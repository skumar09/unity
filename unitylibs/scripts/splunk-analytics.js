function getSessionID() {
  const aToken = window.adobeIMS.getAccessToken();
  const arrayToken = aToken?.token.split('.');
  if (!arrayToken) return;
  const tokenPayload = JSON.parse(atob(arrayToken[1]));
  // eslint-disable-next-line consistent-return
  return tokenPayload.sub || tokenPayload.user_id;
}

function createPayloadForSplunk(metaData) {
  const { eventName, product, errorData, redirectUrl, assetId, statusCode, verb, action, workflowStep } = metaData;
  return {
    event: {
      name: eventName,
      category: product,
      ...(verb && { subcategory: verb }),
      ...(action && { action }),
      ...(statusCode!==undefined && { statusCode }),
      ...(workflowStep && { workflowStep }),
    },
    content: { ...(assetId && { assetId }) },
    source: {
      user_agent: navigator.userAgent,
      lang: document.documentElement.lang,
      app_name: 'unity',
      url: window.location.href,
    },
    user: {
      locale: document.documentElement.lang.toLocaleLowerCase(),
      id: getSessionID(),
    },
    error: errorData ? {
      type: errorData.code,
      ...(errorData.subCode && { subCode: errorData.subCode }),
      ...(errorData.desc && { desc: errorData.desc }),
    } : undefined,
    ...(redirectUrl && { redirect: { url: redirectUrl } }),
  };
}

export default function sendAnalyticsToSplunk(eventName, product, metaData, splunkEndpoint, sendBeacon=false) {
  try {
    const eventDataPayload = createPayloadForSplunk({ ...metaData, eventName, product });
    if (navigator.sendBeacon && navigator.sendBeacon(splunkEndpoint, JSON.stringify(eventDataPayload))) return;
    fetch(splunkEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventDataPayload),
    });
  } catch (error) {
    window.lana?.log(
      `An error occurred while sending ${eventName} to splunk, metadata: ${JSON.stringify(metaData || {})}, error: ${error || ''}`,
      { sampleRate: 100, tags: 'Unity-PS-Upload' },
    );
  }
}
