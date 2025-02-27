/* eslint-disable quote-props */
/* eslint-disable quotes */
import sinon from 'sinon';
import { readFile } from '@web/test-runner-commands';
import { expect } from '@esm-bundle/chai';

window.adobeIMS = {
  getAccessToken: () => { return {"token": 'token', "expire": { valueOf: () => Date.now() + (5 * 60 * 1000)}}},
  adobeid: { locale: 'en' },
};
const { default: init } = await import('../../../unitylibs/blocks/unity/unity.js');
document.body.innerHTML = await readFile({ path: './mocks/dc-body.html' });
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
describe('Unity DC Block', function() {
  this.timeout(10000);
  before(async () => {
    const fetchStub = sinon.stub(window, 'fetch');
    fetchStub.callsFake(async (url) => {
      let payload = {};
      if (url.includes('splashscreen')) {
        payload = '';
      } else if (url.includes('target-config.json')) {
        payload = {"verb-widget": {
          "type": "pdf",
          "selector": ".verb-wrapper",
          "handler": "render",
          "renderWidget": false,
          "source": ".verb-wrapper .verb-container",
          "target": ".verb-wrapper .verb-container",
          "limits": { "maxNumFiles": 1, "maxFileSize": 104857600, "allowedFileTypes": ["application/pdf"]},
          "showSplashScreen": true,
          "splashScreenConfig": {"fragmentLink": "/test/core/workflow/mocks/splash", "splashScreenParent": "body"},
          "actionMap": {
            ".verb-wrapper": [{"actionType": "croppages"},{"actionType": "continueInApp"}],
            "#file-upload": [{"actionType": "croppages"},{"actionType": "continueInApp"}]
          }
        }};
      } else if (url.includes('finalize')) {
        payload = {};
      } else if (url.includes('metadata')) {
        payload = {};
      } else if (url.includes('asset')) {
        payload = {id : 'testid'};
      }
      return Promise.resolve({
        json: async () => payload,
        text: async () => payload,
        status: 200,
        ok: true,
      });
    });
    const unityElement = document.querySelector('.unity');
    await init(unityElement);
    await delay(8000);
  });

  it('Unity DC block should be loaded', async () => {
    const unityWidget = document.querySelector('.unity');
    expect(unityWidget).to.exist;
  });

  it('Test verbs', async () => {
    const fileInput = document.querySelector('#file-upload');
    const base64PDF = '';
    const imageBuffer = Uint8Array.from(atob(base64PDF), c => c.charCodeAt(0));
    const imageBlob = new Blob([imageBuffer], { type: 'application/pdf' });
    const file = new File([imageBlob], 'mock.pdf', { type: 'application/pdf' });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    fileInput.files = dataTransfer.files;
    const changeEvent = new Event('change');
    fileInput.dispatchEvent(changeEvent);
  });
});
