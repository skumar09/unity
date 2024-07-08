export const unityConfig = {
}

export const [setLibs, getLibs] = (() => {
  let libs;
  return [
    (prodLibs, force = false) => {
      if (force) {
        libs = prodLibs;
        return libs;
      }
      const { hostname } = window.location;
      if (!hostname.includes('hlx.page')
        && !hostname.includes('hlx.live')
        && !hostname.includes('localhost')) {
        libs = prodLibs;
        return libs;
      }
      const branch = new URLSearchParams(window.location.search).get('unitylibs') || 'main';
      if (branch.indexOf('--') > -1) { libs = `https://${branch}.hlx.live/unitylibs`; return libs; }
      libs = `https://${branch}--unity--adobecom.hlx.live/libs`;
      return libs;
    }, () => libs,
  ];
})();

export default async function init(el) {
  const unitylibs = setLibs('/unitylibs');
  const { default: init } = await import(`${unitylibs}/unitylibs/core/workflow/workflow.js`);
  init(el);
}
