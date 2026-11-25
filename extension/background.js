// extension/background.js — MV3 Service Worker polling Frontier Bridge HTTP queue & dispatching jobs to Flow / AI Studio tabs.
const DEFAULT_BRIDGE_URL = 'http://127.0.0.1:8081';
const POLL_INTERVAL_ONLINE_MS = 2500;
const POLL_INTERVAL_OFFLINE_MS = 5000;

let pollTimer = null;
let isPolling = false;

function normalizeBridgeUrl(raw) {
  const cleaned = String(raw || '').trim().replace(/\/+$/, '');
  return cleaned || DEFAULT_BRIDGE_URL;
}

async function getConfig() {
  const data = await chrome.storage.local.get(['bridgeBaseUrl', 'clientId']);
  let clientId = data.clientId;
  if (!clientId) {
    clientId = `chrome-ext-${Math.random().toString(16).slice(2, 10)}`;
    await chrome.storage.local.set({ clientId });
  }
  const bridgeBaseUrl = normalizeBridgeUrl(data.bridgeBaseUrl || DEFAULT_BRIDGE_URL);
  return { bridgeBaseUrl, clientId };
}

async function setState(patch) {
  await chrome.storage.local.set(patch);
}

async function fetchStatusAndJobs(bridgeBaseUrl, clientId) {
  const [statusRes, jobsRes] = await Promise.all([
    fetch(`${bridgeBaseUrl}/bridge/status?client_id=${encodeURIComponent(clientId)}`),
    fetch(`${bridgeBaseUrl}/bridge/jobs`),
  ]);
  if (!statusRes.ok) {
    throw new Error(`HTTP ${statusRes.status}`);
  }
  const status = await statusRes.json();
  const jobsData = jobsRes.ok ? await jobsRes.json() : { jobs: [] };
  await setState({
    bridgeConnected: true,
    lastStatus: status,
    jobs: jobsData.jobs || [],
    lastError: null,
    lastCheckedAt: new Date().toISOString(),
  });
  return { status, jobs: jobsData.jobs || [] };
}

function targetSpecForJob(job) {
  if (job.target === 'aistudio_voice') {
    return {
      urlPatterns: ['https://aistudio.google.com/*'],
      createUrl: 'https://aistudio.google.com/',
      scriptFile: 'content_aistudio.js',
    };
  }
  return {
    urlPatterns: ['https://flow.google/*', 'https://labs.google/fx/*'],
    createUrl: 'https://flow.google/',
    scriptFile: 'content_flow.js',
  };
}

function waitForTabComplete(tabId, timeoutMs = 15000) {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      chrome.tabs.onUpdated.removeListener(onUpdated);
      resolve();
    };
    const onUpdated = (updatedId, info) => {
      if (updatedId === tabId && info.status === 'complete') {
        finish();
      }
    };
    chrome.tabs.onUpdated.addListener(onUpdated);
    setTimeout(finish, timeoutMs);
  });
}

