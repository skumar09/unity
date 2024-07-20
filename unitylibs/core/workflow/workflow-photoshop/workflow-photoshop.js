import { createTag, getGuestAccessToken, getUnityConfig } from '../../../scripts/utils.js';
import { uploadAsset } from '../../steps/upload-step.js';
import { initAppConnector, loadImg } from '../../steps/app-connector.js';
import createUpload from '../../steps/upload-btn.js';

function toggleDisplay(domEl) {
  if (domEl.classList.contains('show')) domEl.classList.remove('show');
  else domEl.classList.add('show');
}

async function loadSvg(img) {
  const res = await fetch(img.src);
  if (!res.status === 200) return null;
  const svg = await res.text();
  return svg;
}

async function createActionBtn(btnCfg, btnClass) {
  const txt = btnCfg.innerText;
  const img = btnCfg.querySelector('img[src*=".svg"]');
  const actionBtn = createTag('a', { class: `unity-action-btn ps-action-btn ${btnClass} show` });
  if (img) {
    const btnImg = await loadSvg(img);
    const actionSvg = createTag('div', { class: 'btn-icon' }, btnImg);
    actionBtn.append(actionSvg);
  }
  if (txt) {
    const actionText = createTag('div', { class: 'btn-text' }, txt.split('\n')[0].trim());
    actionBtn.append(actionText);
  }
  return actionBtn;
}

async function resetActiveState() {
  const unityCfg = getUnityConfig();
  const { unityEl, targetEl, unityWidget } = unityCfg;
  unityCfg.presentState.activeIdx = -1;
  const initImg = unityEl.querySelector(':scope picture img');
  const img = targetEl.querySelector(':scope > picture img');
  img.src = initImg.src;
  await changeVisibleFeature();
  await loadImg(img);
  img.style.filter = '';
}

async function switchProdIcon(forceRefresh = false) {
  const unityCfg = getUnityConfig();
  const { unityWidget, refreshEnabled, targetEl } = unityCfg;
  const iconHolder = unityWidget.querySelector('.widget-product-icon');
  if (!(refreshEnabled)) return;
  if (forceRefresh) {
    await resetActiveState();
    iconHolder?.classList.add('show');
    unityWidget.querySelector('.widget-refresh-button').classList.remove('show');
    targetEl.querySelector(':scope > .widget-refresh-button').classList.remove('show');
    return;
  }
  iconHolder?.classList.remove('show');
  unityWidget.querySelector('.widget-refresh-button').classList.add('show');
  targetEl.querySelector(':scope > .widget-refresh-button').classList.add('show');
}

async function addProductIcon() {
  const unityCfg = getUnityConfig();
  const { unityEl, unityWidget, targetEl, refreshWidgetEvent } = unityCfg;
  unityCfg.refreshEnabled = false;
  const refreshCfg = unityEl.querySelector('.icon-product-icon');
  if (!refreshCfg) return;
  const [prodIcon, refreshIcon] = refreshCfg.closest('li').querySelectorAll('img[src*=".svg"]');
  const iconHolder = createTag('div', { class: 'widget-product-icon show' }, prodIcon);
  const refreshHolder = createTag('div', { class: 'widget-refresh-button' }, refreshIcon);
  await loadImg(prodIcon);
  unityWidget.querySelector('.unity-action-area').append(iconHolder);
  if (!refreshIcon) return;
  unityCfg.refreshEnabled = true;
  const mobileRefreshHolder = refreshHolder.cloneNode(true);
  [refreshHolder, mobileRefreshHolder].forEach((el) => {
    el.addEventListener('click', () => {
      unityEl.dispatchEvent(new CustomEvent(refreshWidgetEvent));
    });
  });
  unityWidget.querySelector('.unity-action-area').append(refreshHolder);
  targetEl.append(mobileRefreshHolder);
  await loadImg(refreshIcon);
}

function resetWorkflowState() {
  const unityCfg = getUnityConfig();
  unityCfg.presentState = {
    activeIdx: -1,
    removeBgState: {
      assetId: null,
      assetUrl: null,
    },
    changeBgState: {},
    adjustments: {},
  };
}

