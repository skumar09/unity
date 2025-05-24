/* eslint-disable class-methods-use-this */

import { createTag, getConfig, unityConfig } from '../../../scripts/utils.js';

export default class UnityWidget {
  constructor(target, el, workflowCfg, spriteCon) {
    this.el = el;
    this.target = target;
    this.workflowCfg = workflowCfg;
    this.widget = null;
    this.actionMap = {};
    this.spriteCon = spriteCon;
    this.prompts = null;
    this.selectedVerbType = '';
    this.closeBtn = null;
    this.promptItems = [];
    this.genBtn = null;
    this.hasPromptSuggestions = false;
    this.lanaOptions = { sampleRate: 100, tags: 'Unity-FF' };
  }

  async initWidget() {
    const [widgetWrap, widget, unitySprite] = ['ex-unity-wrap', 'ex-unity-widget', 'unity-sprite-container']
      .map((c) => createTag('div', { class: c }));
    this.widgetWrap = widgetWrap;
    this.widget = widget;
    unitySprite.innerHTML = this.spriteCon;
    this.widgetWrap.append(unitySprite);
    this.workflowCfg.placeholder = this.popPlaceholders();
    const hasPromptPlaceholder = !!this.el.querySelector('.icon-placeholder-prompt');
    const hasSuggestionsPlaceholder = !!this.el.querySelector('.icon-placeholder-suggestions');
    this.hasPromptSuggestions = hasPromptPlaceholder && hasSuggestionsPlaceholder;
    const inputWrapper = this.createInpWrap(this.workflowCfg.placeholder);
    let dropdown = null;
    if (this.hasPromptSuggestions) dropdown = await this.genDropdown(this.workflowCfg.placeholder);
    const comboboxContainer = createTag('div', { class: 'autocomplete', role: 'combobox' });
    comboboxContainer.append(inputWrapper);
    if (dropdown) comboboxContainer.append(dropdown);
    this.widget.append(comboboxContainer);
    this.addWidget();
    if (this.workflowCfg.targetCfg.floatPrompt) this.initIO();
    return this.workflowCfg.targetCfg.actionMap;
  }

  popPlaceholders() {
    return Object.fromEntries(
      [...this.el.querySelectorAll('[class*="placeholder"]')].map((element) => [
        element.classList[1]?.replace('icon-', '') || '',
        element.closest('li')?.innerText || '',
      ]).filter(([key]) => key),
    );
  }

  showVerbMenu(selectedElement) {
    const menuContainer = selectedElement.parentElement;
    document.querySelectorAll('.verbs-container').forEach((container) => {
      if (container !== menuContainer) {
        container.classList.remove('show-menu');
        container.querySelector('.selected-verb')?.setAttribute('aria-expanded', 'false');
      }
    });
    menuContainer.classList.toggle('show-menu');
    selectedElement.setAttribute('aria-expanded', menuContainer.classList.contains('show-menu') ? 'true' : 'false');
  }

  hidePromptDropdown() {
    const dropdown = this.widget.querySelector('#prompt-dropdown');
    const inputField = this.widget.querySelector('.inp-field');
    if (dropdown && !dropdown.classList.contains('hidden')) {
      dropdown.classList.add('hidden');
      dropdown.setAttribute('inert', '');
      dropdown.setAttribute('aria-hidden', 'true');
      if (inputField) inputField.setAttribute('aria-expanded', 'false');
    }
  }

  updateAnalytics(verb) {
    if (this.closeBtn) {
      this.closeBtn.setAttribute('daa-ll', `X Close Prompt--${verb}--Prompt suggestions`);
    }
    if (this.promptItems && this.promptItems.length > 0) {
      this.promptItems.forEach((item) => {
        const ariaLabel = item.getAttribute('aria-label') || '';
        item.setAttribute('daa-ll', `${ariaLabel.slice(0, 20)}--${verb}--Prompt suggestion`);
      });
    }
    if (this.genBtn) {
      this.genBtn.setAttribute('daa-ll', `Generate--${verb}`);
    }
  }