async function installAiStudioMainHook(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: () => {
        if (window.__FRONTIER_AISTUDIO_MAIN_HOOKED__) return;
        window.__FRONTIER_AISTUDIO_MAIN_HOOKED__ = true;

        const notify = (url, mimeType) => {
          try {
            window.dispatchEvent(new CustomEvent('frontier-bridge-audio-url', { detail: { url, mimeType } }));
          } catch {}
        };

        const detectAudioMagic = (bytes) => {
          if (!bytes || bytes.length < 4) return null;
          // RIFF....WAVE
          if (
            bytes.length >= 12 &&
            bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
            bytes[8] === 0x57 && bytes[9] === 0x41 && bytes[10] === 0x56 && bytes[11] === 0x45
          ) {
            return 'audio/wav';
          }
          // ID3
          if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
            return 'audio/mpeg';
          }
          // MP3 frame sync (\xFF\xFB / \xFF\xF3 / \xFF\xF2 / \xFF\xFA)
          if (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) {
            return 'audio/mpeg';
          }
          // OggS
          if (bytes[0] === 0x4f && bytes[1] === 0x67 && bytes[2] === 0x67 && bytes[3] === 0x53) {
            return 'audio/ogg';
          }
          // WebM / Matroska EBML (\x1A\x45\xDF\xA3)
          if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) {
            return 'audio/webm';
          }
          // fLaC
          if (bytes[0] === 0x66 && bytes[1] === 0x4c && bytes[2] === 0x61 && bytes[3] === 0x43) {
            return 'audio/flac';
          }
          // ISO BMFF ftyp (M4A/MP4 audio)
          if (bytes.length >= 8 && bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
            return 'audio/mp4';
          }
          return null;
        };

        const origCreateObjectURL = URL.createObjectURL.bind(URL);
        URL.createObjectURL = function (obj) {
          const url = origCreateObjectURL(obj);
          try {
            if (obj instanceof Blob) {
              if (obj.type && obj.type.startsWith('audio/')) {
                notify(url, obj.type);
              } else if (!obj.type && obj.size >= 4096) {
                obj.slice(0, 12).arrayBuffer().then((buf) => {
                  const detected = detectAudioMagic(new Uint8Array(buf));
                  if (detected) {
                    notify(url, detected);
                  }
                }).catch(() => {});
              }
            }
          } catch {}
          return url;
        };

        const OrigAudio = window.Audio;
        window.Audio = function (src) {
          const el = new OrigAudio(src);
          if (typeof src === 'string' && src && (src.startsWith('blob:') || src.startsWith('data:audio/') || src.startsWith('http'))) {
            notify(src, 'audio/wav');
          }
          return el;
        };
        window.Audio.prototype = OrigAudio.prototype;
      },
    });
  } catch {
    // Non-fatal fallback: DOM <audio> MutationObserver still runs in content_aistudio.js
  }
}

async function dispatchJobToTab(job) {
  const spec = targetSpecForJob(job);
  const existingTabs = await chrome.tabs.query({ url: spec.urlPatterns });
  let tab = existingTabs.find((t) => t.active) || existingTabs[0];

  if (!tab) {
    tab = await chrome.tabs.create({ url: spec.createUrl, active: true });
    if (tab.id !== undefined) {
      await waitForTabComplete(tab.id);
    }
  } else if (tab.id !== undefined) {
    await chrome.tabs.update(tab.id, { active: true });
  }

  if (!tab || tab.id === undefined) {
    throw new Error('Could not open target tab');
  }

  if (job.target === 'aistudio_voice') {
    await installAiStudioMainHook(tab.id);
  }

  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'EXECUTE_BRIDGE_JOB', job });
  } catch {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: [spec.scriptFile],
    });
    await chrome.tabs.sendMessage(tab.id, { type: 'EXECUTE_BRIDGE_JOB', job });
  }
}

