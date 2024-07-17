import { createTag } from '../../../scripts/utils.js';
import { getImageBlobData, uploadAsset } from '../../steps/upload-step.js';

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

function resetWorkflowState(unityCfg) {
  unityCfg.presentState = {
    activeIdx: -1,
    removeBgState: {
      assetId: null,
      assetUrl: null,
    },
    changeBgState: {},
  };
}

async function removeBgHandler(unityCfg, refreshState = true, changeDisplay = true) {
  if (refreshState) resetWorkflowState(unityCfg);
  const { presentState, enabledFeatures, apiEndPoint, targetEl } = unityCfg;
  const { unityEl, interactiveSwitchEvent } = unityCfg;
  const featureName = enabledFeatures[presentState.activeIdx];
  const { endpoint } = unityCfg.wfDetail[featureName];
  const img = targetEl.querySelector('picture img');
  const { origin, pathname } = new URL(img.src);
  const imgUrl = `${origin}${pathname}`;
  if (unityCfg.presentState.removeBgState.assetId) {
    img.src = unityCfg.presentState.removeBgState.assetUrl;
    await loadImg(img);
    if (changeDisplay) unityEl.dispatchEvent(new CustomEvent(interactiveSwitchEvent));
    return unityCfg.presentState.removeBgState.assetId;
  }
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
  if (!changeDisplay) return;
  img.src = outputUrl;
  await loadImg(img);
  unityEl.dispatchEvent(new CustomEvent(interactiveSwitchEvent));
}

function removebg(featureName, unityCfg) {
  const { unityWidget, targetEl } = unityCfg;
  const featureBtn = unityWidget.querySelector('.unity-button');
  const a = createTag('a', { class: 'unity-button removebg-button' }, 'Remove BG');
  if (!featureBtn) unityWidget.append(a);
  else featureBtn.replaceWith(a);
  a.addEventListener('click', async () => {
    await removeBgHandler(unityCfg, false);
  });
}

async function changeBgHandler(unityCfg) {
  const { enabledFeatures, apiEndPoint, targetEl } = unityCfg;
  const { unityEl, interactiveSwitchEvent, presentState } = unityCfg;
  const featureName = enabledFeatures[presentState.activeIdx];
  const { authorCfg, endpoint } = unityCfg.wfDetail[featureName];
  if (!unityCfg.presentState.removeBgState.assetId) {
    removeBgHandler(unityCfg, false, false);
  }
  const img = targetEl.querySelector('picture img');
  const fgId = unityCfg.presentState.removeBgState.assetId;
  const bgImg = authorCfg.querySelector(':scope > ul li img');
  const { origin, pathname } = new URL(bgImg.src);
  const bgImgUrl = `${origin}${pathname}`;
  if (unityCfg.presentState.changeBgState[bgImgUrl]) {
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
  cfg.presentState.activeIdx = (cfg.presentState.activeIdx + 1) % enabledFeatures.length;
  const featureName = enabledFeatures[cfg.presentState.activeIdx];
  switch (featureName) {
    case 'removebg':
      removebg(featureName, cfg);
      break;
    case 'changebg':
      changebg(featureName, cfg);
      break;
    default:
      break;
  }
}

export default async function initUnity(cfg) {
  cfg.interactiveSwitchEvent = 'unity:ps-interactive-switch';
  resetWorkflowState(cfg);
  changeVisibleFeature(cfg);
  cfg.unityEl.addEventListener(cfg.interactiveSwitchEvent, () => {
    changeVisibleFeature(cfg);
  });
}
