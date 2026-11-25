// extension/content_aistudio.js — Content script for aistudio.google.com speech synthesis capture.
(() => {
  if (window.__FRONTIER_AISTUDIO_BRIDGE_LOADED__) return;
  window.__FRONTIER_AISTUDIO_BRIDGE_LOADED__ = true;

  const BANNER_ID = 'frontier-aistudio-bridge-banner';
  let currentJob = null;
  let activeObserver = null;
  let settledCurrentJob = false;
  let capturing = false;
  let pendingCaptureTimer = null;
  const attemptedSrcs = new Set();

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    }
  }

  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const res = String(reader.result || '');
        const comma = res.indexOf(',');
        resolve(comma >= 0 ? res.slice(comma + 1) : res);
      };
      reader.onerror = () => reject(new Error('Failed to read audio blob'));
      reader.readAsDataURL(blob);
    });
  }

  function setStatusMessage(msg, isError = false) {
    const el = document.getElementById('frontier-aistudio-status');
    if (!el) return;
    el.textContent = msg;
    el.style.color = isError ? '#f87171' : '#93c5fd';
  }

  function scriptTextForJob(job) {
    return (job.metadata && job.metadata.annotated_line) || job.prompt;
  }

  async function captureAudioSource(job, audioSrc) {
    if (capturing) return false;
    capturing = true;
    try {
      setStatusMessage('Fetching generated audio stream...');
      const res = await fetch(audioSrc, { credentials: 'include' });
      if (!res.ok) throw new Error(`Audio fetch failed: HTTP ${res.status}`);
      const blob = await res.blob();
      if (blob.size < 1024) {
        throw new Error(`Audio capture too small (${blob.size} bytes)`);
      }
      const dataBase64 = await blobToBase64(blob);
      const resp = await chrome.runtime.sendMessage({
        type: 'COMPLETE_JOB',
        jobId: job.id,
        dataBase64,
        mimeType: blob.type || 'audio/wav',
      });
      if (resp?.ok) {
        if (currentJob && currentJob.id === job.id) {
          settledCurrentJob = true;
          if (activeObserver) {
            activeObserver.disconnect();
            activeObserver = null;
          }
        }
        setStatusMessage(`Normalized 48kHz WAV saved: ${resp.result?.output_path || 'dialogue.wav'}`);
        return true;
      }
      setStatusMessage(`Bridge rejected audio: ${resp?.error || 'unknown error'}`, true);
      return false;
    } catch (err) {
      setStatusMessage(err.message || 'Audio capture failed', true);
      return false;
    } finally {
      capturing = false;
    }
  }

  function findCandidateAudioSrc(ignoreSrcs) {
    const audios = [...document.querySelectorAll('audio')].reverse();
    for (const audio of audios) {
      const src = audio.currentSrc || audio.src || audio.querySelector('source')?.src;
      if (!src) continue;
      if (ignoreSrcs && ignoreSrcs.has(src)) continue;
      return src;
    }
    return null;
  }

  function renderBanner(job, statusMsg) {
    let banner = document.getElementById(BANNER_ID);
    if (!banner) {
      banner = document.createElement('div');
      banner.id = BANNER_ID;
      banner.style.cssText = [
        'position:fixed',
        'bottom:18px',
        'right:18px',
        'z-index:2147483647',
        'width:370px',
        'background:#111318',
        'color:#f3f4f6',
        'border:1px solid #374151',
        'border-radius:10px',
        'padding:14px',
        'font-family:system-ui,-apple-system,sans-serif',
        'font-size:12px',
        'box-shadow:0 16px 36px rgba(0,0,0,0.45)',
      ].join(';');
      document.body.appendChild(banner);
    }

    banner.innerHTML = '';
    const header = document.createElement('div');
    header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;';
    const title = document.createElement('strong');
    title.textContent = `Frontier AI Studio Bridge • ${job.voice_persona || 'Charon'}`;
    title.style.cssText = 'font-size:13px;color:#34d399;';
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.cssText = 'background:transparent;border:none;color:#9ca3af;font-size:16px;cursor:pointer;';
    closeBtn.onclick = () => banner.remove();
    header.append(title, closeBtn);

    const meta = document.createElement('div');
    meta.textContent = `Job: ${job.id} | Shot: ${job.shot_id || '—'} (line ${job.line_index || 1})`;
    meta.style.cssText = 'color:#d1d5db;margin-bottom:6px;word-break:break-all;';

    const status = document.createElement('div');
    status.id = 'frontier-aistudio-status';
    status.textContent = statusMsg;
    status.style.cssText = 'color:#93c5fd;margin-bottom:8px;line-height:1.35;';

    const scriptBox = document.createElement('textarea');
    scriptBox.readOnly = true;
    scriptBox.value = scriptTextForJob(job);
    scriptBox.style.cssText = 'width:100%;height:70px;background:#1f2430;color:#e5e7eb;border:1px solid #374151;border-radius:6px;padding:6px;font-size:11px;box-sizing:border-box;margin-bottom:8px;resize:vertical;';

    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;';

    const copyBtn = document.createElement('button');
    copyBtn.textContent = 'Copy Script';
    copyBtn.style.cssText = 'padding:6px 10px;background:#2563eb;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600;';
    copyBtn.onclick = async () => {
      await copyText(scriptTextForJob(job));
      setStatusMessage('Speaking script copied! Paste into AI Studio, select voice persona, and Run.');
    };

    const captureBtn = document.createElement('button');
    captureBtn.textContent = 'Capture Active Audio';
    captureBtn.style.cssText = 'padding:6px 10px;background:#059669;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600;';
    captureBtn.onclick = async () => {
      const src = findCandidateAudioSrc(null);
      if (!src) {
        setStatusMessage('No <audio> stream found on page yet. Generate or upload downloaded WAV/MP3.', true);
        return;
      }
      await captureAudioSource(job, src);
    };

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.wav,.mp3,.webm,.ogg,.m4a,.flac,audio/*';
    fileInput.style.display = 'none';
    fileInput.onchange = async () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      try {
        setStatusMessage(`Uploading ${file.name}...`);
        const base64 = await blobToBase64(file);
        const resp = await chrome.runtime.sendMessage({
          type: 'COMPLETE_JOB',
          jobId: job.id,
          dataBase64: base64,
          mimeType: file.type || 'audio/wav',
        });
        if (resp?.ok) {
          if (currentJob && currentJob.id === job.id) {
            settledCurrentJob = true;
            if (activeObserver) {
              activeObserver.disconnect();
              activeObserver = null;
            }
          }
          setStatusMessage(`48kHz WAV saved: ${resp.result?.output_path || 'dialogue.wav'}`);
        } else {
          setStatusMessage(resp?.error || 'Audio rejected by bridge server', true);
        }
      } catch (err) {
        setStatusMessage(err.message, true);
      }
    };

    const uploadBtn = document.createElement('button');
    uploadBtn.textContent = 'Upload Audio';
    uploadBtn.style.cssText = 'padding:6px 10px;background:#374151;color:#fff;border:1px solid #4b5563;border-radius:6px;cursor:pointer;';
    uploadBtn.onclick = () => fileInput.click();

    actions.append(copyBtn, captureBtn, uploadBtn, fileInput);
    banner.append(header, meta, status, scriptBox, actions);
  }

  function findPromptBox() {
    const selectors = [
      'ms-autosize-textarea textarea',
      'textarea[aria-label*="prompt" i]',
      'textarea[placeholder*="Enter" i]',
      'textarea',
      '[contenteditable="true"][role="textbox"]',
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && el.offsetParent !== null) return el;
    }
    return null;
  }

  function injectPromptText(el, text) {
    el.focus();
    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
      const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      if (setter) setter.call(el, text);
      else el.value = text;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }
    el.textContent = text;
    el.dispatchEvent(new InputEvent('input', { bubbles: true, data: text }));
  }

  function isVisibleEnabledControl(el) {
    if (!el || el.disabled) return false;
    if (el.getAttribute('aria-disabled') === 'true') return false;
    if (el.offsetParent === null) return false;
    if (el.closest(`#${BANNER_ID}`)) return false;
    return true;
  }

  function trySelectVoicePersona(persona) {
    if (!persona) return;
    const lower = persona.toLowerCase();
    for (const el of document.querySelectorAll('button, [role="option"], mat-option, [role="menuitem"]')) {
      if (!isVisibleEnabledControl(el)) continue;
      if ((el.textContent || '').trim().toLowerCase() === lower) {
        el.click();
        return;
      }
    }
  }

  const EXACT_AISTUDIO_RUN_RE = /^(run|generate|speak)(\s+(prompt|speech|audio|now))?$/i;

  function matchesRunLabel(el) {
    const aria = (el.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim();
    const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
    return EXACT_AISTUDIO_RUN_RE.test(aria) || EXACT_AISTUDIO_RUN_RE.test(text);
  }

  function findRunButton(promptEl) {
    const isCandidate = (b) =>
      isVisibleEnabledControl(b) && !b.closest('nav, header, [role="navigation"], [role="banner"]');

    const promptContainer = promptEl ? promptEl.closest('form, main, [role="main"]') : null;
    if (promptContainer) {
      const containerButtons = [...promptContainer.querySelectorAll('button')].filter(isCandidate);
      const exactHit = containerButtons.find(matchesRunLabel);
      if (exactHit) return exactHit;
    }

    const mainButtons = [...document.querySelectorAll('form button, main button, [role="main"] button')].filter(isCandidate);
    const mainHit = mainButtons.find(matchesRunLabel);
    if (mainHit) return mainHit;

    const pageButtons = [...document.querySelectorAll('button')].filter(isCandidate);
    return pageButtons.find(matchesRunLabel) || null;
  }

  function scheduleAudioCapture(job, audioSrc, delayMs) {
    if (
      !audioSrc ||
      !currentJob ||
      currentJob.id !== job.id ||
      settledCurrentJob ||
      capturing ||
      pendingCaptureTimer ||
      attemptedSrcs.has(audioSrc)
    ) {
      return;
    }
    attemptedSrcs.add(audioSrc);
    pendingCaptureTimer = setTimeout(() => {
      pendingCaptureTimer = null;
      if (!currentJob || currentJob.id !== job.id || settledCurrentJob) return;
      void captureAudioSource(job, audioSrc);
    }, delayMs);
  }

  window.addEventListener('frontier-bridge-audio-url', (ev) => {
    const detail = ev?.detail;
    if (!detail?.url || !currentJob) return;
    scheduleAudioCapture(currentJob, detail.url, 300);
  });

  async function executeJob(job) {
    currentJob = job;
    settledCurrentJob = false;
    capturing = false;
    if (pendingCaptureTimer) {
      clearTimeout(pendingCaptureTimer);
      pendingCaptureTimer = null;
    }
    attemptedSrcs.clear();
    if (activeObserver) {
      activeObserver.disconnect();
      activeObserver = null;
    }

    const scriptText = scriptTextForJob(job);
    renderBanner(job, 'Preparing AI Studio speech script...');
    await copyText(scriptText);

    const existingSrcs = new Set(
      [...document.querySelectorAll('audio')]
        .map((a) => a.currentSrc || a.src || a.querySelector('source')?.src)
        .filter(Boolean),
    );

    trySelectVoicePersona(job.voice_persona);
    const inputEl = findPromptBox();
    if (!inputEl) {
      setStatusMessage('Selector fallback: script copied to clipboard! Paste into AI Studio, generate speech, then click "Capture Active Audio" or "Upload Audio".', true);
      return;
    }

    injectPromptText(inputEl, scriptText);
    const runBtn = findRunButton(inputEl);
    if (!runBtn) {
      setStatusMessage('Script injected & copied to clipboard. Click Run in AI Studio, then click "Capture Active Audio".');
      return;
    }

    setStatusMessage(`Running synthesis with persona "${job.voice_persona || 'Charon'}" & listening for audio stream...`);
    runBtn.click();

    activeObserver = new MutationObserver(() => {
      if (settledCurrentJob || capturing || pendingCaptureTimer || !currentJob || currentJob.id !== job.id) return;
      const freshSrc = findCandidateAudioSrc(new Set([...existingSrcs, ...attemptedSrcs]));
      if (freshSrc) {
        scheduleAudioCapture(job, freshSrc, 600);
      }
    });
    activeObserver.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] });
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg && msg.type === 'EXECUTE_BRIDGE_JOB' && msg.job) {
      void executeJob(msg.job);
      sendResponse({ ok: true });
      return true;
    }
    return false;
  });
})();
