/* eslint-disable quote-props */
/* eslint-disable quotes */
import sinon from 'sinon';
import { readFile } from '@web/test-runner-commands';
import { expect } from '@esm-bundle/chai';

window.adobeIMS = {
  getAccessToken: () => 'token',
  adobeid: { locale: 'en' },
};
const { default: init } = await import('../../../unitylibs/blocks/unity/unity.js');
document.body.innerHTML = await readFile({ path: './mocks/ps-body.html' });

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

describe('Unity PS Block', () => {
  before(async () => {
    const unityElement = document.querySelector('.unity');
    await init(unityElement);
  });

  it('Unity PS block should be loaded', async () => {
    const unityWidget = document.querySelector('.unity-widget');
    expect(unityWidget).to.exist;
  });

  it('Test actions', async () => {
    const fetchStub = sinon.stub(window, 'fetch');
    fetchStub.callsFake(async (url) => {
      let payload = {};
      if (url.includes('PhotoshopRemoveBackground')) {
        payload = { assetId: 'testid', outputUrl: 'http://localhost:2000/test/assets/media_.jpeg?width=2000&format=webply&optimize=medium' };
      } else if (url.includes('asset')) {
        payload = { id: 'testid', href: 'http://localhost:2000/test/assets/media_.jpeg?width=2000&format=webply&optimize=medium' };
      } else if (url.includes('PhotoshopChangeBackground')) {
        payload = { assetId: 'testid', outputUrl: 'http://localhost:2000/test/assets/media_.jpeg?width=2000&format=webply&optimize=medium' };
      } else if (url.includes('connector')) {
        payload = { url: window.location.href };
      } else if (url.includes('finalize')) {
        payload = {};
      }
      return Promise.resolve({
        json: async () => payload,
        status: 200,
        ok: true,
      });
    });
    document.querySelector('.removebg-button').click();
    await delay(300);
    document.querySelector('.changebg-option').click();
    await delay(300);
    const fileInput = document.querySelector('.file-upload');
    const base64Image = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/wcAAwAB/78fKfoAAAAASUVORK5CYII=';
    const imageBuffer = Uint8Array.from(atob(base64Image), c => c.charCodeAt(0));
    const imageBlob = new Blob([imageBuffer], { type: 'image/png' });
    const file = new File([imageBlob], 'image.png', { type: 'image/png' });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    fileInput.files = dataTransfer.files;
    const changeEvent = new Event('change');
    fileInput.dispatchEvent(changeEvent);
    await delay(300);
    document.querySelector('.continue-in-app-button').click();
    setTimeout(() => {
      fetchStub.restore();
    }, 2000);
  });
});
