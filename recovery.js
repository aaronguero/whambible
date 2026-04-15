// ============================================================
// WhamBible — Recovery Engine
//
// WHAM SLAM — exact Whamgame.base44.app spec:
//   Only fires on CORRECT answers and recovery SUCCESS
//   Never fires on wrong answers
//
//   Phase 0 (0ms):    bg=#fff, WHAM! 60px, audio plays
//   Phase 1 (300ms):  bg=#020617, WHAM! 96px + scale(1.08), verse ref appears
//   Phase 2 (1120ms): WHAM! and ref fade to opacity 0
//   Done   (1620ms):  onDone() fires
//
//   Audio: wham-slam-voice1.webm (Whamgame source)
//   WHAM! gradient: linear-gradient(135deg, #f472b6, #c084fc, #818cf8)
//
// FLOW:
//   Wrong answer → navigate to recovery.html?mode=wrong
//   → NO slam, just show recovery scroll directly
//   → Correct recovery → WHAM SLAM then return
//   → Wrong recovery  → show correct values, return
// ============================================================

const ITEM_HEIGHT  = 40;
const RECOVERY_SEC = 7;

// Exact Whamgame audio
const WHAM_AUDIO_URL = 'https://media.base44.com/videos/public/69c40c6701d9dfdb1df69d2b/5d143ab80_51a54c36d_wham-slam-voice1.webm';

let R = {
  verse:         null,
  pts:           0,
  returnUrl:     '',
  bookIndex:     0,
  chapterIndex:  0,
  verseIndex:    0,
  bookItems:     [],
  chapterItems:  [],
  verseItems:    [],
  timerInterval: null,
  timeLeft:      RECOVERY_SEC,
  submitted:     false,
};

const CHAPTERS = Array.from({length: 50}, (_, i) => i + 1);
const VERSES_N = Array.from({length: 50}, (_, i) => i + 1);

// ── Init ───────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  const params    = new URLSearchParams(window.location.search);
  const verseId   = parseInt(params.get('verse')) || 1;
  const pts       = parseInt(params.get('pts'))   || 10;
  const ret       = params.get('return')          || 'game.html';

  R.pts       = pts;
  R.returnUrl = ret;
  R.verse     = VERSES.find(v => v.id === verseId) || VERSES[0];

  // Prewarm audio
  prewarmWhamAudio();

  // Always start directly on recovery screen — no wrong slam
  initRecoveryScreen();
});

// ── WHAM SLAM — exact Whamgame spec ──────────────────────
// label: the word/ref to show in green (e.g. "John 3:16")
function fireWhamSlam(label, subText, callback) {
  const overlay = document.getElementById('wham-slam');
  overlay.querySelector('.wham-slam-ref').textContent = `✅ ${label}`;
  overlay.querySelector('.wham-slam-sub').textContent = subText || 'Correct!';

  // Phase 0: white bg, small text
  overlay.className = 'wham-slam-overlay phase-0';
  overlay.style.display = 'flex';

  // Fire audio immediately
  playWhamAudio();

  // Phase 1 at 300ms
  setTimeout(() => {
    overlay.className = 'wham-slam-overlay phase-1';
  }, 300);

  // Phase 2 at 1120ms
  setTimeout(() => {
    overlay.className = 'wham-slam-overlay phase-2';
  }, 1120);

  // Done at 1620ms
  setTimeout(() => {
    overlay.style.display = 'none';
    overlay.className = 'wham-slam-overlay phase-0';
    callback();
  }, 1620);
}

// ── Audio ─────────────────────────────────────────────────
let _whamAudio = null;

function prewarmWhamAudio() {
  _whamAudio = new Audio(WHAM_AUDIO_URL);
  _whamAudio.preload = 'auto';
  _whamAudio.volume = 1;
  _whamAudio.load();
}

function playWhamAudio() {
  try {
    if (!_whamAudio) prewarmWhamAudio();
    _whamAudio.currentTime = 0;
    _whamAudio.play().catch(() => {});
  } catch(e) {}
}

