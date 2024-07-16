import { createTag, loadStyle, getUnityLibs } from '../../scripts/utils.js';

export function defineDeviceByScreenSize() {
  const DESKTOP_SIZE = 1200;
  const MOBILE_SIZE = 600;
  const screenWidth = window.innerWidth;
  if (screenWidth >= DESKTOP_SIZE) return 'DESKTOP';
  if (screenWidth <= MOBILE_SIZE) return 'MOBILE';
  return 'TABLET';
}

export function getImgSrc(pic) {
  const viewport = defineDeviceByScreenSize() === 'MOBILE' ? 'mobile' : 'desktop';
  let source = '';
  if (viewport === 'mobile') source = pic.querySelector('source[type="image/webp"]:not([media])');
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
  const newPic = pic.cloneNode(true);
  const p = createTag('p', {}, newPic);
  el.querySelector(':scope > div > div').prepend(p);
  pic.querySelector('img').src = getImgSrc(pic);
  iArea.append(pic, iWidget);
  if (el.classList.contains('light')) iArea.classList.add('light');
  else iArea.classList.add('dark');
  return iArea;
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
  const iArea = createInteractiveArea(el, asset);
  const assetArea = intEnb.querySelector('.asset, .image');
  if (container) container.replaceWith(iArea);
  else assetArea.append(iArea);
  return iArea;
}

function getWorkFlowInformation(el) {
  let wfName = '';
  const workflowCfg = {
    'workflow-photoshop': {
      featureList: ['removebg', 'changebg', 'huesat'],
      featureCode: 'psworkflow',
    },
  };
  [...el.classList].forEach((cn) => { if (cn.match('workflow-')) wfName = cn; });
  if (!wfName) return [];
  return [wfName, workflowCfg[wfName].featureList, workflowCfg[wfName].featureCode];
}

async function initWorkflow(cfg) {
  loadStyle(`${getUnityLibs()}/core/workflow/${cfg.featureCode}/${cfg.featureCode}.css`);
  const { default: initUnity } = await import(`./${cfg.featureCode}/${cfg.featureCode}.js`);
  initUnity(cfg);
}

export default async function init(el) {
  loadStyle(`${getUnityLibs()}/core/styles/styles.css`);
  const targetBlock = await getTargetArea(el);
  if (!targetBlock) return;
  const [wfName, featureList, featureCode] = getWorkFlowInformation(el);
  if (!wfName || !featureList) return;
  const workflowConfig = {
    unityEl: el,
    targetEl: targetBlock,
    wfName,
    supportedFeatures: featureList,
    featureCode,
  };
  await initWorkflow(workflowConfig);
  el.innerHTML += 'Loaded the unity block!!<br>'; // to remove
}
