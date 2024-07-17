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

async function uploadImgToUnity(storageUrl, id, blobData) {
  const uploadOptions = {
    method: 'PUT',
    headers: { 'Content-Type': 'image/jpeg' },
    body: blobData,
  };
  const response = await fetch(storageUrl, uploadOptions);
  if (response.status !== 200) return '';
  return id;
}

export async function uploadAsset(apiEp, imgUrl) {
  const genIdOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: window.bearerToken,
      'x-api-key': 'leo',
    },
  };
  const response = await fetch(`${apiEp}/asset`, genIdOptions);
  if (response.status !== 200) return '';
  const { id, href } = await response.json();
  const blobData = await getImageBlobData(imgUrl);
  const assetId = await uploadImgToUnity(href, id, blobData);
  return assetId;
}
