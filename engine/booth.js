/**
 * LUMA — Booth Engine v3 (fixed)
 * Flow: camera → capture per pose → template fill → edit filter → download PNG
 *
 * Fixes vs v2:
 *  - Camera: use loadedmetadata event, fallback constraints, proper error display
 *  - Countdown: arc circumference matches SVG r=40 (251.33), immediate fire on 0s
 *  - Capture: canvas filter applied correctly, no transform conflict
 *  - Download: renderEditCanvas returns Promise, await before toDataURL
 *  - Retake: rebuilt placeholder properly, ring shown correctly
 *  - Edit open: filter chip active state synced to current activeFilter
 */
;(function () {
  'use strict';

  /* ════════════════════════════════════════
     TEMPLATE — from URL param
  ════════════════════════════════════════ */
  const params = new URLSearchParams(location.search);
  const tplId  = params.get('tpl') || 'TPL-001';

  const FALLBACK_TPL = {
    id:'TPL-001', name:'Darkroom', genre:'classic', poseCount:4,
    frame:{ bg:'#1A1612', border:'none', padding:'10px 10px 18px', radius:'12px' },
    slots:[
      {bg:'#2C2520'},{bg:'#1A1612'},{bg:'#2C2520'},{bg:'#1A1612'}
    ],
    label:{ text:'LUMA · Darkroom', position:'bottom', color:'rgba(245,239,230,.4)', font:'mono' }
  };

  const TPL = (typeof LUMA_TEMPLATES !== 'undefined')
    ? (LUMA_TEMPLATES.find(t => t.id === tplId) || LUMA_TEMPLATES[0])
    : FALLBACK_TPL;

  const TOTAL = TPL.poseCount || 4;

  /* ════════════════════════════════════════
     STATE
  ════════════════════════════════════════ */
  let mediaStream    = null;
  let facingMode     = 'user';
  let camReady       = false;
  let isBusy         = false;       // during countdown
  let cdSecs         = 3;
  let cdTimer        = null;
  let currentPose    = 0;           // next slot to fill (sequential)
  let retakeTarget   = -1;          // ≥0 → retaking that specific slot
  let frames         = new Array(TOTAL).fill(null); // captured dataURLs
  let gridOn         = false;
  let activeFilter   = 'original';
  let filterPct      = 70;          // 0-100

  /* ════════════════════════════════════════
     FILTER DEFINITIONS
     css(t): t = 0..1 intensity
  ════════════════════════════════════════ */
  const FILTERS = {
    original: { label:'Original', css:()=>'' },
    bw:       { label:'B & W',    css:t=>`grayscale(${t}) contrast(${0.9+t*0.3})` },
    noir:     { label:'Noir',     css:t=>`grayscale(${t}) contrast(${1+t*0.5}) brightness(${1-t*0.2})` },
    warm:     { label:'Warm',     css:t=>`sepia(${t*0.6}) saturate(${1+t*0.5}) brightness(${1+t*0.05}) hue-rotate(${-t*10}deg)` },
    cool:     { label:'Cool',     css:t=>`saturate(${1-t*0.3}) brightness(${1+t*0.05}) hue-rotate(${t*20}deg)` },
    retro:    { label:'Retro',    css:t=>`sepia(${t*0.8}) contrast(${1+t*0.15}) saturate(${1+t*0.3}) brightness(${1-t*0.05})` },
    film:     { label:'Film',     css:t=>`sepia(${t*0.4}) contrast(${1+t*0.15}) brightness(${1-t*0.1}) saturate(${1-t*0.15})` },
    fade:     { label:'Fade',     css:t=>`brightness(${1+t*0.12}) contrast(${1-t*0.2}) saturate(${1-t*0.25})` },
  };

  const FILTER_GRAD = {
    original:'linear-gradient(135deg,#c8b49a,#8a7a6a)',
    bw:      'linear-gradient(135deg,#999,#222)',
    noir:    'linear-gradient(135deg,#666,#111)',
    warm:    'linear-gradient(135deg,#e8b060,#c06020)',
    cool:    'linear-gradient(135deg,#90b8d8,#3060a0)',
    retro:   'linear-gradient(135deg,#d8a050,#805030)',
    film:    'linear-gradient(135deg,#a89070,#605040)',
    fade:    'linear-gradient(135deg,#ddd,#aaa)',
  };

  /* ════════════════════════════════════════
     DOM HELPERS
  ════════════════════════════════════════ */
  const $  = id => document.getElementById(id);
  const qs = sel => document.querySelector(sel);
  const qsa = sel => document.querySelectorAll(sel);

  /* ════════════════════════════════════════
     CAMERA
  ════════════════════════════════════════ */
  const video   = $('cam-video');
  const errBox  = $('cam-error');
  const errMsg  = $('cam-err-msg');

  function showCamError(msg) {
    if (errBox) { errBox.style.display = 'flex'; }
    if (errMsg) errMsg.textContent = msg || 'Kamera tidak tersedia.';
    if (video)  video.style.display = 'none';
  }
  function hideCamError() {
    if (errBox) errBox.style.display = 'none';
    if (video)  video.style.display  = 'block';
  }

  async function startCamera() {
    hideCamError();
    try {
      if (mediaStream) mediaStream.getTracks().forEach(t => t.stop());

      /* try ideal constraints first, fall back to bare minimum */
      let s;
      try {
        s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width:{ideal:1280}, height:{ideal:960} },
          audio: false,
        });
      } catch(_) {
        s = await navigator.mediaDevices.getUserMedia({ video: { facingMode }, audio: false });
      }

      mediaStream   = s;
      video.srcObject = s;
      video.muted     = true;
      video.playsInline = true;
      video.setAttribute('autoplay', true)

      /* wait for metadata before play to avoid NotAllowedError on some browsers */
      await new Promise((res, rej) => {
        video.onloadedmetadata = res;
        video.onerror          = rej;
        setTimeout(res, 3000); // fallback timeout
      });
      await video.play();

      camReady = true;
      applyVideoFilter();

    } catch (err) {
      camReady = false;
      let msg = 'Kamera tidak dapat diakses.';
      if (err.name === 'NotAllowedError')  msg = 'Izin kamera ditolak. Aktifkan di pengaturan browser.';
      if (err.name === 'NotFoundError')    msg = 'Kamera tidak ditemukan. Coba unggah foto manual.';
      if (err.name === 'NotReadableError') msg = 'Kamera sedang digunakan aplikasi lain.';
      showCamError(msg);
    }
  }

  /* flip */
  function doFlip() {
    facingMode = facingMode === 'user' ? 'environment' : 'user';
    video.style.transform = facingMode === 'user' ? 'scaleX(-1)' : 'scaleX(1)';
    startCamera();
  }
  $('flip-btn')  && $('flip-btn').addEventListener('click',  doFlip);
  $('flip-btn2') && $('flip-btn2').addEventListener('click', doFlip);
  $('cam-retry') && $('cam-retry').addEventListener('click', startCamera);

  /* ── live filter preview ──────────────── */
  function applyVideoFilter() {
    const t  = filterPct / 100;
    const fn = FILTERS[activeFilter];
    video.style.filter = (fn && activeFilter !== 'original') ? fn.css(t) : '';
  }

  /* ── grid ─────────────────────────────── */
  $('grid-tool') && $('grid-tool').addEventListener('click', function () {
    gridOn = !gridOn;
    this.classList.toggle('active', gridOn);
    const g = $('cam-grid');
    if (g) g.classList.toggle('on', gridOn);
  });

  /* ════════════════════════════════════════
     COUNTDOWN BUTTONS
  ════════════════════════════════════════ */
  qsa('.cd-btn').forEach(b => {
    b.addEventListener('click', () => {
      cdSecs = parseInt(b.dataset.secs);
      qsa('.cd-btn').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
    });
  });

  /* ════════════════════════════════════════
     BUILD TEMPLATE STRIP PREVIEW (right panel)
  ════════════════════════════════════════ */
  const stripEl  = $('tpl-strip-bg');
  const labelEl  = $('tpl-strip-label');

  function isHexDark(hex) {
    const c = (hex || '#000').replace('#','');
    if (c.length < 6) return true;
    const r=parseInt(c.substr(0,2),16), g=parseInt(c.substr(2,2),16), b=parseInt(c.substr(4,2),16);
    return (r*299 + g*587 + b*114) / 1000 < 140;
  }