async function removeBgHandler(changeDisplay = true) {
  const unityCfg = getUnityConfig();
  const { apiEndPoint, targetEl } = unityCfg;
  const { unityEl, interactiveSwitchEvent } = unityCfg;
  const { endpoint } = unityCfg.wfDetail.removebg;
  const img = targetEl.querySelector('picture img');
  const { srcUrl, assetUrl } = unityCfg.presentState.removeBgState;
  const urlIsValid = assetUrl ? await fetch(assetUrl) : null;
  if (unityCfg.presentState.removeBgState.assetId && urlIsValid?.status === 200) {
    if (changeDisplay) {
      img.src = unityCfg.presentState.removeBgState.assetUrl;
      await loadImg(img);
      unityEl.dispatchEvent(new CustomEvent(interactiveSwitchEvent));
    }
    return false;
  }
  const { origin, pathname } = new URL(img.src);
  const imgUrl = srcUrl || (img.src.startsWith('blob:') ? img.src : `${origin}${pathname}`);
  unityCfg.presentState.removeBgState.srcUrl = imgUrl;
  const id = await uploadAsset(apiEndPoint, imgUrl);
  const removeBgOptions = {
    method: 'POST',
    headers: {
      Authorization: getGuestAccessToken(),
      'Content-Type': 'application/json',
      'x-api-key': 'leo',
    },
    body: `{"surfaceId":"Unity","assets":[{"id": "${id}"}]}`,
  };
  const response = await fetch(`${apiEndPoint}/${endpoint}`, removeBgOptions);
  if (response.status !== 200) return true;
  const { outputUrl } = await response.json();
  const opId = new URL(outputUrl).pathname.split('/').pop();
  unityCfg.presentState.removeBgState.assetId = opId;
  unityCfg.presentState.removeBgState.assetUrl = outputUrl;
  if (!changeDisplay) return true;
  img.src = outputUrl;
  await loadImg(img);
  unityEl.dispatchEvent(new CustomEvent(interactiveSwitchEvent));
  return true;
}

async function removebg(featureName) {
  const { wfDetail, unityWidget, unityEl, progressCircleEvent } = getUnityConfig();
  const removebgBtn = unityWidget.querySelector('.ps-action-btn.removebg-button');
  if (removebgBtn) return removebgBtn;
  const btn = await createActionBtn(wfDetail[featureName].authorCfg, 'removebg-button');
  btn.addEventListener('click', async () => {
    try {
      unityEl.dispatchEvent(new CustomEvent(progressCircleEvent));
      await removeBgHandler();
    } catch (e) {
      // error
    } finally {
      unityEl.dispatchEvent(new CustomEvent(progressCircleEvent));
    }
  });
  return btn;
}

async function changeBgHandler(selectedUrl = null, refreshState = true) {
  const unityCfg = getUnityConfig();
  if (refreshState) resetWorkflowState();
  const { apiEndPoint, targetEl, unityWidget, unityEl, interactiveSwitchEvent } = unityCfg;
  const { endpoint } = unityCfg.wfDetail.changebg;
  const unityRetriggered = await removeBgHandler(false);
  const img = targetEl.querySelector('picture img');
  const fgId = unityCfg.presentState.removeBgState.assetId;
  const bgImg = selectedUrl || unityWidget.querySelector('.unity-option-area .changebg-options-tray img').dataset.backgroundImg;
  const { origin, pathname } = new URL(bgImg);
  const bgImgUrl = `${origin}${pathname}`;
  if (!unityRetriggered && unityCfg.presentState.changeBgState[bgImgUrl]?.assetId) {
    img.src = unityCfg.presentState.changeBgState[bgImgUrl].assetUrl;
    await loadImg(img);
    unityEl.dispatchEvent(new CustomEvent(interactiveSwitchEvent));
    return;
  }
  const bgId = await uploadAsset(apiEndPoint, bgImgUrl);
  const changeBgOptions = {
    method: 'POST',
    headers: {
      Authorization: getGuestAccessToken(),
      'Content-Type': 'application/json',
      'x-api-key': 'leo',
    },
    body: `{
            "assets": [{ "id": "${fgId}" },{ "id": "${bgId}" }],
            "metadata": {
              "foregroundImageId": "${fgId}",
              "backgroundImageId": "${bgId}"
            }
          }`,
  };
  const response = await fetch(`${apiEndPoint}/${endpoint}`, changeBgOptions);
  if (response.status !== 200) return;
  const { outputUrl } = await response.json();
  const changeBgId = new URL(outputUrl).pathname.split('/').pop();
  unityCfg.presentState.changeBgState[bgImgUrl] = {};
  unityCfg.presentState.changeBgState[bgImgUrl].assetId = changeBgId;
  unityCfg.presentState.changeBgState[bgImgUrl].assetUrl = outputUrl;
  img.src = outputUrl;
  await loadImg(img);
  unityEl.dispatchEvent(new CustomEvent(interactiveSwitchEvent));
}

