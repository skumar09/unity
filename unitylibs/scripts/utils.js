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

export function decorateArea(area = document) {
  const eagerLoad = (parent, selector) => {
    const img = parent.querySelector(selector);
    img?.removeAttribute('loading');
  };

  (async function loadLCPImage() {
    const marquee = document.querySelector('.marquee');
    if (!marquee) {
      eagerLoad(document, 'img');
      return;
    }
  
    // First image of first row
    eagerLoad(marquee, 'div:first-child img');
    // Last image of last column of last row
    eagerLoad(marquee, 'div:last-child > div:last-child img');
  }());
}

export async function useMiloSample() {
  const { createTag } = await import(`${getLibs()}/utils/utils.js`);
}

export const unityConfig = {
}

export const [setUnityLibs, getUnityLibs] = (() => {
  let libs;
  return [
    (prodLibs, project = 'unity') => {
      const { hostname, origin} = window.location;
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