  handleVerbLinkClick(link, verbList, selectedElement, menuIcon, inputPlaceHolder) {
    return (e) => {
      e.preventDefault();
      e.stopPropagation();
      verbList.querySelectorAll('.verb-link').forEach((listLink) => {
        listLink.parentElement.classList.remove('selected');
        listLink.parentElement.setAttribute('aria-label', `${listLink.getAttribute('data-verb-type')} prompt: ${inputPlaceHolder}`);
      });
      selectedElement.parentElement.classList.toggle('show-menu');
      selectedElement.setAttribute('aria-expanded', selectedElement.parentElement.classList.contains('show-menu') ? 'true' : 'false');
      link.parentElement.classList.add('selected');
      const copiedNodes = link.cloneNode(true).childNodes;
      copiedNodes[0].remove();
      this.selectedVerbType = link.getAttribute('data-verb-type');
      selectedElement.replaceChildren(...copiedNodes, menuIcon);
      selectedElement.dataset.selectedVerb = this.selectedVerbType;
      selectedElement.setAttribute('aria-label', `${this.selectedVerbType} prompt: ${inputPlaceHolder}`);
      selectedElement.focus();
      link.parentElement.setAttribute('aria-label', `${this.selectedVerbType} prompt selected:  ${inputPlaceHolder}`);
      this.updateDropdownForVerb(this.selectedVerbType);
      this.widgetWrap.setAttribute('data-selected-verb', this.selectedVerbType);
      this.updateAnalytics(this.selectedVerbType);
    };
  }

