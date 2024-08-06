import { createTag, createActionBtn } from '../../scripts/utils.js';

export default async function createUpload(cfg, target, callback = null) {
  const { targetEl, unityEl, interactiveSwitchEvent } = cfg;
  const { default: showProgressCircle } = await import('../features/progress-circle/progress-circle.js');
  const { showErrorToast } = await import('../../scripts/utils.js');
  const li = unityEl.querySelector('.icon-upload').parentElement;
  const a = await createActionBtn(li, 'show');
  const input = createTag('input', { class: 'file-upload', type: 'file', accept: 'image/png,image/jpg,image/jpeg', tabIndex: -1 });
  a.append(input);
  a.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') input.click();
  });
  a.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 400000000) {
      await showErrorToast(targetEl, unityEl, '.icon-error-filesize');
      return;
    }
    const objUrl = URL.createObjectURL(file);
    target.src = objUrl;
    target.onload = async () => {
      cfg.uploadState.filetype = file.type;
      if (callback) {
        try {
          showProgressCircle(targetEl);
          await callback(cfg);
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
