import { createTag, getUnityConfig } from "../../scripts/utils.js";

export function addProgressCircle(data) {
  const circle = createprogressCircle();
  data.target.appendChild(circle);
  data.target.querySelector('.tray-items').classList.add('disable-click');
  data.target.classList.add('loading');
}

export function removeProgressCircle(data) {
  const circle = data.target.querySelector('.layer-progress');
  data.target.classList.remove('loading');
  if (circle) circle.remove();
  data.target.querySelector('.tray-items').classList.remove('disable-click');
}

export default function createProgressCircle() {
  const cfg = getUnityConfig();
  cfg.progressCircleEvent = 'unity:progress-circle';
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
  const layer = createTag('div', { class: 'layer layer-progress' }, prgc);
  cfg.unityEl.addEventListener(cfg.progressCircleEvent, () =>
    cfg.targetEl.classList.contains('loading') ? cfg.targetEl.classList.remove('loading') : cfg.targetEl.classList.add('loading'));
  return layer;
}