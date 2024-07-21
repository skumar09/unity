export const [setLibs, getLibs] = (() => {
  let libs;
  return [
    (prodLibs, location) => {
      libs = (() => {
        const { hostname, search } = location || window.location;
        if (!(hostname.includes('.hlx.') || hostname.includes('local'))) return prodLibs;
        const branch = new URLSearchParams(search).get('milolibs') || 'main';
        if (branch === 'local') return 'http://localhost:6456/libs';
        return branch.includes('--') ? `https://${branch}.hlx.live/libs` : `https://${branch}--milo--adobecom.hlx.live/libs`;
      })();
      return libs;
    }, () => libs,
  ];
})();

export const [setUnityLibs, getUnityLibs] = (() => {
  let libs;
  return [
    (prodLibs, project = 'unity') => {
      const { hostname, origin } = window.location;
      if (!hostname.includes('hlx.page')
        && !hostname.includes('hlx.live')
        && !hostname.includes('localhost')) {
        libs = prodLibs;
        return libs;
      }
      if (project === 'unity') { libs = `${origin}/unitylibs`; return libs; }
      const branch = new URLSearchParams(window.location.search).get('unitylibs') || 'main';
      if (branch.indexOf('--') > -1) { libs = `https://${branch}.hlx.live/unitylibs`; return libs; }
      libs = `https://${branch}--unity--adobecom.hlx.live/unitylibs`;
      return libs;
    }, () => libs,
  ];
})();

export const [setUnityConfig, getUnityConfig] = (() => {
  let unityConfig = {};
  return [
    (cfg) => {
      unityConfig = {
        apiEndPoint: 'https://assistant-int.adobe.io/api/v1',
        apiKey: 'leo',
        progressCircleEvent: 'unity:progress-circle',
        refreshWidgetEvent: 'unity:refresh-widget',
        interactiveSwitchEvent: 'unity:interactive-switch',
        ...cfg,
      };
    },
    () => unityConfig,
  ];
})();

export function decorateArea(area = document) {}

const miloLibs = setLibs('/libs');
setUnityLibs('/unitylibs');

const { createTag, getConfig, loadStyle } = await import(`${miloLibs}/utils/utils.js`);
export { createTag, loadStyle, getConfig };
const { decorateDefaultLinkAnalytics } = await import(`${miloLibs}/martech/attributes.js`);
export { decorateDefaultLinkAnalytics };

export function getGuestAccessToken() {
  const { token } = window.adobeIMS.getAccessToken();
  return `Bearer ${token}`;
}

export function defineDeviceByScreenSize() {
  const DESKTOP_SIZE = 1200;
  const MOBILE_SIZE = 600;
  const screenWidth = window.innerWidth;
  if (screenWidth >= DESKTOP_SIZE) return 'DESKTOP';
  if (screenWidth <= MOBILE_SIZE) return 'MOBILE';
  return 'TABLET';
}

export async function loadSvg(img) {
  const res = await fetch(img.src);
  if (!res.status === 200) return null;
  const svg = await res.text();
  return svg;
}

export function loadImg(img) {
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

export async function createActionBtn(btnCfg, btnClass, iconAsImg = false, swapOrder = false) {
  const txt = btnCfg.innerText;
  const img = btnCfg.querySelector('img[src*=".svg"]');
  const actionBtn = createTag('a', { href: '#', class: `unity-action-btn ${btnClass}` });
  if (img) {
    let btnImg = null;
    if (iconAsImg) btnImg = img.cloneNode(true);
    else btnImg = await loadSvg(img);
    const btnIcon = createTag('div', { class: 'btn-icon' }, btnImg);
    actionBtn.append(btnIcon);
  }
  if (txt) {
    const btnTxt = createTag('div', { class: 'btn-text' }, txt.split('\n')[0].trim());
    if (swapOrder) actionBtn.prepend(btnTxt);
    else actionBtn.append(btnTxt);
  }
  return actionBtn;
}
