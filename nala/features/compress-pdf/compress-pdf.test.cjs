import path from 'path';
import { expect, test } from '@playwright/test';
import { features } from './compress-pdf.spec.cjs';
import CompressPdf from './compress-pdf.page.cjs';

const pdfFilePath = path.resolve(__dirname, '../../assets/1-PDF-compressed.pdf');

let compressPdf;

const unityLibs = process.env.UNITY_LIBS || '';
console.info(`unityLibs: ${unityLibs}`);

test.describe('Unity Compress PDF test suite', () => {
  test.beforeEach(async ({ page }) => {
    compressPdf = new CompressPdf(page);
  });

  // Test 0 : Compress PDF
  test(`${features[0].name},${features[0].tags}`, async ({ page, baseURL }) => {
    console.info(`[Test Page]: ${baseURL}${features[0].path}${unityLibs}`);
    console.info(`[Asset Path]: ${pdfFilePath}`);
    const { data } = features[0];

    await test.step('step-1: Go to Compress PDF test page', async () => {
      await page.goto(`${baseURL}${features[0].path}${unityLibs}`);
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(`${baseURL}${features[0].path}${unityLibs}`);
      console.info('******* [Step-1 PASS ******]');
    });

    await test.step('step-2: Verify Compress PDF content/specs', async () => {
      const html = await page.content();
      console.log('[DEBUG] PAGE HTML SNAPSHOT:\n', html);
      await expect(await compressPdf.compressPdf).toBeVisible();
      await expect(await compressPdf.dropZone).toBeVisible();
      await expect(await compressPdf.verbImage).toBeVisible();
      await expect(await compressPdf.acrobatIcon).toBeVisible();
      const actualText = await compressPdf.verbHeader.textContent();
      expect(actualText.trim()).toBe(data.verbHeading);
      await expect(await compressPdf.verbTitle).toContainText(data.verbTitle);
      await expect(await compressPdf.verbCopy).toContainText(data.verbCopy);
    });

    await test.step('step-3: Upload a sample PDF file', async () => {
      // upload and wait for some page change indicator (like a new element or URL change)
      const fileInput = page.locator('input[type="file"]#file-upload');
      await page.waitForTimeout(10000);
      await fileInput.setInputFiles(pdfFilePath);
      await page.waitForTimeout(10000);

      // Verify the URL parameters
      const currentUrl = page.url();
      console.log(`[Post-upload URL]: ${currentUrl}`);
      const urlObj = new URL(currentUrl);
      expect(urlObj.searchParams.get('x_api_client_id')).toBe('unity');
      expect(urlObj.searchParams.get('x_api_client_location')).toBe('compress-pdf');
      expect(urlObj.searchParams.get('user')).toBe('frictionless_new_user');
      expect(urlObj.searchParams.get('attempts')).toBe('1st');
      console.log({
        x_api_client_id: urlObj.searchParams.get('x_api_client_id'),
        x_api_client_location: urlObj.searchParams.get('x_api_client_location'),
        user: urlObj.searchParams.get('user'),
        attempts: urlObj.searchParams.get('attempts'),
      });
    });
  });
});
