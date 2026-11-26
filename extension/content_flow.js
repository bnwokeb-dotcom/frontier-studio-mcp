// extension/content_flow.js — Content script for flow.google / labs.google/fx (Nano Banana 2.5).
(() => {
  if (window.__FRONTIER_FLOW_BRIDGE_LOADED__) return;
  window.__FRONTIER_FLOW_BRIDGE_LOADED__ = true;

  const BANNER_ID = 'frontier-flow-bridge-banner';
  let currentJob = null;
  let activeObserver = null;
  let settledCurrentJob = false;
  let capturing = false;
  let pendingCaptureTimer = null;
  let attemptedMedia = new WeakMap();

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
      reader.onerror = () => reject(new Error('Failed to read blob bytes'));
      reader.readAsDataURL(blob);
    });
  }

  function canvasToPngBlob(canvas) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) reject(new Error('Canvas PNG export returned null'));
        else resolve(blob);
      }, 'image/png');
    });
  }

  async function extractImageAsPngBase64(el) {
    if (el.tagName === 'CANVAS') {
      const blob = await canvasToPngBlob(el);
      return blobToBase64(blob);
    }
    const img = el;
    // Try direct fetch first to preserve original lossless PNG bytes if already PNG
    try {
      if (img.src && (img.src.startsWith('blob:') || img.src.startsWith('data:') || img.src.startsWith('http'))) {
        const res = await fetch(img.src, { credentials: 'include' });
        if (res.ok) {
          const blob = await res.blob();
          const header = new Uint8Array(await blob.slice(0, 8).arrayBuffer());
          const isPng =
            header.length === 8 &&
            header[0] === 0x89 &&
            header[1] === 0x50 &&
            header[2] === 0x4e &&
            header[3] === 0x47;
          if (isPng && blob.size >= 10240) {
            return blobToBase64(blob);
          }
        }
      }
    } catch {
      // Cross-origin direct fetch fallback -> offscreen canvas re-encode
    }

    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (w < 512) {
      throw new Error(`Visible image is too small (${w}x${h}); wait for full-resolution generation`);
    }
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas unavailable');
    ctx.drawImage(img, 0, 0, w, h);
    const pngBlob = await canvasToPngBlob(canvas);
    return blobToBase64(pngBlob);
  }

  function mediaSignature(el) {
    if (!el) return '';
    return el.tagName === 'IMG' ? (el.currentSrc || el.src || '') : `${el.width}x${el.height}`;
  }

  function findLargestCandidateMedia(ignoreSet, skipAttempted = false) {
    const candidates = [];
    for (const img of document.querySelectorAll('img')) {
      if (ignoreSet && ignoreSet.has(img)) continue;
      if (!img.complete || img.naturalWidth < 512 || img.naturalHeight < 256) continue;
      if (skipAttempted && attemptedMedia.get(img) === mediaSignature(img)) continue;
      candidates.push({ el: img, area: img.naturalWidth * img.naturalHeight });
    }
    for (const canvas of document.querySelectorAll('canvas')) {
      if (ignoreSet && ignoreSet.has(canvas)) continue;
      if (canvas.width < 512 || canvas.height < 256) continue;
      if (skipAttempted && attemptedMedia.get(canvas) === mediaSignature(canvas)) continue;
      candidates.push({ el: canvas, area: canvas.width * canvas.height });
    }
    candidates.sort((a, b) => b.area - a.area);
    return candidates[0]?.el || null;
  }

  function setStatusMessage(msg, isError = false) {
    const statusEl = document.getElementById('frontier-flow-status');
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.style.color = isError ? '#f87171' : '#93c5fd';
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
    title.textContent = `Frontier Flow Bridge • ${job.target}`;
    title.style.cssText = 'font-size:13px;color:#fbbf24;';
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.cssText = 'background:transparent;border:none;color:#9ca3af;font-size:16px;cursor:pointer;';
    closeBtn.onclick = () => banner.remove();
    header.append(title, closeBtn);

    const meta = document.createElement('div');
    meta.textContent = `Job: ${job.id} | Asset: ${job.asset_id || '—'} | ${job.model_hint || 'Nano Banana 2.5'} (${job.aspect_ratio || '16:9'})`;
    meta.style.cssText = 'color:#d1d5db;margin-bottom:6px;word-break:break-all;';

    const status = document.createElement('div');
    status.id = 'frontier-flow-status';
    status.textContent = statusMsg;
    status.style.cssText = 'color:#93c5fd;margin-bottom:8px;line-height:1.35;';

    const preview = document.createElement('textarea');
    preview.readOnly = true;
    preview.value = job.prompt;
    preview.style.cssText = 'width:100%;height:70px;background:#1f2430;color:#e5e7eb;border:1px solid #374151;border-radius:6px;padding:6px;font-size:11px;box-sizing:border-box;margin-bottom:8px;resize:vertical;';

    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;';

    const copyBtn = document.createElement('button');
    copyBtn.textContent = 'Copy Prompt';
    copyBtn.style.cssText = 'padding:6px 10px;background:#2563eb;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600;';
    copyBtn.onclick = async () => {
      await copyText(job.prompt);
      setStatusMessage('Prompt copied to clipboard. Paste into Flow & click Generate.');
    };

    const captureBtn = document.createElement('button');
    captureBtn.textContent = 'Capture Visible Image';
    captureBtn.style.cssText = 'padding:6px 10px;background:#059669;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600;';
    captureBtn.onclick = async () => {
      const el = findLargestCandidateMedia(null);
      if (!el) {
        setStatusMessage('No >= 512px image/canvas detected yet. Generate or download & use Upload PNG.', true);
        return;
      }
      await sendCapturedMedia(job, el);
    };

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = job.target === 'flow_video' ? '.mp4,.mov,.webm,video/*' : '.png,image/png';
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
          mimeType: file.type || (job.target === 'flow_video' ? 'video/mp4' : 'image/png'),
        });
        if (resp?.ok) {
          if (currentJob && currentJob.id === job.id) {
            settledCurrentJob = true;
            if (activeObserver) {
              activeObserver.disconnect();
              activeObserver = null;
            }
          }
          setStatusMessage(`Saved to studio: ${resp.result?.output_path || (job.target === 'flow_video' ? 'shot.mp4' : 'sheet/plate.png')}`);
        } else {
          setStatusMessage(resp?.error || 'Upload rejected by bridge server', true);
        }
      } catch (err) {
        setStatusMessage(err.message, true);
      }
    };

    const uploadBtn = document.createElement('button');
    uploadBtn.textContent = job.target === 'flow_video' ? 'Upload MP4' : 'Upload PNG';
    uploadBtn.style.cssText = 'padding:6px 10px;background:#374151;color:#fff;border:1px solid #4b5563;border-radius:6px;cursor:pointer;';
    uploadBtn.onclick = () => fileInput.click();

    actions.append(copyBtn, captureBtn, uploadBtn, fileInput);
    banner.append(header, meta, status, preview, actions);
  }

  async function sendCapturedMedia(job, el) {
    if (capturing) return false;
    capturing = true;
    try {
      setStatusMessage('Extracting uncompressed PNG bytes...');
      const dataBase64 = await extractImageAsPngBase64(el);
      const resp = await chrome.runtime.sendMessage({
        type: 'COMPLETE_JOB',
        jobId: job.id,
        dataBase64,
        mimeType: 'image/png',
      });
      if (resp?.ok) {
        if (currentJob && currentJob.id === job.id) {
          settledCurrentJob = true;
          if (activeObserver) {
            activeObserver.disconnect();
            activeObserver = null;
          }
        }
        setStatusMessage(`Completed & saved atomically (${resp.result?.width}x${resp.result?.height}).`);
        return true;
      }
      setStatusMessage(`Bridge rejected capture: ${resp?.error || 'unknown error'}`, true);
      return false;
    } catch (err) {
      setStatusMessage(err.message || 'Image capture failed', true);
      return false;
    } finally {
      capturing = false;
    }
  }

  function findPromptInput() {
    const selectors = [
      'textarea[placeholder*="Describe" i]',
      'textarea[placeholder*="Prompt" i]',
      'textarea[aria-label*="prompt" i]',
      'textarea',
      '[contenteditable="true"][role="textbox"]',
      '[contenteditable="true"]',
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && el.offsetParent !== null) return el;
    }
    return null;
  }

  function injectInputText(el, text) {
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

  function trySelectHints(job) {
    const wantedTokens = [job.model_hint || 'Nano Banana 2.5', job.aspect_ratio || '16:9'];
    const clickables = document.querySelectorAll('button, [role="option"], [role="radio"], [role="menuitem"]');
    for (const token of wantedTokens) {
      const lower = String(token).toLowerCase();
      for (const el of clickables) {
        if (!isVisibleEnabledControl(el)) continue;
        const text = (el.textContent || el.getAttribute('aria-label') || '').toLowerCase();
        if (text.includes(lower)) {
          el.click();
          break;
        }
      }
    }
  }

  const EXACT_FLOW_ACTION_RE = /^(generate|create|dream|run|submit|send)(\s+(image|media|now))?$/i;

  function matchesFlowLabel(el) {
    const aria = (el.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim();
    const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
    return EXACT_FLOW_ACTION_RE.test(aria) || EXACT_FLOW_ACTION_RE.test(text);
  }

  function findSubmitButton(promptEl) {
    const isCandidate = (b) =>
      isVisibleEnabledControl(b) && !b.closest('nav, header, [role="navigation"], [role="banner"]');

    const promptContainer = promptEl ? promptEl.closest('form, main, [role="main"]') : null;
    if (promptContainer) {
      const containerButtons = [...promptContainer.querySelectorAll('button')].filter(isCandidate);
      const exactHit = containerButtons.find(matchesFlowLabel);
      if (exactHit) return exactHit;
      const submitHit = containerButtons.find((b) => b.type === 'submit');
      if (submitHit) return submitHit;
    }

    const mainButtons = [...document.querySelectorAll('form button, main button, [role="main"] button')].filter(isCandidate);
    const mainExact = mainButtons.find(matchesFlowLabel);
    if (mainExact) return mainExact;
    const mainSubmit = mainButtons.find((b) => b.type === 'submit');
    if (mainSubmit) return mainSubmit;

    const pageButtons = [...document.querySelectorAll('button')].filter(isCandidate);
    return (
      pageButtons.find(matchesFlowLabel) ||
      pageButtons.find((b) => b.type === 'submit') ||
      null
    );
  }

  async function executeJob(job) {
    currentJob = job;
    settledCurrentJob = false;
    capturing = false;
    if (pendingCaptureTimer) {
      clearTimeout(pendingCaptureTimer);
      pendingCaptureTimer = null;
    }
    attemptedMedia = new WeakMap();
    if (activeObserver) {
      activeObserver.disconnect();
      activeObserver = null;
    }

    renderBanner(job, 'Preparing Flow prompt injection...');
    await copyText(job.prompt);

    const existingMedia = new Set([
      ...document.querySelectorAll('img'),
      ...document.querySelectorAll('canvas'),
    ]);

    const inputEl = findPromptInput();
    if (!inputEl) {
      setStatusMessage('Selector fallback: prompt copied to clipboard! Paste into Flow, generate, then click "Capture Visible Image" or "Upload PNG".', true);
      return;
    }

    injectInputText(inputEl, job.prompt);
    trySelectHints(job);

    const submitBtn = findSubmitButton(inputEl);
    if (!submitBtn) {
      setStatusMessage('Prompt injected & copied to clipboard. Click Generate in Flow, then click "Capture Visible Image".');
      return;
    }

    setStatusMessage('Submitting generation to Flow & watching for >= 512px output...');
    submitBtn.click();

    activeObserver = new MutationObserver(() => {
      if (settledCurrentJob || capturing || pendingCaptureTimer || !currentJob || currentJob.id !== job.id) return;
      const fresh = findLargestCandidateMedia(existingMedia, true);
      if (fresh) {
        attemptedMedia.set(fresh, mediaSignature(fresh));
        pendingCaptureTimer = setTimeout(() => {
          pendingCaptureTimer = null;
          if (!currentJob || currentJob.id !== job.id || settledCurrentJob) return;
          void sendCapturedMedia(job, fresh);
        }, 800);
      }
    });
    activeObserver.observe(document.body, { childList: true, subtree: true, attributes: true });

    setTimeout(() => {
      if (!settledCurrentJob && currentJob?.id === job.id) {
        setStatusMessage('Still waiting for new image — click "Capture Visible Image" or "Upload PNG" once rendered.');
      }
    }, 60000);
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
