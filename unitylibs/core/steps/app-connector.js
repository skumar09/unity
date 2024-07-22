import { getUnityConfig, createActionBtn, createIntersectionObserver } from '../../scripts/utils.js';

async function continueInApp(appName, btnConfig) {
  const unityCfg = getUnityConfig();
  const { unityWidget } = unityCfg;
  const continuebtn = unityWidget.querySelector(`continue-in-${appName}`);
  if (continuebtn) return continuebtn;
  const btn = await createActionBtn(btnConfig, `continue-in-app continue-in-${appName}`, true, true);
  btn.addEventListener('click', () => {
    console.log(unityCfg.preludeState.assetId);
  });
  return btn;
}

function resetAppConnector() {
  const { unityWidget } = getUnityConfig();
  const connectBtn = unityWidget.querySelector('.continue-in-app');
  connectBtn?.classList.remove('show');
}

export default async function initAppConnector(appName) {
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
  createIntersectionObserver({ el: connectBtn, callback: resetAppConnector });
}
