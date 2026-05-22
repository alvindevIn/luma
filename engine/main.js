const TEMPLATES = [
  {
    name: 'Darkroom',
    style: 'Classic',
    bg: '#1A1612',
    slots: ['#2C2520', '#1A1612', '#2C2520', '#1A1612'],
    accent: '#C8502A'
  },
  {
    name: 'Kodak Tone',
    style: 'Retro',
    bg: '#E8D5B7',
    slots: ['#D4A96A', '#E8D5B7', '#D4A96A', '#E8D5B7'],
    accent: '#D4A96A'
  },
  {
    name: 'Blueprint',
    style: 'Y2K',
    bg: '#3D5A80',
    slots: ['#2a4060', '#4a70a0', '#2a4060'],
    accent: '#4a70a0'
  },
  {
    name: 'Noir Rouge',
    style: 'Dark',
    bg: '#8B1A1A',
    slots: ['#6b1515', '#a02020', '#6b1515', '#a02020'],
    accent: '#C8502A'
  },
  {
    name: 'Grain Paper',
    style: 'Minimal',
    bg: '#f5f0e8',
    slots: ['#e8e0d5', '#f0ebe3', '#e8e0d5', '#f0ebe3'],
    accent: '#7A6E63'
  },
  {
    name: 'Ink & Bone',
    style: 'Minimal',
    bg: '#f5f0e8',
    slots: ['#1A1612', '#f5f0e8', '#1A1612'],
    accent: '#1A1612'
  },
  {
    name: 'Film 400',
    style: 'Retro',
    bg: '#c8b89a',
    slots: ['#b8a88a', '#d8c8aa', '#b8a88a', '#d8c8aa'],
    accent: '#7A6E63'
  },
  {
    name: 'Windows XP',
    style: 'Webcore',
    bg: '#0055b3',
    slots: ['#1a7a1a', '#0055b3', '#1a7a1a'],
    accent: '#1a7a1a'
  }
];

/* ──────────────────────────────────────────
   BUILD STRIP PREVIEW
────────────────────────────────────────── */
function buildStrip(template) {
  const slotsHtml = template.slots.map(color => `
    <div
      class="sp-slot"
      style="background:${color};"
    ></div>
  `).join('');

  return `
    <div
      class="strip-preview"
      style="background:${template.bg};"
    >
      ${slotsHtml}
    </div>
  `;
}

/* ──────────────────────────────────────────
   FLOATING CARDS
────────────────────────────────────────── */
const floatCardIds = ['fc1', 'fc2', 'fc3', 'fc4'];
const floatInnerIds = ['fci1', 'fci2', 'fci3', 'fci4'];
const floatLabelIds = ['fcl1', 'fcl2', 'fcl3', 'fcl4'];

let assignedTemplates = [0, 1, 2, 3];

function applyTemplateToCard(cardIndex, templateIndex) {
  const inner = document.getElementById(floatInnerIds[cardIndex]);
  const template = TEMPLATES[templateIndex];

  inner.classList.add('fade-out');

  setTimeout(() => {
    inner.innerHTML = `
      ${buildStrip(template)}
      <div class="strip-label" id="${floatLabelIds[cardIndex]}">
        ${template.name}
      </div>
    `;

    inner.classList.remove('fade-out');
  }, 500);
}

/* initial setup */
floatCardIds.forEach((_, index) => {
  applyTemplateToCard(index, assignedTemplates[index]);
});

/* auto rotate template */
setInterval(() => {
  const randomCard = Math.floor(Math.random() * 4);

  let randomTemplate;

  do {
    randomTemplate = Math.floor(Math.random() * TEMPLATES.length);
  } while (randomTemplate === assignedTemplates[randomCard]);

  assignedTemplates[randomCard] = randomTemplate;

  applyTemplateToCard(randomCard, randomTemplate);
}, 3000);

/* ──────────────────────────────────────────
   POPULAR TEMPLATE CARDS
────────────────────────────────────────── */
const POPULAR = [0, 1, 2, 3, 4];

const cardsRow = document.getElementById('cardsRow');

POPULAR.forEach(index => {
  const template = TEMPLATES[index];

  const card = document.createElement('div');

  card.className = 'result-card';

  const slotsHtml = template.slots.map(color => `
    <div
      class="rc-slot"
      style="background:${color};"
    ></div>
  `).join('');

  card.innerHTML = `
    <div
      class="rc-preview"
      style="background:${template.bg};"
    >
      ${slotsHtml}
    </div>

    <div class="rc-footer">

      <div class="rc-name">
        ${template.name}
      </div>

      <div class="rc-meta">
        <span class="rc-dot"></span>
        ${template.slots.length} pose
      </div>

      <div class="rc-style-badge">
        ${template.style}
      </div>

    </div>
  `;

  cardsRow.appendChild(card);
});

/* ──────────────────────────────────────────
   NAVBAR ACTIVE LINK
────────────────────────────────────────── */
window.addEventListener('scroll', () => {

  const scrollY = window.scrollY + 100;

  document
    .querySelectorAll('.nav-link')
    .forEach(link => link.classList.remove('active'));

  if (scrollY < 500) {

    document
      .querySelector('.nav-link[href="#start"]')
      .classList.add('active');

  } else if (
    scrollY < document.getElementById('about-section').offsetTop
  ) {

    // gallery section

  } else {

    document
      .querySelector('.nav-link[href="#about"]')
      .classList.add('active');

  }

});