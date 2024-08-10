import { createTag, createActionBtn } from '../../scripts/utils.js';

export function resetClasses(img, targetEl) {
  if (img.classList.contains('contain-object')) img.classList.remove('contain-object');
  if (img.classList.contains('contain-object-landscape')) img.classList.remove('contain-object-landscape');
  if (img.classList.contains('contain-object-portrait')) img.classList.remove('contain-object-portrait');
  if (img.classList.contains('mobile-gray-bg')) img.classList.remove('mobile-gray-bg');
  if (targetEl.classList.contains('gray-bg')) targetEl.classList.remove('gray-bg');
}

export default async function createUpload(cfg, target, callback = null) {
  const { targetEl, unityEl, interactiveSwitchEvent } = cfg;
  const li = unityEl.querySelector('.icon-upload').parentElement;
  const a = await createActionBtn(li, 'show');
  const input = createTag('input', { class: 'file-upload', type: 'file', accept: 'image/png,image/jpg,image/jpeg', tabIndex: -1 });
  a.append(input);
  a.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') input.click();
  });
  a.addEventListener('change', async (e) => {
    let flag = true;
    const { default: showProgressCircle } = await import('../features/progress-circle/progress-circle.js');
    const { showErrorToast } = await import('../../scripts/utils.js');
    const file = e.target.files[0];
    if (!file) return;
    const MAX_FILE_SIZE = 400000000;
    if (file.size > MAX_FILE_SIZE) {
      await showErrorToast(targetEl, unityEl, '.icon-error-filesize');
      return;
    }
    const objUrl = URL.createObjectURL(file);
    resetClasses(target, targetEl);
    target.src = objUrl;
    target.onload = async () => {
      cfg.uploadState.filetype = file.type;
      if (callback && flag) {
        flag = false;
        try {
          const isLandscape = target.naturalWidth > target.naturalHeight;
          const isPortrait = target.naturalWidth < target.naturalHeight;
          const isSquare = target.naturalWidth === target.naturalHeight;
          if (isLandscape || isPortrait) {
            const containObjectClass = 'contain-object';
            const landscapeClass = 'contain-object-landscape';
            const portraitClass = 'contain-object-portrait';
            const mobileGrayBgClass = 'mobile-gray-bg';
            const grayBgClass = 'gray-bg';
            if (!target.classList.contains(containObjectClass)) {
              target.classList.add(containObjectClass);
            }
            if (!target.classList.contains(mobileGrayBgClass)) {
              target.classList.add(mobileGrayBgClass);
            }
            if (!targetEl.classList.contains(grayBgClass)) targetEl.classList.add(grayBgClass);
            if (isLandscape && !target.classList.contains(landscapeClass)) {
              target.classList.add(landscapeClass);
            } else if (isPortrait && !target.classList.contains(portraitClass)) {
              target.classList.add(portraitClass);
            }
          } else if (isSquare) {
            target.classList.remove('contain-object-landscape', 'contain-object-portrait');
            targetEl.classList.remove('gray-bg');
          }
          showProgressCircle(targetEl);
          await callback(cfg);
          if (target.classList.contains('mobile-gray-bg')) target.classList.remove('mobile-gray-bg');
          showProgressCircle(targetEl);
        } catch (err) {
          showProgressCircle(targetEl);
          await showErrorToast(targetEl, unityEl, '.icon-error-request');
          return;
        }
      }
      const alertHolder = document.querySelector('.unity-enabled .interactive-area .alert-holder');
      if (!alertHolder || alertHolder.style.display !== 'flex') {
        unityEl.dispatchEvent(new CustomEvent(interactiveSwitchEvent));
      }
    };
    target.onerror = async () => {
      await showErrorToast(targetEl, unityEl, '.icon-error-request');
    };
    e.target.value = '';
  });
  return a;
}
