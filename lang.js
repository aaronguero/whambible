
// ============================================================
// WhamBible — Language System
// Replace TRANSLATE_FN with your API of choice:
//   - Google Cloud Translation API
//   - DeepL API
//   - LibreTranslate (open source, self-hostable)
//   - MyMemory (free tier, no key)
// ============================================================

const WHAM_LANGUAGES = [
  { code:'en', flag:'🇺🇸', label:'EN', name:'English',    nativeName:'English'    },
  { code:'es', flag:'🇪🇸', label:'ES', name:'Spanish',    nativeName:'Español'    },
  { code:'fr', flag:'🇫🇷', label:'FR', name:'French',     nativeName:'Français'   },
  { code:'de', flag:'🇩🇪', label:'DE', name:'German',     nativeName:'Deutsch'    },
  { code:'pt', flag:'🇵🇹', label:'PT', name:'Portuguese', nativeName:'Português'  },
  { code:'it', flag:'🇮🇹', label:'IT', name:'Italian',    nativeName:'Italiano'   },
  { code:'zh', flag:'🇨🇳', label:'ZH', name:'Chinese',    nativeName:'中文'        },
  { code:'ru', flag:'🇷🇺', label:'RU', name:'Russian',    nativeName:'Русский'    },
  { code:'ja', flag:'🇯🇵', label:'JA', name:'Japanese',   nativeName:'日本語'      },
  { code:'ar', flag:'🇸🇦', label:'AR', name:'Arabic',     nativeName:'العربية'    },
];

// ── Active language (persisted across pages) ────────────────
let WHAM_LANG = localStorage.getItem('whamLang') || 'en';

// ── Translation placeholder ─────────────────────────────────
// WIRE THIS: replace with your chosen API call
// Options:
//   MyMemory (free, no key):  https://api.mymemory.translated.net/get?q=TEXT&langpair=en|TARGET
//   DeepL:                    https://api-free.deepl.com/v2/translate (key required)
//   Google Cloud Translation: https://translation.googleapis.com/language/translate/v2 (key required)
//   LibreTranslate:           https://libretranslate.com/translate (self-hosted or API key)
async function whamTranslate(text, targetLang) {
  if (targetLang === 'en') return text; // no-op for English

  // ── PLACEHOLDER: swap this fetch for your chosen API ──────
  // Currently uses MyMemory (free, ~1000 words/day, no key)
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLang}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.responseStatus === 200 && data.responseData?.translatedText) {
      return data.responseData.translatedText;
    }
    return text; // fallback to English on error
  } catch(e) {
    return text; // fallback
  }
}

// ── Apply language to the page ───────────────────────────────
// Elements with data-i18n="key" get translated
// Elements with data-i18n-src="en text" store the English source
async function whamApplyLang(lang) {
  WHAM_LANG = lang;
  localStorage.setItem('whamLang', lang);

  // Update all lang scroll wheels on the page
  whamLangWheelSync(lang);

  if (lang === 'en') {
    // Restore all originals
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const src = el.getAttribute('data-i18n-src');
      if (src) el.textContent = src;
    });
    return;
  }

  // Translate each tagged element
  const els = document.querySelectorAll('[data-i18n]');
  for (const el of els) {
    // Store English source on first pass
    if (!el.getAttribute('data-i18n-src')) {
      el.setAttribute('data-i18n-src', el.textContent.trim());
    }
    const src = el.getAttribute('data-i18n-src');
    el.setAttribute('data-i18n-loading', '1');
    const translated = await whamTranslate(src, lang);
    el.textContent = translated;
    el.removeAttribute('data-i18n-loading');
  }
}

// ── Init on page load ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Build all lang wheels on this page
  document.querySelectorAll('.wham-lang-wheel-wrap').forEach(wrap => {
    whamLangWheelInit(wrap);
  });
  // Apply saved language if not English
  if (WHAM_LANG && WHAM_LANG !== 'en') {
    whamApplyLang(WHAM_LANG);
  }
});


// ── Language Scroll Wheel Engine ────────────────────────────
const LANG_CELL_H = 44;

