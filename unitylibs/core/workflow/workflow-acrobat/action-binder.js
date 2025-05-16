/* eslint-disable max-len */
/* eslint-disable max-classes-per-file */
/* eslint-disable no-await-in-loop */
/* eslint-disable class-methods-use-this */
/* eslint-disable no-restricted-syntax */

import {
  unityConfig,
  getUnityLibs,
  priorityLoad,
  loadArea,
  loadImg,
  isGuestUser,
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
  handleAbortedRequest(url, options) {
    if (!(options?.signal?.aborted)) return;
    const error = new Error(`Request to ${url} aborted by user.`);
    error.name = 'AbortError';
    error.status = 0;
    throw error;
  }

  async fetchFromService(url, options, canRetry = true) {
    try {
      if (!options?.signal?.aborted)  this.handleAbortedRequest(url, options);
      const response = await fetch(url, options);
      const contentLength = response.headers.get('Content-Length');
      if (response.status === 202) return { status: 202, headers: response.headers };
      if (canRetry && ((response.status >= 500 && response.status < 600) || response.status === 429)) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.fetchFromService(url, options, false);
      }
      if (response.status !== 200) {
        let errorMessage = `Error fetching from service. URL: ${url}`;
        if (contentLength !== '0') {
          try {
            const responseJson = await response.json();
            ['quotaexceeded', 'notentitled'].forEach((errorType) => {
              if (responseJson.reason?.includes(errorType)) errorMessage = errorType;
            });
          } catch {
            errorMessage = `Failed to parse JSON response. URL: ${url}`;
          }
        }
        const error = new Error(errorMessage);
        error.status = response.status;
        throw error;
      }
      if (contentLength === '0') return {};
      return response.json();
    } catch (e) {
      this.handleAbortedRequest(url, options);
      if (e instanceof TypeError) {
        const error = new Error(`Network error. URL: ${url}; Error message: ${e.message}`);
        error.status = 0;
        throw error;
      } else if (e.name === 'TimeoutError' || e.name === 'AbortError') {
        const error = new Error(`Request timed out. URL: ${url}; Error message: ${e.message}`);
        error.status = 504;
        throw error;
      }
      throw e;
    }
  }

  async fetchFromServiceWithRetry(url, options, maxRetryDelay = 120) {
    let timeLapsed = 0;
    while (timeLapsed < maxRetryDelay) {
      this.handleAbortedRequest(url, options);
      const response = await this.fetchFromService(url, options, false);
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

  async deleteCallToService(url, accessToken) {
    const options = {
      method: 'DELETE',
      headers: {
        'Authorization': accessToken,
        'x-api-key': 'unity', 
      },
    };
    return this.fetchFromService(url, options);
  }

  async deleteCallToService(url, accessToken) {
    const options = {
      method: 'DELETE',
      headers: {
        'Authorization': accessToken,
        'x-api-key': 'unity', 
      },
    };
    return this.fetchFromService(url, options);
  }
}

export default class ActionBinder {
  static SINGLE_FILE_ERROR_MESSAGES = {
    UNSUPPORTED_TYPE: 'validation_error_unsupported_type',
    EMPTY_FILE: 'validation_error_empty_file',
    FILE_TOO_LARGE: 'validation_error_file_too_large',
  };

  static MULTI_FILE_ERROR_MESSAGES = {
    UNSUPPORTED_TYPE: 'validation_error_unsupported_type_multi',
    EMPTY_FILE: 'validation_error_empty_file_multi',
    FILE_TOO_LARGE: 'validation_error_file_too_large_multi',
  };

  static LIMITS_MAP = {
    fillsign: ['single','page-limit-100'],
    'compress-pdf': ['hybrid', 'allowed-filetypes-all', 'max-filesize-2-gb'],
    'add-comment': ['single'],
    'number-pages': ['single'],
    'split-pdf': ['single', 'max-filesize-1-gb','split-pdf-page-limits','signedInallowedFileTypes'],
    'crop-pages': ['single'],
    'delete-pages': ['single', 'page-limit-500'],
    'insert-pdf': ['single', 'page-limit-500'],
    'extract-pages': ['single', 'page-limit-500'],
    'reorder-pages': ['single', 'page-limit-500'],
    sendforsignature: ['single', 'max-filesize-5-mb', 'page-limit-25'],
    'pdf-to-word': ['hybrid', 'allowed-filetypes-pdf-only', 'max-filesize-250-mb'],
    'pdf-to-excel': ['hybrid', 'allowed-filetypes-pdf-only', 'max-filesize-100-mb'],
    'pdf-to-ppt': ['hybrid', 'allowed-filetypes-pdf-only', 'max-filesize-250-mb'],
    'pdf-to-image': ['hybrid', 'allowed-filetypes-pdf-only', 'max-filesize-100-mb'],
    createpdf: ['hybrid', 'allowed-filetypes-all', 'max-filesize-100-mb'],
    'word-to-pdf': ['hybrid', 'allowed-filetypes-all', 'max-filesize-100-mb'],
    'excel-to-pdf': ['hybrid', 'allowed-filetypes-all', 'max-filesize-100-mb'],
    'ppt-to-pdf': ['hybrid', 'allowed-filetypes-all', 'max-filesize-100-mb'],
    'jpg-to-pdf': ['hybrid', 'allowed-filetypes-all', 'max-filesize-100-mb'],
    'png-to-pdf': ['hybrid', 'allowed-filetypes-all', 'max-filesize-100-mb'],
    'combine-pdf': ['hybrid', 'page-limit-500', 'allowed-filetypes-all', 'max-filesize-100-mb', 'max-numfiles-100'],
    'rotate-pages': ['hybrid', 'page-limit-500', 'allowed-filetypes-pdf-only', 'max-filesize-100-mb', 'max-numfiles-100'],
    'protect-pdf': ['single'],
    'ocr-pdf': ['hybrid', 'allowed-filetypes-all', 'page-limit-100', 'max-filesize-100-mb'],
    'chat-pdf': ['hybrid', 'allowed-filetypes-pdf-word-ppt-txt', 'page-limit-600', 'max-numfiles-10', 'max-filesize-100-mb'],
    'chat-pdf-student': ['hybrid', 'allowed-filetypes-pdf-word-ppt-txt', 'page-limit-600', 'max-numfiles-10', 'max-filesize-100-mb']
  };
   
static ERROR_MAP = {
  'verb_upload_error_generic': -1,
  'verb_upload_error_loading_verb_limits': -50,
  'verb_upload_error_empty_verb_limits': -51,
  'verb_upload_error_duplicate_asset': -52,
  'verb_upload_error_validate_files': -100,
  'verb_upload_error_renaming_file' : -101,
  'verb_upload_error_max_page_count': -150,
  'verb_upload_error_min_page_count': -151,
  'verb_upload_error_verify_page_count': -152,
  'verb_upload_error_max_page_count_multi': -153,
  'verb_upload_error_unsupported_type': -170,
  'verb_upload_error_empty_file': -171,
  'verb_upload_error_file_too_large': -172,
  'verb_upload_error_only_accept_one_file': -173,
  'verb_upload_error_file_same_type': -174,
  'verb_upload_error_unsupported_type_multi': -200,
  'verb_upload_error_empty_file_multi': -201,
  'verb_upload_error_file_too_large_multi': -202,
  'verb_upload_error_multiple_invalid_files': -203,
  'verb_upload_error_max_num_files': -204,
  'verb_upload_error_max_quota_exceeded': -250,
  'verb_upload_error_no_storage_provision': -251,
  'verb_upload_error_duplicate_operation': -252,
  'verb_upload_exception_finalize': -300,
  'verb_upload_exception_validate_page_count': -301,
  'verb_upload_error_fetch_redirect_url': -350,
  'verb_upload_error_finalize': -351,
  'verb_upload_error_chunk_upload': -352,
  'verb_cookie_not_set': -353,
  'verb_upload_warn_chunk_upload': -600,
  'verb_upload_warn_delete_asset': -601,
  'verb_upload_error_redirect_to_app': -900,
  'verb_upload_error_finalize_asset': -901
};

  constructor(unityEl, workflowCfg, wfblock, canvasArea, actionMap = {}) {
    this.unityEl = unityEl;
    this.workflowCfg = workflowCfg;
    this.isUploading = false;
    this.block = wfblock;
    this.canvasArea = canvasArea;
    this.actionMap = actionMap;
    this.limits = {};
    this.operations = [];
    this.acrobatApiConfig = this.getAcrobatApiConfig();
    this.serviceHandler = new ServiceHandler();
    this.uploadHandler = null;
    this.splashScreenEl = null;
    this.transitionScreen = null;
    this.promiseStack = [];
    this.signedOut = undefined;
    this.tokenError = null;
    this.redirectUrl = '';
    this.filesData = {};
    this.errorData = {};
    this.redirectWithoutUpload = false;
    this.LOADER_LIMIT = 95;
    this.MULTI_FILE = false;
    this.initActionListeners = this.initActionListeners.bind(this);
    this.abortController = new AbortController();
    this.uploadTimestamp = null;
    this.initialize();
  }

  async initialize() {
    await this.isSignedOut();
    await this.applySignedInSettings();
  }

  async isSignedOut() {
    const result = await isGuestUser();
    if (result.error) {
      this.tokenError = result.error;
      return;
    }
    this.signedOut = result.isGuest ?? undefined;
  }

  setIsUploading(isUploading) {
    this.isUploading = isUploading;
  }

  getAbortSignal() {
    return this.abortController.signal;
  }

  acrobatSignedInSettings() {
    if (this.limits.signedInallowedFileTypes && !this.signedOut) this.limits.allowedFileTypes.push(...this.limits.signedInallowedFileTypes);
  }

  async applySignedInSettings() {
    if (this.signedOut === undefined) return;
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
      getMetadata: `${unityConfig.apiEndPoint}/asset/metadata`
    };
    return unityConfig;
  }

  async handlePreloads() {
    const parr = [];
    if (this.workflowCfg.targetCfg.showSplashScreen) {
      parr.push(
        `${getUnityLibs()}/core/styles/splash-screen.css`,
      );
    }
    await priorityLoad(parr);
  }

  async dispatchErrorToast(errorType, status, info = null, lanaOnly = false, showError = true, errorMetaData = {}) {
    if (!showError) return;
    const errorMessage = errorType in this.workflowCfg.errors
      ? this.workflowCfg.errors[errorType]
      : await (async () => {
        const getError = (await import('../../../scripts/errors.js')).default;
        const oldKey = ActionBinder.NEW_TO_OLD_ERROR_KEY_MAP[errorType] || errorType;
        return getError(this.workflowCfg.enabledFeatures[0], oldKey);
      })();
    const message = lanaOnly ? '' : errorMessage || 'Unable to process the request';
    const sendToSplunk = this.workflowCfg.targetCfg.sendSplunkAnalytics;
    this.block.dispatchEvent(new CustomEvent(
      unityConfig.errorToastEvent,
      {
        detail: {
          code: errorType,
          message: `${message}`,
          status,
          info: `Upload Type: ${this.MULTI_FILE ? 'multi' : 'single'}; ${info}`,
          accountType: this.signedOut ? 'guest' : 'signed-in',
          metaData: this.filesData,
          errorData: {
            code: ActionBinder.ERROR_MAP[errorMetaData.code || errorType] || -1,
            subCode: ActionBinder.ERROR_MAP[errorMetaData.subCode] || errorMetaData.subCode,
            desc: errorMetaData.desc || message || undefined
          },
          sendToSplunk,
        },
      },
    ));
  }

  async dispatchAnalyticsEvent(eventName, data = null) {
    const sendToSplunk = this.workflowCfg.targetCfg.sendSplunkAnalytics;
    const detail = { event: eventName, ...(data && { data }) , sendToSplunk };
    this.block.dispatchEvent(new CustomEvent(unityConfig.trackAnalyticsEvent, { detail }));
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
        await this.dispatchErrorToast('pre_upload_warn_renamed_invalid_file_name', null, `Renamed ${rawFileName} to ${fileName}`, true)
      }
      return fileName;
    } catch (error) {
      console.error('Error sanitizing filename:', error);
      await this.dispatchErrorToast('error_generic', 500, `Error renaming file: ${rawFileName}`, false, true, {
        code: 'pre_upload_error_renaming_file',
        subCode: error.name,
        desc: error.message,
      });
      return '---';
    }
  }

  isSameFileType(verb, fileType) {
    const verbToFileTypeMap = {
      'pdf-to-word': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword', 'application/rtf'],
      'pdf-to-excel': ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
      'pdf-to-ppt': ['application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
      'pdf-to-jpg': ['image/jpeg'],
      'pdf-to-png': ['image/png'],
    };
    return verbToFileTypeMap[verb]?.includes(fileType) || false;
  }

  async validateFiles(files) {
    const errorMessages = files.length === 1
      ? ActionBinder.SINGLE_FILE_ERROR_MESSAGES
      : ActionBinder.MULTI_FILE_ERROR_MESSAGES;
    let allFilesFailed = true;
    const errorTypes = new Set();
    const validFiles = [];

    if (this.limits.maxNumFiles && files.length > this.limits.maxNumFiles) {
      await this.dispatchErrorToast('verb_upload_error_max_num_files', null, `Maximum ${this.limits.maxNumFiles} files allowed`, false, true, { 
        code: 'verb_upload_error_validate_files', 
        subCode: 'verb_upload_error_max_num_files'
      });
      return { isValid: false, validFiles };
    }

    for (const file of files) {
      let fail = false;
      if (!this.limits.allowedFileTypes.includes(file.type)) {
        let errorMessage = errorMessages.UNSUPPORTED_TYPE;
        if (this.isSameFileType(this.workflowCfg.enabledFeatures[0], file.type)) errorMessage = 'validation_error_file_same_type';
        if (this.MULTI_FILE) await this.dispatchErrorToast(errorMessage, null, `File type: ${file.type}`, true, true, { code: 'validation_error_validate_files', subCode: errorMessage });
        else await this.dispatchErrorToast(errorMessage, null, null, false, true, { code: 'validation_error_validate_files', subCode: errorMessage });
        fail = true;
        errorTypes.add('UNSUPPORTED_TYPE');
      }
      if (!file.size) {
        if (this.MULTI_FILE) await this.dispatchErrorToast(errorMessages.EMPTY_FILE, null, 'Empty file', true, true, { code: 'validation_error_validate_files', subCode: errorMessages.EMPTY_FILE });
        else await this.dispatchErrorToast(errorMessages.EMPTY_FILE, null, null, false, true, { code: 'validation_error_validate_files', subCode: errorMessages.EMPTY_FILE });
        fail = true;
        errorTypes.add('EMPTY_FILE');
      }
      if (file.size > this.limits.maxFileSize) {
        if (this.MULTI_FILE) await this.dispatchErrorToast(errorMessages.FILE_TOO_LARGE, null, `File too large: ${file.size}`, true, true, { code: 'validation_error_validate_files', subCode: errorMessages.FILE_TOO_LARGE });
        else await this.dispatchErrorToast(errorMessages.FILE_TOO_LARGE, null, null, false, true, { code: 'validation_error_validate_files', subCode: errorMessages.FILE_TOO_LARGE });
        fail = true;
        errorTypes.add('FILE_TOO_LARGE');
      }
      if (!fail) {
        allFilesFailed = false;
        validFiles.push(file);
      }
    }
    if (allFilesFailed) {
      if (this.MULTI_FILE) {
        if (errorTypes.size === 1) {
          const errorType = Array.from(errorTypes)[0];
          await this.dispatchErrorToast(errorMessages[errorType], null, null, false, true, { code: 'validation_error_validate_files', subCode: errorMessages[errorType] });
        } else {
          let errorDesc = '';
          for (const errorType of errorTypes) {
            errorDesc += `${errorMessages[errorType]}, `;
          }
          errorDesc = errorDesc.slice(0, -2);
          await this.dispatchErrorToast('error_generic', null, `All ${files.length} files failed validation. Error Types: ${Array.from(errorTypes).join(', ')}`, false, true, { code: 'validation_error_validate_files', subCode: 'validation_error_multiple_invalid_files', desc: errorDesc });
        }
      }
      return { isValid: false, validFiles};
    }
    return {isValid: true, validFiles};
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
        const { default: TransitionScreen } = await import(`${getUnityLibs()}/scripts/transition-screen.js`);
        this.transitionScreen = new TransitionScreen(this.transitionScreen.splashScreenEl, this.initActionListeners, this.LOADER_LIMIT, this.workflowCfg);
        await this.transitionScreen.showSplashScreen();
        await this.dispatchErrorToast('pre_upload_error_fetch_redirect_url', e.status || 500, `Exception thrown when retrieving redirect URL. Message: ${e.message}, Options: ${JSON.stringify(cOpts)}`, false, e.showError, {
          code: 'pre_upload_error_fetch_redirect_url',
          subCode: e.status,
          desc: e.message,
        });
      });
  }

  async handleRedirect(cOpts, filesData) {
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
    this.dispatchAnalyticsEvent('redirectUrl', {...filesData, redirectUrl: this.redirectUrl});
    return true;
  }

  async handleSingleFileUpload(files) {
    this.filesData = {...this.filesData,uploadType: 'sfu'};
    if (this.signedOut) await this.uploadHandler.singleFileGuestUpload(files[0], this.filesData);
    else await this.uploadHandler.singleFileUserUpload(files[0], this.filesData);
  }

  async handleMultiFileUpload(files) {
    this.MULTI_FILE = true;
    this.LOADER_LIMIT = 65;
    this.filesData = {...this.filesData,uploadType: 'mfu'};
    this.dispatchAnalyticsEvent('multifile', this.filesData);
    if (this.signedOut) await this.uploadHandler.multiFileGuestUpload(files, this.filesData);
    else await this.uploadHandler.multiFileUserUpload(files, this.filesData);
  }

  async handleFileUpload(files, eventName, totalFileSize) {
    const verbsWithoutFallback = this.workflowCfg.targetCfg.verbsWithoutMfuToSfuFallback;
    const sanitizedFiles = await Promise.all(files.map(async (file) => {
      const sanitizedFileName = await this.sanitizeFileName(file.name);
      return new File([file], sanitizedFileName, { type: file.type, lastModified: file.lastModified });
    }));
    const { isValid, validFiles } = await this.validateFiles(sanitizedFiles);
    if (!isValid) return;
    const { default: UploadHandler } = await import(`${getUnityLibs()}/core/workflow/${this.workflowCfg.name}/upload-handler.js`);
    this.uploadHandler = new UploadHandler(this, this.serviceHandler);
    if (files.length === 1 || (validFiles.length === 1 && !verbsWithoutFallback.includes(this.workflowCfg.enabledFeatures[0]))) {
      await this.handleSingleFileUpload(validFiles);
    } else {
      await this.handleMultiFileUpload(validFiles);
    }
  }

  async loadVerbLimits(workflowName, keys) {
    try {
      const response = await fetch(`${getUnityLibs()}/core/workflow/${workflowName}/limits.json`);
      if (!response.ok) throw new Error('Error loading verb limits');
      const limits = await response.json();
      const combinedLimits = keys.reduce((acc, key) => {
        if (limits[key]) Object.entries(limits[key]).forEach(([k, v]) => { acc[k] = v; });
        return acc;
      }, {});
      if (!combinedLimits || Object.keys(combinedLimits).length === 0) await this.dispatchErrorToast('error_generic', 500, 'No verb limits found', false, true, {
        code: 'pre_upload_error_empty_verb_limits',
        desc: 'No verb limits found',
      });
      return combinedLimits;
    } catch (e) {
      await this.dispatchErrorToast('error_generic', 500, `Exception thrown when loading verb limits: ${e.message}`, false, true, {
        code: 'pre_upload_error_loading_verb_limits',
        subCode: e.status,
        desc: e.message,
      });
      return {};
    }
  }

  async processSingleFile(files) {
    this.limits = await this.loadVerbLimits(this.workflowCfg.name, ActionBinder.LIMITS_MAP[this.workflowCfg.enabledFeatures[0]]);
    if (!this.limits || Object.keys(this.limits).length === 0) return;
    if (!files || files.length > this.limits.maxNumFiles) {
      await this.dispatchErrorToast('validation_error_only_accept_one_file');
      return;
    }
    const file = files[0];
    if (!file) return;
    await this.handleFileUpload(files);
  }

  async processHybrid(files) {
    if (!files) {
      await this.dispatchErrorToast('validation_error_only_accept_one_file');
      return;
    }
    this.limits = await this.loadVerbLimits(this.workflowCfg.name, ActionBinder.LIMITS_MAP[this.workflowCfg.enabledFeatures[0]]);
    if (!this.limits || Object.keys(this.limits).length === 0) return;
    await this.handleFileUpload(files);
  }

  delay(ms) {
    return new Promise((res) => { setTimeout(() => { res(); }, ms); });
  }

  async continueInApp() {
    if (!this.redirectUrl || !(this.operations.length || this.redirectWithoutUpload)) return;
    this.LOADER_LIMIT = 100;
    const { default: TransitionScreen } = await import(`${getUnityLibs()}/scripts/transition-screen.js`);
    this.transitionScreen = new TransitionScreen(this.transitionScreen.splashScreenEl, this.initActionListeners, this.LOADER_LIMIT, this.workflowCfg);
    this.transitionScreen.updateProgressBar(this.transitionScreen.splashScreenEl, 100);
    try {
      await this.delay(500);
      const [baseUrl, queryString] = this.redirectUrl.split('?');
      const additionalParams = unityConfig.env === 'stage' ? `${window.location.search.slice(1)}&` : '';
      if (this.multiFileFailure && this.redirectUrl.includes('#folder')) {
        window.location.href = `${baseUrl}?${additionalParams}feedback=${this.multiFileFailure}&${queryString}`;
      } else window.location.href = `${baseUrl}?${this.redirectWithoutUpload === false ? `UTS_Uploaded=${this.uploadTimestamp}&` : ''}${additionalParams}${queryString}`;
    } catch (e) {
      await this.transitionScreen.showSplashScreen();
      await this.dispatchErrorToast('error_generic', 500, `Exception thrown when redirecting to product; ${e.message}`, false, e.showError, {
        code: 'upload_error_redirect_to_app',
        subCode: e.status,
        desc: e.message,
      });
    }
  }

  async cancelAcrobatOperation() {
    const { default: TransitionScreen } = await import(`${getUnityLibs()}/scripts/transition-screen.js`);
    this.transitionScreen = new TransitionScreen(this.transitionScreen.splashScreenEl, this.initActionListeners, this.LOADER_LIMIT, this.workflowCfg);
    await this.transitionScreen.showSplashScreen();
    this.redirectUrl = '';
    this.filesData = this.filesData || {};
    this.filesData.workflowStep = this.isUploading ? 'uploading' : 'preuploading';
    this.dispatchAnalyticsEvent('cancel', this.filesData);
    this.setIsUploading(false);
    this.abortController.abort();
    this.abortController = new AbortController();
    const e = new Error('Operation termination requested.');
    e.showError = false;
    const cancelPromise = Promise.reject(e);
    this.promiseStack.unshift(cancelPromise);
  }

  async acrobatActionMaps(value, files, totalFileSize, eventName) {
    await this.handlePreloads();
    if (this.signedOut === undefined) {
      if (this.tokenError) {
        const errorDetails = JSON.stringify(this.tokenError, null, 2);
        await this.dispatchErrorToast('pre_upload_error_fetching_access_token', null, `Could not fetch access token; Error: ${errorDetails}`, false, true, {
          code: 'pre_upload_error_fetching_access_token',
          desc: `Could not fetch access token; Error: ${errorDetails}`,
        });
        return;
      }
    }
    window.addEventListener('DCUnity:RedirectReady', async () => {
      await this.continueInApp();
    });
    const uploadType = ActionBinder.LIMITS_MAP[this.workflowCfg.enabledFeatures[0]][0];
    switch (value) {
      case 'upload':
        this.promiseStack = [];
        this.filesData = { type: this.isMixedFileTypes(files), size: totalFileSize, count: files.length, uploadType: files.length > 1 ? 'mfu' : 'sfu' };
        this.dispatchAnalyticsEvent(eventName, this.filesData);
        if (uploadType === 'single') await this.processSingleFile(files);
        else if (uploadType === 'hybrid') await this.processHybrid(files);
        break;
      case 'interrupt':
        await this.cancelAcrobatOperation();
        break;
      default:
        break;
    }
    if (this.redirectWithoutUpload) await this.continueInApp();
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

  setAssetId(assetId) {
    this.filesData.assetId = assetId;
  }

  async initActionListeners(b = this.block, actMap = this.actionMap) {
    for (const [key, value] of Object.entries(actMap)) {
      const el = b.querySelector(key);
      if (!el) return;
      switch (true) {
        case el.nodeName === 'A':
          el.addEventListener('click', async (e) => {
            e.preventDefault();
            await this.acrobatActionMaps(value);
          });
          break;
        case el.nodeName === 'DIV':
          el.addEventListener('drop', async (e) => {
            e.preventDefault();
            const { files, totalFileSize } = this.extractFiles(e);
            await this.acrobatActionMaps(value, files, totalFileSize, 'drop');
          });
          break;
        case el.nodeName === 'INPUT':
          el.addEventListener('change', async (e) => {
            const { files, totalFileSize } = this.extractFiles(e);
            await this.acrobatActionMaps(value, files, totalFileSize, 'change');
            e.target.value = '';
          });
          break;
        default:
          break;
      }
    }
    if (b === this.block) {
      const { default: TransitionScreen } = await import(`${getUnityLibs()}/scripts/transition-screen.js`);
      this.transitionScreen = new TransitionScreen(this.splashScreenEl, this.initActionListeners, this.LOADER_LIMIT, this.workflowCfg);
      await this.transitionScreen.delayedSplashLoader();
    }
  }
}