async function changebg(featureName) {
  const { unityEl, unityWidget, wfDetail, progressCircleEvent } = getUnityConfig();
  const { authorCfg } = wfDetail[featureName];
  const changebgBtn = unityWidget.querySelector('.ps-action-btn.changebg-button');
  if (changebgBtn) return changebgBtn;
  const btn = await createActionBtn(authorCfg, 'changebg-button subnav-active');
  btn.dataset.optionsTray = 'changebg-options-tray';
  const bgSelectorTray = createTag('div', { class: 'changebg-options-tray show' });
  const bgOptions = authorCfg.querySelectorAll(':scope ul li');
  [...bgOptions].forEach((o) => {
    let [thumbnail, bgImg] = o.querySelectorAll('img');
    if (!bgImg) bgImg = thumbnail;
    thumbnail.dataset.backgroundImg = bgImg.src;
    const a = createTag('a', { class: 'changebg-option' }, thumbnail);
    bgSelectorTray.append(a);
    a.addEventListener('click', async () => {
      try {
        unityEl.dispatchEvent(new CustomEvent(progressCircleEvent));
        await changeBgHandler(bgImg.src, false);
      } catch (e) {
        // error
      } finally {
        unityEl.dispatchEvent(new CustomEvent(progressCircleEvent));
      }
    });
  });
  unityWidget.querySelector('.unity-option-area').append(bgSelectorTray);
  btn.addEventListener('click', () => {
    if (btn.classList.contains('subnav-active')) btn.classList.remove('subnav-active');
    else btn.classList.add('subnav-active');
    toggleDisplay(unityWidget.querySelector('.unity-option-area .changebg-options-tray'));
  });
  return btn;
}

function createSlider(tray, propertyName, label, cssFilter, minVal, maxVal) {
  const cfg = getUnityConfig();
  const { targetEl } = cfg;
  const actionDiv = createTag('div', { class: 'adjustment-option' });
  const actionLabel = createTag('label', { class: 'adjustment-label' }, label);
  const actionSliderDiv = createTag('div', { class: `adjustment-container ${propertyName}` });
  const actionSliderInput = createTag('input', {
    type: 'range',
    min: minVal,
    max: maxVal,
    value: (minVal + maxVal) / 2,
    class: `adjustment-slider ${propertyName}`,
  });
  const actionAnalytics = createTag('div', { class: 'analytics-content' }, `Unity ${label}`);
  const actionSliderCircle = createTag('a', { href: '#', class: `adjustment-circle ${propertyName}` }, actionAnalytics);
  actionSliderDiv.append(actionSliderInput, actionSliderCircle);
  actionDiv.append(actionLabel, actionSliderDiv);
  actionSliderInput.addEventListener('input', () => {
    const { value } = actionSliderInput;
    const centerOffset = (value - minVal) / (maxVal - minVal);
    const moveCircle = 3 + (centerOffset * 94);
    actionSliderCircle.style.left = `${moveCircle}%`;
    const img = targetEl.querySelector(':scope > picture img');
    const filterValue = cssFilter.replace('inputValue', value);
    cfg.presentState.adjustments[propertyName] = { value, filterValue };
    const imgFilters = Object.keys(cfg.presentState.adjustments);
    img.style.filter = '';
    imgFilters.forEach((f) => {
      img.style.filter += `${cfg.presentState.adjustments[f].filterValue} `;
    });
  });
  tray.append(actionDiv);
}