function whamLangWheelInit(wrap) {
  const inner   = wrap.querySelector('.wham-lang-inner');
  const outer   = wrap.querySelector('.wham-lang-outer');
  const selBtn  = wrap.querySelector('.wham-lang-select-btn');
  if (!inner || !outer) return;

  const items = WHAM_LANGUAGES;
  // Find starting index from saved lang
  let idx = items.findIndex(l => l.code === WHAM_LANG);
  if (idx < 0) idx = 0;

  const state = {
    items, index: idx,
    dragging: false, startX: 0, dragOffset: 0,
    velocity: 0, lastX: 0, lastT: 0, _startPad: 0
  };
  wrap._langState = state;

  // Render cells — horizontal, 3x list for infinite feel
  inner.innerHTML = '';
  const reps = 3;
  state._startPad = items.length; // 1 rep offset
  for (let r = 0; r < reps; r++) {
    items.forEach(lang => {
      const div = document.createElement('div');
      div.className = 'wham-lang-cell';
      div.innerHTML = `<span class="lang-flag">${lang.flag}</span><span class="lang-code">${lang.label}</span>`;
      inner.appendChild(div);
    });
  }

  whamLangSetOffset(wrap, 0, false);

  // Touch
  outer.addEventListener('touchstart',  e => whamLangDragStart(wrap, e.touches[0].clientX), {passive:true});
  outer.addEventListener('touchmove',   e => { e.preventDefault(); whamLangDragMove(wrap, e.touches[0].clientX); }, {passive:false});
  outer.addEventListener('touchend',    () => whamLangDragEnd(wrap));
  // Mouse
  outer.addEventListener('mousedown',   e => whamLangDragStart(wrap, e.clientX));
  window.addEventListener('mousemove',  e => { if (wrap._langState && wrap._langState.dragging) whamLangDragMove(wrap, e.clientX); });
  window.addEventListener('mouseup',    () => { if (wrap._langState && wrap._langState.dragging) whamLangDragEnd(wrap); });

  // Select button
  if (selBtn) {
    selBtn.addEventListener('click', () => {
      const lang = state.items[state.index].code;
      whamApplyLang(lang);
      whamPlaceholder(
        lang === 'en'
          ? '🌐 English selected'
          : `🌐 ${state.items[state.index].nativeName} — translating...`
      );
    });
  }
}

function whamLangSetOffset(wrap, pxOffset, animate) {
  const s     = wrap._langState;
  const inner = wrap.querySelector('.wham-lang-inner');
  if (!inner || !s) return;
  const px = -s.index * LANG_CELL_H + s._startPad * LANG_CELL_H - pxOffset;
  inner.style.transition = animate ? 'transform 0.22s cubic-bezier(.22,.68,0,1.2)' : 'none';
  inner.style.transform  = `translateX(${px}px)`;
  whamLangHighlight(wrap);
}

function whamLangHighlight(wrap) {
  const s     = wrap._langState;
  const inner = wrap.querySelector('.wham-lang-inner');
  if (!inner || !s) return;
  const selI = s._startPad + s.index;
  inner.querySelectorAll('.wham-lang-cell').forEach((c, i) => {
    c.classList.toggle('selected', i === selI);
  });
}

function whamLangDragStart(wrap, x) {
  const s = wrap._langState;
  s.dragging = true; s.startX = x; s.dragOffset = 0;
  s.lastX = x; s.lastT = Date.now(); s.velocity = 0;
}

function whamLangDragMove(wrap, x) {
  const s = wrap._langState;
  if (!s.dragging) return;
  const now = Date.now();
  s.velocity   = (x - s.lastX) / Math.max(1, now - s.lastT) * 16;
  s.lastX = x; s.lastT = now;
  s.dragOffset = -(x - s.startX);
  whamLangSetOffset(wrap, s.dragOffset, false);
}

function whamLangDragEnd(wrap) {
  const s = wrap._langState;
  if (!s.dragging) return;
  s.dragging = false;
  let delta = Math.round(s.dragOffset / LANG_CELL_H) + (-Math.round(s.velocity * 2 / LANG_CELL_H));
  s.index = Math.max(0, Math.min(s.items.length - 1, s.index + delta));
  s.dragOffset = 0;
  whamLangSetOffset(wrap, 0, true);
}

// Sync all wheels on page to a given lang code
function whamLangWheelSync(code) {
  document.querySelectorAll('.wham-lang-wheel-wrap').forEach(wrap => {
    const s = wrap._langState;
    if (!s) return;
    const idx = s.items.findIndex(l => l.code === code);
    if (idx >= 0) {
      s.index = idx;
      whamLangSetOffset(wrap, 0, true);
    }
  });
}
