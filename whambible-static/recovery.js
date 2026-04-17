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

const ITEM_HEIGHT  = 42;   // matches --wh-item CSS var
const VISIBLE_ROWS = 5;    // total rows shown in wheel
const CENTER_ROW   = 2;    // 0-indexed row that is "selected" (middle of 5)
const WHEEL_H      = ITEM_HEIGHT * VISIBLE_ROWS;  // 210px
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

// Chapters: 1–150 (Psalms has most); verses: 1–176 (Psalms 119)
// Show 1–150 for chapters, 1–176 for verses — snaps to valid range on submit
const CHAPTERS = Array.from({length: 150}, (_, i) => i + 1);
const VERSES_N = Array.from({length: 176}, (_, i) => i + 1);

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
  const levelNames = { 5: '🗡️ Squire', 10: '⚔️ Warrior', 15: '🛡️ Knight', 20: '👑 Champion' };
  const lvlLabel = levelNames[R.pts] || `${R.pts}pt`;
  document.getElementById('pts-at-stake').textContent = `${lvlLabel} · ${R.pts}pts missed · recover +5`;

  R.bookItems    = [...ALL_BOOKS];
  R.chapterItems = CHAPTERS;
  R.verseItems   = VERSES_N;

  // Start 8 items before correct answer for book (needs scrolling to find it)
  // 4 items before for chapter/verse
  R.bookIndex    = randomStartIndex(R.bookItems,    v.book,    8);
  R.chapterIndex = randomStartIndex(R.chapterItems, v.chapter, 4);
  R.verseIndex   = randomStartIndex(R.verseItems,   v.verse,   4);

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
// Offset formula:
//   We render copies: [copy0][copy1][copy2]
//   We start in copy1 so we can scroll in both directions.
//   To put startIndex in the CENTER row we need the translateY that puts
//   the top of the selected item at (CENTER_ROW * ITEM_HEIGHT) from the
//   top of the visible window, i.e.:
//     offset = (items.length + startIndex) * ITEM_HEIGHT - CENTER_ROW * ITEM_HEIGHT
function buildWheel(innerId, items, startIndex) {
  const inner = document.getElementById(innerId);
  inner.innerHTML = '';
  // 5 copies so long lists (66 books) have room to momentum-scroll without hitting an edge
  [...items, ...items, ...items, ...items, ...items].forEach(item => {
    const el = document.createElement('div');
    el.className   = 'scroll-item';
    el.textContent = String(item);
    inner.appendChild(el);
  });
  // Start in copy index 2 (middle of 5 copies)
  const offset = (items.length * 2 + startIndex) * ITEM_HEIGHT - CENTER_ROW * ITEM_HEIGHT;
  setWheelOffset(inner, offset, false);
  inner._items   = items;
  inner._current = startIndex;
}

function setWheelOffset(inner, offset, animate) {
  inner.style.transition = animate ? 'transform 0.18s cubic-bezier(0.25,0.46,0.45,0.94)' : 'none';
  inner.style.transform  = `translateY(-${offset}px)`;
  inner._offset = offset;
}

// ── Highlight the correct items based on current offset ───
function updateWheelHighlight(innerId, currentIdx, items) {
  const inner    = document.getElementById(innerId);
  const allItems = inner.querySelectorAll('.scroll-item');
  const len      = items.length;
  allItems.forEach((el, i) => {
    const relIdx = ((i % len) + len) % len;
    el.classList.remove('selected', 'near1', 'near2', 'near');
    if (relIdx === currentIdx) {
      el.classList.add('selected');
    } else {
      const dist = Math.min(
        Math.abs(relIdx - currentIdx),
        Math.abs(relIdx - currentIdx + len),
        Math.abs(relIdx - currentIdx - len)
      );
      if (dist === 1) el.classList.add('near1');
      else if (dist === 2) el.classList.add('near2');
    }
  });
}

function randomStartIndex(arr, correct, offsetBy) {
  const idx = Array.isArray(arr)
    ? arr.findIndex(v => String(v) === String(correct))
    : -1;
  const len = arr.length;
  return ((idx - offsetBy) % len + len) % len;
}

