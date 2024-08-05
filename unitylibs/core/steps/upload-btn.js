import { createTag, createActionBtn, getUnityLibs } from '../../scripts/utils.js';

function showErrorToast(cfg, className) {
  const { unityEl } = cfg;
  const msg = unityEl.querySelector(className)?.nextSibling.textContent;
  document.querySelector('.unity-enabled .interactive-area .alert-holder .alert-toast .alert-text p').innerText = msg;
  document.querySelector('.unity-enabled .interactive-area .alert-holder').style.display = 'flex';
}

export async function createErrorToast(cfg) {
  const alertImg = await fetch(`${getUnityLibs()}/img/icons/alert.svg`).then((res) => res.text());
  const closeImg = await fetch(`${getUnityLibs()}/img/icons/close.svg`).then((res) => res.text());
  const { unityEl, errorToastEvent } = cfg;
  const errholder = createTag('div', { class: 'alert-holder' });
  const errdom = createTag('div', { class: 'alert-toast' });
  const alertContent = createTag('div', { class: 'alert-content' });
  const alertIcon = createTag('div', { class: 'alert-icon' });
  const alertText = createTag('div', { class: 'alert-text' });
  const p = createTag('p', {}, 'Alert Text');
  alertText.append(p);
  alertIcon.innerHTML = alertImg;
  alertIcon.append(alertText);
  const alertClose = createTag('div', { class: 'alert-close' });
  alertClose.innerHTML = closeImg;
  alertContent.append(alertIcon, alertClose);
  errdom.append(alertContent);
  errholder.append(errdom);
  unityEl.addEventListener(errorToastEvent, (e) => {
    showErrorToast(cfg, e.detail.className);
  });
  alertClose.addEventListener('click', (e) => {
    e.target.closest('.alert-holder').style.display = 'none';
  });
  return errholder;
}

export default async function createUpload(cfg, target, callback = null) {
  const { unityEl, errorToastEvent, interactiveSwitchEvent, progressCircleEvent } = cfg;
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
      unityEl.dispatchEvent(new CustomEvent(errorToastEvent, { detail: { className: '.icon-error-filesize' } }));
      return;
    }
    const objUrl = URL.createObjectURL(file);
    target.src = objUrl;
    target.onload = async () => {
      cfg.uploadState.filetype = file.type;
      if (callback) {
        try {
          unityEl.dispatchEvent(new CustomEvent(progressCircleEvent));
          await callback(cfg);
          unityEl.dispatchEvent(new CustomEvent(progressCircleEvent));
        } catch (err) {
          unityEl.dispatchEvent(new CustomEvent(progressCircleEvent));
          return;
        }
      }
      if (document.querySelector('.unity-enabled .interactive-area .alert-holder').style.display !== 'flex') {
        unityEl.dispatchEvent(new CustomEvent(interactiveSwitchEvent));
      }
    };
    target.onerror = () => {
      unityEl.dispatchEvent(new CustomEvent(errorToastEvent, { detail: { className: '.icon-error-request' } }));
    };
    e.target.value = '';
  });
  return a;
}
