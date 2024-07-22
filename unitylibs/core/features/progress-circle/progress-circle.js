import { createTag, getUnityConfig } from '../../../scripts/utils.js';

export default function createProgressCircle() {
  const cfg = getUnityConfig();
  const { unityEl, targetEl, progressCircleEvent } = cfg;
  const pdom = `<div class="spectrum-ProgressCircle-track"></div>
  <div class="spectrum-ProgressCircle-fills">
    <div class="spectrum-ProgressCircle-fillMask1">
      <div class="spectrum-ProgressCircle-fillSubMask1">
        <div class="spectrum-ProgressCircle-fill"></div>
      </div>
    </div>
    <div class="spectrum-ProgressCircle-fillMask2">
      <div class="spectrum-ProgressCircle-fillSubMask2">
        <div class="spectrum-ProgressCircle-fill"></div>
      </div>
    </div>
  </div>`;
  const prgc = createTag('div', { class: 'spectrum-ProgressCircle spectrum-ProgressCircle--indeterminate' }, pdom);
  const layer = createTag('div', { class: 'progress-holder' }, prgc);
  unityEl.addEventListener(progressCircleEvent, () => {
    if (targetEl.classList.contains('loading')) targetEl.classList.remove('loading');
    else targetEl.classList.add('loading');
  });
  return layer;
}
