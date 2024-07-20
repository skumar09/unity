import { createTag, loadStyle, getUnityLibs, setUnityConfig, defineDeviceByScreenSize} from '../../scripts/utils.js';
import { createErrorToast } from '../steps/upload-btn.js';
import createProgressCircle from '../features/progress-circle.js';

export function getImgSrc(pic) {
  const viewport = defineDeviceByScreenSize();
  let source = '';
  if (viewport === 'MOBILE') source = pic.querySelector('source[type="image/webp"]:not([media])');
  else source = pic.querySelector('source[type="image/webp"][media]');
  return source.srcset;
}

function checkRenderStatus(targetBlock, res, rej, etime, rtime) {
  if (etime > 20000) { rej(); return; }
  if (targetBlock.querySelector('.text') && targetBlock.querySelector('.asset, .image')) res();
  else setTimeout(() => checkRenderStatus(targetBlock, res, rej, etime + rtime), rtime);
}

function intEnbReendered(targetBlock) {
  return new Promise((res, rej) => {
    try {
      checkRenderStatus(targetBlock, res, rej, 0, 100);
    } catch (err) { rej(); }
  });
}

function createInteractiveArea(el, pic) {
  const iArea = createTag('div', { class: 'interactive-area' });
  const iWidget = createTag('div', { class: 'unity-widget' });
  const unityaa = createTag('div', { class: 'unity-action-area' });
  const unityoa = createTag('div', { class: 'unity-option-area' });
  iWidget.append(unityoa, unityaa);
  pic.querySelector('img').src = getImgSrc(pic);
  [...pic.querySelectorAll('source')].forEach((s) => s.remove());
  const newPic = pic.cloneNode(true);
  const p = createTag('p', {}, newPic);
  el.querySelector(':scope > div > div').prepend(p);
  iArea.append(pic, iWidget);
  if (el.classList.contains('light')) iArea.classList.add('light');
  else iArea.classList.add('dark');
  return [iArea, iWidget];
}

async function getTargetArea(el) {
  const metadataSec = el.closest('.section');
  const intEnb = metadataSec.querySelector('.marquee, .aside');
  try {
    intEnb.classList.add('unity-enabled');
    await intEnbReendered(intEnb);
  } catch (err) { return null; }
  const asset = intEnb.querySelector('.asset picture, .image picture');
  const container = asset.closest('p');
  const [iArea, iWidget] = createInteractiveArea(el, asset);
  const assetArea = intEnb.querySelector('.asset, .image');
  if (container) container.replaceWith(iArea);
  else assetArea.append(iArea);
  return [iArea, iWidget];
}

function getEnabledFeatures(unityEl, wfDetail) {
  const enabledFeatures = [];
  const supportedFeatures = Object.keys(wfDetail);
  const configuredFeatures = unityEl.querySelectorAll(':scope ul > li > span.icon');
  configuredFeatures.forEach((cf) => {
    const cfName = [...cf.classList].find((cn) => cn.match('icon-'));
    if (!cfName) return;
    const fn = cfName.split('-')[1];
    const isEnabled = supportedFeatures.indexOf(fn);
    if (isEnabled > -1) {
      enabledFeatures.push(fn);
      wfDetail[fn].authorCfg = cf.closest('li');
    }
  });
  return enabledFeatures;
}

function getWorkFlowInformation(el) {
  let wfName = '';
  const workflowCfg = {
    'workflow-photoshop': {
      removebg: { endpoint: 'providers/PhotoshopRemoveBackground' },
      changebg: { endpoint: 'providers/PhotoshopChangeBackground' },
      slider: {},
    },
  };
  [...el.classList].forEach((cn) => { if (cn.match('workflow-')) wfName = cn; });
  if (!wfName || !workflowCfg[wfName]) return [];
  return [wfName, workflowCfg[wfName]];
}

async function initWorkflow(cfg) {
  loadStyle(`${getUnityLibs()}/core/workflow/${cfg.wfName}/${cfg.wfName}.css`);
  const { default: initUnity } = await import(`./${cfg.wfName}/${cfg.wfName}.js`);
  const errorToast = createErrorToast();
  const progressCircle = createProgressCircle();
  cfg.targetEl.append(errorToast, progressCircle);
  cfg.targetEl.append(progressCircle);
  initUnity(cfg);
}

export default async function init(el) {
  loadStyle(`${getUnityLibs()}/core/styles/styles.css`);
  const [targetBlock, unityWidget] = await getTargetArea(el);
  if (!targetBlock) return;
  const [wfName, wfDetail] = getWorkFlowInformation(el);
  if (!wfName || !wfDetail) return;
  const enabledFeatures = getEnabledFeatures(el, wfDetail);
  if (!enabledFeatures) return;
  const wfConfig = {
    unityEl: el,
    targetEl: targetBlock,
    unityWidget,
    wfName,
    wfDetail,
    enabledFeatures,
  };
  setUnityConfig(wfConfig);
  await initWorkflow(wfConfig);
}
