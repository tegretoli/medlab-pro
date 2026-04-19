require('dotenv').config();

const axios = require('axios');
const {
  writeFLinkInputFile,
  shouldWaitForFLinkResponse,
  waitForFLinkResponse,
} = require('../utils/printerUtil');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const backendBaseUrl = (process.env.FISCAL_BRIDGE_BACKEND_URL || 'http://localhost:5000/api').replace(/\/$/, '');
const bridgeSecret = process.env.FISCAL_BRIDGE_SECRET || '';
const bridgeId = process.env.FISCAL_BRIDGE_ID || process.env.COMPUTERNAME || 'windows-bridge';
const loopDelayMs = Number(process.env.FISCAL_BRIDGE_LOOP_DELAY_MS || 3000);
const responseTimeoutMs = Number(process.env.FLINK_RESPONSE_TIMEOUT_MS || 120000);

const formatBridgeError = (err) => {
  const status = err.response?.status;
  const serverMessage = err.response?.data?.message || err.response?.data?.error || '';

  if (status === 401) {
    return `Bridge secret is invalid (401). ${serverMessage || 'Check FISCAL_BRIDGE_SECRET in backend/.env and restart both backend and bridge.'}`.trim();
  }

  if (!err.response && err.code) {
    if (err.code === 'ECONNREFUSED') {
      return `Cannot connect to backend at ${backendBaseUrl} (ECONNREFUSED). Start or restart the backend API server.`;
    }
    if (err.code === 'ECONNABORTED') {
      return `Bridge request to ${backendBaseUrl} timed out (ECONNABORTED).`;
    }
    return `${err.code}: ${err.message || 'Bridge request failed before receiving a response.'}`;
  }

  return serverMessage || err.message;
};

if (!bridgeSecret) {
  throw new Error('FISCAL_BRIDGE_SECRET is required for the local fiscal bridge service');
}

const client = axios.create({
  baseURL: backendBaseUrl,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'x-bridge-secret': bridgeSecret,
    'x-bridge-id': bridgeId,
  },
});

const claimJob = async () => {
  const { data } = await client.post('/pagesat/fiskal/jobs/bridge/claim', { bridgeId });
  return data.job || null;
};

const markQueued = async (jobId, payload) => {
  await client.post(`/pagesat/fiskal/jobs/${jobId}/bridge/queued`, payload);
};

const markComplete = async (jobId, payload) => {
  await client.post(`/pagesat/fiskal/jobs/${jobId}/bridge/complete`, payload);
};

const processJob = async (job) => {
  const queueResult = await writeFLinkInputFile(job, {
    watchFolder: process.env.FLINK_WATCH_FOLDER,
  });

  await markQueued(job._id, {
    requestFileName: queueResult.requestFileName,
    requestFilePath: queueResult.requestFilePath,
    payloadFormat: queueResult.payloadFormat,
    watchedFolder: queueResult.watchFolder,
  });

  if (!shouldWaitForFLinkResponse()) {
    console.log(`[fiscal-bridge] Job ${job._id} queued to F-Link folder ${queueResult.watchFolder}`);
    return;
  }

  const result = await waitForFLinkResponse(queueResult, {
    responseFolder: process.env.FLINK_RESPONSE_FOLDER,
    timeoutMs: responseTimeoutMs,
  });

  await markComplete(job._id, {
    status: result.status,
    responseFileName: result.responseFileName || '',
    responseFilePath: result.responseFilePath || '',
    receiptNumber: result.receiptNumber || '',
    fiscalNumber: result.fiscalNumber || '',
    rawResponse: result.rawResponse || '',
    errorMessage: result.errorMessage || '',
  });
};

const run = async () => {
  console.log(`[fiscal-bridge] Started as ${bridgeId} against ${backendBaseUrl}`);

  while (true) {
    try {
      const job = await claimJob();
      if (!job) {
        await sleep(loopDelayMs);
        continue;
      }

      console.log(`[fiscal-bridge] Claimed job ${job._id} (${job.correlationId})`);

      try {
        await processJob(job);
        console.log(`[fiscal-bridge] Completed job ${job._id}`);
      } catch (err) {
        const formattedError = formatBridgeError(err);
        console.error(`[fiscal-bridge] Job ${job._id} failed: ${formattedError}`);
        await markComplete(job._id, {
          status: 'failed',
          errorMessage: formattedError,
          rawResponse: '',
        });
      }
    } catch (err) {
      console.error(`[fiscal-bridge] Loop error: ${formatBridgeError(err)}`);
      await sleep(loopDelayMs);
    }
  }
};

run().catch((err) => {
  console.error(`[fiscal-bridge] Fatal error: ${err.message}`);
  process.exit(1);
});
