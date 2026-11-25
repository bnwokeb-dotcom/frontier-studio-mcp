// extension/popup.js — Popup controller for Frontier Flow & AI Studio Bridge.
const connDot = document.getElementById('connDot');
const connText = document.getElementById('connText');
const bridgeUrlInput = document.getElementById('bridgeUrl');
const saveUrlBtn = document.getElementById('saveUrlBtn');
const statClients = document.getElementById('statClients');
const statPending = document.getElementById('statPending');
const statClaimed = document.getElementById('statClaimed');
const statDone = document.getElementById('statDone');
const jobSelect = document.getElementById('jobSelect');
const promptPreview = document.getElementById('promptPreview');
const copyPromptBtn = document.getElementById('copyPromptBtn');
const dispatchTabBtn = document.getElementById('dispatchTabBtn');
const manualFileInput = document.getElementById('manualFile');
const uploadBtn = document.getElementById('uploadBtn');
const feedbackEl = document.getElementById('feedback');

let cachedJobs = [];

function showFeedback(text, isError = false) {
  feedbackEl.textContent = text;
  feedbackEl.className = isError ? 'error' : '';
}

function selectedJob() {
  const id = jobSelect.value;
  return cachedJobs.find((j) => j.id === id) || null;
}

function renderJobPreview() {
  const job = selectedJob();
  if (!job) {
    promptPreview.value = '';
    return;
  }
  promptPreview.value = job.target === 'aistudio_voice' && job.metadata?.annotated_line
    ? job.metadata.annotated_line
    : job.prompt;
}

function renderState(state) {
  if (state.bridgeBaseUrl && document.activeElement !== bridgeUrlInput) {
    bridgeUrlInput.value = state.bridgeBaseUrl;
  }
  const online = Boolean(state.bridgeConnected);
  connDot.className = online ? 'dot online' : 'dot';
  connText.textContent = online
    ? `Online • Client ID: ${state.clientId}`
    : `Offline • ${state.error || 'Start frontier-studio-mcp to connect'}`;

  const s = state.status || {};
  statClients.textContent = String(s.connectedClients ?? 0);
  statPending.textContent = String(s.pendingTasks ?? 0);
  statClaimed.textContent = String(s.claimedTasks ?? 0);
  statDone.textContent = String(s.completedTasks ?? 0);

  const prevId = jobSelect.value;
  cachedJobs = state.jobs || [];
  jobSelect.innerHTML = '';

  if (cachedJobs.length === 0) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'No jobs queued';
    jobSelect.appendChild(opt);
  } else {
    for (const j of cachedJobs) {
      const opt = document.createElement('option');
      opt.value = j.id;
      const targetTag = j.asset_id || j.shot_id || '';
      opt.textContent = `[${j.status}] ${j.target} (${targetTag})`;
      jobSelect.appendChild(opt);
    }
    if (prevId && cachedJobs.some((j) => j.id === prevId)) {
      jobSelect.value = prevId;
    } else if (state.activeJob && cachedJobs.some((j) => j.id === state.activeJob.id)) {
      jobSelect.value = state.activeJob.id;
    }
  }
  renderJobPreview();
}

async function refreshState() {
  const resp = await chrome.runtime.sendMessage({ type: 'GET_BRIDGE_STATE' });
  if (resp) renderState(resp);
}

saveUrlBtn.addEventListener('click', async () => {
  showFeedback('Connecting...');
  const resp = await chrome.runtime.sendMessage({
    type: 'SET_BRIDGE_URL',
    bridgeBaseUrl: bridgeUrlInput.value,
  });
  if (resp?.ok) {
    showFeedback(`Connected to ${resp.bridgeBaseUrl}`);
  } else {
    showFeedback(`Saved URL, but unreachable: ${resp?.error || 'offline'}`, true);
  }
  await refreshState();
});

jobSelect.addEventListener('change', renderJobPreview);

copyPromptBtn.addEventListener('click', async () => {
  const job = selectedJob();
  if (!job) {
    showFeedback('Select a job first.', true);
    return;
  }
  const text = promptPreview.value || job.prompt;
  await navigator.clipboard.writeText(text);
  showFeedback(`Copied prompt for ${job.id}`);
});

dispatchTabBtn.addEventListener('click', async () => {
  const job = selectedJob();
  if (!job) {
    showFeedback('Select a job first.', true);
    return;
  }
  const resp = await chrome.runtime.sendMessage({ type: 'DISPATCH_JOB', job });
  if (resp?.ok) {
    showFeedback(`Dispatched ${job.id} to target tab.`);
  } else {
    showFeedback(resp?.error || 'Tab dispatch failed', true);
  }
});

uploadBtn.addEventListener('click', async () => {
  const job = selectedJob();
  if (!job) {
    showFeedback('Select a pending or claimed job first.', true);
    return;
  }
  const file = manualFileInput.files?.[0];
  if (!file) {
    showFeedback('Choose a PNG or audio file first.', true);
    return;
  }
  showFeedback(`Uploading ${file.name}...`);
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  const dataBase64 = btoa(binary);
  const resp = await chrome.runtime.sendMessage({
    type: 'MANUAL_UPLOAD',
    jobId: job.id,
    dataBase64,
    mimeType: file.type || (file.name.endsWith('.png') ? 'image/png' : 'audio/wav'),
  });
  if (resp?.ok) {
    showFeedback(`Uploaded & verified: ${resp.result?.output_path || 'done'}`);
    await refreshState();
  } else {
    showFeedback(resp?.error || 'Upload rejected', true);
  }
});

void refreshState();
