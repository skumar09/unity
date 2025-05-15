function getUserAgent(userAgent) {
  return userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : '');
}

function isIPad(userAgent) {
  const ua = getUserAgent(userAgent);
  if (typeof navigator !== 'undefined') {
    if (navigator.userAgentData) {
      const platform = navigator.userAgentData.platform.toLowerCase();
      const isMobile = navigator.userAgentData.mobile;
      if (isMobile && platform === 'ios') {
        return true;
      }
    }
    if (navigator.maxTouchPoints > 2 && /Macintosh/.test(ua)) {
      return true;
    }
  }
  return /iPad/.test(ua);
}

function isWindowsTablet(userAgent) {
  const ua = getUserAgent(userAgent);
  if (typeof navigator !== 'undefined' && navigator.userAgentData) {
    const platform = navigator.userAgentData.platform.toLowerCase();
    const isMobile = navigator.userAgentData.mobile;
    if (isMobile && platform === 'windows') {
      return true;
    }
  }
  if (/Windows Phone|Windows Mobile/i.test(ua)) return true;
  if (/Windows NT/.test(ua) && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 2) {
    if (/Touch|Tablet|ARM|Windows.*Tablet PC/i.test(ua) && !/Laptop|Desktop/i.test(ua)) {
      return true;
    }
  }
  return false;
}

function hasTouch() {
  if (typeof window === 'undefined') return false;
  if (typeof navigator !== 'undefined') {
    if (navigator.maxTouchPoints !== undefined) {
      return navigator.maxTouchPoints > 0;
    }
    if (navigator.msMaxTouchPoints !== undefined) {
      return navigator.msMaxTouchPoints > 0;
    }
  }
  return 'ontouchstart' in window;
}

function hasMouse() {
  if (typeof window === 'undefined') return false;
  return 'onmouseover' in window;
}

function isHeadlessBrowser(ua) {
  return /HeadlessChrome/.test(ua);
}

function getPlatformInfo(userAgent) {
  const ua = getUserAgent(userAgent);
  if (typeof navigator !== 'undefined' && navigator.userAgentData) {
    return {
      platform: navigator.userAgentData.platform.toLowerCase(),
      isMobile: navigator.userAgentData.mobile,
    };
  }
  const uaLower = ua.toLowerCase();
  let platform = 'unknown';
  const mobileKeywords = [
    'mobi',
    'android',
    'iphone',
    'ipad',
    'ipod',
    'silk',
    'blackberry',
    'opera mini',
    'uc browser',
    'puffin',
    'tizen',
    'sailfish',
    'webos',
    'googlebot-mobile',
    'kaios',
    'fennec',
    'firefox os',
  ];
  const platformPatterns = [
    { pattern: /android/, platform: 'android' },
    { pattern: /iphone|ipad|ipod|ios/, platform: 'ios' },
    { pattern: /windows/, platform: 'windows' },
    { pattern: /macintosh|mac os x/, platform: 'macos' },
    { pattern: /linux/, platform: 'linux' },
    { pattern: /chrome os/, platform: 'chromeos' },
  ];
  platform = platformPatterns.find(({ pattern }) => pattern.test(uaLower))?.platform || 'unknown';
  const isMobile = mobileKeywords.some((keyword) => uaLower.includes(keyword))
    || /mobile|windows phone/i.test(uaLower);
  return {
    platform,
    isMobile,
  };
}

export default function isDesktop(userAgent) {
  const ua = getUserAgent(userAgent);
  if (isHeadlessBrowser(ua)) return true;
  const platformInfo = getPlatformInfo(ua);
  if (platformInfo.isMobile) return false;
  const isDesktopOS = ['windows', 'macos', 'linux', 'chromeos'].includes(platformInfo.platform);
  if (!isDesktopOS) return false;
  const isTabletIPad = isIPad(ua);
  const isTabletWindows = isWindowsTablet(ua);
  if (isTabletIPad || isTabletWindows) return false;
  const deviceHasTouch = hasTouch();
  const deviceHasMouse = hasMouse();
  if (!deviceHasTouch) return true;
  const isWindowsTouch = /Windows NT/.test(ua) && deviceHasTouch;
  const isWindowsLaptopWithTouch = isWindowsTouch && !isTabletWindows;
  return isWindowsLaptopWithTouch || (deviceHasTouch && deviceHasMouse);
}
