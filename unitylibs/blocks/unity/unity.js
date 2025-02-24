import { loadStyle } from '../../scripts/utils.js';

function getUnityLibs(prodLibs, project = 'unity') {
  const { hostname, origin } = window.location;
  if (project === 'unity') { return `${origin}/unitylibs`; }
  if (!hostname.includes('.hlx.')
    && !hostname.includes('.aem.')
    && !hostname.includes('localhost')) {
    return prodLibs;
  }
  const branch = new URLSearchParams(window.location.search).get('unitylibs') || 'main';
  const helixVersion = hostname.includes('.hlx.') ? 'hlx' : 'aem';
  return branch.indexOf('--') > -1 
  ? `https://${branch}.${helixVersion}.live/unitylibs` 
  : `https://${branch}--unity--adobecom.${helixVersion}.live/unitylibs`;
}

export default async function init(el) {
  const projectName = 'unity';
  const unitylibs = getUnityLibs('/unitylibs', projectName);
  const stylePromise = new Promise((resolve) => {
    loadStyle(`${unitylibs}/core/styles/styles.css`, resolve);
  });
  await stylePromise;
  const { default: wfinit } = await import(`${unitylibs}/core/workflow/workflow.js`);
  await wfinit(el, projectName, unitylibs, 'v2');
}
