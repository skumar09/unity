import { getGuestAccessToken } from '../../scripts/utils.js';

export async function getImageBlobData(url) {
  return new Promise((res, rej) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.responseType = 'blob';
    xhr.onload = () => {
      if (xhr.status === 200) res(xhr.response);
      else rej(xhr.status);
    };
    xhr.send();
  });
}

async function uploadImgToUnity(storageUrl, id, blobData, fileType) {
  const uploadOptions = {
    method: 'PUT',
    headers: { 'Content-Type': fileType },
    body: blobData,
  };
  const response = await fetch(storageUrl, uploadOptions);
  if (response.status !== 200) return '';
  return id;
}

function getFileType(cfg, imgUrl) {
  if (imgUrl.startsWith('blob:')) return cfg.uploadState.filetype;
  if (imgUrl.endsWith('.jpeg')) return 'image/jpeg';
  if (imgUrl.endsWith('.png')) return 'image/png';
  if (imgUrl.endsWith('.jpg')) return 'image/jpg';
  return '';
}

export async function uploadAsset(cfg, imgUrl) {
  const { apiEndPoint } = cfg;
  const genIdOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getGuestAccessToken(),
      'x-api-key': 'leo',
    },
  };
  const response = await fetch(`${apiEndPoint}/asset`, genIdOptions);
  if (response.status !== 200) return '';
  const { id, href } = await response.json();
  const blobData = await getImageBlobData(imgUrl);
  const fileType = getFileType(cfg, imgUrl);
  const assetId = await uploadImgToUnity(href, id, blobData, fileType);
  return assetId;
}
