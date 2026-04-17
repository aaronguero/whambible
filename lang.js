// ============================================================
// WhamBible — Language System  (lang.js)
// ============================================================
//
// TRANSLATION API — choose ONE provider, set WHAM_TRANSLATE_PROVIDER
// and fill in the matching key/URL below.
//
//  Provider options:
//  ─────────────────────────────────────────────────────────
//  'mymemory'   — Free, no key, ~1000 words/day per IP
//                 Good for: dev/testing
//                 Docs: https://mymemory.translated.net/doc/spec.php
//
//  'google'     — Google Cloud Translation API v2
//                 Requires: GOOGLE_TRANSLATE_API_KEY (paid, ~$20/1M chars)
//                 Docs: https://cloud.google.com/translate/docs/reference/rest
//
//  'deepl'      — DeepL API (highest quality, 19 languages)
//                 Requires: DEEPL_API_KEY (free tier: 500K chars/mo)
//                 Docs: https://www.deepl.com/docs-api
//
//  'libretranslate' — Open source, self-hosted or hosted
//                 Requires: LIBRETRANSLATE_URL + optional LIBRETRANSLATE_API_KEY
//                 Docs: https://libretranslate.com / https://github.com/LibreTranslate/LibreTranslate
//
// ────────────────────────────────────────────────────────────
// STEP 1: Set your provider
const WHAM_TRANSLATE_PROVIDER = 'mymemory'; // ← change to 'google' | 'deepl' | 'libretranslate'

// STEP 2: Fill in your key/URL for the chosen provider
const WHAM_TRANSLATE_CONFIG = {

  // ── MyMemory (no key required) ───────────────────────────
  mymemory: {
    // No key needed. Optional: add &de=your@email.com for 10K words/day
    email: '', // optional: 'your@email.com'
  },

  // ── Google Cloud Translation ─────────────────────────────
  google: {
    apiKey: '%%GOOGLE_TRANSLATE_API_KEY%%', // Replace with your key
    // Get key: https://console.cloud.google.com → APIs → Cloud Translation API
  },

  // ── DeepL ────────────────────────────────────────────────
  deepl: {
    apiKey: '%%DEEPL_API_KEY%%', // Replace with your key
    // Free tier key ends in :fx → use api-free.deepl.com
    // Paid key → use api.deepl.com
    freeKey: true, // set false if using a paid key
    // Supported langs: https://www.deepl.com/docs-api/translate-text
    // Note: DeepL uses different codes — ZH→ZH, JA→JA, AR not supported
  },

  // ── LibreTranslate ───────────────────────────────────────
  libretranslate: {
    url:    'https://libretranslate.com', // or your self-hosted URL
    apiKey: '%%LIBRETRANSLATE_API_KEY%%', // Optional if self-hosted with no auth
    // Free hosted instance may have rate limits
    // Self-host: https://github.com/LibreTranslate/LibreTranslate
  },

};
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


// ============================================================
// whamTranslate — single entry point, routes to active provider
// ============================================================
async function whamTranslate(text, targetLang) {
  if (!text || !text.trim()) return text;
  if (targetLang === 'en') return text; // no-op

  const cfg = WHAM_TRANSLATE_CONFIG[WHAM_TRANSLATE_PROVIDER] || {};

  try {

    // ── MyMemory ─────────────────────────────────────────────
    if (WHAM_TRANSLATE_PROVIDER === 'mymemory') {
      let url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLang}`;
      if (cfg.email) url += `&de=${encodeURIComponent(cfg.email)}`;
      const res  = await fetch(url);
      const data = await res.json();
      if (data.responseStatus === 200 && data.responseData?.translatedText) {
        return data.responseData.translatedText;
      }
      return text;
    }

    // ── Google Cloud Translation ──────────────────────────────
    if (WHAM_TRANSLATE_PROVIDER === 'google') {
      // PLACEHOLDER — fill in GOOGLE_TRANSLATE_API_KEY above
      // Endpoint: POST https://translation.googleapis.com/language/translate/v2
      // Body: { q: text, target: targetLang, source: 'en', format: 'text' }
      const url = `https://translation.googleapis.com/language/translate/v2?key=${cfg.apiKey}`;
      const res  = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: text, source: 'en', target: targetLang, format: 'text' }),
      });
      const data = await res.json();
      return data?.data?.translations?.[0]?.translatedText || text;
    }

    // ── DeepL ─────────────────────────────────────────────────
    if (WHAM_TRANSLATE_PROVIDER === 'deepl') {
      // PLACEHOLDER — fill in DEEPL_API_KEY above
      // DeepL lang codes differ slightly — map as needed:
      //   ZH → ZH  |  JA → JA  |  PT → PT-BR or PT-PT
      //   AR — NOT supported by DeepL (falls back to English)
      const deeplLangMap = { zh:'ZH', ja:'JA', pt:'PT-BR', en:'EN' };
      const tl = (deeplLangMap[targetLang] || targetLang.toUpperCase());
      const base = cfg.freeKey
        ? 'https://api-free.deepl.com/v2/translate'
        : 'https://api.deepl.com/v2/translate';
      const res  = await fetch(base, {
        method: 'POST',
        headers: {
          'Authorization': `DeepL-Auth-Key ${cfg.apiKey}`,
          'Content-Type':  'application/x-www-form-urlencoded',
        },
        body: `text=${encodeURIComponent(text)}&source_lang=EN&target_lang=${tl}`,
      });
      const data = await res.json();
      return data?.translations?.[0]?.text || text;
    }

    // ── LibreTranslate ────────────────────────────────────────
    if (WHAM_TRANSLATE_PROVIDER === 'libretranslate') {
      // PLACEHOLDER — set libretranslate.url and optional apiKey above
      const body = { q: text, source: 'en', target: targetLang, format: 'text' };
      if (cfg.apiKey && !cfg.apiKey.startsWith('%%')) body.api_key = cfg.apiKey;
      const res  = await fetch(`${cfg.url}/translate`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });
      const data = await res.json();
      return data?.translatedText || text;
    }

  } catch(e) {
    console.warn('[WhamBible] Translation error:', e);
  }

  return text; // universal fallback — show English if anything fails
}