function buildStrip() {
    if (!stripEl) return;
    const f = TPL.frame;
    const padMatch = (f.padding||'10px').match(/\d+/g) || ['10','10','18'];
    const padV = parseInt(padMatch[0]);
    const padH = parseInt(padMatch[1] || padMatch[0]);

    // 1. SETUP LAYOUT UTAMA STRIP/GRID
    if (TPL.layout === 'grid-2x2') {
      stripEl.style.cssText = `
        background:${f.bg};
        padding: 40px ${padH}px 45px; 
        display:grid;
        grid-template-columns: repeat(2, 1fr);
        gap:6px;
        border-radius: 10px;
        position: relative;
        border: ${f.border || 'none'};
      `;
    } else {
      stripEl.style.cssText = `
        background:${f.bg};
        padding:${padV}px ${padH}px 0;
        display:flex; flex-direction:column; gap:4px;
      `;
    }
    stripEl.innerHTML = '';

    // 2. INJECT MACBOOK ORNAMEN (TOPBAR & BOTTOMBAR) JIKA MATCH
    if (TPL.theme === 'macbook') {
      // Topbar macOS (Tombol Bulat 3 & Judul)
      const topbar = document.createElement('div');
      topbar.style.cssText = `
        position: absolute; top: 0; left: 0; right: 0; height: 40px;
        display: flex; align-items: center; justify-content: center; padding: 0 14px;
      `;
      topbar.innerHTML = `
        <div style="position: absolute; left: 14px; display: flex; gap: 6px;">
          <div style="width:10px; height:10px; background:#FF5F56; border-radius:50%;"></div>
          <div style="width:10px; height:10px; background:#FFBD2E; border-radius:50%;"></div>
          <div style="width:10px; height:10px; background:#27C93F; border-radius:50%;"></div>
        </div>
        <span style="font-size: 11px; font-weight: 600; color: #4D4D4D; font-family:-apple-system, BlinkMacSystemFont, sans-serif;">
          ${TPL.label?.text || 'Photo Booth'}
        </span>
      `;
      stripEl.appendChild(topbar);

      // Bottombar macOS (Tombol Shutter Putih)
      const bottombar = document.createElement('div');
      bottombar.style.cssText = `
        position: absolute; bottom: 0; left: 0; right: 0; height: 45px;
        display: flex; align-items: center; justify-content: center;
      `;
      bottombar.innerHTML = `
        <div style="width: 26px; height: 26px; background: #A0A0A0; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
          <div style="width: 20px; height: 20px; background: #FFFFFF; border-radius: 50%;"></div>
        </div>
      `;
      stripEl.appendChild(bottombar);
    }

    // 3. LOOPING SLOT FOTO SEPERTI BIASA
    for (let i = 0; i < TOTAL; i++) {
      const slotBg  = TPL.slots[i]?.bg || '#2C2520';
      const darkBg  = isHexDark(slotBg);
      const iconClr = darkBg ? '#fff' : '#000';
      const numClr  = darkBg ? 'rgba(255,255,255,.4)' : 'rgba(0,0,0,.3)';

      const box = document.createElement('div');
      box.className = 'tpl-slot-box';
      box.id        = 'slot-' + i;
      box.style.background = slotBg;
      if (TPL.layout === 'grid-2x2') {
        box.style.borderRadius = '0px'; // Macbook aslinya gak pake radius di dalem slotnya
      }

      /* placeholder */
      const ph = document.createElement('div');
      ph.className = 'slot-placeholder';
      ph.id        = 'ph-' + i;
      ph.innerHTML = `
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
          stroke="${iconClr}" stroke-width="1.5" stroke-linecap="round">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
          <circle cx="12" cy="13" r="4"/>
        </svg>
        <span class="slot-num" style="color:${numClr}">${i + 1}</span>`;
      box.appendChild(ph);

      /* active ring */
      const ring = document.createElement('div');
      ring.className = 'slot-active-ring';
      ring.id        = 'ring-' + i;
      ring.style.display = i === 0 ? 'block' : 'none';
      if (TPL.layout === 'grid-2x2') ring.style.borderRadius = '0px';
      box.appendChild(ring);

      /* retake hint */
      const hint = document.createElement('div');
      hint.className = 'slot-retake-hint';
      hint.innerHTML = '<span>Ulang</span>';
      if (TPL.layout === 'grid-2x2') hint.style.borderRadius = '0px';
      ;(function(idx) {
        hint.addEventListener('click', e => { e.stopPropagation(); startRetake(idx); });
      })(i);
      box.appendChild(hint);

      stripEl.appendChild(box);
    }

    /* strip label bawah */
    if (labelEl && TPL.label) {
      if (TPL.theme === 'macbook') {
        labelEl.textContent = '';
        labelEl.style.padding = '0';
      } else {
        labelEl.textContent     = TPL.label.text;
        labelEl.style.color     = TPL.label.color || 'rgba(0,0,0,.4)';
        labelEl.style.background = f.bg;
        labelEl.style.paddingBottom = padV + 'px';
        labelEl.style.fontFamily = TPL.label.font === 'serif'
          ? '"Playfair Display", Georgia, serif'
          : '"DM Mono", monospace';
      }
    }
  }
  /* ────────────────────────────────────────
     FILL a slot with captured image
  ──────────────────────────────────────── */
  function fillSlot(idx, dataUrl) {
    const box = $('slot-' + idx);
    if (!box) return;

    /* remove placeholder */
    const ph = $('ph-' + idx) || box.querySelector('.slot-placeholder');
    if (ph) ph.remove();

    /* remove old img if retaking */
    const old = box.querySelector('.slot-img');
    if (old) old.remove();

    /* insert image */
    const img = new Image();
    img.className = 'slot-img';
    img.src = dataUrl;
    box.insertBefore(img, box.firstChild);
    box.classList.add('slot-filled');

    /* hide ring */
    const ring = $('ring-' + idx);
    if (ring) ring.style.display = 'none';
  }

  function setActiveRing(idx) {
    for (let i = 0; i < TOTAL; i++) {
      const r = $('ring-' + i);
      if (r) r.style.display = (i === idx) ? 'block' : 'none';
    }
  }

  /* ════════════════════════════════════════
     COUNTDOWN + CAPTURE
  ════════════════════════════════════════ */
  const CIRC = 2 * Math.PI * 40; // SVG r=40 → 251.33

  const cdOverlay = $('cd-overlay');
  const cdNum     = $('cd-num');
  const cdArc     = $('cd-arc');
  const flashEl   = $('cam-flash');

  function runCountdown(cb) {
    /* 0s = instant */
    if (cdSecs === 0) { cb(); return; }
    if (!cdOverlay || !cdNum || !cdArc) { cb(); return; }

    let rem = cdSecs;
    cdArc.style.strokeDasharray  = CIRC;
    cdArc.style.strokeDashoffset = '0';
    cdNum.textContent = rem;
    cdNum.style.animation = '';
    cdOverlay.classList.add('on');

    cdTimer = setInterval(() => {
      rem--;
      if (rem <= 0) {
        clearInterval(cdTimer);
        cdOverlay.classList.remove('on');
        cb();
        return;
      }
      cdNum.textContent = rem;
      cdArc.style.strokeDashoffset = CIRC * (1 - rem / cdSecs);
      /* pulse number */
      cdNum.style.animation = 'none';
      void cdNum.offsetWidth;            // reflow
      cdNum.style.animation = 'cd-pulse .35s ease-out';
    }, 1000);
  }

  function flash() {
    if (!flashEl) return;
    flashEl.classList.add('on');
    if (navigator.vibrate) navigator.vibrate([14]);
    setTimeout(() => flashEl.classList.remove('on'), 140);
  }

  /* capture one frame from video to dataURL */
  function captureFrame() {
    const w = video.videoWidth  || 640;
    const h = video.videoHeight || 480;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');

    /* mirror front cam */
    if (facingMode === 'user') { ctx.translate(w, 0); ctx.scale(-1, 1); }

    /* apply filter */
    if (activeFilter !== 'original') {
      const cssFilter = FILTERS[activeFilter].css(filterPct / 100);
      if (cssFilter) ctx.filter = cssFilter;
    }

    ctx.drawImage(video, 0, 0, w, h);
    return c.toDataURL('image/jpeg', 0.93);
  }

  const shutterBtn  = $('shutter-btn');
  const retakeBtn   = $('retake-btn');
  const continueBtn = $('continue-btn');

  function doCapture() {
    if (isBusy) return;

    const target = retakeTarget >= 0 ? retakeTarget : currentPose;
    if (target >= TOTAL) return;

    isBusy = true;
    if (shutterBtn) shutterBtn.classList.add('disabled');

    runCountdown(() => {
      flash();
      const dataUrl = captureFrame();

      frames[target] = dataUrl;
      fillSlot(target, dataUrl);

      if (retakeTarget >= 0) {
        /* finished retake */
        retakeTarget = -1;
        if (retakeBtn) retakeBtn.classList.add('hidden');
      } else {
        currentPose++;
      }

      isBusy = false;
      if (shutterBtn) shutterBtn.classList.remove('disabled');

      /* advance ring to next unfilled slot */
      const nextEmpty = frames.indexOf(null);
      setActiveRing(nextEmpty >= 0 ? nextEmpty : TOTAL);

      if (frames.every(f => f !== null)) {
        allFilled();
      }
    });
  }

  function allFilled() {
    setActiveRing(TOTAL); // no ring
    if (continueBtn) continueBtn.classList.add('ready');
    if (retakeBtn)   retakeBtn.classList.add('hidden');
  }

  /* retake a specific slot */
  function startRetake(idx) {
    if (isBusy) return;
    retakeTarget = idx;
    frames[idx] = null;
    currentPose = Math.min(currentPose, idx);

    /* restore placeholder in slot */
    const box = $('slot-' + idx);
    if (box) {
      const old = box.querySelector('.slot-img');
      if (old) old.remove();
      box.classList.remove('slot-filled');

      if (!box.querySelector('.slot-placeholder')) {
        const slotBg = TPL.slots[idx]?.bg || '#2C2520';
        const dark   = isHexDark(slotBg);
        const ph = document.createElement('div');
        ph.className = 'slot-placeholder';
        ph.id        = 'ph-' + idx;
        ph.innerHTML = `
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
            stroke="${dark?'#fff':'#000'}" stroke-width="1.5" stroke-linecap="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
          <span class="slot-num" style="color:${dark?'rgba(255,255,255,.4)':'rgba(0,0,0,.3)'}">${idx+1}</span>`;
        box.insertBefore(ph, box.firstChild);
      }
    }

    setActiveRing(idx);
    if (continueBtn) continueBtn.classList.remove('ready');
    if (retakeBtn)   retakeBtn.classList.remove('hidden');
  }

  /* shutter click & spacebar */
  if (shutterBtn) shutterBtn.addEventListener('click', doCapture);
  window.addEventListener('keydown', e => {
    const overlay = $('edit-overlay');
    if (e.code === 'Space'
      && document.activeElement.tagName !== 'INPUT'
      && document.activeElement.tagName !== 'TEXTAREA'
      && !(overlay && overlay.classList.contains('on'))) {
      e.preventDefault();
      doCapture();
    }
  });

  /* retake-last button */
  if (retakeBtn) {
    retakeBtn.addEventListener('click', () => {
      /* find last filled slot and retake it */
      for (let i = TOTAL - 1; i >= 0; i--) {
        if (frames[i] !== null) { startRetake(i); return; }
      }
    });
  }

  /* ── UPLOAD instead of camera ───────────── */
  const uploadIn = $('upload-input');
  if (uploadIn) {
    uploadIn.addEventListener('change', e => {
      const files = Array.from(e.target.files);
      files.forEach(file => {
        const idx = frames.indexOf(null);
        if (idx < 0) return;
        const reader = new FileReader();
        reader.onload = ev => {
          frames[idx] = ev.target.result;
          fillSlot(idx, ev.target.result);
          const next = frames.indexOf(null);
          setActiveRing(next >= 0 ? next : TOTAL);
          if (frames.every(f => f !== null)) allFilled();
        };
        reader.readAsDataURL(file);
      });
      e.target.value = '';
    });
  }

  /* continue → edit */
  if (continueBtn) {
    continueBtn.addEventListener('click', () => {
      if (!continueBtn.classList.contains('ready')) return;
      openEdit();
    });
  }

  /* ════════════════════════════════════════
     EDIT PANEL
  ════════════════════════════════════════ */
  const editOverlay  = $('edit-overlay');
  const editCanvas   = $('edit-canvas');
  const filterGridEl = $('filter-grid');
  const sliderEl     = $('intensity-slider');
  const sliderValEl  = $('intensity-val');

  /* canvas layout constants */
  const C_SLOT_W  = 380;
  const C_SLOT_H  = Math.round(C_SLOT_W * 3 / 4); // 285 (4:3)
  const C_GAP     = 6;
  const C_PAD     = 14;
  const C_LABEL_H = TPL.label ? 30 : 0;

  let C_W, C_H;

  if (TPL.layout === 'grid-2x2') {
    C_W = (C_SLOT_W * 2) + (C_PAD * 2) + C_GAP;

    const MAC_PAD_TOP = 44;
    const MAC_PAD_BOT = 40;
    C_H = (C_SLOT_H * 2) + MAC_PAD_TOP + MAC_PAD_BOT + C_GAP;
  } else {
    C_W = C_SLOT_W + C_PAD * 2;
    C_H = C_PAD + TOTAL * (C_SLOT_H + C_GAP) - C_GAP + C_PAD + C_LABEL_H;
  }
  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);     ctx.quadraticCurveTo(x + w, y,     x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);     ctx.quadraticCurveTo(x,     y + h, x, y + h - r);
    ctx.lineTo(x, y + r);         ctx.quadraticCurveTo(x,     y,     x + r, y);
    ctx.closePath();
  }
    function loadImage(src) {
    return new Promise(res => {
      if (!src) { res(null); return; }
      const img = new Image();
      img.onload  = () => res(img);
      img.onerror = () => res(null);
      img.src = src;
    });
  }

  /* returns Promise (waits for image loads) */
  function renderCanvas(ctx, scale) {
    const s = scale || 1;
    const w = C_W * s, h = C_H * s;

    /* background */
    ctx.fillStyle = TPL.frame.bg;
    const fr = parseInt(TPL.frame.radius) || 12;
    roundRect(ctx, 0, 0, w, h, fr * s);
    ctx.fill();

    return Promise.all(frames.map(loadImage)).then(imgs => {
      const t         = filterPct / 100;
      const filterCss = (activeFilter !== 'original') ? FILTERS[activeFilter].css(t) : '';

      // PROSES DRAWING UNTUK TIAP FOTO FRAME
      imgs.forEach((img, i) => {
        let x, y;
        const sw = C_SLOT_W * s;
        const sh = C_SLOT_H * s;
        let sr = 7 * s; // Radius pojok foto default bawaan LUMA

        // JALUR LOGIKA KOORDINAT GRID 2X2 MACBOOK ATAU STRIP VERTIKAL
        if (TPL.layout === 'grid-2x2') {
          const MAC_PAD_TOP = 44 * s; // Jarak ruang kosong atas untuk topbar mac
          const MAC_PAD_LEFT = C_PAD * s;
          
          const col = i % 2;          // Kolom 0 (kiri) atau Kolom 1 (kanan)
          const row = Math.floor(i / 2); // Baris 0 (atas) atau Baris 1 (bawah)

          x = MAC_PAD_LEFT + col * (sw + (C_GAP * s));
          y = MAC_PAD_TOP + row * (sh + (C_GAP * s));
          sr = 0; // Foto booth Macbook asli tiap slot kotaknya tajam tajam tanpa radius round
        } else {
          // Jalur normal original bawaan foto strip vertikal lo
          x = C_PAD * s;
          y = (C_PAD + i * (C_SLOT_H + C_GAP)) * s;
        }

        /* slot background */
        ctx.fillStyle = TPL.slots[i]?.bg || '#2C2520';
        if (TPL.layout === 'grid-2x2') {
          ctx.fillRect(x, y, sw, sh); // Draw kotak flat langsung tanpa radius
        } else {
          roundRect(ctx, x, y, sw, sh, sr);
          ctx.fill();
        }

        if (img) {
          ctx.save();
          
          // 1. Buat clipping mask ruang foto
          if (TPL.layout === 'grid-2x2') {
            ctx.beginPath();
            ctx.rect(x, y, sw, sh);
            ctx.clip();
          } else {
            roundRect(ctx, x, y, sw, sh, sr);
            ctx.clip();
          }
          
          // 2. Pasang filter aktif
          if (activeFilter !== 'original' && FILTERS[activeFilter]) {
            ctx.filter = FILTERS[activeFilter].css(filterPct / 100);
          } else {
            ctx.filter = 'none';
          }

          /* cover crop */
          const iAR = img.naturalWidth / img.naturalHeight;
          const sAR = sw / sh;
          let srcX = 0, srcY = 0, srcW = img.naturalWidth, srcH = img.naturalHeight;
          if (iAR > sAR) { 
            srcW = img.naturalHeight * sAR; 
            srcX = (img.naturalWidth  - srcW) / 2; 
          } else { 
            srcH = img.naturalWidth / sAR;  
            srcY = (img.naturalHeight - srcH) / 2; 
          }

          // 3. Gambar foto ke area canvas
          ctx.drawImage(img, srcX, srcY, srcW, srcH, x, y, sw, sh);
          ctx.restore(); // Reset filter/clipping mask balik normal
        }

        /* slot tint overlay (jika ada setup warna tint di DB) */
        const tint = TPL.slots[i]?.tint;
        if (tint && tint !== 'none') {
          ctx.fillStyle = tint;
          if (TPL.layout === 'grid-2x2') {
            ctx.fillRect(x, y, sw, sh);
          } else {
            roundRect(ctx, x, y, sw, sh, sr);
            ctx.fill();
          }
        }
      });

      /* ── DEKORASI LUAR (THEMING DECORATION) ── */
      if (TPL.theme === 'macbook') {
        const w = C_W * s, h = C_H * s;
        
        // A. Gambar Tiga Tombol Window macOS Klasik (Merah, Kuning, Hijau)
        const btnY = 22 * s;          // Posisi koordinat tengah Y tombol topbar
        const radiusCircle = 6 * s;   // Ukuran bulatan tombol
        const gapCircle = 8 * s;      // Jarak antar bulatan tombol
        const startX = 20 * s;        // Titik mulai dari kiri canvas

        // Tombol Merah (Close)
        ctx.beginPath(); ctx.arc(startX, btnY, radiusCircle, 0, 2 * Math.PI);
        ctx.fillStyle = '#FF5F56'; ctx.fill();
        // Tombol Kuning (Minimize)
        ctx.beginPath(); ctx.arc(startX + (radiusCircle * 2) + gapCircle, btnY, radiusCircle, 0, 2 * Math.PI);
        ctx.fillStyle = '#FFBD2E'; ctx.fill();
        // Tombol Hijau (Zoom/Fullscreen)
        ctx.beginPath(); ctx.arc(startX + (radiusCircle * 4) + (gapCircle * 2), btnY, radiusCircle, 0, 2 * Math.PI);
        ctx.fillStyle = '#27C93F'; ctx.fill();

        // B. Cetak Judul Window "Photo Booth" Tepat di Tengah-Tengah Atas Window
        if (TPL.label) {
          ctx.fillStyle = TPL.label.color || '#4D4D4D';
          // Menggunakan standard system font Apple macOS
          ctx.font = `600 ${14 * s}px -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(TPL.label.text, w / 2, btnY);
        }

        // C. Simulasi Tombol Kamera Merah/Putih di Sisi Bottombar Abu-abu
        const bottomCenterY = h - (20 * s); // Koordinat sumbu Y bawah
        ctx.beginPath();
        ctx.arc(w / 2, bottomCenterY, 16 * s, 0, 2 * Math.PI);
        ctx.fillStyle = '#A0A0A0';
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(w / 2, bottomCenterY, 13 * s, 0, 2 * Math.PI);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();

      } else if (TPL.label) {
        // JALUR NORMAL: Teks label watermark asli bawaan LUMA untuk strip vertikal lo
        const w = C_W * s, h = C_H * s;
        ctx.fillStyle = TPL.label.color || 'rgba(245,239,230,.4)';
        const serif = TPL.label.font === 'serif';
        ctx.font = `${serif ? 'italic bold' : '500'} ${13 * s}px ${serif ? 'Georgia, serif' : '"DM Mono", monospace'}`;
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(TPL.label.text, w / 2, h - (C_LABEL_H * s) / 2);
      }
    });
  }

  // function refreshEditCanvas() {
  //   if (!editCanvas) return Promise.resolve();
  //   editCanvas.width  = C_W;
  //   editCanvas.height = C_H;
  //   const ctx = editCanvas.getContext('2d');
  //   return renderCanvas(ctx, 1);
  // }
  function refreshEditCanvas() {
  if (!editCanvas) return Promise.resolve();
  
  // Memaksa browser me-reset ukuran buffer canvas
  editCanvas.width  = C_W;
  editCanvas.height = C_H;
  
  const ctx = editCanvas.getContext('2d');
  
  // Bersihkan total area canvas agar filter baru tidak bentrok dengan sisa render lama
  ctx.clearRect(0, 0, C_W, C_H); 
  
  // Kembalikan renderCanvas dan pastikan logging jika terjadi kegagalan pemuatan gambar
  return renderCanvas(ctx, 1).catch(err => {
    console.error("Gagal memperbarui filter pada canvas:", err);
  });
}

  /* ── Build filter chips ─────────────────── */
  function buildFilterChips() {
    if (!filterGridEl) return;
    filterGridEl.innerHTML = '';
    Object.entries(FILTERS).forEach(([key, def]) => {
      const chip = document.createElement('div');
      chip.className   = 'filter-chip' + (key === activeFilter ? ' active' : '');
      chip.dataset.filter = key;
      chip.innerHTML = `
        <div class="fc-thumb">
          <div class="fc-thumb-inner" style="background:${FILTER_GRAD[key]||'#888'}"></div>
        </div>
        <span class="fc-name">${def.label}</span>`;
      chip.addEventListener('click', () => {
        activeFilter = key;
        qsa('.filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        applyVideoFilter();
        refreshEditCanvas();
      });
      filterGridEl.appendChild(chip);
    });
  }

  /* ── Intensity slider ───────────────────── */
  function syncSlider(val) {
    filterPct = parseInt(val);
    if (sliderValEl)  sliderValEl.textContent = filterPct + '%';
    if (sliderEl)     sliderEl.style.setProperty('--pct', filterPct + '%');
    applyVideoFilter();
    refreshEditCanvas();
  }
  if (sliderEl) {
    sliderEl.value = filterPct;
    sliderEl.style.setProperty('--pct', filterPct + '%');
    sliderEl.addEventListener('input', e => syncSlider(e.target.value));
  }

  /* ── Open / close ─────────────────────── */
  function openEdit() {
    buildFilterChips();
    syncSlider(filterPct);
    if (editOverlay) editOverlay.classList.add('on');
    refreshEditCanvas();
  }
  function closeEdit() {
    if (editOverlay) editOverlay.classList.remove('on');
  }
  $('edit-close')    && $('edit-close').addEventListener('click',    closeEdit);
  $('edit-back-btn') && $('edit-back-btn').addEventListener('click', closeEdit);

  /* ── Download ──────────────────────────── */
  // $('edit-save-btn') && $('edit-save-btn').addEventListener('click', async () => {
  //   if (!editCanvas) return;

  //   const SCALE = 2; // 2× for high DPI
  //   const hq = document.createElement('canvas');
  //   hq.width = C_W * SCALE;
  //   hq.height = C_H * SCALE;
  //   const ctx = hq.getContext('2d');

  //   try {
  //     await renderCanvas(ctx, SCALE);

  //     const blob = await new Promise(resolve => hq.toBlob(resolve, 'image/png', 1.0));

  //     // upload to server
  //     const formData = new FormData();
  //     formData.append('photo', blob, 'strip.png');
  //     await fetch('http://localhost:3000/upload', { method: 'POST', body: formData });

  //     // trigger download
  //     const dl = document.createElement('a');
  //     dl.download = 'LUMA_' + TPL.name.replace(/\s+/g, '_') + '_' + Date.now() + '.png';
  //     dl.href = URL.createObjectURL(blob);
  //     dl.click();

  //     showToast('✓ uploaded + downloaded');
  //   } catch (err) {
  //     console.error(err);
  //     showToast('✗ Gagal menyimpan strip');
  //   }
  // });
  $('edit-save-btn') && $('edit-save-btn').addEventListener('click', async () => {

  if (!editCanvas) return;

  const SCALE = 2;

  const hq = document.createElement('canvas');

  hq.width = C_W * SCALE;
  hq.height = C_H * SCALE;

  const ctx = hq.getContext('2d');

  await renderCanvas(ctx, SCALE);

  const blob = await new Promise(resolve =>
    hq.toBlob(resolve, 'image/png', 1.0)
  );

  // upload ke server
  // 1. JALUR UTAMA: BIARKAN USER DOWNLOAD LOKAL TERLEBIH DAHULU (TANPA TERSENDAT)
  const link = document.createElement('a');
  link.download = 'LUMA_' + TPL.name.replace(/\s+/g, '_') + '_' + Date.now() + '.png';
  link.href = URL.createObjectURL(blob);
  link.click();

  // 2. JALUR LATAR BELAKANG: UPLOAD KE SERVER MENGGUNAKAN TRY...CATCH
  // Menggunakan fungsi async terpisah agar jika gagal, tidak menyumbat fungsi utama
  (async function kirimKeServer() {
    try {
      const formData = new FormData();
      formData.append('photo', blob, 'strip.png');

      // Set timeout pendek via AbortController agar browser tidak nge-hang kelamaan nungguin server mati
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000); // Batas nunggu 4 detik

      const response = await fetch('https://7e14-140-0-49-43.ngrok-free.app/upload', {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (response.ok) {
        showToast('✓ Foto berhasil disimpan & diunduh!');
      } else {
        console.warn('Server merespon dengan error, tapi download lokal aman.');
        showToast('✓ Foto berhasil diunduh secara lokal');
      }
    } catch (err) {
      // Jika server mati atau koneksi ngrok putus, error ditangkap di sini tanpa merusak aplikasi
      console.error('Gagal upload ke server (Server Mati/Offline), tetapi user tetap bisa download:', err);
      showToast('✓ Foto berhasil diunduh secara lokal');
    }
  })();
});

  /* ── Toast ─────────────────────────────── */
  const toastEl = $('toast');
  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    setTimeout(() => toastEl.classList.remove('show'), 2800);
  }

  /* ════════════════════════════════════════
     INIT
  ════════════════════════════════════════ */
  function init() {
    /* set template name in topbar */
    const nameEl = $('booth-tpl-name');
    if (nameEl) nameEl.textContent = TPL.name;

    buildStrip();
    startCamera();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.addEventListener('beforeunload', () => {
    if (mediaStream) mediaStream.getTracks().forEach(t => t.stop());
  });

})();