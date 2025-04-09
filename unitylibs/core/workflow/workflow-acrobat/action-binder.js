/* eslint-disable max-len */
/* eslint-disable max-classes-per-file */
/* eslint-disable no-await-in-loop */
/* eslint-disable class-methods-use-this */
/* eslint-disable no-restricted-syntax */

import {
  unityConfig,
  getUnityLibs,
  createTag,
  localizeLink,
  priorityLoad,
  loadArea,
  loadImg,
  getHeaders,
} from '../../../scripts/utils.js';

const DOS_SPECIAL_NAMES = new Set([
  'CON', 'PRN', 'AUX', 'NUL', 'COM0', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6',
  'COM7', 'COM8', 'COM9', 'LPT0', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6',
  'LPT7', 'LPT8', 'LPT9'
]);

const INVALID_CHARS_REGEX = /[\x00-\x1F\\/:"*?<>|]/g;
const ENDING_SPACE_PERIOD_REGEX = /[ .]+$/;
const STARTING_SPACE_PERIOD_REGEX = /^[ .]+/;

class ServiceHandler {
  async fetchFromService(url, options) {
    try {
      const response = await fetch(url, options);
      const contentLength = response.headers.get('Content-Length');
      if (response.status === 202) return { status: 202, headers: response.headers };
      if (response.status !== 200) {
        const error = new Error();
        if (contentLength !== '0') {
          try {
            error.responseJson = await response.json();
            ['quotaexceeded', 'notentitled'].forEach((errorMessage) => {
              if (resJson.reason?.includes(errorMessage)) error.message = errorMessage;
            });
          } catch {
            error.message = `Failed to parse JSON response. URL: ${url}, Options: ${JSON.stringify(options)}`;
          }
        }
        if (!error.message) error.message = `Error fetching from service. URL: ${url}, Options: ${JSON.stringify(options)}`;
        error.status = response.status;
        throw error;
      }
      if (contentLength === '0') return {};
      return response.json();
    } catch (e) {
      if (e instanceof TypeError) {
        e.status = 0;
        e.message = `Network error. URL: ${url}, Options: ${JSON.stringify(options)}`;
      } else if (e.name === 'TimeoutError' || e.name === 'AbortError') {
        e.status = 504;
        e.message = `Request timed out. URL: ${url}, Options: ${JSON.stringify(options)}`;
      }
      throw e;
    }
  }

  async fetchFromServiceWithRetry(url, options, maxRetryDelay = 120) {
    let timeLapsed = 0;
    while (timeLapsed < maxRetryDelay) {
      const response = await this.fetchFromService(url, options);
      if (response.status === 202) {
        const retryDelay = parseInt(response.headers.get('retry-after')) || 5;
        await new Promise(resolve => setTimeout(resolve, retryDelay * 1000));
        timeLapsed += retryDelay;
      } else {
        return response;
      }
    }
    const timeoutError = new Error(`Max retry delay exceeded for URL: ${url}`);
    timeoutError.status = 504;
    throw timeoutError;
  }

  async postCallToService(api, options, additionalHeaders = {}) {
    const postOpts = {
      method: 'POST',
      headers: await getHeaders(unityConfig.apiKey, additionalHeaders),
      ...options,
    };
    return this.fetchFromService(api, postOpts);
  }

  async postCallToServiceWithRetry(api, options, additionalHeaders = {}) {
    const postOpts = {
      method: 'POST',
      headers: await getHeaders(unityConfig.apiKey, additionalHeaders),
      ...options,
    };
    return this.fetchFromServiceWithRetry(api, postOpts);
  }

  async getCallToService(api, params, additionalHeaders = {}) {
    const getOpts = {
      method: 'GET',
      headers: await getHeaders(unityConfig.apiKey, additionalHeaders),
    };
    const queryString = new URLSearchParams(params).toString();
    const url = `${api}?${queryString}`;
    return this.fetchFromService(url, getOpts);
  }
}

export default class ActionBinder {
  static SINGLE_FILE_ERROR_MESSAGES = {
    UNSUPPORTED_TYPE: 'verb_upload_error_unsupported_type',
    EMPTY_FILE: 'verb_upload_error_empty_file',
    FILE_TOO_LARGE: 'verb_upload_error_file_too_large',
  };

  static MULTI_FILE_ERROR_MESSAGES = {
    UNSUPPORTED_TYPE: 'verb_upload_error_unsupported_type_multi',
    EMPTY_FILE: 'verb_upload_error_empty_file_multi',
    FILE_TOO_LARGE: 'verb_upload_error_file_too_large_multi',
  };

  constructor(unityEl, workflowCfg, wfblock, canvasArea, actionMap = {}, limits = {}) {
    this.unityEl = unityEl;
    this.workflowCfg = workflowCfg;
    this.block = wfblock;
    this.actionMap = actionMap;
    this.limits = limits;
    this.canvasArea = canvasArea;
    this.operations = [];
    this.acrobatApiConfig = this.getAcrobatApiConfig();
    this.serviceHandler = new ServiceHandler();
    this.uploadHandler = null;
    this.splashScreenEl = null;
    this.promiseStack = [];
    this.signedOut = this.isSignedOut();
    this.redirectUrl = '';
    this.redirectWithoutUpload = false;
    this.LOADER_DELAY = 800;
    this.LOADER_INCREMENT = 30;
    this.LOADER_LIMIT = 95;
    this.MULTI_FILE = false;
    this.applySignedInSettings();
  }

  isSignedOut() {
    const serverTiming = window.performance.getEntriesByType('navigation')[0].serverTiming?.reduce(
      (acc, { name, description }) => ({ ...acc, [name]: description }),
      {},
    );
    return !Object.keys(serverTiming || {}).length || serverTiming?.sis === '0';
  }

  acrobatSignedInSettings() {
    if (this.limits.signedInallowedFileTypes && !this.signedOut) this.limits.allowedFileTypes.push(...this.limits.signedInallowedFileTypes);
  }

  async applySignedInSettings() {
    if (this.block.classList.contains('signed-in')) {
      if (!this.signedOut) {
        this.acrobatSignedInSettings();
        return;
      }
    }
    window.addEventListener('IMS:Ready', () => {
      this.acrobatSignedInSettings();
    });
  }

  getAcrobatApiConfig() {
    unityConfig.acrobatEndpoint = {
      createAsset: `${unityConfig.apiEndPoint}/asset`,
      finalizeAsset: `${unityConfig.apiEndPoint}/asset/finalize`,
      getMetadata: `${unityConfig.apiEndPoint}/asset/metadata`,
    };
    return unityConfig;
  }

  async handlePreloads() {
    const parr = [];
    if (this.workflowCfg.targetCfg.showSplashScreen) {
      parr.push(
        `${getUnityLibs()}/core/styles/splash-screen.css`,
        `${this.splashFragmentLink}.plain.html`,
      );
    }
    await priorityLoad(parr);
  }

  async getAccountType() {
    try {
      return window.adobeIMS.getAccountType();
    } catch (e) {
      await this.dispatchErrorToast('verb_upload_error_generic', 500, `Exception raised when getting account type: ${e.message}`, true);
      return '';
    }
  }

  async dispatchErrorToast(code, status, info = null, lanaOnly = false, showError = true) {
    if (showError) {
      const errorMessage = code in this.workflowCfg.errors
        ? this.workflowCfg.errors[code]
        : await (async () => {
          const getError = (await import('../../../scripts/errors.js')).default;
          return getError(this.workflowCfg.enabledFeatures[0], code);
        })();
      const message = lanaOnly ? '' : errorMessage || 'Unable to process the request';
      this.block.dispatchEvent(new CustomEvent(
        unityConfig.errorToastEvent,
        {
          detail: {
            code,
            message: `${message}`,
            status,
            info: `Upload Type: ${this.MULTI_FILE ? 'multi' : 'single'}; ${info}`,
            accountType: this.signedOut ? 'guest' : 'signed-in',
          },
        },
      ));
    }
  }

  async dispatchAnalyticsEvent(eventName, data = null) {
    const detail = { event: eventName, ...(data && { data }) };
    this.block.dispatchEvent(new CustomEvent(unityConfig.trackAnalyticsEvent, { detail }));
  }

  updateProgressBar(layer, percentage) {
    const p = Math.min(percentage, this.LOADER_LIMIT);
    const spb = layer.querySelector('.spectrum-ProgressBar');
    spb?.setAttribute('value', p);
    spb?.setAttribute('aria-valuenow', p);
    layer.querySelector('.spectrum-ProgressBar-percentage').innerHTML = `${p}%`;
    layer.querySelector('.spectrum-ProgressBar-fill').style.width = `${p}%`;
  }

  createProgressBar() {
    const pdom = `<div class="spectrum-ProgressBar spectrum-ProgressBar--sizeM spectrum-ProgressBar--sideLabel" value="0" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
    <div class="spectrum-FieldLabel spectrum-FieldLabel--sizeM spectrum-ProgressBar-label"></div>
    <div class="spectrum-FieldLabel spectrum-FieldLabel--sizeM spectrum-ProgressBar-percentage">0%</div>
    <div class="spectrum-ProgressBar-track">
      <div class="spectrum-ProgressBar-fill" style="width: 0%;"></div>
    </div>
    </div>`;
    return createTag('div', { class: 'progress-holder' }, pdom);
  }

  progressBarHandler(s, delay, i, initialize = false) {
    if (!s) return;
    delay = Math.min(delay + 100, 2000);
    i = Math.max(i - 5, 5);
    const progressBar = s.querySelector('.spectrum-ProgressBar');
    if (!initialize && progressBar?.getAttribute('value') >= this.LOADER_LIMIT) return;
    if (initialize) this.updateProgressBar(s, 0);
    setTimeout(() => {
      const v = initialize ? 0 : parseInt(progressBar.getAttribute('value'), 10);
      this.updateProgressBar(s, v + i);
      this.progressBarHandler(s, delay, i);
    }, delay);
  }

  isMixedFileTypes(files) {
    const fileTypes = new Set(files.map((file) => file.type));
    return fileTypes.size > 1 ? 'mixed' : files[0].type;
  }

  async sanitizeFileName(rawFileName) {
    try {
      const MAX_FILE_NAME_LENGTH = 255;
      let fileName = rawFileName;
      if (!fileName || fileName === '.' || fileName === '..') {
        return '---';
      }
      const { getExtension, removeExtension } = await import('../../../utils/FileUtils.js');
      let ext = getExtension(fileName);
      const nameWithoutExtension = removeExtension(fileName);
      ext = ext.length > 0 ? `.${ext}` : '';
      fileName = DOS_SPECIAL_NAMES.has(nameWithoutExtension.toUpperCase()) 
        ? `---${ext}` 
        : nameWithoutExtension + ext;
      if (fileName.length > MAX_FILE_NAME_LENGTH) {
        const trimToLen = MAX_FILE_NAME_LENGTH - ext.length;
        fileName = trimToLen > 0 ? fileName.substring(0, trimToLen) + ext : fileName.substring(0, MAX_FILE_NAME_LENGTH);
      }
      fileName = fileName
        .replace(ENDING_SPACE_PERIOD_REGEX, '-')
        .replace(STARTING_SPACE_PERIOD_REGEX, '-')
        .replace(INVALID_CHARS_REGEX, '-');
      if (rawFileName !== fileName) {
        await this.dispatchErrorToast('verb_warn_renamed_invalid_file_name', null, `Renamed ${rawFileName} to ${fileName}`, true)
      }
      return fileName;
    } catch (error) {
      console.error('Error sanitizing filename:', error);
      await this.dispatchErrorToast('verb_upload_error_generic', 500, `Error renaming file: ${rawFileName}`, false);
      return '---';
    }
  }

  async validateFiles(files) {
    const errorMessages = files.length === 1
      ? ActionBinder.SINGLE_FILE_ERROR_MESSAGES
      : ActionBinder.MULTI_FILE_ERROR_MESSAGES;
    let allFilesFailed = true;
    const errorTypes = new Set();
    for (const file of files) {
      let fail = false;
      if (!this.limits.allowedFileTypes.includes(file.type)) {
        if (this.MULTI_FILE) await this.dispatchErrorToast(errorMessages.UNSUPPORTED_TYPE, null, `File type: ${file.type}`, true);
        else await this.dispatchErrorToast(errorMessages.UNSUPPORTED_TYPE);
        fail = true;
        errorTypes.add('UNSUPPORTED_TYPE');
      }
      if (!file.size) {
        if (this.MULTI_FILE) await this.dispatchErrorToast(errorMessages.EMPTY_FILE, null, 'Empty file', true);
        else await this.dispatchErrorToast(errorMessages.EMPTY_FILE);
        fail = true;
        errorTypes.add('EMPTY_FILE');
      }
      if (file.size > this.limits.maxFileSize) {
        if (this.MULTI_FILE) await this.dispatchErrorToast(errorMessages.FILE_TOO_LARGE, null, `File too large: ${file.size}`, true);
        else await this.dispatchErrorToast(errorMessages.FILE_TOO_LARGE);
        fail = true;
        errorTypes.add('FILE_TOO_LARGE');
      }
      if (!fail) allFilesFailed = false;
    }
    if (allFilesFailed) {
      if (this.MULTI_FILE) {
        if (errorTypes.size === 1) {
          const errorType = Array.from(errorTypes)[0];
          await this.dispatchErrorToast(errorMessages[errorType]);
        } else {
          await this.dispatchErrorToast('verb_upload_error_generic', null, `All ${files.length} files failed validation. Error Types: ${Array.from(errorTypes).join(', ')}`, false);
        }
      }
      return false;
    }
    return true;
  }

  async getRedirectUrl(cOpts) {
    this.promiseStack.push(
      this.serviceHandler.postCallToService(
        this.acrobatApiConfig.connectorApiEndPoint,
        { body: JSON.stringify(cOpts) },
        { 'x-unity-dc-verb': this.MULTI_FILE ? `${this.workflowCfg.enabledFeatures[0]}MFU` : this.workflowCfg.enabledFeatures[0] },
      ),
    );
    await Promise.all(this.promiseStack)
      .then(async (resArr) => {
        const response = resArr[resArr.length - 1];
        if (!response?.url) throw new Error('Error connecting to App');
        this.redirectUrl = response.url;
      })
      .catch(async (e) => {
        await this.showSplashScreen();
        await this.dispatchErrorToast('verb_upload_error_generic', e.status || 500, `Exception thrown when retrieving redirect URL. Message: ${e.message}, Options: ${JSON.stringify(cOpts)}`, false, e.showError);
      });
  }

  async handleRedirect(cOpts) {
    try {
      cOpts.payload.newUser = !localStorage.getItem('unity.user');
      const numAttempts = parseInt(localStorage.getItem(`${this.workflowCfg.enabledFeatures[0]}_attempts`), 10) || 0;
      const trialMapping = {
        0: '1st',
        1: '2nd',
      };
      cOpts.payload.attempts = trialMapping[numAttempts] || '2+';
    } catch (e) {
      cOpts.payload.newUser = true;
      cOpts.payload.attempts = '1st';
    }
    await this.getRedirectUrl(cOpts);
    if (!this.redirectUrl) return false;
    this.dispatchAnalyticsEvent('redirectUrl', this.redirectUrl);
    return true;
  }

  async handleSingleFileUpload(file, eventName) {  
    const sanitizedFileName = await this.sanitizeFileName(file.name); 
    const newFile = new File([file], sanitizedFileName, { type: file.type, lastModified: file.lastModified });
    const fileData = { type: newFile.type, size: newFile.size, count: 1 };
    this.dispatchAnalyticsEvent(eventName, fileData);
    if (!await this.validateFiles([newFile])) return;
    const { default: UploadHandler } = await import(`${getUnityLibs()}/core/workflow/${this.workflowCfg.name}/upload-handler.js`);
    this.uploadHandler = new UploadHandler(this, this.serviceHandler);
    if (this.signedOut) await this.uploadHandler.singleFileGuestUpload(newFile, fileData);
    else await this.uploadHandler.singleFileUserUpload(newFile, fileData);
  }

  async handleMultiFileUpload(files, totalFileSize, eventName) {
    this.MULTI_FILE = true;
    this.LOADER_LIMIT = 65;
    const isMixedFileTypes = this.isMixedFileTypes(files);
    const filesData = { type: isMixedFileTypes, size: totalFileSize, count: files.length };
    this.dispatchAnalyticsEvent(eventName, filesData);
    this.dispatchAnalyticsEvent('multifile', filesData);
    const sanitizedFiles = await Promise.all(files.map(async (file) => {
      const sanitizedFileName = await this.sanitizeFileName(file.name);
      return new File([file], sanitizedFileName, { type: file.type, lastModified: file.lastModified });
    }));
    if (!await this.validateFiles(files)) return;
    const { default: UploadHandler } = await import(`${getUnityLibs()}/core/workflow/${this.workflowCfg.name}/upload-handler.js`);
    this.uploadHandler = new UploadHandler(this, this.serviceHandler);
    if (this.signedOut) await this.uploadHandler.multiFileGuestUpload(filesData);
    else await this.uploadHandler.multiFileUserUpload(sanitizedFiles, filesData);
  }

  async processSingleFile(files, eventName) {
    if (!files || files.length > this.limits.maxNumFiles) {
      await this.dispatchErrorToast('verb_upload_error_only_accept_one_file');
      return;
    }
    const file = files[0];
    if (!file) return;
    await this.handleSingleFileUpload(file, eventName);
  }

  async fillsign(files, eventName) {
    await this.processSingleFile(files, eventName);
  }

  async addComment(files, eventName) {
    await this.processSingleFile(files, eventName);
  }

  async numberPages(files, eventName) {
    await this.processSingleFile(files, eventName);
  }

  async splitPdf(files, eventName) {
    await this.processSingleFile(files, eventName);
  }

  async cropPages(files, eventName) {
    await this.processSingleFile(files, eventName);
  }

  async compress(files, totalFileSize, eventName) {
    if (!files) {
      await this.dispatchErrorToast('verb_upload_error_only_accept_one_file');
      return;
    }
    const isSingleFile = files.length === 1;
    if (isSingleFile) await this.handleSingleFileUpload(files[0], eventName);
    else await this.handleMultiFileUpload(files, totalFileSize, eventName);
  }

  delay(ms) {
    return new Promise((res) => { setTimeout(() => { res(); }, ms); });
  }

  checkCookie = () => {
    const cookies = document.cookie.split(';').map((item) => item.trim());
    const target = /^UTS_Uploaded=/;
    return cookies.some((item) => target.test(item));
  };

  waitForCookie = (timeout) => new Promise((resolve) => {
    const interval = 100;
    let elapsed = 0;
    const intervalId = setInterval(() => {
      if (this.checkCookie() || elapsed >= timeout) {
        clearInterval(intervalId);
        resolve();
      }
      elapsed += interval;
    }, interval);
  });

  async continueInApp() {
    if (!this.redirectUrl || !(this.operations.length || this.redirectWithoutUpload)) return;
    this.LOADER_LIMIT = 100;
    this.updateProgressBar(this.splashScreenEl, 100);
    try {
      await this.waitForCookie(2000);
      if (!this.checkCookie()) {
        await this.dispatchErrorToast('verb_cookie_not_set', 200, 'Not all cookies found, redirecting anyway', true);
      }
      await this.delay(500);
      if (this.multiFileFailure && this.redirectUrl.includes('#folder')) {
        window.location.href = `${this.redirectUrl}&feedback=${this.multiFileFailure}`;
      } else window.location.href = this.redirectUrl;
    } catch (e) {
      await this.showSplashScreen();
      await this.dispatchErrorToast('verb_upload_error_generic', 500, `Exception thrown when redirecting to product; ${e.message}`, false, e.showError);
    }
  }

  async cancelAcrobatOperation() {
    await this.showSplashScreen();
    this.redirectUrl = '';
    this.dispatchAnalyticsEvent('cancel');
    const e = new Error();
    e.message = 'Operation termination requested.';
    e.showError = false;
    const cancelPromise = Promise.reject(e);
    this.promiseStack.unshift(cancelPromise);
  }

  async acrobatActionMaps(values, files, totalFileSize, eventName) {
    await this.handlePreloads();
    for (const value of values) {
      switch (true) {
        case value.actionType === 'fillsign':
          this.promiseStack = [];
          await this.fillsign(files, eventName);
          break;
        case value.actionType === 'compress':
          this.promiseStack = [];
          await this.compress(files, totalFileSize, eventName);
          break;
        case value.actionType === 'addcomment':
          this.promiseStack = [];
          await this.addComment(files, eventName);
          break;
        case value.actionType === 'numberpages':
          this.promiseStack = [];
          await this.numberPages(files, eventName);
          break;
        case value.actionType === 'splitpdf':
          this.promiseStack = [];
          await this.splitPdf(files, eventName);
          break;
        case value.actionType === 'croppages':
          this.promiseStack = [];
          await this.cropPages(files, eventName);
          break;
        case value.actionType === 'continueInApp':
          await this.continueInApp();
          break;
        case value.actionType === 'interrupt':
          await this.cancelAcrobatOperation();
          break;
        default:
          break;
      }
    }
  }

  extractFiles(e) {
    const files = [];
    let totalFileSize = 0;
    if (e.dataTransfer?.items) {
      [...e.dataTransfer.items].forEach((item) => {
        if (item.kind === 'file') {
          const file = item.getAsFile();
          files.push(file);
          totalFileSize += file.size;
        }
      });
    } else if (e.target?.files) {
      [...e.target.files].forEach((file) => {
        files.push(file);
        totalFileSize += file.size;
      });
    }
    return { files, totalFileSize };
  }

  async loadSplashFragment() {
    if (!this.workflowCfg.targetCfg.showSplashScreen) return;
    this.splashFragmentLink = localizeLink(`${window.location.origin}${this.workflowCfg.targetCfg.splashScreenConfig.fragmentLink}`);
    const resp = await fetch(`${this.splashFragmentLink}.plain.html`);
    const html = await resp.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const sections = doc.querySelectorAll('body > div');
    const f = createTag('div', { class: 'fragment splash-loader decorate', style: 'display: none' });
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

  async initActionListeners(b = this.block, actMap = this.actionMap) {
    for (const [key, values] of Object.entries(actMap)) {
      const el = b.querySelector(key);
      if (!el) return;
      switch (true) {
        case el.nodeName === 'A':
          el.addEventListener('click', async (e) => {
            e.preventDefault();
            await this.acrobatActionMaps(values);
          });
          break;
        case el.nodeName === 'DIV':
          el.addEventListener('drop', async (e) => {
            e.preventDefault();
            const { files, totalFileSize } = this.extractFiles(e);
            await this.acrobatActionMaps(values, files, totalFileSize, 'drop');
          });
          break;
        case el.nodeName === 'INPUT':
          el.addEventListener('change', async (e) => {
            const { files, totalFileSize } = this.extractFiles(e);
            await this.acrobatActionMaps(values, files, totalFileSize, 'change');
            e.target.value = '';
          });
          break;
        default:
          break;
      }
    }
    if (b === this.block) await this.delayedSplashLoader();
  }

  async handleSplashProgressBar() {
    const pb = this.createProgressBar();
    this.splashScreenEl.querySelector('.icon-progress-bar').replaceWith(pb);
    this.progressBarHandler(this.splashScreenEl, this.LOADER_DELAY, this.LOADER_INCREMENT, true);
  }

  handleOperationCancel() {
    const actMap = { 'a.con-button[href*="#_cancel"]': [{ actionType: 'interrupt' }] };
    this.initActionListeners(this.splashScreenEl, actMap);
  }

  splashVisibilityController(displayOn) {
    if (!displayOn) {
      this.LOADER_LIMIT = 95;
      this.splashScreenEl.parentElement?.classList.remove('hide-splash-overflow');
      this.splashScreenEl.classList.remove('show');
      return;
    }
    this.progressBarHandler(this.splashScreenEl, this.LOADER_DELAY, this.LOADER_INCREMENT, true);
    this.splashScreenEl.classList.add('show');
    this.splashScreenEl.parentElement?.classList.add('hide-splash-overflow');
  }

  async showSplashScreen(displayOn = false) {
    if (!this.splashScreenEl && !this.workflowCfg.targetCfg.showSplashScreen) return;
    if (this.splashScreenEl.classList.contains('decorate')) {
      if (this.splashScreenEl.querySelector('.icon-progress-bar')) await this.handleSplashProgressBar();
      if (this.splashScreenEl.querySelector('a.con-button[href*="#_cancel"]')) this.handleOperationCancel();
      this.splashScreenEl.classList.remove('decorate');
    }
    this.splashVisibilityController(displayOn);
  }
}
