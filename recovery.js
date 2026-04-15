// ============================================================
// WhamBible — Recovery Engine
//
// MECHANIC (exact Whamgame pattern):
//   Wrong answer → WHAM SLAM fires (wrong theme, red burst)
//   → Scroll Recovery screen appears
//   → Picker (challenger) gets 7 seconds to spin Book/Chapter/Verse
//   → Correct = full points recovered → WHAM SLAM (correct theme, green)
//   → Wrong = points lost, turn advances
//   → last_recovered_points stored in game state
//
// WHAM SLAM:
//   Wrong:   red radial burst + "WRONG!" + particle shower + audio
//   Correct: green radial burst + "WHAM!" + gold particles + audio
//   Both:    fullscreen takeover, 1.4s hold, then transition
// ============================================================

const ITEM_HEIGHT  = 40;  // px per wheel item
const RECOVERY_SEC = 7;   // timer countdown

// ── State ─────────────────────────────────────────────────
let R = {
  verse:          null,
  pts:            0,
  returnUrl:      '',
  // Wheel positions
  bookIndex:      0,
  chapterIndex:   0,
  verseIndex:     0,
  // Wheel item lists
  bookItems:      [],
  chapterItems:   [],
  verseItems:     [],
  timerInterval:  null,
  timeLeft:       RECOVERY_SEC,
  submitted:      false,
};

// ── Chapter/Verse number arrays ────────────────────────────
const CHAPTERS = Array.from({length: 50}, (_, i) => i + 1);
const VERSES_N = Array.from({length: 50}, (_, i) => i + 1);

// ── Init ───────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  const params  = new URLSearchParams(window.location.search);
  const verseId = parseInt(params.get('verse')) || 1;
  const pts     = parseInt(params.get('pts'))   || 10;
  const ret     = params.get('return')          || 'challenge.html';
  const mode    = params.get('mode')            || 'wrong'; // 'wrong' or 'correct'

  R.pts       = pts;
  R.returnUrl = ret;
  R.verse     = VERSES.find(v => v.id === verseId) || VERSES[0];

  // Show correct WHAM SLAM if coming from a correct answer
  if (mode === 'correct') {
    fireCorrectSlam(pts, () => {
      window.location.href = ret;
    });
    return;
  }

  // Wrong answer flow: WHAM SLAM then recovery
  fireWrongSlam(pts, () => {
    initRecoveryScreen();
  });
});

// ── WHAM SLAM — Wrong ─────────────────────────────────────
function fireWrongSlam(pts, callback) {
  const overlay = document.getElementById('wham-slam');
  document.getElementById('slam-word').textContent = 'WRONG!';
  document.getElementById('slam-sub').textContent  = '📜 Scroll Recovery Unlocked';
  document.getElementById('slam-pts').textContent  = `−${pts} pts`;

  overlay.style.display = 'flex';
  overlay.style.animation = 'none';

  // Particle burst
  spawnParticles('wham-particles', '#c93030', '#ff4444', '#8b0000');

  // Play audio
  tryPlayAudio('audio-wham-wrong');

  // Hold 1.4s → callback
  setTimeout(() => {
    overlay.style.transition = 'opacity 0.3s';
    overlay.style.opacity = '0';
    setTimeout(() => {
      overlay.style.display = 'none';
      overlay.style.opacity = '1';
      callback();
    }, 300);
  }, 1400);
}

// ── WHAM SLAM — Correct / Recovery Won ───────────────────
function fireCorrectSlam(pts, callback, label = 'Correct!') {
  const overlay = document.getElementById('correct-slam');
  document.getElementById('correct-slam-word').textContent = 'WHAM!';
  document.getElementById('correct-slam-sub').textContent  = label;
  document.getElementById('correct-slam-pts').textContent  = `+${pts} pts`;

  overlay.style.display = 'flex';
  overlay.style.opacity = '1';

  spawnParticles('correct-particles', '#c9a227', '#ffd700', '#4caf7d');

  tryPlayAudio('audio-wham-correct');

  setTimeout(() => {
    overlay.style.transition = 'opacity 0.3s';
    overlay.style.opacity = '0';
    setTimeout(() => {
      overlay.style.display = 'none';
      overlay.style.opacity = '1';
      callback();
    }, 300);
  }, 1600);
}

