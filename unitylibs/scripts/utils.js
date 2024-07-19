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
