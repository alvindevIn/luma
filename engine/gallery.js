/**
 * LUMA — Gallery Renderer
 * Mengambil data dari LUMA_TEMPLATES (templates-db.js)
 * dan merender card ke DOM secara otomatis.
 */

;(function () {
  'use strict';

  /* ── State ─────────────────────────────────── */
  let activeGenre  = 'all';
  let activeSort   = 'default';
  let searchQuery  = '';
  let visibleCount = 0;

  /* ── Helpers ──────────────────────────────── */

  /** Bikin warna gelap/terang lebih mudah dibaca */
  function isDark(hex) {
    const c = hex.replace('#','');
    const r = parseInt(c.substr(0,2),16);
    const g = parseInt(c.substr(2,2),16);
    const b = parseInt(c.substr(4,2),16);
    return (r*299 + g*587 + b*114) / 1000 < 128;
  }

  /** Escape HTML untuk keamanan */
  function esc(str) {
    return String(str)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /* ── Render satu slot foto ────────────────── */
  function renderSlot(slot, idx, isMacGrid) {
    // Jika layout Macbook, paksa radius slot foto jadi tajam (0px)
    const finalRadius = isMacGrid ? '0px' : (slot.radius || '');

    const style = [
      'background:' + slot.bg,
      slot.border ? 'border:' + slot.border : '',
      finalRadius ? 'border-radius:' + finalRadius : '',
    ].filter(Boolean).join(';');

    const tintStyle = slot.tint && slot.tint !== 'none'
      ? `<div class="slot-tint" style="background:${slot.tint}"></div>`
      : '';

    return `<div class="tpl-slot" style="${style}" data-axis="${slot.axis || 'center'}">
      ${tintStyle}
      <div class="slot-axis-indicator" data-axis="${slot.axis || 'center'}"></div>
    </div>`;
  }

  /* ── Render strip preview ────────────────── */
  function renderStrip(tpl) {
    const f = tpl.frame;
    
    const isMacGrid = !!(tpl.layout && tpl.layout === 'grid-2x2');
    const isMacTheme = !!(tpl.theme && tpl.theme === 'macbook');

    // Modifikasi inline style pembungkus luar strip agar fleksibel mendeteksi grid macbook
    let frameStyle = [
      'background:'  + f.bg,
      f.border  ? 'border:'  + f.border  : '',
      f.radius  ? 'border-radius:' + f.radius : '',
    ].filter(Boolean).join(';');

    // Jika macbook layout, timpa padding bawaan biar memberikan space untuk topbar (30px) dan bottombar (32px)
    if (isMacGrid) {
      frameStyle += `; padding: 30px 10px 32px; display: block; position: relative; width: 100%;`;
    } else {
      frameStyle += f.padding ? `; padding:${f.padding}` : '';
    }

    // Render isi slot foto internal
    const slotsHtml = tpl.slots.map((s,i) => renderSlot(s, i, isMacGrid)).join('');

    // Mengatur bungkus pembawa list slot foto agar bisa flex kolom kebawah ATAU grid 2x2
    let wrapStyle = '';
    if (isMacGrid) {
      wrapStyle = `style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px; border-radius: 0px;"`;
    }

    // Kustom Ornamen Ornamen macOS tambahan ke dalam HTML string
    let macTopbarHtml = '';
    let macBottombarHtml = '';

    if (isMacTheme) {
      // Bulatan 3 macOS klasik di sisi kiri atas & teks judul ditengah
      macTopbarHtml = `
        <div style="position: absolute; top: 0; left: 0; right: 0; height: 30px; display: flex; align-items: center; justify-content: center; padding: 0 10px; pointer-events: none; z-index: 2;">
          <div style="position: absolute; left: 10px; display: flex; gap: 4px;">
            <div style="width:6px; height:6px; background:#FF5F56; border-radius:50%;"></div>
            <div style="width:6px; height:6px; background:#FFBD2E; border-radius:50%;"></div>
            <div style="width:6px; height:6px; background:#27C93F; border-radius:50%;"></div>
          </div>
          <span style="font-size: 8px; font-weight: 600; color: #666; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
            ${tpl.label && tpl.label.text ? esc(tpl.label.text) : 'Photo Booth'}
          </span>
        </div>
      `;

      // Bulatan Shutter Kamera di sisi bawah tengah
      macBottombarHtml = `
        <div style="position: absolute; bottom: 0; left: 0; right: 0; height: 32px; display: flex; align-items: center; justify-content: center; pointer-events: none; z-index: 2;">
          <div style="width: 16px; height: 16px; background: #A0A0A0; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
            <div style="width: 12px; height: 12px; background: #FFFFFF; border-radius: 50%;"></div>
          </div>
        </div>
      `;
    }

    // Matikan cetak tulisan label bawah khusus untuk tema macbook
    const labelHtml = (tpl.label && !isMacTheme)
      ? `<div class="tpl-label tpl-label--${tpl.label.position} tpl-label--${tpl.label.font} tpl-label--${tpl.label.size}"
              style="color:${tpl.label.color};">${esc(tpl.label.text)}</div>`
      : '';

    // texture overlay
    const textureHtml = f.texture && f.texture !== 'none'
      ? `<div class="frame-texture frame-texture--${f.texture}"></div>`
      : '';

    return `<div class="tpl-strip" style="${frameStyle}">
      ${textureHtml}
      ${macTopbarHtml}
      <div class="tpl-slots-wrap" ${wrapStyle}>${slotsHtml}</div>
      ${macBottombarHtml}
      ${labelHtml}
    </div>`;
  }

  /* ── Render badges ────────────────────────── */
  function renderBadges(tpl) {
    const out = [];
    if (tpl.isHot)     out.push('<span class="badge badge--hot">Hot</span>');
    if (tpl.isNew)     out.push('<span class="badge badge--new">New</span>');
    if (tpl.isPremium) out.push('<span class="badge badge--premium">Premium</span>');
    return out.join('');
  }

  /* ── Render satu card ─────────────────────── */
  function renderCard(tpl) {
    const card = document.createElement('div');
    card.className = [
      'tpl-card',
      'genre--' + tpl.genre,
      tpl.isPremium ? 'is-premium' : '',
      tpl.isNew     ? 'is-new' : '',
      tpl.isHot     ? 'is-hot' : '',
    ].filter(Boolean).join(' ');

    card.dataset.id    = tpl.id;
    card.dataset.genre = tpl.genre;
    card.dataset.tags  = tpl.tags.join(',');
    card.dataset.name  = tpl.name.toLowerCase();

    card.innerHTML = `
      <div class="card-preview-wrap">
        ${renderStrip(tpl)}
        <div class="card-badges">${renderBadges(tpl)}</div>
        ${tpl.isPremium ? '<div class="premium-lock"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg></div>' : ''}
        <div class="card-hover-overlay">
          <button class="pick-btn" onclick="window.LUMA_Gallery.pick('${esc(tpl.id)}')">Pilih Template</button>
        </div>
      </div>
      <div class="card-meta">
        <div class="card-meta-top">
          <span class="card-name">${esc(tpl.name)}</span>
          <span class="card-id">${esc(tpl.id)}</span>
        </div>
        <div class="card-meta-bottom">
          <span class="card-genre">${esc(tpl.genre)}</span>
          <span class="card-poses">${tpl.poseCount} pose</span>
        </div>
        <div class="card-tags">
          ${tpl.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}
        </div>
      </div>
    `;
    return card;
  }

  /* ── Filter & sort data ───────────────────── */
  function getFiltered() {
    let list = [...LUMA_TEMPLATES];

    // genre filter
    if (activeGenre !== 'all') {
      list = list.filter(t => t.genre === activeGenre);
    }

    // search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.genre.toLowerCase().includes(q) ||
        t.tags.some(tag => tag.toLowerCase().includes(q))
      );
    }

    // sort
    switch (activeSort) {
      case 'newest': list = list.filter(t => t.isNew).concat(list.filter(t => !t.isNew)); break;
      case 'popular': list = list.filter(t => t.isHot).concat(list.filter(t => !t.isHot)); break;
      case 'poses-asc':  list.sort((a,b) => a.poseCount - b.poseCount); break;
      case 'poses-desc': list.sort((a,b) => b.poseCount - a.poseCount); break;
      default: /* keep insertion order */ break;
    }

    return list;
  }

  /* ── Render seluruh grid ──────────────────── */
  function renderGrid() {
    const grid = document.getElementById('tpl-grid');
    if (!grid) return;

    const filtered = getFiltered();
    visibleCount = filtered.length;

    // Update count label
    const countEl = document.getElementById('gallery-count');
    if (countEl) countEl.textContent = visibleCount + ' template';

    // Clear
    grid.innerHTML = '';

    if (filtered.length === 0) {
      grid.innerHTML = `<div class="grid-empty">
        <div class="grid-empty-icon">🎞️</div>
        <div class="grid-empty-title">Template tidak ditemukan</div>
        <div class="grid-empty-sub">Coba kata kunci atau filter lain.</div>
      </div>`;
      return;
    }

    // Render cards with staggered animation
    filtered.forEach((tpl, i) => {
      const card = renderCard(tpl);
      card.style.animationDelay = Math.min(i * 40, 400) + 'ms';
      grid.appendChild(card);
    });
  }

  /* ── Genre tab switching ──────────────────── */
  function initGenreTabs() {
    document.querySelectorAll('.genre-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.genre-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeGenre = btn.dataset.genre;
        renderGrid();
      });
    });
  }

  /* ── Sort dropdown ────────────────────────── */
  function initSort() {
    const sel = document.getElementById('sort-select');
    if (!sel) return;
    sel.addEventListener('change', () => {
      activeSort = sel.value;
      renderGrid();
    });
  }

  /* ── Search ───────────────────────────────── */
  function initSearch() {
    const inp = document.getElementById('search-input');
    if (!inp) return;
    let debounce;
    inp.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        searchQuery = inp.value;
        renderGrid();
      }, 220);
    });
  }

  /* ── Build genre tabs dynamically from DB ─── */
  function buildGenreTabs() {
    const genres = ['all', ...new Set(LUMA_TEMPLATES.map(t => t.genre))];
    const labels = {
      all:'Semua', classic:'Classic', retro:'Retro',
      y2k:'Y2K', minimal:'Minimal', dark:'Dark', webcore:'Webcore',
    };
    const container = document.getElementById('genre-tabs');
    if (!container) return;
    container.innerHTML = genres.map(g =>
      `<button class="genre-tab${g==='all'?' active':''}\" data-genre="${g}">
        ${labels[g] || g}
        <span class="genre-count">${g==='all' ? LUMA_TEMPLATES.length : LUMA_TEMPLATES.filter(t=>t.genre===g).length}</span>
      </button>`
    ).join('');
  }

  /* ── Public API ───────────────────────────── */
  window.LUMA_Gallery = {
    pick(id) {
      const tpl = LUMA_TEMPLATES.find(t => t.id === id);
      if (!tpl) return;
      window.location.href = 'booth.html?tpl=' + encodeURIComponent(tpl.id);
    },
    refresh() { renderGrid(); },
    getAll()  { return LUMA_TEMPLATES; },
  };

  /* ── Init ─────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', () => {
    buildGenreTabs();
    initGenreTabs();
    initSort();
    initSearch();
    renderGrid();
  });

})();