  verbDropdown() {
    const verbs = this.el.querySelectorAll('[class*="icon-verb"]');
    const inputPlaceHolder = this.el.querySelector('.icon-placeholder-input').parentElement.textContent;
    const selectedVerbType = verbs[0]?.className.split('-')[2];
    const selectedVerb = verbs[0]?.nextElementSibling;
    const { href } = selectedVerb;
    const selectedElement = createTag('button', {
      class: 'selected-verb',
      'aria-expanded': 'false',
      'aria-controls': 'prompt-menu',
      'aria-label': `${selectedVerbType} prompt: ${inputPlaceHolder}`,
      'data-selected-verb': selectedVerbType,
    }, `<img src="${href}" alt="" />${selectedVerbType}`);
    this.selectedVerbType = selectedVerbType;
    this.widgetWrap.setAttribute('data-selected-verb', this.selectedVerbType);
    if (verbs.length <= 1) {
      selectedElement.setAttribute('disabled', 'true');
      return [selectedElement];
    }
    const menuIcon = createTag('span', { class: 'menu-icon' }, '<svg><use xlink:href="#unity-chevron-icon"></use></svg>');
    const verbList = createTag('ul', { class: 'verb-list', id: 'prompt-menu' });
    selectedElement.append(menuIcon);
    const handleDocumentClick = (e) => {
      const menuContainer = selectedElement.parentElement;
      if (!menuContainer.contains(e.target)) {
        document.removeEventListener('click', handleDocumentClick);
        menuContainer.classList.remove('show-menu');
        selectedElement.setAttribute('aria-expanded', 'false');
      }
    };
    selectedElement.addEventListener('click', (e) => {
      e.stopPropagation();
      this.hidePromptDropdown();
      this.showVerbMenu(selectedElement);
      document.addEventListener('click', handleDocumentClick);
    }, true);
    selectedElement.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        this.hidePromptDropdown();
        this.showVerbMenu(selectedElement);
      }
      if (e.key === 'Escape' || e.code === 27) {
        selectedElement.parentElement.classList?.remove('show-menu');
        selectedElement.focus();
      }
    });
    verbs.forEach((verb, idx) => {
      const name = verb.nextElementSibling?.textContent.trim();
      const verbType = verb.className.split('-')[2];
      const icon = verb.nextElementSibling?.href;
      const item = createTag('li', {
        class: 'verb-item',
        'aria-label': `${verbType} prompt: ${inputPlaceHolder}`,
      });
      const selectedIcon = createTag('span', { class: 'selected-icon' }, '<svg><use xlink:href="#unity-checkmark-icon"></use></svg>');
      const link = createTag('a', {
        href: '#',
        class: 'verb-link',
        'data-verb-type': verbType,
      }, `<img src="${icon}" alt="" />${name}`);
      if (idx === 0) {
        item.classList.add('selected');
        item.setAttribute('aria-label', `${verbType} prompt selected: ${inputPlaceHolder}`);
      }
      verbs[0].classList.add('selected');
      link.prepend(selectedIcon);
      item.append(link);
      verbList.append(item);
      link.addEventListener('click', this.handleVerbLinkClick(link, verbList, selectedElement, menuIcon, inputPlaceHolder));
    });
    return [selectedElement, verbList];
  }

  createInpWrap(ph) {
    const inpWrap = createTag('div', { class: 'inp-wrap' });
    const actWrap = createTag('div', { class: 'act-wrap' });
    const verbBtn = createTag('div', { class: 'verbs-container', 'aria-label': 'Prompt options' });
    const inpField = createTag('input', {
      id: 'promptInput',
      class: 'inp-field',
      type: 'text',
      placeholder: ph['placeholder-input'],
      'aria-autocomplete': 'list',
      'aria-haspopup': 'listbox',
      'aria-controls': 'prompt-dropdown',
      'aria-expanded': 'false',
      'aria-owns': 'prompt-dropdown',
      'aria-activedescendant': '',
    });
    const verbDropdown = this.verbDropdown();
    const genBtn = this.createActBtn(this.el.querySelector('.icon-generate')?.closest('li'), 'gen-btn');
    actWrap.append(genBtn);
    verbBtn.append(...verbDropdown);
    inpWrap.append(verbBtn, inpField, actWrap);
    return inpWrap;
  }

  getLimitedDisplayPrompts(prompts) {
    const shuffled = prompts.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 3).map(({ prompt, assetid }) => ({
      prompt,
      assetid,
      displayPrompt: prompt.length > 105 ? `${prompt.slice(0, 105)}…` : prompt,
    }));
  }

  addPromptItemsToDropdown(dropdown, prompts, placeholder) {
    this.promptItems = [];
    prompts.forEach(({ prompt, assetid, displayPrompt }, idx) => {
      const item = createTag('li', {
        id: assetid,
        class: 'drop-item',
        role: 'option',
        tabindex: '0',
        'aria-label': prompt,
        'aria-description': `${placeholder['placeholder-prompt']} ${placeholder['placeholder-suggestions']}`,
        'daa-ll': `${prompt.slice(0, 20)}--${this.selectedVerbType}--Prompt suggestion`,
      }, `<svg><use xlink:href="#unity-prompt-icon"></use></svg> ${displayPrompt}`);
      dropdown.insertBefore(item, dropdown.children[2 + idx]);
      this.promptItems.push(item);
    });
  }

  async genDropdown(ph) {
    if (!this.hasPromptSuggestions) return null;
    const dd = createTag('ul', {
      id: 'prompt-dropdown',
      class: 'drop hidden',
      'daa-lh': 'Marquee',
      role: 'listbox',
      'aria-labelledby': 'promptInput',
      'aria-hidden': 'true',
    });
    const titleCon = createTag('li', { class: 'drop-title-con', 'aria-labelledby': 'prompt-suggestions' });
    const title = createTag('span', { class: 'drop-title', id: 'prompt-suggestions' }, `${ph['placeholder-prompt']} ${ph['placeholder-suggestions']}`);
    const closeBtn = createTag('button', { class: 'close-btn', 'daa-ll': `X Close Prompt--${this.selectedVerbType}--Prompt suggestions`, 'aria-label': 'Close dropdown' }, '<svg><use xlink:href="#unity-close-icon"></use></svg>');
    closeBtn.addEventListener('click', () => {
      dd.classList.add('hidden');
      dd.setAttribute('aria-hidden', 'true');
    });
    this.closeBtn = closeBtn;
    titleCon.append(title, closeBtn);
    dd.append(titleCon);
    const prompts = await this.getPrompt(this.selectedVerbType);
    const limited = this.getLimitedDisplayPrompts(prompts);
    this.addPromptItemsToDropdown(dd, limited, ph);
    dd.append(createTag('li', { class: 'drop-sep', role: 'separator' }));
    dd.append(this.createFooter(ph));
    return dd;
  }

  createFooter(ph) {
    const footer = createTag('li', { class: 'drop-footer' });
    const tipEl = this.el.querySelector('.icon-tip')?.closest('li');
    const tipCon = createTag('div', { id: 'tip-content', class: 'tip-con', tabindex: '-1', role: 'note', 'aria-label': `${ph['placeholder-tip']} ${tipEl?.innerText}` }, '<svg><use xlink:href="#unity-info-icon"></use></svg>');
    const tipText = createTag('span', { class: 'tip-text', id: 'tip-text' }, `${ph['placeholder-tip']}:`);
    const tipDesc = createTag('span', { class: 'tip-desc', id: 'tip-desc' }, tipEl?.innerText || '');
    tipCon.append(tipText, tipDesc);
    const legalEl = this.el.querySelector('.icon-legal')?.closest('li');
    const legalCon = createTag('div', { class: 'legal-con' });
    const legalLink = legalEl?.querySelector('a');
    const legalText = createTag('a', { href: legalLink?.href || '#', class: 'legal-text' }, legalLink?.innerText || 'Legal');
    legalCon.append(legalText);
    footer.append(tipCon, legalCon);
    return footer;
  }

  createActBtn(cfg, cls) {
    if (!cfg) return null;
    const txt = cfg.innerText?.trim();
    const img = cfg.querySelector('img[src*=".svg"]');
    const btn = createTag('a', { href: '#', class: `unity-act-btn ${cls}`, 'daa-ll': `Generate--${this.selectedVerbType}` });
    if (img) btn.append(createTag('div', { class: 'btn-ico' }, img));
    if (txt) btn.append(createTag('div', { class: 'btn-txt' }, txt.split('\n')[0]));
    this.genBtn = btn;
    return btn;
  }

  addWidget() {
    const interactArea = this.target.querySelector('.copy');
    const para = interactArea?.querySelector(this.workflowCfg.targetCfg.target);
    this.widgetWrap.append(this.widget);
    if (para && this.workflowCfg.targetCfg.insert === 'before') para.before(this.widgetWrap);
    else if (para) para.after(this.widgetWrap);
    else interactArea?.appendChild(this.widgetWrap);
  }

  async loadPrompts() {
    const { locale } = getConfig();
    const { origin } = window.location;
    const baseUrl = (origin.includes('.aem.') || origin.includes('.hlx.'))
      ? `https://main--unity--adobecom.${origin.includes('.hlx.') ? 'hlx' : 'aem'}.live`
      : origin;
    const promptFile = locale.prefix && locale.prefix !== '/'
      ? `${baseUrl}${locale.prefix}/unity/configs/prompt/firefly-prompt.json`
      : `${baseUrl}/unity/configs/prompt/firefly-prompt.json`;
    const promptRes = await fetch(promptFile);
    if (!promptRes.ok) {
      throw new Error('Failed to fetch prompts.');
    }
    const promptJson = await promptRes.json();
    this.prompts = this.createPromptMap(promptJson?.content?.data);
  }

  async getPrompt(verb) {
    if (!this.hasPromptSuggestions) return [];
    try {
      if (!this.prompts || Object.keys(this.prompts).length === 0) await this.loadPrompts();
      return (this.prompts?.[verb] || []).filter((item) => item.prompt && item.prompt.trim() !== '');
    } catch (e) {
      window.lana?.log(`Message: Error loading promts, Error: ${e}`, this.lanaOptions);
      return [];
    }
  }

  createPromptMap(data) {
    const promptMap = {};
    if (Array.isArray(data)) {
      data.forEach((item) => {
        const itemEnv = item.env || 'prod';
        if (item.verb && item.prompt && item.assetid && itemEnv === unityConfig.env) {
          if (!promptMap[item.verb]) promptMap[item.verb] = [];
          promptMap[item.verb].push({ prompt: item.prompt, assetid: item.assetid });
        }
      });
    }
    return promptMap;
  }

  async updateDropdownForVerb(verb) {
    if (!this.hasPromptSuggestions) return;
    const dropdown = this.widget.querySelector('#prompt-dropdown');
    if (!dropdown) return;
    dropdown.querySelectorAll('.drop-item').forEach((item) => item.remove());
    const prompts = await this.getPrompt(verb);
    const limited = this.getLimitedDisplayPrompts(prompts);
    this.addPromptItemsToDropdown(dropdown, limited, this.workflowCfg.placeholder);
    this.widgetWrap.dispatchEvent(new CustomEvent('firefly-reinit-action-listeners'));
  }
}
