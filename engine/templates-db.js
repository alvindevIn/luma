/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  LUMA — Template Database                                        ║
 * ║  Untuk menambah template baru, cukup push objek baru ke          ║
 * ║  LUMA_TEMPLATES. ID akan di-generate otomatis berdasarkan urutan.║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * SCHEMA satu template:
 * {
 *   name        : string   — Nama tampil di UI
 *   genre       : string   — Kategori: 'classic'|'retro'|'y2k'|'minimal'|'dark'|'webcore'
 *   tags        : string[] — Tag tambahan bebas, misal ['bw','film','strip']
 *   poseCount   : number   — Jumlah slot foto (2–6)
 *   orientation : 'portrait'|'landscape'|'square'  — orientasi strip keseluruhan
 *   slots       : SlotDef[]  — Definisi tiap slot foto
 *   frame       : FrameDef  — Warna/style bingkai/background strip
 *   label       : LabelDef  — Teks dekoratif di strip (opsional)
 *   isNew       : bool    — Tampilkan badge "New"
 *   isHot       : bool    — Tampilkan badge "Hot"
 *   isPremium   : bool    — Tampilkan badge "Premium" + lock
 * }
 *
 * SlotDef:
 * {
 *   axis        : 'full'|'top'|'bottom'|'left'|'right'|'center'
 *                 — area foto relatif terhadap slot (untuk simulasi crop)
 *   bg          : string  — warna placeholder slot (hex)
 *   tint        : string  — overlay warna opsional (hex+alpha)
 *   border      : string  — CSS border string opsional, misal '2px solid #fff'
 *   radius      : string  — border-radius opsional
 * }
 *
 * FrameDef:
 * {
 *   bg          : string  — background warna strip
 *   border      : string  — CSS border strip luar
 *   padding     : string  — padding dalam strip
 *   radius      : string  — border-radius strip
 *   texture     : 'none'|'grain'|'paper'|'halftone'  — overlay tekstur
 * }
 *
 * LabelDef (opsional):
 * {
 *   text        : string  — teks label
 *   position    : 'top'|'bottom'  — posisi di strip
 *   color       : string  — warna teks
 *   font        : 'serif'|'mono'|'sans'
 *   size        : 'xs'|'sm'|'md'
 * }
 */

