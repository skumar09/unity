import { createTag, getUnityConfig } from "../../scripts/utils.js";

function showErrorToast(msg) {
  document.querySelector('.unity-enabled .interactive-area .alert-toast .alert-text p').innerText = msg;
  document.querySelector('.unity-enabled .interactive-area .alert-toast').style.display = 'flex';
}

export function createErrorToast() {
  const alertImg = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g id="Frame">
  <path id="iconPrimary" d="M9.99936 15.1233C9.76871 15.1315 9.54398 15.0496 9.37275 14.895C9.04242 14.5304 9.04242 13.9751 9.37275 13.6104C9.5421 13.4521 9.76758 13.3677 9.99939 13.3757C10.2357 13.3662 10.4653 13.4559 10.6324 13.6231C10.7945 13.7908 10.8816 14.017 10.8738 14.2499C10.8862 14.4846 10.8042 14.7145 10.6461 14.8886C10.4725 15.0531 10.2382 15.1382 9.99936 15.1233Z" fill="white"/>
  <path id="iconPrimary_2" d="M10 11.75C9.58594 11.75 9.25 11.4141 9.25 11V7C9.25 6.58594 9.58594 6.25 10 6.25C10.4141 6.25 10.75 6.58594 10.75 7V11C10.75 11.4141 10.4141 11.75 10 11.75Z" fill="white"/>
  <path id="iconPrimary_3" d="M16.7332 18H3.26642C2.46613 18 1.74347 17.5898 1.3338 16.9023C0.924131 16.2148 0.906551 15.3838 1.28741 14.6797L8.02082 2.23242C8.41437 1.50488 9.17268 1.05273 9.99982 1.05273C10.827 1.05273 11.5853 1.50488 11.9788 2.23242L18.7122 14.6797C19.0931 15.3838 19.0755 16.2149 18.6658 16.9024C18.2562 17.5899 17.5335 18 16.7332 18ZM9.99982 2.55273C9.86554 2.55273 9.53205 2.59082 9.34015 2.94531L2.60675 15.3926C2.42364 15.7315 2.55646 16.0244 2.62237 16.1338C2.6878 16.2441 2.88165 16.5 3.26641 16.5H16.7332C17.118 16.5 17.3118 16.2441 17.3773 16.1338C17.4432 16.0244 17.576 15.7315 17.3929 15.3926L10.6595 2.94531C10.4676 2.59082 10.1341 2.55273 9.99982 2.55273Z" fill="white"/>
  </g>
  </svg>`;
  const closeImg = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g id="Frame" clip-path="url(#clip0_3633_2420)">
  <path id="iconPrimary" d="M7.34283 6L10.7389 2.60352C11.1095 2.2334 11.1095 1.63184 10.7389 1.26075C10.3678 0.891609 9.76721 0.890629 9.39612 1.26173L6.00061 4.65773L2.6051 1.26172C2.23401 0.890629 1.63342 0.891599 1.26233 1.26074C0.891723 1.63183 0.891723 2.2334 1.26233 2.60351L4.65839 5.99999L1.26233 9.39647C0.891723 9.76659 0.891723 10.3681 1.26233 10.7392C1.44788 10.9238 1.69055 11.0166 1.93372 11.0166C2.17689 11.0166 2.41956 10.9238 2.60511 10.7383L6.00062 7.34226L9.39613 10.7383C9.58168 10.9238 9.82435 11.0166 10.0675 11.0166C10.3107 11.0166 10.5534 10.9238 10.7389 10.7392C11.1095 10.3681 11.1095 9.76658 10.7389 9.39647L7.34283 6Z" fill="white"/>
  </g>
  <defs>
  <clipPath id="clip0_3633_2420">
  <rect width="12" height="12" fill="white"/>
  </clipPath>
  </defs>
  </svg>`;
  const cfg = getUnityConfig();
  cfg.errorToastEvent = 'unity:error-toast';
  const errdom = createTag('div', { class: 'alert-toast'});
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
  cfg.unityEl.addEventListener(cfg.errorToastEvent, (e) => {
    showErrorToast(e.detail.msg);
  });
  alertClose.addEventListener('click', (e) => {
    e.target.closest('.alert-toast').style.display = 'none';
  });
  return errdom;
}

async function loadSvg(img) {
  const res = await fetch(img.src);
  if (!res.status === 200) return null;
  const svg = await res.text();
  return svg;
}

async function createActionBtn(btnCfg) {
  const txt = btnCfg.innerText;
  const img = btnCfg.querySelector('img[src*=".svg"]');
  const actionBtn = createTag('a', { class: 'unity-action-btn show' });
  if (img) {
    const btnImg = await loadSvg(img);
    const actionSvg = createTag('div', { class: 'btn-icon' }, btnImg);
    actionBtn.append(actionSvg);
  }
  if (txt) {
    const actionText = createTag('div', { class: 'btn-text' }, txt);
    actionBtn.append(actionText);
  }
  return actionBtn;
}

export default async function createUpload(target, callback) {
  const { unityEl, errorToastEvent, interactiveSwitchEvent } = getUnityConfig();
  const li = unityEl.querySelector('.icon-upload').parentElement;
  const a = await createActionBtn(li);
  const input = createTag('input', { class: 'file-upload', type: 'file', accept: 'image/png,image/jpg,image/jpeg' });
  a.append(input);
  const eft = unityEl.querySelector('.icon-error-filesize').nextSibling.textContent;
  a.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 400000000) {
      unityEl.dispatchEvent(new CustomEvent(errorToastEvent, { detail: { msg: eft } }));
      return;
    }
    const objUrl = URL.createObjectURL(file);
    target.src = objUrl;
    unityEl.dispatchEvent(new CustomEvent(interactiveSwitchEvent));
  });
  return a;
}
