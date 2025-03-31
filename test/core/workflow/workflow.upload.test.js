import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';
import { readFile } from '@web/test-runner-commands';
import { setUnityLibs } from '../../../unitylibs/scripts/utils.js';

// Initialize unitylibs path
setUnityLibs('/unitylibs');

window.adobeIMS = {
  getAccessToken: () => ({ token: 'token', expire: { valueOf: () => Date.now() + (5 * 60 * 1000) } }),
  adobeid: { locale: 'en' },
};

const { default: init } = await import('../../../unitylibs/blocks/unity/unity.js');
document.body.innerHTML = await readFile({ path: './mocks/upload-body.html' });

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

describe('Unity Upload Block', function() {
  this.timeout(10000);
  let unityEl;
  let mockFile;
  let fetchStub;

  before(async () => {
    fetchStub = sinon.stub(window, 'fetch');
    fetchStub.callsFake(async (url) => {
      let payload = {};
      if (url.includes('splashscreen')) {
        payload = '';
      } else if (url.includes('target-config.json')) {
        payload = {
          upload: {
            type: 'upload',
            selector: '.drop-zone',
            handler: 'render',
            renderWidget: false,
            source: '.drop-zone',
            target: '.drop-zone',
            limits: {
              maxNumFiles: 1,
              maxFileSize: 40000000,
              maxHeight: 8000,
              maxWidth: 8000,
              allowedFileTypes: ['image/jpeg', 'image/png', 'image/jpg'],
            },
            showSplashScreen: true,
            splashScreenConfig: {
              fragmentLink: '/test/core/workflow/mocks/splash',
              splashScreenParent: 'body',
            },
            actionMap: {
              '.drop-zone': [{ actionType: 'upload' }],
              '#file-upload': [{ actionType: 'upload' }],
            },
          },
        };
      } else if (url.includes('finalize')) {
        payload = {};
      } else if (url.includes('asset')) {
        payload = { id: 'testid', href: 'https://test-url.com' };
      }
      return Promise.resolve({
        json: async () => payload,
        text: async () => payload,
        status: 200,
        ok: true,
      });
    });

    unityEl = document.querySelector('.unity.workflow-upload');
    mockFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
    await init(unityEl);
    await delay(1000);
  });

  afterEach(() => {
    sinon.restore();
    document.body.innerHTML = '';
  });

  beforeEach(async () => {
    document.body.innerHTML = await readFile({ path: './mocks/upload-body.html' });
    unityEl = document.querySelector('.unity.workflow-upload');
    await init(unityEl);
    await delay(1000);
  });

  describe('File Upload', () => {
    it('should handle successful file upload', async () => {
      const fileInput = document.querySelector('#file-upload');
      const base64Image = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/wcAAwAB/78fKfoAAAAASUVORK5CYII=';
      const imageBuffer = Uint8Array.from(atob(base64Image), (c) => c.charCodeAt(0));
      const imageBlob = new Blob([imageBuffer], { type: 'image/png' });
      const file = new File([imageBlob], 'mock.png', { type: 'image/png' });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      fileInput.files = dataTransfer.files;
      console.log('File set on input:', fileInput.files.length > 0 ? 'Yes' : 'No');
      const changeEvent = new Event('change', { bubbles: true });
      fileInput.dispatchEvent(changeEvent);
    });

    it('should show error for invalid file type', async () => {
      const invalidFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
      const fileInput = document.querySelector('input[type="file"]');
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(invalidFile);
      fileInput.files = dataTransfer.files;
      const event = new Event('change', { bubbles: true });
      Object.defineProperty(event, 'target', {
        value: fileInput,
        writable: true,
      });
      fileInput.dispatchEvent(event);
      await delay(500);
      const errorToast = document.querySelector('.alert-holder');
      expect(errorToast).to.not.be.null;
      expect(errorToast.classList.contains('show')).to.be.true;
    });

    it('should show error for file size exceeding limit', async () => {
      const largeFile = new File(['x'.repeat(41 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
      const fileInput = document.querySelector('input[type="file"]');
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(largeFile);
      fileInput.files = dataTransfer.files;
      const event = new Event('change', { bubbles: true });
      Object.defineProperty(event, 'target', {
        value: fileInput,
        writable: true,
      });
      fileInput.dispatchEvent(event);
      await delay(500);
      const errorToast = document.querySelector('.alert-holder');
      expect(errorToast).to.not.be.null;
      expect(errorToast.classList.contains('show')).to.be.true;
    });
  });

  describe('Drag and Drop', () => {
    it('should handle drag and drop upload', async () => {
      const dropZone = document.querySelector('.drop-zone');
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(mockFile);
      const dropEvent = new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer,
      });
      dropZone.dispatchEvent(dropEvent);
    });
  });
});