// ── Init Recovery Screen ──────────────────────────────────
function initRecoveryScreen() {
  const v = R.verse;

  // Set verse display
  document.getElementById('recovery-verse-body').textContent = `"${v.text}"`;
  document.getElementById('recovery-verse-ref').textContent  = `${v.book} ${v.chapter}:${v.verse}`;
  document.getElementById('pts-at-stake').textContent        = `${R.pts} pts at stake`;

  // Build wheel data
  R.bookItems    = [...ALL_BOOKS];
  R.chapterItems = CHAPTERS;
  R.verseItems   = VERSES_N;

  // Start wheels near but not at correct answer
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

  // Render triple loop so wheel feels infinite
  const tripleItems = [...items, ...items, ...items];
  tripleItems.forEach(item => {
    const el = document.createElement('div');
    el.className = 'scroll-item';
    el.textContent = item;
    inner.appendChild(el);
  });

  // Position to startIndex in middle loop
  const offset = (items.length + startIndex) * ITEM_HEIGHT - (ITEM_HEIGHT * 2);
  inner.style.transform = `translateY(-${offset}px)`;
  inner._offset  = offset;
  inner._items   = items;
  inner._current = startIndex;
}

function updateWheelHighlight(innerId, currentIdx, items) {
  const inner = document.getElementById(innerId);
  const allItems = inner.querySelectorAll('.scroll-item');
  const len = items.length;

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
  const correctIdx = arr.indexOf ? arr.indexOf(correct) : arr.findIndex(v => v === correct);
  const len = arr.length;
  return ((correctIdx - offsetBy) % len + len) % len;
}

// ── Drag / Touch on Wheels ────────────────────────────────
function attachWheelDrag(wheelId, key) {
  const outer = document.getElementById(wheelId);
  const inner = outer.querySelector('.scroll-wheel-inner');

  let startY = 0, startOffset = 0, dragging = false;

  const onStart = (y) => {
    dragging     = true;
    startY       = y;
    startOffset  = inner._offset || 0;
    inner.style.transition = 'none';
    tryPlayAudio('audio-scroll-spin');
  };

  const onMove = (y) => {
    if (!dragging) return;
    const delta  = startY - y;
    const offset = startOffset + delta;
    inner.style.transform = `translateY(-${offset}px)`;
    inner._offset = offset;

    const items   = inner._items;
    const rawIdx  = Math.round(offset / ITEM_HEIGHT) % items.length;
    const idx     = ((rawIdx % items.length) + items.length) % items.length;
    inner._current = idx;

    if (key === 'book')    R.bookIndex    = idx;
    if (key === 'chapter') R.chapterIndex = idx;
    if (key === 'verse')   R.verseIndex   = idx;

    updateWheelHighlight(inner.id, idx, items);
  };

  const onEnd = () => {
    if (!dragging) return;
    dragging = false;

    // Snap to nearest item
    const items   = inner._items;
    const rawIdx  = Math.round(inner._offset / ITEM_HEIGHT) % items.length;
    const idx     = ((rawIdx % items.length) + items.length) % items.length;
    const snapped = (Math.round(inner._offset / ITEM_HEIGHT)) * ITEM_HEIGHT;

    inner.style.transition = 'transform 0.12s ease-out';
    inner.style.transform  = `translateY(-${snapped}px)`;
    inner._offset  = snapped;
    inner._current = idx;

    if (key === 'book')    R.bookIndex    = idx;
    if (key === 'chapter') R.chapterIndex = idx;
    if (key === 'verse')   R.verseIndex   = idx;

    updateWheelHighlight(inner.id, idx, items);
  };

  // Touch
  outer.addEventListener('touchstart', e => onStart(e.touches[0].clientY), { passive: true });
  outer.addEventListener('touchmove',  e => { e.preventDefault(); onMove(e.touches[0].clientY); }, { passive: false });
  outer.addEventListener('touchend',   () => onEnd());

  // Mouse
  outer.addEventListener('mousedown', e => { onStart(e.clientY); e.preventDefault(); });
  document.addEventListener('mousemove', e => { if (dragging) onMove(e.clientY); });
  document.addEventListener('mouseup',   () => { if (dragging) onEnd(); });
}

