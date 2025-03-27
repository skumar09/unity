import { expect } from '@esm-bundle/chai';
import sinon from 'sinon';
import { setLibs, getLibs, getHeaders } from '../../unitylibs/scripts/utils.js';

describe('Libs', () => {
  it('Default Libs', () => {
    const libs = setLibs('/libs');
    expect(libs).to.equal('https://main--milo--adobecom.aem.live/libs');
  });

  it('Does not support milolibs query param on prod', () => {
    const location = {
      hostname: 'business.adobe.com',
      search: '?milolibs=foo',
    };
    const libs = setLibs('/libs', location);
    expect(libs).to.equal('/libs');
  });

  it('Supports milolibs query param', () => {
    const location = {
      hostname: 'localhost',
      search: '?milolibs=foo',
    };
    const libs = setLibs('/libs', location);
    expect(libs).to.equal('https://foo--milo--adobecom.aem.live/libs');
  });

  it('Supports local milolibs query param', () => {
    const location = {
      hostname: 'localhost',
      search: '?milolibs=local',
    };
    const libs = setLibs('/libs', location);
    expect(libs).to.equal('http://localhost:6456/libs');
  });

  it('Supports forked milolibs query param', () => {
    const location = {
      hostname: 'localhost',
      search: '?milolibs=awesome--milo--forkedowner',
    };
    const libs = setLibs('/libs', location);
    expect(libs).to.equal('https://awesome--milo--forkedowner.aem.live/libs');
  });

  it('Should return libs', () => {
    const libs = getLibs();
    expect(libs).to.equal('https://awesome--milo--forkedowner.aem.live/libs');
  });
});

describe('Headers and Token', () => {
  let adobeIMSStub;

  beforeEach(() => {
    window.adobeIMS = { getAccessToken: () => {}, refreshToken: () => {} };
    adobeIMSStub = sinon.stub(window.adobeIMS, 'getAccessToken');
  });

  afterEach(() => {
    adobeIMSStub.restore();
  });

  it('Should return headers with guest access token', async () => {
    const token = { token: 'guest-token', expire: Date.now() + (10 * 60 * 1000) };
    adobeIMSStub.returns(token);

    const headers = await getHeaders('test-api-key');
    expect(headers).to.deep.equal({
      'Content-Type': 'application/json',
      Authorization: 'Bearer guest-token',
      'x-api-key': 'test-api-key',
    });
  });

  it('Should return headers with refreshed token if guest access token is expired', async () => {
    const token = { token: 'guest-token', expire: Date.now() - (10 * 60 * 1000) };
    adobeIMSStub.returns(token);
    sinon.stub(window.adobeIMS, 'refreshToken').resolves({ tokenInfo: { token: 'refreshed-token' } });

    const headers = await getHeaders('test-api-key');
    expect(headers).to.deep.equal({
      'Content-Type': 'application/json',
      Authorization: 'Bearer refreshed-token',
      'x-api-key': 'test-api-key',
    });
  });

  it('Should return headers with empty string if refresh token fails', async () => {
    const token = { token: 'guest-token', expire: Date.now() - (10 * 60 * 1000) };
    adobeIMSStub.returns(token);
    sinon.stub(window.adobeIMS, 'refreshToken').rejects(new Error('Refresh token failed'));

    const headers = await getHeaders('test-api-key');
    expect(headers).to.deep.equal({
      'Content-Type': 'application/json',
      Authorization: '',
      'x-api-key': 'test-api-key',
    });
  });
});
