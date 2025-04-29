module.exports = {
  FeatureName: 'Compress PDF',
  features: [
    {
      tcid: '0',
      name: '@Compress-pdf',
      path: '/acrobat/online/compress-pdf?unitylibs=wait-redirect',
      data: {
        title: 'Adobe Acrobat',
        heading: 'Compress a PDF',
        redirectUrl: 'https://stage.acrobat.adobe.com/us/en/compress-pdf?x_api_client_id=unity&x_api_client_location=compress-pdf&user=frictionless_new_user',
      },
      tags: '@compress-pdf @smoke @regression @unity',
    },
  ],
};