// ── Recovery Timer ────────────────────────────────────────
function startRecoveryTimer() {
  R.timeLeft    = RECOVERY_SEC;
  R.submitted   = false;

  const circle  = document.getElementById('timer-circle');
  const numEl   = document.getElementById('timer-number');
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

  const v = R.verse;
  const selectedBook    = R.bookItems[R.bookIndex];
  const selectedChapter = R.chapterItems[R.chapterIndex];
  const selectedVerse   = R.verseItems[R.verseIndex];

  const correct = (
    selectedBook    === v.book    &&
    selectedChapter === v.chapter &&
    selectedVerse   === v.verse
  );

  // Store recovered points in localStorage for game engine to pick up
  const gameCode = new URLSearchParams(window.location.search).get('game') || '';
  if (gameCode) {
    const savedGame = JSON.parse(localStorage.getItem('wb_game_' + gameCode) || '{}');
    if (correct) {
      savedGame.last_recovered_points = R.pts;
      savedGame.recovery_result       = 'recovered';
    } else {
      savedGame.last_recovered_points = 0;
      savedGame.recovery_result       = 'failed';
    }
    localStorage.setItem('wb_game_' + gameCode, JSON.stringify(savedGame));
  }

  if (correct) {
    fireCorrectSlam(R.pts, () => {
      tryPlayAudio('audio-recovery-win');
      window.location.href = R.returnUrl + (R.returnUrl.includes('?') ? '&' : '?') + 'recovered=1';
    }, '📜 Scroll Recovered!');
  } else {
    // Show correct answer briefly then exit
    highlightCorrectOnWheels(v);
    setTimeout(() => {
      window.location.href = R.returnUrl + (R.returnUrl.includes('?') ? '&' : '?') + 'recovered=0';
    }, 1200);
  }
};

// Highlight correct values on all wheels after failure
function highlightCorrectOnWheels(v) {
  snapWheelToValue('wheel-book-inner',    R.bookItems,    v.book,    'book');
  snapWheelToValue('wheel-chapter-inner', R.chapterItems, v.chapter, 'chapter');
  snapWheelToValue('wheel-verse-inner',   R.verseItems,   v.verse,   'verse');
}

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

// ── Particle System ───────────────────────────────────────
function spawnParticles(canvasId, ...colors) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = Array.from({ length: 80 }, () => ({
    x:     Math.random() * canvas.width,
    y:     Math.random() * canvas.height * 0.5,
    vx:    (Math.random() - 0.5) * 8,
    vy:    (Math.random() - 2)   * 6,
    size:  Math.random() * 6 + 2,
    color: colors[Math.floor(Math.random() * colors.length)],
    alpha: 1,
    rot:   Math.random() * Math.PI * 2,
    rspd:  (Math.random() - 0.5) * 0.2,
  }));

  let frame;
  const gravity = 0.25;

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;

    particles.forEach(p => {
      if (p.alpha <= 0) return;
      alive = true;
      p.x    += p.vx;
      p.y    += p.vy;
      p.vy   += gravity;
      p.alpha -= 0.018;
      p.rot  += p.rspd;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle   = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();
    });

    if (alive) frame = requestAnimationFrame(draw);
  }

  draw();
  setTimeout(() => cancelAnimationFrame(frame), 2000);
}

// ── Audio Helper ──────────────────────────────────────────
function tryPlayAudio(id) {
  const el = document.getElementById(id);
  if (el && el.src && !el.src.endsWith('/')) {
    el.currentTime = 0;
    el.play().catch(() => {}); // graceful fail if no src yet
  }
}
