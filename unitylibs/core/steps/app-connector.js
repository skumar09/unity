import { getUnityConfig, createActionBtn, getGuestAccessToken } from '../../scripts/utils.js';

async function continueInApp(appName, btnConfig) {
  const unityCfg = getUnityConfig();
  const { unityWidget, connectorApiEndPoint } = unityCfg;
  const continuebtn = unityWidget.querySelector(`continue-in-${appName}`);
  if (continuebtn) return continuebtn;
  const btn = await createActionBtn(btnConfig, `continue-in-app continue-in-${appName}`, true, true);
  btn.addEventListener('click', async () => {
    const data = {
      assetId: unityCfg.preludeState.assetId,
      targetProduct: 'Photoshop',
    };
    const connectorOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: getGuestAccessToken(),
        'x-api-key': 'leo',
      },
      body: JSON.stringify(data),
    };
    const response = await fetch(connectorApiEndPoint, connectorOptions);
    if (response.status !== 200) return '';
    window.location.href = response.url;
    return true;
  });
  return btn;
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
}