async function submitJobCompletion(jobId, payload) {
  const { bridgeBaseUrl } = await getConfig();
  const res = await fetch(`${bridgeBaseUrl}/bridge/jobs/${encodeURIComponent(jobId)}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  const stored = await chrome.storage.local.get(['activeJob']);
  if (stored.activeJob && stored.activeJob.id === jobId) {
    await setState({ activeJob: null });
  }
  return body;
}

async function pollOnce() {
  if (isPolling) return;
  isPolling = true;
  let nextDelay = POLL_INTERVAL_ONLINE_MS;

  try {
    const { bridgeBaseUrl, clientId } = await getConfig();
    const res = await fetch(`${bridgeBaseUrl}/bridge/jobs/next?client_id=${encodeURIComponent(clientId)}`);
    if (!res.ok) {
      throw new Error(`Bridge poll returned HTTP ${res.status}`);
    }
    const data = await res.json();
    await setState({
      bridgeConnected: true,
      lastError: null,
      lastCheckedAt: new Date().toISOString(),
    });

    if (data && data.job) {
      await setState({ activeJob: data.job });
      try {
        await dispatchJobToTab(data.job);
      } catch (dispatchErr) {
        await setState({ lastError: `Dispatch warning: ${dispatchErr.message}` });
      }
    }
  } catch (err) {
    nextDelay = POLL_INTERVAL_OFFLINE_MS;
    await setState({
      bridgeConnected: false,
      lastError: (err && err.message) || 'Bridge server offline',
      lastCheckedAt: new Date().toISOString(),
    });
  } finally {
    isPolling = false;
    schedulePoll(nextDelay);
  }
}

function schedulePoll(delayMs = POLL_INTERVAL_ONLINE_MS) {
  if (pollTimer) clearTimeout(pollTimer);
  pollTimer = setTimeout(() => {
    void pollOnce();
  }, delayMs);
}

chrome.runtime.onInstalled.addListener(() => {
  void pollOnce();
});

chrome.runtime.onStartup.addListener(() => {
  void pollOnce();
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg || typeof msg !== 'object') return false;

  if (msg.type === 'GET_BRIDGE_STATE') {
    (async () => {
      const cfg = await getConfig();
      try {
        const live = await fetchStatusAndJobs(cfg.bridgeBaseUrl, cfg.clientId);
        const stored = await chrome.storage.local.get(['activeJob']);
        sendResponse({
          ok: true,
          bridgeBaseUrl: cfg.bridgeBaseUrl,
          clientId: cfg.clientId,
          bridgeConnected: true,
          status: live.status,
          jobs: live.jobs,
          activeJob: stored.activeJob || null,
        });
      } catch (err) {
        const stored = await chrome.storage.local.get(['activeJob', 'jobs', 'lastStatus']);
        sendResponse({
          ok: false,
          bridgeBaseUrl: cfg.bridgeBaseUrl,
          clientId: cfg.clientId,
          bridgeConnected: false,
          status: stored.lastStatus || null,
          jobs: stored.jobs || [],
          activeJob: stored.activeJob || null,
          error: (err && err.message) || 'Bridge unreachable',
        });
      }
    })();
    return true;
  }

  if (msg.type === 'SET_BRIDGE_URL') {
    (async () => {
      const url = normalizeBridgeUrl(msg.bridgeBaseUrl);
      await setState({ bridgeBaseUrl: url });
      const { clientId } = await getConfig();
      try {
        const live = await fetchStatusAndJobs(url, clientId);
        schedulePoll(500);
        sendResponse({ ok: true, bridgeBaseUrl: url, status: live.status, jobs: live.jobs });
      } catch (err) {
        sendResponse({ ok: false, bridgeBaseUrl: url, error: (err && err.message) || 'Connection failed' });
      }
    })();
    return true;
  }

  if (msg.type === 'COMPLETE_JOB' || msg.type === 'MANUAL_UPLOAD') {
    (async () => {
      try {
        const result = await submitJobCompletion(msg.jobId, {
          data_base64: msg.dataBase64,
          mime_type: msg.mimeType,
        });
        const cfg = await getConfig();
        await fetchStatusAndJobs(cfg.bridgeBaseUrl, cfg.clientId).catch(() => {});
        sendResponse({ ok: true, result });
      } catch (err) {
        sendResponse({ ok: false, error: (err && err.message) || 'Upload failed' });
      }
    })();
    return true;
  }

  if (msg.type === 'FAIL_JOB') {
    (async () => {
      try {
        const result = await submitJobCompletion(msg.jobId, {
          error: msg.error || 'Cancelled in browser',
        });
        sendResponse({ ok: true, result });
      } catch (err) {
        sendResponse({ ok: false, error: (err && err.message) || 'Failed to report job error' });
      }
    })();
    return true;
  }

  if (msg.type === 'DISPATCH_JOB') {
    (async () => {
      try {
        await setState({ activeJob: msg.job });
        await dispatchJobToTab(msg.job);
        sendResponse({ ok: true });
      } catch (err) {
        sendResponse({ ok: false, error: (err && err.message) || 'Dispatch failed' });
      }
    })();
    return true;
  }

  return false;
});

void pollOnce();
