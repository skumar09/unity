/* eslint-disable max-len */
/* eslint-disable max-classes-per-file */
/* eslint-disable no-await-in-loop */
/* eslint-disable class-methods-use-this */
/* eslint-disable no-restricted-syntax */

import {
  unityConfig,
  getUnityLibs,
  createTag,
  defineDeviceByScreenSize,
  getLibs,
  getHeaders,
  getLocale,
  sendAnalyticsEvent,
} from '../../../scripts/utils.js';

class ServiceHandler {
  constructor(renderWidget = false, canvasArea = null, unityEl = null) {
    this.renderWidget = renderWidget;
    this.canvasArea = canvasArea;
    this.unityEl = unityEl;
  }

  async fetchFromService(url, options) {
    try {
      const response = await fetch(url, options);
      const error = new Error();
      if (response.status !== 200) {
        error.status = response.status;
        throw error;
      }
      return response.json();
    } catch (error) {
      if (error.name === 'TimeoutError' || error.name === 'AbortError') {
        error.status = 504;
      }
      throw error;
    }
  }

  async postCallToService(api, options) {
    const postOpts = {
      method: 'POST',
      headers: await getHeaders(unityConfig.apiKey),
      ...options,
    };
    return this.fetchFromService(api, postOpts);
  }

  showErrorToast(errorCallbackOptions, error, lanaOptions, errorType = 'server') {
    sendAnalyticsEvent(new CustomEvent(`FF Generate prompt ${errorType} error|UnityWidget`));
    if (!errorCallbackOptions?.errorToastEl) return;
    const msg = this.unityEl.querySelector(errorCallbackOptions.errorType)?.nextSibling.textContent;
    const promptBarEl = this.canvasArea.querySelector('.copy .ex-unity-wrap');
    promptBarEl.style.pointerEvents = 'none';
    const errorToast = promptBarEl.querySelector('.alert-holder');
    if (!errorToast) return;
    const closeBtn = errorToast.querySelector('.alert-close');
    if (closeBtn) closeBtn.style.pointerEvents = 'auto';
    const alertText = errorToast.querySelector('.alert-text p');
    if (!alertText) return;
    alertText.innerText = msg;
    errorToast.classList.add('show');
    window.lana?.log(`Message: ${msg}, Error: ${error || ''}`, lanaOptions);
  }
}

export default class ActionBinder {
  boundHandleKeyDown = this.handleKeyDown.bind(this);

  boundOutsideClickHandler = this.handleOutsideClick.bind(this);

  constructor(unityEl, workflowCfg, block, canvasArea, actionMap = {}) {
    this.unityEl = unityEl;
    this.workflowCfg = workflowCfg;
    this.block = block;
    this.canvasArea = canvasArea;
    this.actions = actionMap;
    this.query = '';
    this.serviceHandler = null;
    this.activeIndex = -1;
    this.id = '';
    this.apiConfig = { ...unityConfig };
    this.inputField = this.getElement('.inp-field');
    this.dropdown = this.getElement('.drop');
    this.widget = this.getElement('.ex-unity-widget');
    this.viewport = defineDeviceByScreenSize();
    this.widgetWrap = this.getElement('.ex-unity-wrap');
    this.widgetWrap.addEventListener('firefly-reinit-action-listeners', () => this.initActionListeners());
    this.scrRead = createTag('div', { class: 'sr-only', 'aria-live': 'polite', 'aria-atomic': 'true' });
    this.widgetWrap.append(this.scrRead);
    this.errorToastEl = null;
    this.lanaOptions = { sampleRate: 1, tags: 'Unity-FF' };
    this.sendAnalyticsToSplunk = null;
    this.addAccessibility();
    this.initAction();
  }

