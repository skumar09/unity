async function getImageBlobData(url) {
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

async function uploadToUnityStorage(storageUrl, blobData) {
  const uploadOptions = {
    method: 'PUT',
    headers: { 'Content-Type': 'image/jpeg' },
    body: blobData,
  };
  const response = await fetch(storageUrl, uploadOptions);
}

export default async function uploadAsset(url) {
  const genIdOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: window.bearerToken,
      'x-api-key': 'leo',
    },
  };
  const response = await fetch('https://assistant-int.adobe.io/api/v1/asset', genIdOptions);
  if (response.status !== 200) return '';
  const { id, href } = await response.json();
  const blobData = await getImageBlobData(url);
  await uploadToUnityStorage(href, blobData);
  if (response.status !== 200) return '';
  return id;
}