// ── Init Recovery Screen ──────────────────────────────────
function initRecoveryScreen() {
  const v = R.verse;

  document.getElementById('recovery-verse-body').textContent = `"${v.text}"`;
  document.getElementById('recovery-verse-ref').textContent  = `${v.book} ${v.chapter}:${v.verse}`;
  document.getElementById('pts-at-stake').textContent        = `${R.pts} pts at stake`;

  R.bookItems    = [...ALL_BOOKS];
  R.chapterItems = CHAPTERS;
  R.verseItems   = VERSES_N;

  R.bookIndex    = randomStartIndex(R.bookItems,    v.book,    6);
  R.chapterIndex = randomStartIndex(R.chapterItems, v.chapter, 5);
  R.verseIndex   = randomStartIndex(R.verseItems,   v.verse,   5);

  buildWheel('wheel-book-inner',    R.bookItems,    R.bookIndex);
  buildWheel('wheel-chapter-inner', R.chapterItems, R.chapterIndex);
  buildWheel('wheel-verse-inner',   R.verseItems,   R.verseIndex);

  attachWheelDrag('wheel-book',    'book');
  attachWheelDrag('wheel-chapter', 'chapter');
  attachWheelDrag('wheel-verse',   'verse');

  updateWheelHighlight('wheel-book-inner',    R.bookIndex,    R.bookItems);
  updateWheelHighlight('wheel-chapter-inner', R.chapterIndex, R.chapterItems);
  updateWheelHighlight('wheel-verse-inner',   R.verseIndex,   R.verseItems);

  startRecoveryTimer();
}

// ── Wheel Builder ─────────────────────────────────────────
function buildWheel(innerId, items, startIndex) {
  const inner = document.getElementById(innerId);
  inner.innerHTML = '';
  [...items, ...items, ...items].forEach(item => {
    const el = document.createElement('div');
    el.className   = 'scroll-item';
    el.textContent = item;
    inner.appendChild(el);
  });
  const offset = (items.length + startIndex) * ITEM_HEIGHT - (ITEM_HEIGHT * 2);
  inner.style.transform = `translateY(-${offset}px)`;
  inner._offset  = offset;
  inner._items   = items;
  inner._current = startIndex;
}

function updateWheelHighlight(innerId, currentIdx, items) {
  const inner    = document.getElementById(innerId);
  const allItems = inner.querySelectorAll('.scroll-item');
  const len      = items.length;
  allItems.forEach((el, i) => {
    const relIdx = i % len;
    el.classList.remove('selected', 'near');
    if (relIdx === currentIdx) el.classList.add('selected');
    else if (relIdx === (currentIdx + 1) % len || relIdx === (currentIdx - 1 + len) % len) {
      el.classList.add('near');
    }
  });
}

function randomStartIndex(arr, correct, offsetBy) {
  const idx = arr.indexOf ? arr.indexOf(correct) : arr.findIndex(v => v === correct);
  const len = arr.length;
  return ((idx - offsetBy) % len + len) % len;
}

// ── Wheel Drag ────────────────────────────────────────────
function attachWheelDrag(wheelId, key) {
  const outer = document.getElementById(wheelId);
  const inner = outer.querySelector('.scroll-wheel-inner');
  let startY = 0, startOffset = 0, dragging = false;

  const onStart = (y) => {
    dragging    = true;
    startY      = y;
    startOffset = inner._offset || 0;
    inner.style.transition = 'none';
  };

  const onMove = (y) => {
    if (!dragging) return;
    const offset = startOffset + (startY - y);
    inner.style.transform = `translateY(-${offset}px)`;
    inner._offset = offset;
    const items  = inner._items;
    const rawIdx = Math.round(offset / ITEM_HEIGHT) % items.length;
    const idx    = ((rawIdx % items.length) + items.length) % items.length;
    inner._current = idx;
    if (key === 'book')    R.bookIndex    = idx;
    if (key === 'chapter') R.chapterIndex = idx;
    if (key === 'verse')   R.verseIndex   = idx;
    updateWheelHighlight(inner.id, idx, items);
  };

  const onEnd = () => {
    if (!dragging) return;
    dragging = false;
    const items   = inner._items;
    const rawIdx  = Math.round(inner._offset / ITEM_HEIGHT);
    const idx     = ((rawIdx % items.length) + items.length) % items.length;
    const snapped = rawIdx * ITEM_HEIGHT;
    inner.style.transition = 'transform 0.12s ease-out';
    inner.style.transform  = `translateY(-${snapped}px)`;
    inner._offset  = snapped;
    inner._current = idx;
    if (key === 'book')    R.bookIndex    = idx;
    if (key === 'chapter') R.chapterIndex = idx;
    if (key === 'verse')   R.verseIndex   = idx;
    updateWheelHighlight(inner.id, idx, items);
  };

  outer.addEventListener('touchstart', e => onStart(e.touches[0].clientY), { passive: true });
  outer.addEventListener('touchmove',  e => { e.preventDefault(); onMove(e.touches[0].clientY); }, { passive: false });
  outer.addEventListener('touchend',   () => onEnd());
  outer.addEventListener('mousedown',  e => { onStart(e.clientY); e.preventDefault(); });
  document.addEventListener('mousemove', e => { if (dragging) onMove(e.clientY); });
  document.addEventListener('mouseup',   () => { if (dragging) onEnd(); });
}

