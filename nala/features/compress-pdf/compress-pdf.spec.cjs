module.exports = {
  FeatureName: 'Compress PDF',
  features: [
    {
      tcid: '0',
      name: '@compress-pdf',
      path: '/drafts/nala/acrobat/online/test/compress-pdf',
      data: {
        headers: 3,
        verbTitle: 'Adobe Acrobat',
        verbHeading: 'Compress PDF',
        verbCopy: 'Drag and drop a PDF to reduce file size with our PDF compressor.',
      },
      tags: '@compress-pdf @smoke @regression @unity',
    },
  ],
};
