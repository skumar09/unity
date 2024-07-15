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

export default async function init(el) {
  const unitylibs = setUnityLibs('/unitylibs', 'unity');
  const { default: init } = await import(`${unitylibs}/core/workflow/workflow.js`);
  init(el);
}
