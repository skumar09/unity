import { createTag } from '../../../scripts/utils.js';

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

async function removeBgHandler(unityWidget, targetEl, featureCfg) {
  const { default: uploadAsset } = await import('../../steps/unity-uploader.js');
  const img = targetEl.querySelector('picture img');
  const { origin, pathname } = new URL(img.src);
  const imgUrl = `${origin}${pathname}`;
  const id = await uploadAsset(imgUrl);
  if (!id) return;
  const removeBgOptions = {
    method: 'POST',
    headers: {
      Authorization: window.bearerToken,
      'Content-Type': 'application/json',
      'x-api-key': 'leo',
    },
    body: `{"surfaceId":"Unity","assets":[{"id": "${id}"}]}`,
  };
  const response = await fetch('https://assistant-int.adobe.io/api/v1/providers/PhotoshopRemoveBackground', removeBgOptions);
  if (response.status !== 200) return;
  const { outputUrl } = await response.json();
  img.src = outputUrl;
  await loadImg(img);
}

function removebg(unityWidget, targetEl, featureCfg) {
  const a = createTag('a', {}, 'Remove BG');
  unityWidget.append(a);
  a.addEventListener('click', async () => {
    await removeBgHandler(unityWidget, targetEl, featureCfg);
  });
}

async function changeBgHandler(unityWidget, targetEl, featureCfg) {
  const { uploadAsset } = await import('../../steps/unity-uploader.js');
  const img = targetEl.querySelector('picture img').src;
  console.log(img);
}

function changebg(unityWidget, targetEl, featureCfg) {
  const a = createTag('a', { class: 'unity-widget-feature-button' }, 'Change BG');
  unityWidget.append(a);
  a.addEventListener('click', async () => {
    await changeBgHandler(unityWidget, targetEl, featureCfg);
  });
}

export default async function initUnity(cfg) {
  const { unityWidget, targetEl, enabledFeatures } = cfg;
  enabledFeatures.forEach((ef) => {
    const { featureName, featureCfg } = ef;
    switch (featureName) {
      case 'removebg':
        removebg(unityWidget, targetEl, featureCfg);
        break;
      case 'changebg':
        changebg(unityWidget, targetEl, featureCfg);
        break;
      default:
        break;
    }
  });
  cfg.unityEl.innerHTML += `Loaded the PS widget for ${enabledFeatures} !!<br>`; // to remove
}