// ── Recovery Timer ────────────────────────────────────────
function startRecoveryTimer() {
  R.timeLeft   = RECOVERY_SEC;
  R.submitted  = false;
  const circle = document.getElementById('timer-circle');
  const numEl  = document.getElementById('timer-number');
  const circumf = 163.4;

  clearInterval(R.timerInterval);
  R.timerInterval = setInterval(() => {
    R.timeLeft -= 0.1;
    const pct = R.timeLeft / RECOVERY_SEC;
    circle.style.strokeDashoffset = circumf * (1 - pct);
    numEl.textContent = Math.ceil(R.timeLeft);
    if (R.timeLeft <= 3) {
      circle.classList.add('danger');
      numEl.classList.add('danger');
    }
    if (R.timeLeft <= 0) {
      clearInterval(R.timerInterval);
      submitRecovery();
    }
  }, 100);
}

// ── Submit Recovery ───────────────────────────────────────
window.submitRecovery = function() {
  if (R.submitted) return;
  R.submitted = true;
  clearInterval(R.timerInterval);

  const v               = R.verse;
  const selectedBook    = R.bookItems[R.bookIndex];
  const selectedChapter = R.chapterItems[R.chapterIndex];
  const selectedVerse   = R.verseItems[R.verseIndex];

  const correct = (
    selectedBook    === v.book    &&
    selectedChapter === v.chapter &&
    selectedVerse   === v.verse
  );

  // Store result
  const gameCode = new URLSearchParams(window.location.search).get('game') || '';
  if (gameCode) {
    const saved = JSON.parse(localStorage.getItem('wb_game_' + gameCode) || '{}');
    saved.last_recovered_points = correct ? R.pts : 0;
    saved.recovery_result       = correct ? 'recovered' : 'failed';
    localStorage.setItem('wb_game_' + gameCode, JSON.stringify(saved));
  }

  if (correct) {
    // WHAM SLAM fires — exact Whamgame spec
    const ref = `${v.book} ${v.chapter}:${v.verse}`;
    fireWhamSlam(ref, 'Recovered!', () => {
      window.location.href = R.returnUrl
        + (R.returnUrl.includes('?') ? '&' : '?') + 'recovered=1';
    });
  } else {
    // No slam — snap wheels to correct, brief pause, exit
    snapWheelToValue('wheel-book-inner',    R.bookItems,    v.book,    'book');
    snapWheelToValue('wheel-chapter-inner', R.chapterItems, v.chapter, 'chapter');
    snapWheelToValue('wheel-verse-inner',   R.verseItems,   v.verse,   'verse');
    setTimeout(() => {
      window.location.href = R.returnUrl
        + (R.returnUrl.includes('?') ? '&' : '?') + 'recovered=0';
    }, 1200);
  }
};

function snapWheelToValue(innerId, items, value, key) {
  const inner = document.getElementById(innerId);
  const idx   = items.indexOf ? items.indexOf(value) : items.findIndex(v => v === value);
  if (idx < 0) return;
  const snapped = (items.length + idx) * ITEM_HEIGHT;
  inner.style.transition = 'transform 0.4s ease';
  inner.style.transform  = `translateY(-${snapped}px)`;
  inner._offset  = snapped;
  inner._current = idx;
  if (key === 'book')    R.bookIndex    = idx;
  if (key === 'chapter') R.chapterIndex = idx;
  if (key === 'verse')   R.verseIndex   = idx;
  updateWheelHighlight(innerId, idx, items);
}
