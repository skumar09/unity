import {
  createTag,
  localizeLink,
  loadImg,
  loadArea,
} from './utils.js';

export default class TransitionScreen {
  constructor(splashScreenEl, initActionListeners, loaderLimit, workflowCfg, isDesktop = false) {
    this.splashScreenEl = splashScreenEl;
    this.initActionListeners = initActionListeners;
    this.LOADER_LIMIT = loaderLimit;
    this.workflowCfg = workflowCfg;
    this.LOADER_DELAY = 800;
    this.LOADER_INCREMENT = 30;
    this.isDesktop = isDesktop;
    this.headingElements = [];
  }

  updateProgressBar(layer, percentage) {
    const p = Math.min(percentage, this.LOADER_LIMIT);
    const spb = layer.querySelector('.spectrum-ProgressBar');
    spb?.setAttribute('value', p);
    spb?.setAttribute('aria-valuenow', p);
    layer.querySelector('.spectrum-ProgressBar-percentage').innerHTML = `${p}%`;
    layer.querySelector('.spectrum-ProgressBar-fill').style.width = `${p}%`;
    const status = layer.querySelector('#progress-status');
    if (status?.textContent !== `${p}%`) status.textContent = `${p}%`;
  }

  createProgressBar() {
    const pdom = `<div class="spectrum-ProgressBar spectrum-ProgressBar--sizeM spectrum-ProgressBar--sideLabel" value="0" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
    <div class="spectrum-FieldLabel spectrum-FieldLabel--sizeM spectrum-ProgressBar-label"></div>
    <div class="spectrum-FieldLabel spectrum-FieldLabel--sizeM spectrum-ProgressBar-percentage">0%</div>
    <div class="spectrum-ProgressBar-track">
      <div class="spectrum-ProgressBar-fill" style="width: 0%;"></div>
    </div>
    </div>
    <div aria-live="polite" aria-atomic="true" class="sr-only" id="progress-status"></div>`;
    return createTag('div', { class: 'progress-holder' }, pdom);
  }

  progressBarHandler(s, delay, i, initialize = false) {
    if (!s) return;
    delay = Math.min(delay + 100, 2000);
    i = Math.max(i - 5, 5);
    const progressBar = s.querySelector('.spectrum-ProgressBar');
    const currentValue = parseInt(progressBar?.getAttribute('value'), 10);
    if (currentValue === 100 || (!initialize && currentValue >= this.LOADER_LIMIT)) return;
    if (initialize) this.updateProgressBar(s, 0);
    setTimeout(() => {
      const v = initialize ? 0 : parseInt(progressBar.getAttribute('value'), 10);
      if (v === 100) return;
      this.updateProgressBar(s, v + i);
      this.progressBarHandler(s, delay, i);
    }, delay);
  }

  async loadSplashFragment() {
    if (!this.workflowCfg.targetCfg.showSplashScreen) return;
    this.splashFragmentLink = localizeLink(`${window.location.origin}${this.workflowCfg.targetCfg.splashScreenConfig.fragmentLink}`);
    const resp = await fetch(`${this.splashFragmentLink}.plain.html`);
    const html = await resp.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const sections = doc.querySelectorAll('body > div');
    const f = createTag('div', { class: 'fragment splash-loader decorate', style: 'display: none', tabindex: '-1', role: 'dialog', 'aria-modal': 'true' });
    f.append(...sections);
    const splashDiv = document.querySelector(
      this.workflowCfg.targetCfg.splashScreenConfig.splashScreenParent,
    );
    splashDiv.append(f);
    const img = f.querySelector('img');
    if (img) loadImg(img);
    await loadArea(f);
    this.splashScreenEl = f;
    return f;
  }

  async delayedSplashLoader() {
    let eventListeners = ['mousemove', 'keydown', 'click', 'touchstart'];
    const interactionHandler = async () => {
      await this.loadSplashFragment();
      cleanup(interactionHandler);
    };

    const timeoutHandler = async () => {
      await this.loadSplashFragment();
      cleanup(interactionHandler);
    };

    // Timeout to load after 8 seconds
    let timeoutId = setTimeout(timeoutHandler, 8000);

    const cleanup = (handler) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (eventListeners) {
        eventListeners.forEach((event) => document.removeEventListener(event, handler));
        eventListeners = null;
      }
    };
    eventListeners.forEach((event) => document.addEventListener(
      event,
      interactionHandler,
      { once: true },
    ));
  }

  async handleSplashProgressBar() {
    const pb = this.createProgressBar();
    this.splashScreenEl.querySelector('.icon-progress-bar').replaceWith(pb);
    this.progressBarHandler(this.splashScreenEl, this.LOADER_DELAY, this.LOADER_INCREMENT, true);
  }

  handleOperationCancel() {
    const actMap = { 'a.con-button[href*="#_cancel"]': 'interrupt' };
    this.initActionListeners(this.splashScreenEl, actMap);
  }

  splashVisibilityController(displayOn) {
    if (!displayOn) {
      this.LOADER_LIMIT = 95;
      this.splashScreenEl.parentElement?.classList.remove('hide-splash-overflow');
      this.splashScreenEl.classList.remove('show');
      document.querySelector('main').removeAttribute('aria-hidden');
      document.querySelector('header').removeAttribute('aria-hidden');
      document.querySelector('footer').removeAttribute('aria-hidden');
      return;
    }
    this.progressBarHandler(this.splashScreenEl, this.LOADER_DELAY, this.LOADER_INCREMENT, true);
    this.splashScreenEl.classList.add('show');
    this.splashScreenEl.parentElement?.classList.add('hide-splash-overflow');
    document.querySelector('main').setAttribute('aria-hidden', 'true');
    document.querySelector('header').setAttribute('aria-hidden', 'true');
    document.querySelector('footer').setAttribute('aria-hidden', 'true');
    setTimeout(() => this.splashScreenEl.focus(), 50);
  }

  updateCopyForDevice() {
    const mobileHeading = this.headingElements[1];
    const desktopHeading = this.headingElements[2];
    if (mobileHeading) {
      mobileHeading.style.display = (this.isDesktop && desktopHeading) ? 'none' : 'block';
    }
    if (desktopHeading) {
      if (this.isDesktop) {
        desktopHeading.style.display = 'block';
        this.splashScreenEl.setAttribute('aria-label', desktopHeading.innerText);
      } else {
        desktopHeading.style.display = 'none';
      }
    }
  }

  async showSplashScreen(displayOn = false) {
    if (!this.splashScreenEl || !this.workflowCfg.targetCfg.showSplashScreen) return;
    if (this.splashScreenEl.classList.contains('decorate')) {
      if (this.splashScreenEl.querySelector('.icon-progress-bar')) await this.handleSplashProgressBar();
      if (this.splashScreenEl.querySelector('a.con-button[href*="#_cancel"]')) this.handleOperationCancel();
      this.headingElements = this.splashScreenEl.querySelectorAll('h1, h2, h3, h4, h5, h6');
      this.splashScreenEl.setAttribute('aria-label', this.headingElements[1].innerText);
      if (this.workflowCfg.productName.toLowerCase() === 'photoshop') this.updateCopyForDevice();
      this.splashScreenEl.classList.remove('decorate');
    }
    this.splashVisibilityController(displayOn);
  }
}