const LUMA_TEMPLATES = [

  /* ── 000 ─────────────────────────────────────── */
  {
    name:        'Macbook Booth',
    genre:       'webcore',
    tags:        ['y2k','macbook','photobooth','retro-tech'],
    poseCount:   4,
    orientation: 'landscape',
    layout:      'grid-2x2', 
    theme:       'macbook', 
    frame: {
      bg:      '#E1E1E1',   
      border:  '1px solid #ACACAC',
      padding: '40px 14px 45px',
      radius:  '10px',
      texture: 'none',
    },
    slots: [
      { axis:'center', bg:'#1A1612', tint:'none' },
      { axis:'center', bg:'#1A1612', tint:'none' },
      { axis:'center', bg:'#1A1612', tint:'none' },
      { axis:'center', bg:'#1A1612', tint:'none' },
    ],
    label: { text:'Photo Booth', position:'top', color:'#4D4D4D', font:'sans', size:'sm' },
    isHot:    true,
    isNew:    true,
    isPremium: false,
  },

    /* ── 001─────────────────────────────────────── */
  {
    name:        'Darkroom',
    genre:       'classic',
    tags:        ['bw','film','strip','analog'],
    poseCount:   4,
    orientation: 'portrait',
    frame: {
      bg:      '#1A1612',
      border:  'none',
      padding: '10px 10px 18px',
      radius:  '12px',
      texture: 'grain',
    },
    slots: [
      { axis:'center', bg:'#2C2520', tint:'rgba(0,0,0,.2)' },
      { axis:'center', bg:'#1A1612', tint:'rgba(0,0,0,.15)' },
      { axis:'center', bg:'#2C2520', tint:'rgba(0,0,0,.2)' },
      { axis:'center', bg:'#1A1612', tint:'rgba(0,0,0,.15)' },
    ],
    label: { text:'LUMA · Darkroom', position:'bottom', color:'rgba(245,239,230,.4)', font:'mono', size:'xs' },
    isHot:    true,
    isNew:    false,
    isPremium: false,
  },

  /* ── 002 ─────────────────────────────────────── */
  {
   name:        'Espresso',
   genre:       'classic',
   tags:        ['brown','warm','coffee','minimal'],
   poseCount:   2,
   orientation: 'portrait',
   frame: {
     bg:      '#2C1810',
     border:  'none',
     padding: '10px 10px 20px',
     radius:  '12px',
     texture: 'grain',
   },
   slots: [
     { axis:'top',    bg:'#3d2418', tint:'rgba(44,24,16,.3)' },
     { axis:'bottom', bg:'#1e0e08', tint:'rgba(44,24,16,.4)' },
   ],
   label: { text:'espresso · shot', position:'bottom', color:'rgba(200,160,100,.4)', font:'serif', size:'xs' },
   isHot:    true,
   isNew:    true,
   isPremium: false,
 },

  /* ── 003 ─────────────────────────────────────── */
    {
    name:        'Kodak Tone',
    genre:       'retro',
    tags:        ['warm','film','kodak','analog'],
    poseCount:   4,
    orientation: 'portrait',
    frame: {
      bg:      '#E8D5B7',
      border:  '2px solid #D4A96A',
      padding: '8px 8px 20px',
      radius:  '10px',
      texture: 'paper',
    },
    slots: [
      { axis:'top',    bg:'#D4A96A', tint:'rgba(212,169,106,.25)' },
      { axis:'center', bg:'#E8D5B7', tint:'rgba(212,169,106,.15)' },
      { axis:'top',    bg:'#D4A96A', tint:'rgba(212,169,106,.25)' },
      { axis:'center', bg:'#E8D5B7', tint:'rgba(212,169,106,.15)' },
    ],
    label: { text:'Kodak · 400', position:'bottom', color:'#7A6E63', font:'mono', size:'xs' },
    isHot:    false,
    isNew:    false,
    isPremium: false,
  },

  /* ── 004 ─────────────────────────────────────── */
  {
    name:        'Blueprint',
    genre:       'y2k',
    tags:        ['blue','digital','y2k','tech'],
    poseCount:   3,
    orientation: 'portrait',
    frame: {
      bg:      '#1e3a5f',
      border:  '2px solid #4a70a0',
      padding: '10px 10px 18px',
      radius:  '14px',
      texture: 'none',
    },
    slots: [
      { axis:'center', bg:'#2a4060', tint:'rgba(74,112,160,.3)', border:'1px solid rgba(255,255,255,.12)' },
      { axis:'center', bg:'#4a70a0', tint:'rgba(74,112,160,.2)', border:'1px solid rgba(255,255,255,.12)' },
      { axis:'center', bg:'#2a4060', tint:'rgba(74,112,160,.3)', border:'1px solid rgba(255,255,255,.12)' },
    ],
    label: { text:'BLUEPRINT · v1', position:'bottom', color:'rgba(100,160,220,.7)', font:'mono', size:'xs' },
    isHot:    false,
    isNew:    true,
    isPremium: false,
  },

  /* ── 005 ─────────────────────────────────────── */
  {
    name:        'Grain Paper',
    genre:       'minimal',
    tags:        ['minimal','beige','clean','neutral'],
    poseCount:   4,
    orientation: 'portrait',
    frame: {
      bg:      '#f5f0e8',
      border:  '1px solid #d8cfc2',
      padding: '8px 8px 22px',
      radius:  '10px',
      texture: 'paper',
    },
    slots: [
      { axis:'center', bg:'#e8e0d5', tint:'rgba(0,0,0,.04)' },
      { axis:'center', bg:'#f0ebe3', tint:'rgba(0,0,0,.02)' },
      { axis:'center', bg:'#e8e0d5', tint:'rgba(0,0,0,.04)' },
      { axis:'center', bg:'#f0ebe3', tint:'rgba(0,0,0,.02)' },
    ],
    label: { text:'grain · paper', position:'bottom', color:'#b0a89a', font:'serif', size:'xs' },
    isHot:    false,
    isNew:    false,
    isPremium: false,
  },

  /* ── 006 ─────────────────────────────────────── */
  {
    name:        'Ink & Bone',
    genre:       'minimal',
    tags:        ['minimal','bw','contrast','editorial'],
    poseCount:   3,
    orientation: 'portrait',
    frame: {
      bg:      '#fafaf8',
      border:  '2px solid #1A1612',
      padding: '10px 10px 22px',
      radius:  '8px',
      texture: 'none',
    },
    slots: [
      { axis:'center', bg:'#1A1612', tint:'none', border:'none' },
      { axis:'center', bg:'#fafaf8', tint:'none', border:'1px solid #1A1612' },
      { axis:'center', bg:'#1A1612', tint:'none', border:'none' },
    ],
    label: { text:'INK & BONE', position:'bottom', color:'#1A1612', font:'serif', size:'xs' },
    isHot:    false,
    isNew:    false,
    isPremium: false,
  },

  /* ── 007 ─────────────────────────────────────── */
  {
    name:        'Film 400',
    genre:       'retro',
    tags:        ['film','brown','warm','analog'],
    poseCount:   4,
    orientation: 'portrait',
    frame: {
      bg:      '#c8b89a',
      border:  'none',
      padding: '8px 8px 20px',
      radius:  '10px',
      texture: 'grain',
    },
    slots: [
      { axis:'center', bg:'#b8a88a', tint:'rgba(180,150,100,.2)' },
      { axis:'center', bg:'#d8c8aa', tint:'rgba(180,150,100,.1)' },
      { axis:'center', bg:'#b8a88a', tint:'rgba(180,150,100,.2)' },
      { axis:'center', bg:'#d8c8aa', tint:'rgba(180,150,100,.1)' },
    ],
    label: { text:'Fuji · 400', position:'bottom', color:'rgba(80,60,30,.5)', font:'mono', size:'xs' },
    isHot:    false,
    isNew:    false,
    isPremium: false,
  },

  /* ── 008 ─────────────────────────────────────── */
  {
    name:        'Windows XP',
    genre:       'webcore',
    tags:        ['y2k','windows','web','retro-tech'],
    poseCount:   3,
    orientation: 'portrait',
    frame: {
      bg:      '#0055b3',
      border:  '3px solid #1a90ff',
      padding: '10px 10px 18px',
      radius:  '6px',
      texture: 'none',
    },
    slots: [
      { axis:'center', bg:'#1a7a1a', tint:'rgba(26,122,26,.3)', border:'1px solid rgba(255,255,255,.2)' },
      { axis:'center', bg:'#0055b3', tint:'rgba(0,85,179,.3)', border:'1px solid rgba(255,255,255,.2)' },
      { axis:'center', bg:'#1a7a1a', tint:'rgba(26,122,26,.3)', border:'1px solid rgba(255,255,255,.2)' },
    ],
    label: { text:'Windows · XP', position:'bottom', color:'rgba(255,255,255,.5)', font:'mono', size:'xs' },
    isHot:    false,
    isNew:    true,
    isPremium: false,
  },

  /* ── 009 ─────────────────────────────────────── */
  {
    name:        'Vaporwave',
    genre:       'y2k',
    tags:        ['vaporwave','purple','aesthetic','gradient'],
    poseCount:   4,
    orientation: 'portrait',
    frame: {
      bg:      '#2d0a4e',
      border:  '2px solid #a855f7',
      padding: '10px 10px 20px',
      radius:  '14px',
      texture: 'none',
    },
    slots: [
      { axis:'center', bg:'#6a50a0', tint:'rgba(168,85,247,.3)' },
      { axis:'center', bg:'#3a2050', tint:'rgba(168,85,247,.2)' },
      { axis:'center', bg:'#6a50a0', tint:'rgba(168,85,247,.3)' },
      { axis:'center', bg:'#3a2050', tint:'rgba(168,85,247,.2)' },
    ],
    label: { text:'V A P O R', position:'bottom', color:'rgba(200,150,255,.6)', font:'mono', size:'xs' },
    isHot:    false,
    isNew:    true,
    isPremium: false,
  },

  /* ── 010 ─────────────────────────────────────── */
  {
    name:        'Noir Rouge',
    genre:       'dark',
    tags:        ['red','dark','moody','drama'],
    poseCount:   4,
    orientation: 'portrait',
    frame: {
      bg:      '#8B1A1A',
      border:  'none',
      padding: '10px 10px 16px',
      radius:  '12px',
      texture: 'grain',
    },
    slots: [
      { axis:'center', bg:'#6b1515', tint:'rgba(139,26,26,.4)' },
      { axis:'center', bg:'#a02020', tint:'rgba(139,26,26,.2)' },
      { axis:'center', bg:'#6b1515', tint:'rgba(139,26,26,.4)' },
      { axis:'center', bg:'#a02020', tint:'rgba(139,26,26,.2)' },
    ],
    label: { text:'NOIR · ROUGE', position:'bottom', color:'rgba(255,200,200,.35)', font:'serif', size:'xs' },
    isHot:    false,
    isNew:    false,
    isPremium: false,
  },

  /* ── 011 ─────────────────────────────────────── */
  {
    name:        'Sakura',
    genre:       'minimal',
    tags:        ['pink','soft','japan','spring'],
    poseCount:   4,
    orientation: 'portrait',
    frame: {
      bg:      '#fde8ed',
      border:  '1px solid #f4b8c8',
      padding: '8px 8px 22px',
      radius:  '14px',
      texture: 'paper',
    },
    slots: [
      { axis:'center', bg:'#f9cdd8', tint:'rgba(244,184,200,.2)' },
      { axis:'center', bg:'#fde8ed', tint:'rgba(244,184,200,.1)' },
      { axis:'center', bg:'#f9cdd8', tint:'rgba(244,184,200,.2)' },
      { axis:'center', bg:'#fde8ed', tint:'rgba(244,184,200,.1)' },
    ],
    label: { text:'桜 · sakura', position:'bottom', color:'#c48fa0', font:'serif', size:'xs' },
    isHot:    false,
    isNew:    true,
    isPremium: false,
  },

  /* ── 012 ─────────────────────────────────────── */
  {
    name:        'Neon Night',
    genre:       'dark',
    tags:        ['neon','night','green','cyberpunk'],
    poseCount:   3,
    orientation: 'portrait',
    frame: {
      bg:      '#050f0a',
      border:  '1px solid #00ff88',
      padding: '10px 10px 18px',
      radius:  '10px',
      texture: 'none',
    },
    slots: [
      { axis:'center', bg:'#0a2018', tint:'rgba(0,255,136,.1)', border:'1px solid rgba(0,255,136,.2)' },
      { axis:'center', bg:'#051510', tint:'rgba(0,255,136,.08)', border:'1px solid rgba(0,255,136,.15)' },
      { axis:'center', bg:'#0a2018', tint:'rgba(0,255,136,.1)', border:'1px solid rgba(0,255,136,.2)' },
    ],
    label: { text:'NEON · NIGHT', position:'bottom', color:'rgba(0,255,136,.5)', font:'mono', size:'xs' },
    isHot:    false,
    isNew:    true,
    isPremium: false,
  },

];

/* ─────────────────────────────────────────
   AUTO-ASSIGN ID berdasarkan urutan array
   Format: TPL-001, TPL-002, ...
   Jangan ubah bagian ini.
───────────────────────────────────────── */
LUMA_TEMPLATES.forEach((tpl, idx) => {
  tpl.id    = 'TPL-' + String(idx + 1).padStart(3, '0');
  tpl.index = idx + 1;
});

/* Export untuk dipakai gallery.js */
if (typeof module !== 'undefined') module.exports = LUMA_TEMPLATES;
