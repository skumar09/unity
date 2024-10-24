/* eslint-disable eqeqeq */
/* eslint-disable no-await-in-loop */
/* eslint-disable class-methods-use-this */
/* eslint-disable no-restricted-syntax */

import {
  getGuestAccessToken,
  unityConfig,
} from '../../../scripts/utils.js';

export default class ServiceHandler {
  constructor(renderWidget = false, canvasArea = null) {
    this.renderWidget = renderWidget;
    this.canvasArea = canvasArea;
  }

  getHeaders() {
    return {
      headers: {
        'Content-Type': 'application/json',
        Authorization: getGuestAccessToken(),
        'x-api-key': unityConfig.apiKey,
      },
    };
  }

  async fetchFromService(url, options) {
    try {
      const response = await fetch(url, options);
      const error = new Error();
      const contentLength = response.headers.get('Content-Length');
      if (response.status !== 200) {
        if (contentLength !== '0') {
          const resJson = await response.json();
          ['quotaexceeded', 'notentitled'].forEach((errorMessage) => {
            if (resJson.reason?.includes(errorMessage)) error.message = errorMessage;
          });
        }
        error.status = response.status;
        throw error;
      }
      if (contentLength === '0') return {};
      return response.json();
    } catch (error) {
      if (error.name === 'TimeoutError' || error.name === 'AbortError') {
        error.status = 504;
      }
      throw error;
    }
  }

  async postCallToService(api, options) {
    const postOpts = {
      method: 'POST',
      ...this.getHeaders(),
      ...options,
    };
    return this.fetchFromService(api, postOpts);
  }

  async getCallToService(api, params) {
    const getOpts = {
      method: 'GET',
      ...this.getHeaders(),
    };
    const queryString = new URLSearchParams(params).toString();
    const url = `${api}?${queryString}`;
    return this.fetchFromService(url, getOpts);
  }
}
