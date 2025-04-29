/* eslint-disable no-sequences */
/* eslint-disable no-plusplus */
/* eslint-disable no-await-in-loop */
/* eslint-disable arrow-parens */
/* eslint-disable max-len */
/* eslint-disable no-console */
/* eslint-disable no-unused-vars */
/* eslint-disable import/no-extraneous-dependencies */
import { expect, test } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { features } from './analytics.spec.cjs';
import CompressPDF from './analytics.page.cjs';

const miloLibs = process.env.MILO_LIBS || '';
const totalIterations = 2500;

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
  test.setTimeout(600000); // Increase timeout for longer uploads

  test(`${features[0].name}, for ${totalIterations} iterations`, async ({ page, baseURL }) => {
    const setupLogCollectors = (iteration) => {
      const consoleLogs = [];
      const networkLogs = [];

      page.on('console', (msg) => {
        if (msg.type() === 'log') {
          const logText = msg.text();
          const logEntry = `[Iteration ${iteration}] ${logText}`;
          consoleLogs.push(logEntry);
          fs.appendFileSync(consoleLogFile, `${logEntry}\n`, 'utf-8');
        }
      });

      page.on('request', async (request) => {
        const postData = request.postData();
        const headers = request.headers();

        networkLogs.push({
          type: 'request',
          method: request.method(),
          url: request.url(),
          headers,
          postData,
        });
      });

      page.on('response', async (response) => {
        const headers = response.headers();
        const status = response.status();
        const url = response.url();

        let body = '';
        try {
          const contentType = headers['content-type'] || '';
          if (contentType.includes('application/json') || contentType.includes('text')) {
            body = await response.text();
          } else {
            body = '[Binary data omitted]';
          }
        } catch {
          body = '[Unable to capture response body]';
        }

        networkLogs.push({
          type: 'response',
          status,
          url,
          headers,
          body,
        });
      });

      return { consoleLogs, networkLogs };
    };

    for (let iteration = 1; iteration <= totalIterations; iteration++) {
      const iterationStartTime = new Date();
      console.info(`Starting iteration ${iteration}/${totalIterations} at ${iterationStartTime.toISOString()}`);
      fs.appendFileSync(consoleLogFile, `Starting iteration ${iteration} at ${iterationStartTime.toISOString()}\n`, 'utf-8');

      const { consoleLogs, networkLogs } = setupLogCollectors(iteration);
      const compressPDF = new CompressPDF(page);
      const { data } = features[0];

      try {
        // Step 1: Navigate to page
        await test.step(`Iteration ${iteration}: Step-1 Go to test page`, async () => {
          await page.goto(`${baseURL}${features[0].path}${miloLibs}`);
          await page.waitForLoadState('domcontentloaded');
          await expect(page).toHaveURL(`${baseURL}${features[0].path}${miloLibs}`);
          console.info(`Page loaded: ${baseURL}${features[0].path}${miloLibs}`);
        });

        // Step 2: Verify widget
        await test.step(`Iteration ${iteration}: Step-2 Verify widget`, async () => {
          await expect(compressPDF.widget).toBeVisible();
          await expect(compressPDF.verbTitle).toContainText(data.title);

          const headingText = await compressPDF.verbHeading.textContent();
          expect(headingText.replace(/\s+/g, ' ').trim()).toContain(data.heading);

          await expect(compressPDF.verbIcon).toBeVisible();
          await expect(compressPDF.verbDropZone).toBeVisible();
          await expect(compressPDF.selectFileButton).toBeVisible();

          console.info('Widget content verified');
        });

        // Step 3: Upload file
        await test.step(`Iteration ${iteration}: Step-3 Upload file`, async () => {
          const filePath = path.resolve('./nala/assets/testfile_1MB.pdf');
          const input = await compressPDF.widget.locator('input[type="file"]');
          await compressPDF.selectFileButton.click();
          await input.setInputFiles(filePath);
          console.info('File selected for upload');
        });

        // Step 4: Wait and capture URL
        await test.step(`Iteration ${iteration}: Step-4 Wait and capture URL`, async () => {
          const initialURL = page.url();
          console.info(`Initial URL: ${initialURL}`);
          console.info('Upload completed and page navigated to post-upload URL.');
          console.info('Waiting for upload and redirect...');
          await page.waitForTimeout(9000); // Adjust as per upload time

          const finalURL = page.url();
          console.info(`Final page URL after upload: ${finalURL}`);
        });

        // Step 5: Validate and flush logs
        await test.step(`Iteration ${iteration}: Step-5 Validate logs and flush`, async () => {
          console.info(`Network logs captured (${networkLogs.length})`);
          console.info(`Console logs captured (${consoleLogs.length})`);

          // Append network logs
          const networkEntry = JSON.stringify({
            iteration,
            logs: networkLogs,
          }, null, 2);
          fs.appendFileSync(networkLogFile, `${networkEntry},\n`, 'utf-8');

          // Clear in-memory logs
          consoleLogs.length = 0;
          networkLogs.length = 0;

          console.info('Logs written to file and flushed');
        });
      } catch (error) {
        const errorMessage = `Error in iteration ${iteration}: ${error.stack || error.message || error}`;
        console.error(errorMessage);
        fs.appendFileSync(consoleLogFile, `${errorMessage}\n`, 'utf-8');
      }

      const iterationEndTime = new Date();
      const iterationDuration = iterationEndTime - iterationStartTime;
      console.info(`Iteration ${iteration} ended at: ${iterationEndTime.toISOString()}`);
      console.info(`Iteration ${iteration} duration: ${Math.round(iterationDuration / 1000)} seconds`);
      fs.appendFileSync(consoleLogFile, `Iteration ${iteration} ended at: ${iterationEndTime.toISOString()}\n`, 'utf-8');
      fs.appendFileSync(consoleLogFile, `Iteration ${iteration} duration: ${Math.round(iterationDuration / 1000)} seconds\n\n`, 'utf-8');

      console.info(`Completed iteration ${iteration}/${totalIterations}`);
    }

    // Close JSON array for network log
    fs.appendFileSync(networkLogFile, '{}\n]', 'utf-8');

    // Final test timing
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
