/* eslint-disable no-sequences */
/* eslint-disable no-plusplus */
/* eslint-disable no-await-in-loop */
/* eslint-disable arrow-parens */
/* eslint-disable max-len */
/* eslint-disable no-console */
/* eslint-disable no-unused-vars */
/* eslint-disable import/no-extraneous-dependencies */
import { chromium, expect, test } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { features } from './analytics.spec.cjs';
import CompressPDF from './analytics.page.cjs';

const miloLibs = process.env.MILO_LIBS || '';
const totalIterations = 1;

// Global logs directory
const logsDir = './nala/logs';
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Log file paths
const consoleLogFile = path.join(logsDir, 'console.log');
const networkLogFile = path.join(logsDir, 'network.log.json');

// Clear existing logs
fs.writeFileSync(consoleLogFile, '', 'utf-8');
fs.writeFileSync(networkLogFile, '[\n', 'utf-8');

// Record overall test start time
const testStartTime = new Date();

test.describe('Unity PDF Compress widget Block Iteration Test Suite', () => {
  test.setTimeout(600000);

  test(`${features[0].name}, for ${totalIterations} iterations`, async () => {
    const browser = await chromium.launch({ headless: true });

    for (let iteration = 1; iteration <= totalIterations; iteration++) {
      const iterationStartTime = new Date();
      console.info(`Starting iteration ${iteration}/${totalIterations} at ${iterationStartTime.toISOString()}`);
      fs.appendFileSync(consoleLogFile, `Starting iteration ${iteration} at ${iterationStartTime.toISOString()}\n`, 'utf-8');

      const context = await browser.newContext();
      const page = await context.newPage();

      const consoleLogs = [];
      const networkLogs = [];

      // Setup log collectors per iteration
      page.on('console', (msg) => {
        if (msg.type() === 'log') {
          const logEntry = `[Iteration ${iteration}] ${msg.text()}`;
          consoleLogs.push(logEntry);
          fs.appendFileSync(consoleLogFile, `${logEntry}\n`, 'utf-8');
        }
      });

      page.on('request', (request) => {
        const logEntry = {
          iteration,
          type: 'request',
          method: request.method(),
          url: request.url(),
          headers: request.headers(),
          postData: request.postData(),
        };
        networkLogs.push(logEntry);
      });

      page.on('response', async (response) => {
        let body = '';
        try {
          const contentType = response.headers()['content-type'] || '';
          if (contentType.includes('application/json') || contentType.includes('text')) {
            body = await response.text();
          } else {
            body = '[Binary data omitted]';
          }
        } catch {
          body = '[Unable to capture response body]';
        }

        const logEntry = {
          iteration,
          type: 'response',
          status: response.status(),
          url: response.url(),
          headers: response.headers(),
          body,
        };
        networkLogs.push(logEntry);
      });

      try {
        const compressPDF = new CompressPDF(page);
        const { data } = features[0];

        // Step 1: Navigate to page
        await page.goto(`${data.baseURL || ''}${features[0].path}${miloLibs}`);
        await page.waitForLoadState('domcontentloaded');
        await expect(page).toHaveURL(`${data.baseURL || ''}${features[0].path}${miloLibs}`);
        console.info(`Page loaded: ${features[0].path}${miloLibs}`);

        // Step 2: Verify widget
        await expect(compressPDF.widget).toBeVisible();
        await expect(compressPDF.verbTitle).toContainText(data.title);

        const headingText = await compressPDF.verbHeading.textContent();
        expect(headingText.replace(/\s+/g, ' ').trim()).toContain(data.heading);

        await expect(compressPDF.verbIcon).toBeVisible();
        await expect(compressPDF.verbDropZone).toBeVisible();
        await expect(compressPDF.selectFileButton).toBeVisible();

        console.info('Widget content verified');

        // Step 3: Upload file
        const filePath = path.resolve('./nala/assets/testfile_1MB.pdf');
        const input = await compressPDF.widget.locator('input[type="file"]');
        // await compressPDF.selectFileButton.click();
        await input.setInputFiles(filePath);
        console.info('File selected for upload');

        // Step 4: Wait and capture URL
        const initialURL = page.url();
        console.info(`Initial URL: ${initialURL}`);
        await page.waitForTimeout(9000);
        const finalURL = page.url();
        console.info(`Final page URL after upload: ${finalURL}`);

        // Step 5: Flush logs
        const networkEntry = JSON.stringify({
          iteration,
          logs: networkLogs,
        }, null, 2);
        fs.appendFileSync(networkLogFile, `${networkEntry},\n`, 'utf-8');

        console.info(`Network logs captured (${networkLogs.length})`);
        console.info(`Console logs captured (${consoleLogs.length})`);
      } catch (error) {
        const errorMessage = `Error in iteration ${iteration}: ${error.stack || error.message || error}`;
        console.error(errorMessage);
        fs.appendFileSync(consoleLogFile, `${errorMessage}\n`, 'utf-8');
      } finally {
        await context.close(); //
      }

      const iterationEndTime = new Date();
      const iterationDuration = iterationEndTime - iterationStartTime;
      console.info(`Iteration ${iteration} ended at: ${iterationEndTime.toISOString()}`);
      console.info(`Iteration ${iteration} duration: ${Math.round(iterationDuration / 1000)} seconds`);
      fs.appendFileSync(consoleLogFile, `Iteration ${iteration} ended at: ${iterationEndTime.toISOString()}\n`, 'utf-8');
      fs.appendFileSync(consoleLogFile, `Iteration ${iteration} duration: ${Math.round(iterationDuration / 1000)} seconds\n\n`, 'utf-8');
      console.info(`Completed iteration ${iteration}/${totalIterations}`);
    }

    // Close browser after all iterations
    await browser.close();

    // Close JSON array for network log
    fs.appendFileSync(networkLogFile, '{}\n]', 'utf-8');

    const testEndTime = new Date();
    const testDuration = testEndTime - testStartTime;
    console.info(`Test started at: ${testStartTime.toISOString()}`);
    console.info(`Test ended at: ${testEndTime.toISOString()}`);
    console.info(`Total test duration: ${Math.round(testDuration / 1000)} seconds`);

    fs.appendFileSync(consoleLogFile, `Test started at: ${testStartTime.toISOString()}\n`, 'utf-8');
    fs.appendFileSync(consoleLogFile, `Test ended at: ${testEndTime.toISOString()}\n`, 'utf-8');
    fs.appendFileSync(consoleLogFile, `Total test duration: ${Math.round(testDuration / 1000)} seconds\n`, 'utf-8');

    console.info(`Final logs written to ${networkLogFile} and ${consoleLogFile}`);
  });
});
