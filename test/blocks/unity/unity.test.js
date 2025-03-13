import { readFile } from '@web/test-runner-commands';
import { expect } from '@esm-bundle/chai';

const { default: init } = await import('../../../unitylibs/blocks/unity/unity.js');
document.body.innerHTML = await readFile({ path: './mocks/body.html' });

describe('Unity Block', () => {
  before(async () => {
    const unityElement = document.querySelector('.unity');
    await init(unityElement);
  });

  it('Unity block should be loaded', async () => {
    const unityWidget = document.querySelector('.unity-widget');
    expect(unityWidget).to.exist;
  });
});