// ── Clamp offset to valid range (wrap when near edges) ────
function normalizeOffset(inner, rawOffset) {
  const items = inner._items;
  const len   = items.length;
  const total = len * ITEM_HEIGHT * 5; // 5 copies
  // Keep us in copies 1-3 to allow free scrolling
  const minOff = len * ITEM_HEIGHT;
  const maxOff = len * ITEM_HEIGHT * 3;
  let off = rawOffset;
  while (off < minOff) off += len * ITEM_HEIGHT;
  while (off > maxOff) off -= len * ITEM_HEIGHT;
  return off;
}

// ── Convert offset → item index ──────────────────────────
function offsetToIndex(inner, offset) {
  const items = inner._items;
  const len   = items.length;
  // Which row is in the CENTER slot?
  const centerRow = Math.round((offset + CENTER_ROW * ITEM_HEIGHT) / ITEM_HEIGHT);
  return ((centerRow % len) + len) % len;
}

// ── Wheel Drag — with velocity / momentum physics ─────────
function attachWheelDrag(wheelId, key) {
  const outer = document.getElementById(wheelId);
  const inner = outer.querySelector('.scroll-wheel-inner');

  let startY      = 0;
  let startOffset = 0;
  let dragging    = false;
  let lastY       = 0;
  let lastT       = 0;
  let velocity    = 0;  // px/ms
  let rafId       = null;

  function getIdx(offset) {
    const items = inner._items;
    const len   = items.length;
    const centered = offset + CENTER_ROW * ITEM_HEIGHT;
    return (((Math.round(centered / ITEM_HEIGHT)) % len) + len) % len;
  }

  function applyOffset(offset, animate) {
    // Wrap to stay in valid zone
    offset = normalizeOffset(inner, offset);
    setWheelOffset(inner, offset, animate);
    const idx = getIdx(offset);
    inner._current = idx;
    if (key === 'book')    R.bookIndex    = idx;
    if (key === 'chapter') R.chapterIndex = idx;
    if (key === 'verse')   R.verseIndex   = idx;
    updateWheelHighlight(inner.id, idx, inner._items);
  }

  function snapToNearest(offset) {
    // Round to nearest item boundary
    const centered   = offset + CENTER_ROW * ITEM_HEIGHT;
    const snappedCtr = Math.round(centered / ITEM_HEIGHT) * ITEM_HEIGHT;
    const snapped    = snappedCtr - CENTER_ROW * ITEM_HEIGHT;
    applyOffset(snapped, true);
  }

  function onStart(y) {
    cancelAnimationFrame(rafId);
    dragging    = true;
    startY      = y;
    lastY       = y;
    lastT       = performance.now();
    velocity    = 0;
    startOffset = inner._offset || 0;
    inner.style.transition = 'none';
  }

  function onMove(y) {
    if (!dragging) return;
    const now  = performance.now();
    const dt   = now - lastT || 16;
    velocity   = (lastY - y) / dt;  // positive = scrolling down (increasing offset)
    lastY      = y;
    lastT      = now;
    const offset = startOffset + (startY - y);
    applyOffset(offset, false);
  }

  function onEnd() {
    if (!dragging) return;
    dragging = false;

    // Momentum coast
    let vel    = velocity * 1000; // px/s
    let offset = inner._offset;
    const friction = 0.94; // decay per frame
    const MIN_VEL  = 0.5;

    function coast() {
      if (Math.abs(vel) < MIN_VEL) {
        snapToNearest(offset);
        return;
      }
      vel    *= friction;
      offset += vel / 60;
      applyOffset(offset, false);
      rafId = requestAnimationFrame(coast);
    }

    if (Math.abs(vel) > 80) {
      coast();
    } else {
      snapToNearest(offset);
    }
  }

  // Touch events
  outer.addEventListener('touchstart', e => {
    onStart(e.touches[0].clientY);
  }, { passive: true });

  outer.addEventListener('touchmove', e => {
    e.preventDefault();
    onMove(e.touches[0].clientY);
  }, { passive: false });

  outer.addEventListener('touchend', () => onEnd(), { passive: true });

  // Mouse events (desktop)
  outer.addEventListener('mousedown', e => {
    onStart(e.clientY);
    e.preventDefault();
  });

  // Use outer itself, not document, so multiple wheels don't interfere
  outer.addEventListener('mousemove', e => { if (dragging) onMove(e.clientY); });
  outer.addEventListener('mouseleave', () => { if (dragging) onEnd(); });
  document.addEventListener('mouseup', () => { if (dragging) onEnd(); });
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
    saved.last_recovered_points = correct ? 5 : 0; // Recovery = flat +5 (exact Whamgame: Le(Y=>Y+5))
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
