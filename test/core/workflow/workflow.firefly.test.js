/* eslint-disable max-len */
import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';
import { readFile } from '@web/test-runner-commands';
import ActionBinder from '../../../unitylibs/core/workflow/workflow-firefly/action-binder.js';
import UnityWidget from '../../../unitylibs/core/workflow/workflow-firefly/widget.js';

describe('Firefly Workflow Tests', () => {
  let actionBinder;
  let unityElement;
  let workflowCfg;
  let block;
  let canvasArea;
  let actionMap;
  let unityWidget;
  let spriteContainer;

  before(async () => {
    document.body.innerHTML = await readFile({ path: './mocks/ff-body.html' });
    unityElement = document.querySelector('.unity');
    workflowCfg = {
      name: 'workflow-firefly',
      targetCfg: { renderWidget: true, insert: 'before', target: 'a:last-of-type' },
    };
    spriteContainer = '<svg></svg>';
    block = document.querySelector('.unity-enabled');
    canvasArea = document.createElement('div');
    actionMap = {
      '.gen-btn': [{ actionType: 'generate' }],
      '.drop-item': [{ actionType: 'setPromptValue' }],
      '.close-btn': [{ actionType: 'closeDropdown' }],
      '.inp-field': [{ actionType: 'autocomplete' }],
    };

    sinon.stub(UnityWidget.prototype, 'loadPrompts').callsFake(function () {
      const samplePrompts = [
        { verb: 'image', prompt: 'A calm face blending into a forest landscape with birds flying from the silhouette. Soft lighting with color popping trees', assetid: '17669552-32bc-4216-82fe-8f7e72ffb4b0' },
        { verb: 'image', prompt: 'Make a cheerful product image of a collectible jar with a tiny person tending to a miniature garden, complete with working watering can, tiny plants, and a little bench, the jar lid decorated with flower patterns and labeled Green Thumb Series', assetid: '69c64e7a-83cb-466b-a530-6b42b06a914a' },
        { verb: 'image', prompt: 'high quality image  of a translucent studio background with light prisms created by light sunlight, the atmosphere is magical, ephemeral, modern, in the center there is a a flower made of clouds', assetid: 'f56dbb62-53ed-4745-874f-adc549e81ee5' },
        { verb: 'video', prompt: 'photograph of a boy standing in tall grass, wearing a pig mask over his head. hazy halation filter. weird surreal dreamy look', assetid: '0a3b51b4-23e8-4f80-a955-c0b91fd67bf7' },
        { verb: 'video', prompt: 'a bright yellow sun with a face in a very blue sky', assetid: 'af9b6097-1c3a-49d3-a0f8-e0b4fe288ee1' },
        { verb: 'video', prompt: 'vehicle that constantly shifts between three states: solid chrome geometry with sharp angles, flowing mercury that maintains speed while changing shape, and an energy wireframe that leaves trails of light - all on a track that loops through different reality layers.', assetid: 'da5d3aa3-61e3-4492-8795-9b558b495402' },
      ];
      // Group by verb
      this.prompts = samplePrompts.reduce((acc, item) => {
        if (!acc[item.verb]) acc[item.verb] = [];
        acc[item.verb].push({ prompt: item.prompt, assetid: item.assetid });
        return acc;
      }, {});
      return Promise.resolve();
    });

    // Ensure .copy contains a target <a> for widget insertion
    const copy = block.querySelector('.copy');
    if (copy && !copy.querySelector('a')) {
      copy.innerHTML = '<a href="#">Target Link</a>';
    }

    unityWidget = new UnityWidget(block, unityElement, workflowCfg, spriteContainer);
    await unityWidget.initWidget();

    // Ensure .ex-unity-wrap is present before constructing ActionBinder
    if (!document.querySelector('.ex-unity-wrap')) {
      throw new Error('.ex-unity-wrap not found in DOM after widget initialization');
    }

    actionBinder = new ActionBinder(unityElement, workflowCfg, block, canvasArea, actionMap);
  });

  it('should initialize ActionBinder correctly', () => {
    expect(actionBinder).to.exist;
    expect(actionBinder.inputField).to.exist;
    expect(actionBinder.dropdown).to.exist;
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

  it('should initialize UnityWidget correctly', () => {
    expect(unityWidget).to.exist;
    expect(unityWidget.target).to.equal(block);
    expect(unityWidget.el).to.equal(unityElement);
  });

  it('should insert widget into DOM', () => {
    expect(document.querySelector('.ex-unity-wrap')).to.exist;
  });

  it('should correctly populate placeholders', () => {
    const placeholders = unityWidget.popPlaceholders();
    expect(placeholders).to.be.an('object');
    expect(Object.keys(placeholders).length).to.be.greaterThan(0);
  });

  it('should generate dropdown with correct placeholders', async () => {
    const placeholder = {
      'placeholder-prompt': 'Prompt',
      'placeholder-suggestions': 'Suggestions',
    };
    const dropdown = await unityWidget.genDropdown(placeholder);
    expect(dropdown).to.exist;
    expect(dropdown.querySelector('.drop-title')).to.exist;
    expect(dropdown.querySelector('.close-btn')).to.exist;
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

  it('should update prompt suggestions when verb is changed', async () => {
    const imagePrompts = [
      'A calm face blending into a forest landscape with birds flying from the silhouette. Soft lighting with color popping trees',
      'Make a cheerful product image of a collectible jar with a tiny person tending to a miniature garden, complete with working watering can, tiny plants, and a little bench, the jar lid decorated with flower patterns and labeled Green Thumb Series',
      'high quality image  of a translucent studio background with light prisms created by light sunlight, the atmosphere is magical, ephemeral, modern, in the center there is a a flower made of clouds',
    ];
    const videoPrompts = [
      'photograph of a boy standing in tall grass, wearing a pig mask over his head. hazy halation filter. weird surreal dreamy look',
      'a bright yellow sun with a face in a very blue sky',
      'vehicle that constantly shifts between three states: solid chrome geometry with sharp angles, flowing mercury that maintains speed while changing shape, and an energy wireframe that leaves trails of light - all on a track that loops through different reality layers.',
    ];
    // Initial verb is 'image' (default)
    await unityWidget.updateDropdownForVerb('image');
    let dropItems = Array.from(document.querySelectorAll('.drop-item'));
    expect(dropItems.length).to.be.greaterThan(0);
    expect(dropItems.some((item) => imagePrompts.some((prompt) => item.getAttribute('aria-label').includes(prompt)))).to.be.true;

    // Change verb to 'video'
    await unityWidget.updateDropdownForVerb('video');
    dropItems = Array.from(document.querySelectorAll('.drop-item'));
    expect(dropItems.length).to.be.greaterThan(0);
    expect(dropItems.some((item) => videoPrompts.some((prompt) => item.getAttribute('aria-label').includes(prompt)))).to.be.true;

    // Change back to 'image'
    await unityWidget.updateDropdownForVerb('image');
    dropItems = Array.from(document.querySelectorAll('.drop-item'));
    expect(dropItems.length).to.be.greaterThan(0);
    expect(dropItems.some((item) => imagePrompts.some((prompt) => item.getAttribute('aria-label').includes(prompt)))).to.be.true;
  });
});
