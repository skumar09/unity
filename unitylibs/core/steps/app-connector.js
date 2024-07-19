import { createTag, getUnityConfig } from '../../scripts/utils.js';

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

export async function createContinueBtn(btnCfg, appName) {
  const txt = btnCfg.innerText;
  const img = btnCfg.querySelector('img[src*=".svg"]');
  const actionBtn = createTag('a', { class: `unity-action-btn continue-in-app continue-in-${appName}` });
  if (txt) {
    const actionText = createTag('div', { class: 'btn-text' }, txt);
    actionBtn.append(actionText);
  }
  if (img) {
    const appImg = img.cloneNode(true);
    const actionSvg = createTag('div', { class: 'btn-icon' }, appImg);
    actionBtn.append(actionSvg);
    await loadImg(img);
  }
  return actionBtn;
}

async function continueInApp(appName, btnConfig) {
  const unityCfg = getUnityConfig();
  const { unityWidget } = unityCfg;
  const continuebtn = unityWidget.querySelector(`continue-in-${appName}`);
  if (continuebtn) return continuebtn;
  const btn = await createContinueBtn(btnConfig, appName);
  return btn;
}

export async function initAppConnector(appName) {
  const cfg = getUnityConfig();
  const { unityEl, unityWidget, refreshWidgetEvent, interactiveSwitchEvent } = cfg;
  const isContinueEnabled = unityEl.querySelector('.icon-app-connector');
  if (!isContinueEnabled) return;
  const btnConfig = isContinueEnabled.closest('li');
  const connectBtn = await continueInApp(appName, btnConfig);
  unityWidget.querySelector('.unity-action-area').append(connectBtn);
  unityEl.addEventListener(refreshWidgetEvent, () => {
    connectBtn?.classList.remove('show');
  });
  unityEl.addEventListener(interactiveSwitchEvent, () => {
    connectBtn?.classList.add('show');
  });
}
