import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';
import { readFile } from '@web/test-runner-commands';
import ActionBinder from '../../../unitylibs/core/workflow/workflow-ai/action-binder.js';
import UnityWidget from '../../../unitylibs/core/workflow/workflow-ai/widget.js';

describe('AI Workflow Tests', () => {
  let actionBinder;
  let unityElement;
  let workflowCfg;
  let block;
  let canvasArea;
  let actionMap;
  let unityWidget;
  let spriteContainer;

  before(async () => {
    document.body.innerHTML = await readFile({ path: './mocks/text2image-body.html' });
    unityElement = document.querySelector('.unity');
    workflowCfg = {
      name: 'workflow-ai',
      placeholder: { 'placeholder-no-suggestions': 'No Suggestions available' },
      targetCfg: { renderWidget: true, insert: 'before', target: 'p:last-of-type', floatPrompt: true },
    };
    spriteContainer = '<svg></svg>';
    block = document.querySelector('.unity-enabled');
    canvasArea = document.createElement('div');
    actionMap = {
      '.gen-btn': [{ actionType: 'generate' }],
      '.drop-item': [{ actionType: 'setPromptValue' }],
      '.close-btn': [{ actionType: 'closeDropdown' }],
      '.inp-field': [{ actionType: 'autocomplete' }],
      '.surprise-btn': [{ actionType: 'surprise' }],
    };

    unityWidget = new UnityWidget(block, unityElement, workflowCfg, spriteContainer);
    await unityWidget.initWidget();

    actionBinder = new ActionBinder(unityElement, workflowCfg, block, canvasArea, actionMap);
  });

  it('should initialize ActionBinder correctly', () => {
    expect(actionBinder).to.exist;
    expect(actionBinder.inputField).to.exist;
    expect(actionBinder.dropdown).to.exist;
    expect(actionBinder.surpriseBtn).to.exist;
    expect(actionBinder.widget).to.exist;
  });

  it('should bind event listeners on init', async () => {
    await actionBinder.initActionListeners();
    Object.keys(actionMap).forEach((selector) => {
      document.querySelectorAll(selector).forEach((el) => {
        expect(el.getAttribute('data-event-bound')).to.equal('true');
      });
    });
  });

  it('should fetch autocomplete suggestions', async () => {
    const mockResponse = { completions: ['suggestion1', 'suggestion2'] };
    actionBinder.serviceHandler = { postCallToService: sinon.stub().resolves(mockResponse) };
    actionBinder.query = 'test';
    await actionBinder.fetchAutoComplete();
    expect(actionBinder.suggestion).to.deep.equal(mockResponse.completions);
  });

  it('should initialize UnityWidget correctly', () => {
    expect(unityWidget).to.exist;
    expect(unityWidget.target).to.equal(block);
    expect(unityWidget.el).to.equal(unityElement);
  });

  it('should insert widget into DOM', () => {
    unityWidget.addWidget();
    expect(document.querySelector('.ex-unity-wrap')).to.exist;
  });

  it('should initialize intersection observer', () => {
    const initIOStub = sinon.stub(unityWidget, 'initIO');
    unityWidget.initIO();
    expect(initIOStub.calledOnce).to.be.true;
    initIOStub.restore();
  });

  it('should correctly populate placeholders', () => {
    const placeholders = unityWidget.popPlaceholders();
    expect(placeholders).to.be.an('object');
    expect(Object.keys(placeholders).length).to.be.greaterThan(0);
  });

  it('should generate dropdown with correct placeholders', () => {
    const placeholder = {
      'placeholder-prompt': 'Prompt',
      'placeholder-suggestions': 'Suggestions',
    };
    const dropdown = unityWidget.genDropdown(placeholder);
    expect(dropdown).to.exist;
    expect(dropdown.querySelector('.drop-title')).to.exist;
    expect(dropdown.querySelector('.close-btn')).to.exist;
  });

  it('should toggle visibility correctly', () => {
    const cfg = { isIntersecting: true };
    const wrapper = unityWidget.target.querySelector('.ex-unity-wrap');
    unityWidget.toggleVisibility(cfg);
    expect(wrapper.classList.contains('hidden')).to.be.true;
    cfg.isIntersecting = false;
    unityWidget.toggleVisibility(cfg);
    expect(wrapper.classList.contains('hidden')).to.be.false;
  });

  it('should debounce function calls', async () => {
    const testFunc = sinon.spy();
    const debouncedFunc = unityWidget.debounce(testFunc, 100);
    debouncedFunc();
    debouncedFunc();
    await new Promise((resolve) => { setTimeout(resolve, 150); });
    expect(testFunc.calledOnce).to.be.true;
  });

  it('should set up intersection observers', () => {
    const observerEl = document.createElement('div');
    const footerEl = document.createElement('div');
    const createObsSpy = sinon.spy(unityWidget, 'createCustIntsecObs');
    unityWidget.setupIO(observerEl, footerEl);
    expect(createObsSpy.calledTwice).to.be.true;
    createObsSpy.restore();
  });

  it('should handle keydown events correctly', () => {
    const dropdown = document.querySelector('.drop');
    actionBinder.dropdown = dropdown;
    const arrowDownEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
    actionBinder.handleKeyDown(arrowDownEvent);
    expect(actionBinder.activeIndex).to.not.equal(-1);
    const arrowUpEvent = new KeyboardEvent('keydown', { key: 'ArrowUp' });
    actionBinder.handleKeyDown(arrowUpEvent);
    expect(actionBinder.activeIndex).to.not.equal(-1);
    const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
    sinon.stub(actionBinder, 'hideDropdown');
    actionBinder.handleKeyDown(escapeEvent);
    expect(actionBinder.hideDropdown.calledOnce).to.be.true;
    actionBinder.hideDropdown.restore();
  });

  it('should move focus correctly with Arrow keys', () => {
    const dropItems = [...document.querySelectorAll('.drop-item')];
    actionBinder.moveFocusWithArrow(dropItems, 'down');
    expect(document.activeElement).to.equal(dropItems[0]);

    actionBinder.moveFocusWithArrow(dropItems, 'down');
    expect(document.activeElement).to.equal(dropItems[1]);

    actionBinder.moveFocusWithArrow(dropItems, 'up');
    expect(document.activeElement).to.equal(dropItems[0]);
  });

  it('should correctly process Enter key actions', () => {
    const dropItem = document.querySelector('.drop-item');
    dropItem.focus();
    actionBinder.activeIndex = 0;
    const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
    sinon.stub(actionBinder, 'setPrompt');
    actionBinder.handleEnter(enterEvent, [dropItem], [], 0);
    expect(actionBinder.setPrompt.calledOnce).to.be.true;
    actionBinder.setPrompt.restore();
  });

  it('should handle Tab key navigation in dropdown', () => {
    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
    const shiftEvent = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, shiftKey: true });
    const focusableElements = Array.from(document.querySelectorAll('.inp-field, .gen-btn, .drop-item, .close-btn'));
    const dropItems = [document.querySelector('.drop-item')];
    focusableElements[0].focus();
    const currentIndex = focusableElements.indexOf(document.activeElement);
    actionBinder.handleTab(event, focusableElements, dropItems, currentIndex);
    expect(document.activeElement).to.equal(focusableElements[1]);
    actionBinder.handleTab(shiftEvent, focusableElements, dropItems, 1);
    expect(document.activeElement).to.equal(focusableElements[0]);
  });

  it('should move focus to legal-text if tip-con is focused', () => {
    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
    const tipCon = document.querySelector('.tip-con');
    const legalText = document.querySelector('.legal-text');
    tipCon.focus();
    expect(document.activeElement).to.equal(tipCon);
    const queryStub = sinon.stub(actionBinder.block, 'querySelector');
    queryStub.withArgs('.legal-text').returns(legalText);
    actionBinder.handleTab(event, [tipCon, legalText], [], 0);
    expect(document.activeElement).to.equal(legalText);
    queryStub.restore();
  });

  it('should initialize action on iOS and bind event listeners', async () => {
    const originalUserAgent = Object.getOwnPropertyDescriptor(navigator, 'userAgent');
    Object.defineProperty(navigator, 'userAgent', {
      value: 'iPhone',
      configurable: true,
    });
    const originalVisibilityState = Object.getOwnPropertyDescriptor(document, 'visibilityState');
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true,
    });
    const inputField = document.querySelector('.inp-field');
    actionBinder.inputField = inputField;
    const initActionListenersSpy = sinon.spy(actionBinder, 'initActionListeners');
    const showDropdownSpy = sinon.spy(actionBinder, 'showDropdown');
    actionBinder.initAction();
    const pageShowEvent = new Event('pageshow');
    Object.defineProperty(pageShowEvent, 'persisted', { value: true });
    window.dispatchEvent(pageShowEvent);
    inputField.dispatchEvent(new Event('click', { bubbles: true }));
    await new Promise((resolve) => { setTimeout(resolve, 10); });
    expect(initActionListenersSpy.calledOnce).to.be.true;
    expect(showDropdownSpy.calledOnce).to.be.true;
    expect(document.activeElement).to.equal(inputField);
    if (originalUserAgent) {
      Object.defineProperty(navigator, 'userAgent', originalUserAgent);
    }
    if (originalVisibilityState) {
      Object.defineProperty(document, 'visibilityState', originalVisibilityState);
    }
    initActionListenersSpy.restore();
    showDropdownSpy.restore();
  });
  it('should handle user input and update query', async () => {
    const inputField = document.querySelector('.inp-field');
    expect(inputField).to.exist;
    actionBinder.addInputEvents(inputField, ['autocomplete']);
    inputField.value = 'Test Input';
    inputField.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((resolve) => { setTimeout(resolve, 1100); });
    expect(actionBinder.query).to.equal('Test Input');
  });

  it('should show suggestion dropdown when we focus on input', async () => {
    const inputField = document.querySelector('.inp-field');
    expect(inputField).to.exist;
    inputField.dispatchEvent(new Event('focus', { bubbles: true }));
    expect(actionBinder.sendAnalyticsOnFocus).to.be.false;
  });

  it('should Show No sugestion available in the dropdown', async () => {
    const mockResponse = { completions: [] };
    actionBinder.serviceHandler = { postCallToService: sinon.stub().resolves(mockResponse) };
    actionBinder.query = 'test';
    await actionBinder.fetchAutoComplete();
    expect(actionBinder.serviceHandler.postCallToService.calledOnce).to.be.true;
  });
  it('should fetch autocomplete suggestions', async () => {
    const mockResponse = { completions: ['suggestion1', 'suggestion2'] };
    actionBinder.serviceHandler = { postCallToService: sinon.stub().resolves(mockResponse) };
    actionBinder.query = 'test';
    await actionBinder.fetchAutoComplete();
    expect(actionBinder.serviceHandler.postCallToService.calledOnce).to.be.true;
  });

  it('should trigger surprise action and call generateContent', async () => {
    sinon.restore();
    sinon.stub(actionBinder, 'generateContent').resolves();
    actionBinder.workflowCfg.supportedTexts = { prompt: ['test prompt 1', 'test prompt 2'] };
    await actionBinder.triggerSurprise();
    expect(actionBinder.query).to.be.oneOf(['test prompt 1', 'test prompt 2']);
    expect(actionBinder.generateContent.calledOnce).to.be.true;
    actionBinder.generateContent.restore();
  });

  it('should handle clicking on generate button', async () => {
    sinon.restore();
    await actionBinder.initActionListeners();
    const genBtn = document.querySelector('.gen-btn');
    expect(genBtn).to.exist;
    const generateSpy = sinon.spy(actionBinder, 'generateContent');
    genBtn.click();
    await new Promise((resolve) => { setTimeout(resolve, 50); });
    expect(generateSpy.calledOnce).to.be.true;
    generateSpy.restore();
  });
});