async function changeAdjustments(featureName) {
  const { unityEl, unityWidget, wfDetail, progressCircleEvent } = getUnityConfig();
  const { authorCfg } = wfDetail[featureName];
  const adjustmentBtn = unityWidget.querySelector('.ps-action-btn.adjustment-button');
  if (adjustmentBtn) return adjustmentBtn;
  const btn = await createActionBtn(authorCfg, 'adjustment-button subnav-active');
  btn.dataset.optionsTray = 'adjustment-options-tray';
  const sliderTray = createTag('div', { class: 'adjustment-options-tray show' });
  const sliderOptions = authorCfg.querySelectorAll(':scope > ul li');
  [...sliderOptions].forEach((o) => {
    let actionName = null;
    const psAction = o.querySelector(':scope > .icon');
    [...psAction.classList].forEach((cn) => { if (cn.match('icon-')) actionName = cn; });
    actionName = actionName.split('-')[1];
    switch (actionName) {
      case 'hue':
        createSlider(sliderTray, 'hue', o.innerText, 'hue-rotate(inputValuedeg)', -180, 180);
        break;
      case 'saturation':
        createSlider(sliderTray, 'saturation', o.innerText, 'saturate(inputValue%)', 0, 300);
        break;
      default:
        break;
    }
  });
  unityWidget.querySelector('.unity-option-area').append(sliderTray);
  btn.addEventListener('click', () => {
    if (btn.classList.contains('subnav-active')) btn.classList.remove('subnav-active');
    else btn.classList.add('subnav-active');
    toggleDisplay(unityWidget.querySelector('.unity-option-area .adjustment-options-tray'));
  });
  return btn;
}

function showFeatureButton(prevBtn, currBtn) {
  const cfg = getUnityConfig();
  const { unityWidget } = cfg;
  if (!prevBtn) {
    unityWidget.querySelector('.unity-action-area').append(currBtn);
  } else {
    prevBtn.insertAdjacentElement('afterend', currBtn);
    const prevOptionTray = prevBtn?.dataset.optionsTray;
    unityWidget.querySelector(`.unity-option-area .${prevOptionTray}`)?.classList.remove('show');
    prevBtn.classList.remove('show');
  }
  const currOptionTray = currBtn.dataset.optionsTray;
  unityWidget.querySelector(`.unity-option-area .${currOptionTray}`)?.classList.add('show');
  currBtn.classList.add('show');
}

async function changeVisibleFeature() {
  const cfg = getUnityConfig();
  const { unityWidget, enabledFeatures } = cfg;
  if (cfg.presentState.activeIdx + 1 === enabledFeatures.length) return;
  cfg.presentState.activeIdx += 1;
  const featureName = enabledFeatures[cfg.presentState.activeIdx];
  let actionBtn = null;
  switch (featureName) {
    case 'removebg':
      actionBtn = await removebg(featureName);
      break;
    case 'changebg':
      actionBtn = await changebg(featureName);
      break;
    case 'slider':
      actionBtn = await changeAdjustments(featureName);
      break;
    default:
      break;
  }
  const prevActionBtn = unityWidget.querySelector('.ps-action-btn.show');
  if (prevActionBtn === actionBtn) return;
  showFeatureButton(prevActionBtn, actionBtn);
}

function uploadCallback() {
  const cfg = getUnityConfig();
  const { enabledFeatures } = cfg;
  if (enabledFeatures.length === 1) return null;
  return removeBgHandler;
}

export default async function initUnity() {
  const cfg = getUnityConfig();
  const { unityEl, unityWidget, interactiveSwitchEvent, refreshWidgetEvent } = cfg;
  resetWorkflowState();
  await addProductIcon();
  await changeVisibleFeature();
  const img = cfg.targetEl.querySelector('picture img');
  const uploadBtn = await createUpload(img, uploadCallback());
  unityWidget.querySelector('.unity-action-area').append(uploadBtn);
  await initAppConnector('photoshop');
  unityEl.addEventListener(interactiveSwitchEvent, async () => {
    await changeVisibleFeature();
    await switchProdIcon();
  });
  unityEl.addEventListener(refreshWidgetEvent, async () => {
    await switchProdIcon(true);
  });
}
