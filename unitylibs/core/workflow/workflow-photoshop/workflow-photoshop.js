import { createTag } from '../../../scripts/utils.js';
import { uploadAsset } from '../../steps/upload-step.js';

function loadImg(img) {
  return new Promise((res) => {
    img.loading = 'eager';
    img.fetchpriority = 'high';
    if (img.complete) res();
    else {
      img.onload = () => res();
      img.onerror = () => res();
    }
  });
}

async function resetActiveState(unityCfg) {
  const { unityEl, unityWidget, targetEl } = unityCfg;
  const iconHolder = unityWidget.querySelector('.product-refresh-holder');
  iconHolder.classList.add('show-product');
  iconHolder.classList.remove('show-refresh');
  unityCfg.presentState.activeIdx = -1;
  changeVisibleFeature(unityCfg);
  const initImg = unityEl.querySelector(':scope picture img');
  const img = targetEl.querySelector('picture img');
  img.src = initImg.src;
  await loadImg(img);
}

async function switchProdIcon(unityCfg, refresh = false) {
  const { unityWidget } = unityCfg;
  const iconHolder = unityWidget.querySelector('.product-refresh-holder');
  if (refresh) {
    await resetActiveState(unityCfg);
    return;
  }
  iconHolder.classList.add('show-refresh');
  iconHolder.classList.remove('show-product');
}

function addProductIcon(unityCfg) {
  const { unityEl, unityWidget } = unityCfg;
  unityCfg.refreshEnabled = false;
  const refreshCfg = unityEl.querySelector('.icon-product-icon');
  if (!refreshCfg) return;
  const [prodIcon, refreshIcon] = refreshCfg.closest('li').querySelectorAll('img[src*=".svg"]');
  const iconHolder = createTag('div', { class: 'product-refresh-holder show-product' }, prodIcon);
  if (refreshIcon) {
    iconHolder.append(refreshIcon);
    unityCfg.refreshEnabled = true;
    refreshIcon.addEventListener('click', async () => {
      await switchProdIcon(unityCfg, true);
    });
  }
  unityWidget.querySelector('.unity-action-area').append(iconHolder);
}

function resetWorkflowState(unityCfg) {
  unityCfg.presentState = {
    activeIdx: -1,
    removeBgState: {
      assetId: null,
      assetUrl: null,
    },
    changeBgState: {},
    hueState: {},
    satState: {},
  };
}

async function removeBgHandler(unityCfg, changeDisplay = true) {
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
  const imgUrl = !srcUrl ? `${origin}${pathname}` : srcUrl;
  unityCfg.presentState.removeBgState.srcUrl = imgUrl;
  const id = await uploadAsset(apiEndPoint, imgUrl);
  const removeBgOptions = {
    method: 'POST',
    headers: {
      Authorization: window.bearerToken,
      'Content-Type': 'application/json',
      'x-api-key': 'leo',
    },
    body: `{"surfaceId":"Unity","assets":[{"id": "${id}"}]}`,
  };
  const response = await fetch(`${apiEndPoint}/${endpoint}`, removeBgOptions);
  if (response.status !== 200) return;
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

function removebg(featureName, unityCfg) {
  const { unityWidget } = unityCfg;
  const featureBtn = unityWidget.querySelector('.unity-button');
  const a = createTag('a', { class: 'unity-button removebg-button' }, 'Remove BG');
  if (!featureBtn) unityWidget.append(a);
  else featureBtn.replaceWith(a);
  a.addEventListener('click', async () => {
    await removeBgHandler(unityCfg);
  });
}

async function changeBgHandler(unityCfg, refreshState = true) {
  if (refreshState) resetWorkflowState(unityCfg);
  const { apiEndPoint, targetEl } = unityCfg;
  const { unityEl, interactiveSwitchEvent } = unityCfg;
  const { authorCfg, endpoint } = unityCfg.wfDetail.changebg;
  const unityRetriggered = await removeBgHandler(unityCfg, false);
  const img = targetEl.querySelector('picture img');
  const fgId = unityCfg.presentState.removeBgState.assetId;
  const bgImg = authorCfg.querySelector(':scope > ul li img');
  const { origin, pathname } = new URL(bgImg.src);
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
      Authorization: window.bearerToken,
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

function changebg(featureName, unityCfg) {
  const { unityWidget } = unityCfg;
  const featureBtn = unityWidget.querySelector('.unity-button');
  const a = createTag('a', { class: 'unity-button changebg-button' }, 'Change BG');
  if (!featureBtn) unityWidget.append(a);
  else featureBtn.replaceWith(a);
  a.addEventListener('click', async () => {
    await changeBgHandler(unityCfg, false);
  });
}

function changeHueSat(featureName, unityCfg) {
  const { unityWidget, targetEl } = unityCfg;
  const featureBtn = unityWidget.querySelector('.unity-button');
  const a = createTag('a', { class: 'unity-button changebg-button' }, 'Change BG');
  if (!featureBtn) unityWidget.append(a);
  else featureBtn.replaceWith(a);
  a.addEventListener('click', async () => {
    await changeBgHandler(unityCfg);
  });
}

function changeVisibleFeature(cfg) {
  const { enabledFeatures } = cfg;
  if (cfg.presentState.activeIdx + 1 === enabledFeatures.length) return;
  cfg.presentState.activeIdx += 1;
  const featureName = enabledFeatures[cfg.presentState.activeIdx];
  switch (featureName) {
    case 'changebg':
      changebg(featureName, cfg);
      break;
    case 'removebg':
      removebg(featureName, cfg);
      break;
    case 'huesat':
      changeHueSat(featureName, cfg);
      break;
    default:
      break;
  }
}

export default async function initUnity(cfg) {
  cfg.interactiveSwitchEvent = 'unity:ps-interactive-switch';
  resetWorkflowState(cfg);
  addProductIcon(cfg);
  changeVisibleFeature(cfg);
  cfg.unityEl.addEventListener(cfg.interactiveSwitchEvent, () => {
    changeVisibleFeature(cfg);
    if (cfg.refreshEnabled) switchProdIcon(cfg);
  });
}