// ── Apply language to the page ───────────────────────────────
// Elements with data-i18n="key" get translated.
// data-i18n-src stores the original English for re-use.
async function whamApplyLang(lang) {
  WHAM_LANG = lang;
  localStorage.setItem('whamLang', lang);

  // Update menu language button to show active flag
  const curLang = WHAM_LANGUAGES.find(l => l.code === lang);
  if (curLang) {
    const flagEl  = document.getElementById('menu-lang-flag');
    const labelEl = document.getElementById('menu-lang-label');
    if (flagEl)  flagEl.textContent  = curLang.flag;
    if (labelEl) labelEl.textContent = curLang.nativeName || curLang.label;
  }

  // Sync all scroll wheels
  whamLangWheelSync(lang);

  if (lang === 'en') {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const src = el.getAttribute('data-i18n-src');
      if (src) el.textContent = src;
    });
    return;
  }

  const els = document.querySelectorAll('[data-i18n]');
  for (const el of els) {
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
  document.querySelectorAll('.wham-lang-wheel-wrap').forEach(wrap => {
    whamLangWheelInit(wrap);
  });

  // Restore menu language button from saved pref
  const savedLang = WHAM_LANGUAGES.find(l => l.code === WHAM_LANG);
  if (savedLang) {
    const flagEl  = document.getElementById('menu-lang-flag');
    const labelEl = document.getElementById('menu-lang-label');
    if (flagEl && WHAM_LANG !== 'en')  flagEl.textContent  = savedLang.flag;
    if (labelEl && WHAM_LANG !== 'en') labelEl.textContent = savedLang.nativeName || savedLang.label;
  }

  if (WHAM_LANG && WHAM_LANG !== 'en') {
    whamApplyLang(WHAM_LANG);
  }
});


// ============================================================
// Language Scroll Wheel Engine
// ============================================================
const LANG_CELL_H = 44;

function whamLangWheelInit(wrap) {
  const inner  = wrap.querySelector('.wham-lang-inner');
  const outer  = wrap.querySelector('.wham-lang-outer');
  const selBtn = wrap.querySelector('.wham-lang-select-btn');
  if (!inner || !outer) return;

  const items = WHAM_LANGUAGES;
  let idx = items.findIndex(l => l.code === WHAM_LANG);
  if (idx < 0) idx = 0;

  const state = {
    items, index: idx,
    dragging: false, startX: 0, dragOffset: 0,
    velocity: 0, lastX: 0, lastT: 0, _startPad: 0,
  };
  wrap._langState = state;

  inner.innerHTML = '';
  const reps = 3;
  state._startPad = items.length;
  for (let r = 0; r < reps; r++) {
    items.forEach(lang => {
      const div = document.createElement('div');
      div.className = 'wham-lang-cell';
      div.innerHTML = `<span class="lang-flag">${lang.flag}</span><span class="lang-code">${lang.label}</span>`;
      inner.appendChild(div);
    });
  }

  whamLangSetOffset(wrap, 0, false);

  outer.addEventListener('touchstart', e => whamLangDragStart(wrap, e.touches[0].clientX), {passive:true});
  outer.addEventListener('touchmove',  e => { e.preventDefault(); whamLangDragMove(wrap, e.touches[0].clientX); }, {passive:false});
  outer.addEventListener('touchend',   () => whamLangDragEnd(wrap));
  outer.addEventListener('mousedown',  e => whamLangDragStart(wrap, e.clientX));
  window.addEventListener('mousemove', e => { if (wrap._langState?.dragging) whamLangDragMove(wrap, e.clientX); });
  window.addEventListener('mouseup',   () => { if (wrap._langState?.dragging) whamLangDragEnd(wrap); });

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