  async initAction() {
    if (!this.errorToastEl) this.errorToastEl = await this.createErrorToast();
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent)
      || (navigator.userAgent.includes('Mac') && navigator.maxTouchPoints > 1);
    if (!isIos) return;
    window.addEventListener('pageshow', ({ persisted }) => {
      if (!persisted || document.visibilityState !== 'visible') return;
      const handleClick = ({ target }) => {
        if (target === this.inputField) {
          this.inputField.focus();
          this.initActionListeners();
          this.showDropdown();
        }
      };
      document.addEventListener('click', handleClick, { once: true });
    });
  }

  async createErrorToast() {
    try {
      const [alertImg, closeImg] = await Promise.all([
        fetch(`${getUnityLibs()}/img/icons/alert.svg`).then((res) => res.text()),
        fetch(`${getUnityLibs()}/img/icons/close.svg`).then((res) => res.text()),
      ]);
      const { decorateDefaultLinkAnalytics } = await import(`${getLibs()}/martech/attributes.js`);
      const promptBarEl = this.canvasArea.querySelector('.copy .ex-unity-wrap');
      const alertText = createTag('div', { class: 'alert-text' }, createTag('p', {}, 'Alert Text'));
      const alertIcon = createTag('div', { class: 'alert-icon' });
      alertIcon.innerHTML = alertImg;
      alertIcon.append(alertText);
      const alertClose = createTag('a', { class: 'alert-close', href: '#' });
      alertClose.innerHTML = closeImg;
      alertClose.append(createTag('span', { class: 'alert-close-text' }, 'Close error toast'));
      const alertContent = createTag('div', { class: 'alert-content' });
      alertContent.append(alertIcon, alertClose);
      const alertToast = createTag('div', { class: 'alert-toast' }, alertContent);
      const errholder = createTag('div', { class: 'alert-holder' }, alertToast);
      alertClose.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        errholder.classList.remove('show');
        promptBarEl.style.pointerEvents = 'auto';
      });
      decorateDefaultLinkAnalytics(errholder);
      promptBarEl.prepend(errholder);
      return promptBarEl?.querySelector('.alert-holder');
    } catch (e) {
      window.lana?.log(`Message: Error creating error toast, Error: ${e}`, this.lanaOptions);
      return null;
    }
  }

  initializeApiConfig() {
    return { ...unityConfig };
  }

  getElement(selector) {
    const element = this.block.querySelector(selector);
    if (!element) console.warn(`Element with selector "${selector}" not found.`);
    return element;
  }

  async initActionListeners() {
    Object.entries(this.actions).forEach(([selector, actionsList]) => {
      this.block.querySelectorAll(selector).forEach((el) => {
        if (!el.hasAttribute('data-event-bound')) {
          this.addEventListeners(el, actionsList);
          el.setAttribute('data-event-bound', 'true');
        }
      });
    });
  }

  async loadServiceHandler() {
    this.serviceHandler = new ServiceHandler(
      this.workflowCfg.targetCfg.renderWidget,
      this.canvasArea,
      this.unityEl,
    );
  }

  addEventListeners(el, actionsList) {
    const handleClick = async (event) => {
      event.preventDefault();
      await this.execActions(actionsList, el);
    };
    switch (el.nodeName) {
      case 'A':
      case 'BUTTON':
        el.addEventListener('click', handleClick);
        break;
      case 'LI':
        el.addEventListener('mousedown', (event) => event.preventDefault());
        el.addEventListener('click', handleClick);
        break;
      case 'INPUT':
        this.addInputEvents(el);
        break;
      default:
        break;
    }
  }

  addInputEvents(el) {
    el.addEventListener('focus', () => this.showDropdown());
    el.addEventListener('focusout', ({ relatedTarget, currentTarget }) => {
      if (!relatedTarget && this.widget?.contains(currentTarget)) return;
      if (!this.widget?.contains(relatedTarget)) this.hideDropdown();
    });
  }

  async execActions(action, el = null) {
    try {
      await this.handleAction(action, el);
    } catch (err) {
      window.lana?.log(`Message: Actions failed, Error: ${err}`, this.lanaOptions);
    }
  }

  async handleAction(action, el) {
    const actionMap = {
      generate: () => this.generateContent(),
      setPromptValue: () => this.setPrompt(el),
      closeDropdown: () => this.resetDropdown(),
    };
    const execute = actionMap[action.actionType];
    if (execute) await execute();
  }

  getSelectedVerbType = () => this.widgetWrap.getAttribute('data-selected-verb');

  validateInput() {
    if (this.inputField.value.length === 0 && !this.id) {
      this.serviceHandler.showErrorToast({ errorToastEl: this.errorToastEl, errorType: '.icon-error-empty-input' }, 'Empty input');
      return { isValid: false, errorCode: 'empty-input' };
    }
    if (this.inputField.value.length > 750) {
      this.serviceHandler.showErrorToast({ errorToastEl: this.errorToastEl, errorType: '.icon-error-max-length' }, 'Max prompt characters exceeded');
      return { isValid: false, errorCode: 'max-prompt-characters-exceeded' };
    }
    return { isValid: true };
  }

  async initAnalytics() {
    if (!this.sendAnalyticsToSplunk && this.workflowCfg.targetCfg.sendSplunkAnalytics) {
      this.sendAnalyticsToSplunk = (await import(`${getUnityLibs()}/scripts/splunk-analytics.js`)).default;
    }
  }

  logAnalytics(eventName, data, { workflowStep, statusCode } = {}) {
    const logData = {
      ...data,
      ...(workflowStep && { workflowStep }),
      ...(typeof statusCode !== 'undefined' && { statusCode }),
    };
    this.sendAnalyticsToSplunk?.( eventName, this.workflowCfg.productName, logData, `${unityConfig.apiEndPoint}/log`, true);
  }

  async generateContent() {
    await this.initAnalytics();
    if (!this.serviceHandler) await this.loadServiceHandler();
    const cgen = this.unityEl.querySelector('.icon-cgen')?.nextSibling?.textContent?.trim();
    const queryParams = {};
    if (cgen) {
      cgen.split('&').forEach((param) => {
        const [key, value] = param.split('=');
        if (key && value) queryParams[key] = value;
      });
    }
    if (!this.query) this.query = this.inputField.value.trim();
    const selectedVerbType = `text-to-${this.getSelectedVerbType()}`;
    const action = (this.id ? 'prompt-suggestion' : 'generate');
    const eventData = { assetId: this.id, verb: selectedVerbType, action };
    this.logAnalytics('generate', eventData, { workflowStep: 'start' });
    const validation = this.validateInput();
    if (!validation.isValid) {
      this.logAnalytics('generate', { ...eventData, errorData: { code: validation.errorCode } }, { workflowStep: 'complete', statusCode: -1 });
      return;
    }
    try {
      const payload = {
        targetProduct: this.workflowCfg.productName,
        additionalQueryParams: queryParams,
        payload: { workflow: selectedVerbType, locale: getLocale(), action },
        ...(this.id ? { assetId: this.id } : { query: this.query }),
      };
      const { url } = await this.serviceHandler.postCallToService(
        this.apiConfig.connectorApiEndPoint,
        { body: JSON.stringify(payload) },
      );
      this.logAnalytics('generate', eventData, { workflowStep: 'complete', statusCode: 0 });
      this.query = '';
      this.id = '';
      this.resetDropdown();
      if (url) window.location.href = url;
    } catch (err) {
      this.serviceHandler.showErrorToast({ errorToastEl: this.errorToastEl, errorType: '.icon-error-request' }, err);
      this.logAnalytics('generate', { ...eventData,
        errorData: { code: 'request-failed', subCode: err.status, desc: err.message },
      }, { workflowStep: 'complete', statusCode: -1 });
      window.lana?.log(`Content generation failed:, Error: ${err}`, this.lanaOptions);
    }
  }

  setPrompt(el) {
    this.query = el.getAttribute('aria-label')?.trim();
    this.id = el.getAttribute('id')?.trim();
    this.generateContent();
    this.hideDropdown();
  }

  addAccessibility() {
    this.addKeyDown();
  }

  addKeyDown() {
    this.rmvKeyDown();
    this.block.addEventListener('keydown', this.boundHandleKeyDown);
  }

  rmvKeyDown() {
    this.block.removeEventListener('keydown', this.boundHandleKeyDown);
  }

  handleKeyDown(ev) {
    const validKeys = ['Tab', 'ArrowDown', 'ArrowUp', 'Enter', 'Escape'];
    if (!validKeys.includes(ev.key)) return;
    const dropItems = this.getDropdownItems();
    const focusElems = this.getFocusElems(dropItems.length > 0);
    const currIdx = focusElems.indexOf(document.activeElement);
    const isDropVisi = this.isDropdownVisible();
    switch (ev.key) {
      case 'Tab':
        if (!isDropVisi) return;
        this.handleTab(ev, focusElems, dropItems, currIdx);
        break;
      case 'ArrowDown':
        ev.preventDefault();
        this.moveFocusWithArrow(dropItems, 'down');
        break;
      case 'ArrowUp':
        ev.preventDefault();
        this.moveFocusWithArrow(dropItems, 'up');
        break;
      case 'Enter':
        this.handleEnter(ev, dropItems, focusElems, currIdx);
        break;
      case 'Escape':
        this.inputField.focus();
        this.hideDropdown();
        break;
      default:
        break;
    }
  }

  getDropdownItems() {
    if (!this.dropdown) return [];
    const dynamicItems = Array.from(this.dropdown?.querySelectorAll('.drop-item.dynamic'));
    let tipCon = null;
    if (this.viewport !== 'MOBILE') tipCon = this.dropdown?.querySelector('.tip-con');
    if (dynamicItems.length > 0) return tipCon ? [...dynamicItems, tipCon] : dynamicItems;
    const allItems = Array.from(this.dropdown?.querySelectorAll('.drop-item'));
    return tipCon ? [...allItems, tipCon] : allItems;
  }

  getFocusElems() {
    let elmSelector = this.block.querySelector('.close-btn.dynamic') ? '.close-btn.dynamic,.drop-item.dynamic' : '.close-btn,.drop-item';
    if (this.viewport !== 'MOBILE') elmSelector = `${elmSelector}, .legal-text`;
    const selector = `.inp-field, .gen-btn, ${elmSelector}`;
    return Array.from(this.block.querySelectorAll(selector));
  }

  isDropdownVisible = () => !this.dropdown?.classList.contains('hidden');

  handleTab(event, focusableElements, dropItems, currentIndex) {
    if (!focusableElements.length) return;
    event.preventDefault();
    const isShift = event.shiftKey;
    const currentElement = document.activeElement;
    if (currentElement.classList.contains('tip-con')) {
      if (!isShift) {
        const legalText = this.block.querySelector('.legal-text');
        if (legalText) {
          legalText.focus();
          return;
        }
      }
    }
    const nextIndex = isShift
      ? (currentIndex - 1 + focusableElements.length) % focusableElements.length
      : (currentIndex + 1) % focusableElements.length;
    focusableElements[nextIndex].focus();
    const newActiveIndex = dropItems.indexOf(focusableElements[nextIndex]);
    this.activeIndex = newActiveIndex !== -1 ? newActiveIndex : -1;
  }

  moveFocusWithArrow(dropItems, direction) {
    if (this.activeIndex === -1 || !this.isDropdownItemFocused(dropItems)) this.activeIndex = direction === 'down' ? 0 : dropItems.length - 1;
    else this.activeIndex = direction === 'down' ? (this.activeIndex + 1) % dropItems.length : (this.activeIndex - 1 + dropItems.length) % dropItems.length;
    this.setActiveItem(dropItems, this.activeIndex, this.inputField);
  }

  isDropdownItemFocused = (dropItems) => dropItems.some((item) => item === document.activeElement);

  handleEnter(ev, dropItems, focusElems, currIdx) {
    ev.preventDefault();
    const nonInteractiveRoles = ['note', 'presentation'];
    const role = document.activeElement.getAttribute('role');
    if (role && nonInteractiveRoles.includes(role)) return;
    if (
      this.activeIndex >= 0
      && dropItems[this.activeIndex]
      && dropItems[this.activeIndex] === document.activeElement
    ) {
      this.setPrompt(dropItems[this.activeIndex]);
      this.activeIndex = -1;
      return;
    }
    const tarElem = focusElems[currIdx] || ev.target;
    const actions = { 'inp-field': () => this.inpRedirect() };
    if (tarElem) {
      const matchCls = Object.keys(actions).find((cls) => tarElem.classList.contains(cls));
      if (matchCls) actions[matchCls]();
      else if (currIdx !== -1) tarElem.click();
    }
  }

  setActiveItem(items, index, input) {
    items.forEach((item, i) => {
      if (i === index) {
        input.setAttribute('aria-activedescendant', item.id || 'tip-content');
        item.focus();
      }
    });
  }

  async inpRedirect() {
    if (!this.query) return;
    await this.generateContent();
  }

  showDropdown() {
    this.dropdown?.classList.remove('hidden');
    this.dropdown?.removeAttribute('inert');
    this.inputField.setAttribute('aria-expanded', 'true');
    this.dropdown?.removeAttribute('aria-hidden');
    document.addEventListener('click', this.boundOutsideClickHandler, true);
  }

  hideDropdown() {
    if (this.isDropdownVisible()) {
      this.dropdown?.classList.add('hidden');
      this.dropdown?.setAttribute('inert', '');
      this.dropdown?.setAttribute('aria-hidden', 'true');
      this.inputField.setAttribute('aria-expanded', 'false');
      document.removeEventListener('click', this.boundOutsideClickHandler, true);
    }
  }

  handleOutsideClick(event) {
    if (!this.widget?.contains(event.target)) this.hideDropdown();
  }

  resetDropdown() {
    this.inputField.focus();
    if (!this.query) this.inputField.value = '';
    this.hideDropdown();
  }
}
