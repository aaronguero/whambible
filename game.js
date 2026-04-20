// WhamBible — Game Engine (Solo)
// WHAM SLAM: exact Whamgame.base44.app spec — correct only

const VERSES_PER_ROUND = 5;
const TIME_LIMIT       = 20;
const LETTERS          = ['A', 'B', 'C', 'D'];

// Exact Whamgame audio URL
const WHAM_AUDIO_URL = 'https://media.base44.com/videos/public/69c40c6701d9dfdb1df69d2b/5d143ab80_51a54c36d_wham-slam-voice1.webm';
let _whamAudio = null;

// ── State ────────────────────────────────────────────────
let state = {
  pointsPerVerse: 5,          // overridden by getPlayerDefaultLevel() on init
  levelName:      'Squire',   // overridden by getPlayerDefaultLevel() on init
  levelIcon:      '🗡️',       // overridden by getPlayerDefaultLevel() on init
  queue:          [],
  currentIndex:   0,
  currentVerse:   null,
  score:          0,
  streak:         0,
  results:        [],
  answered:       false,
  timerInterval:  null,
  timeLeft:       TIME_LIMIT,
};
// Expose to game.html inline scripts (papa hint, etc.)
window._gameState = state;


// ── Rank → Default Level Helper ──────────────────────────
// Maps a player's lifetime score to their rank and the corresponding
// suggested challenge level. Called at init to pre-select the right card.
function rankFromScore(score) {
  if (score >= 700) return { pts: 20, name: 'Champion', icon: '👑' };
  if (score >= 300) return { pts: 15, name: 'Knight',   icon: '🛡️' };
  if (score >= 100) return { pts: 10, name: 'Warrior',  icon: '⚔️' };
  if (score >=   1) return { pts:  5, name: 'Squire',   icon: '🗡️' };
  return                    { pts:  5, name: 'Squire',   icon: '🗡️' }; // Scribe → 5
}

// Returns a Promise that resolves to the player's rank-level object.
// Reads Firestore if logged in, otherwise uses local solo high-score.
async function getPlayerDefaultLevel() {
  try {
    const fb   = window._fb;
    const auth = fb && fb.auth;
    const user = auth && auth.currentUser;
    if (user) {
      const { db, doc, getDoc } = fb;
      const snap = await getDoc(doc(db, 'players', user.uid));
      if (snap.exists()) {
        const s = snap.data().score || 0;
        return rankFromScore(s);
      }
    }
  } catch(e) { /* offline / not authed — fall through */ }

  // Fallback: best solo score stored in localStorage
  const localBest = parseInt(localStorage.getItem('wb_best_solo_score') || '0', 10);
  return rankFromScore(localBest);
}

// ── Init ─────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  const params    = new URLSearchParams(window.location.search);
  const lvl       = parseInt(params.get('level'));
  const retIndex  = parseInt(params.get('retIndex'));
  const recovered = params.get('recovered');

  prewarmWhamAudio();

  // ── Returning from recovery screen — skip pick screen ────
  if (!isNaN(retIndex) && recovered !== null) {
    hideSoloPickScreen();
    // Use the level from URL param; if missing, resolve from rank
    if (!isNaN(lvl) && lvl > 0) {
      setLevel(lvl);
    } else {
      getPlayerDefaultLevel().then(rl => setLevel(rl.pts));
    }
    buildQueue();
    renderProgressDots();
    _queueBuilt = true; // mark queue as built so next answer doesn't rebuild
    state.currentIndex = retIndex;
    restoreScoreFromStorage();
    if (recovered === '1') {
      state.score += 5;
      updateScoreDisplay();
      updateDot(retIndex, 'recovered');
      state.results[retIndex] = { correct: true, recovered: true };
    } else {
      updateDot(retIndex, 'wrong');
      state.results[retIndex] = { correct: false };
    }
    // Show answer reveal for the recovered verse before advancing
    loadVerse();
    showResult(recovered === '1');
    return;
  }

  // ── Fresh entry — show pick-level screen ──────────────────
  // If level was passed via URL (future use), auto-start
  if (!isNaN(lvl) && lvl > 0) {
    soloPickLevel(lvl,
      {5:'Squire',10:'Warrior',15:'Knight',20:'Champion'}[lvl]||'Warrior',
      {5:'🗡️',10:'⚔️',15:'🛡️',20:'👑'}[lvl]||'⚔️'
    );
    return;
  }

  // Fresh entry — pre-highlight the card matching the player's rank-level
  getPlayerDefaultLevel().then(rankLevel => {
    preHighlightLevelCard(rankLevel.pts);
  });
});

// ── Solo Level Pick ───────────────────────────────────────
// Whether the queue has been built yet this session
let _queueBuilt = false;

window.soloPickLevel = function(pts, name, icon) {
  // Highlight selected card
  [5,10,15,20].forEach(n => {
    const el = document.getElementById('slvl-' + n);
    if (!el) return;
    const isSelected = n === pts;
    el.style.background   = isSelected ? 'rgba(201,162,39,0.15)' : 'rgba(201,162,39,0.07)';
    el.style.border       = isSelected ? '2px solid #c9a227'     : '1px solid rgba(201,162,39,0.2)';
    el.style.boxShadow    = isSelected ? '0 0 0 2px rgba(201,162,39,0.3),0 6px 20px rgba(0,0,0,0.5)' : 'none';
    el.style.transform    = isSelected ? 'translateY(-2px) scale(1.04)' : 'none';
  });

  setTimeout(() => {
    hideSoloPickScreen();
    setLevel(pts);
    if (!_queueBuilt) {
      // First pick — build the full queue & dots
      buildQueue();
      renderProgressDots();
      _queueBuilt = true;
    }
    if (window._pendingRecovery) {
      window._pendingRecovery = false;
      launchRecovery();
    } else {
      loadVerse();
    }
  }, 220);
};


// Pre-highlight a level card (visual only — does NOT start the game)
function preHighlightLevelCard(pts) {
  [5,10,15,20].forEach(n => {
    const el = document.getElementById('slvl-' + n);
    if (!el) return;
    const isSelected = n === pts;
    el.style.background = isSelected ? 'rgba(201,162,39,0.15)' : 'rgba(201,162,39,0.07)';
    el.style.border     = isSelected ? '2px solid #c9a227'     : '1px solid rgba(201,162,39,0.2)';
    el.style.boxShadow  = isSelected ? '0 0 0 2px rgba(201,162,39,0.3),0 6px 20px rgba(0,0,0,0.5)' : 'none';
    el.style.transform  = isSelected ? 'translateY(-2px) scale(1.04)' : 'none';
  });
  // Also update the HUD label to match (will be overwritten when player confirms)
  const levels = {5:{name:'Squire',icon:'🗡️'},10:{name:'Warrior',icon:'⚔️'},15:{name:'Knight',icon:'🛡️'},20:{name:'Champion',icon:'👑'}};
  const l = levels[pts] || levels[5];
  const el = document.getElementById('hud-level');
  if (el) el.textContent = `${l.icon} ${l.name} · ${pts}pts`;
}

// Show pick screen between verses (does NOT rebuild queue)
function showLevelSelectBetweenVerses() {
  const screen = document.getElementById('solo-pick-screen');
  if (!screen) { loadVerse(); return; }

  // Update header text for between-verse context
  const heading = screen.querySelector('h1');
  if (heading) heading.textContent = 'Next Level';
  const sub = screen.querySelector('p');
  if (sub && sub.style.fontStyle === 'italic') {
    const remaining = state.queue.length - state.currentIndex;
    sub.textContent = remaining > 0
      ? `${remaining} verse${remaining !== 1 ? 's' : ''} remaining — choose your points`
      : 'Choose your level';
  }

  // Reset card styles to default
  [5,10,15,20].forEach(n => {
    const el = document.getElementById('slvl-' + n);
    if (!el) return;
    el.style.background = 'rgba(201,162,39,0.07)';
    el.style.border     = '1px solid rgba(201,162,39,0.2)';
    el.style.boxShadow  = 'none';
    el.style.transform  = 'none';
  });

  screen.style.display   = 'flex';
  screen.style.opacity   = '0';
  screen.style.transform = 'scale(1.03)';
  screen.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
  setTimeout(() => {
    screen.style.opacity   = '1';
    screen.style.transform = 'scale(1)';
  }, 20);
}

function hideSoloPickScreen() {
  const screen = document.getElementById('solo-pick-screen');
  if (!screen) return;
  screen.style.transition  = 'opacity 0.3s ease, transform 0.3s ease';
  screen.style.opacity     = '0';
  screen.style.transform   = 'scale(0.97)';
  setTimeout(() => screen.style.display = 'none', 300);
}

// ── Level ─────────────────────────────────────────────────
function setLevel(pts) {
  state.pointsPerVerse = pts;
  const levels = {
    5:  { name: 'Squire',   icon: '🗡️' },
    10: { name: 'Warrior',  icon: '⚔️' },
    15: { name: 'Knight',   icon: '🛡️' },
    20: { name: 'Champion', icon: '👑' },
  };
  const l = levels[pts] || levels[10];
  state.levelName = l.name;
  state.levelIcon = l.icon;
  const el = document.getElementById('hud-level');
  if (el) el.textContent = `${l.icon} ${l.name} · ${pts}pts`;
}

// ── Score ─────────────────────────────────────────────────
function restoreScoreFromStorage() {
  const saved = sessionStorage.getItem('wb_solo_score');
  if (saved) state.score = parseInt(saved) || 0;
  updateScoreDisplay();
}

function updateScoreDisplay() {
  const el = document.getElementById('hud-score');
  if (!el) return;
  el.textContent = state.score;
  el.style.animation = 'none';
  setTimeout(() => { el.style.animation = 'scorePop 0.4s ease'; }, 10);
}

// ── Queue ─────────────────────────────────────────────────
function buildQueue() {
  state.queue = [...VERSES].sort(() => Math.random() - 0.5).slice(0, VERSES_PER_ROUND);
}

// ── Progress Dots ─────────────────────────────────────────
function renderProgressDots() {
  const wrap = document.getElementById('progress-dots');
  if (!wrap) return;
  wrap.innerHTML = '';
  state.queue.forEach((_, i) => {
    const dot = document.createElement('div');
    dot.className = 'progress-dot' + (i === 0 ? ' current' : '');
    dot.id        = `dot-${i}`;
    wrap.appendChild(dot);
  });
}

function updateDot(index, status) {
  const dot = document.getElementById(`dot-${index}`);
  if (dot) dot.className = `progress-dot ${status}`;
}

// ── Load Verse ────────────────────────────────────────────
function loadVerse() {
  if (state.currentIndex >= state.queue.length) {
    showGameOver();
    return;
  }

  state.answered     = false;
  state.currentVerse = state.queue[state.currentIndex];
  const v            = state.currentVerse;

  const ptEl = document.getElementById('progress-text');
  if (ptEl) ptEl.textContent = `Verse ${state.currentIndex + 1} of ${VERSES_PER_ROUND}`;
  updateDot(state.currentIndex, 'current');

  const verseBody = document.getElementById('verse-body');
  verseBody.style.opacity   = '0';
  verseBody.style.transform = 'translateY(8px)';
  setTimeout(() => {
    verseBody.textContent      = `"${v.text}"`;
    verseBody.style.transition = 'all 0.4s ease';
    verseBody.style.opacity    = '1';
    verseBody.style.transform  = 'translateY(0)';
  }, 100);

  const fb = document.getElementById('feedback-bar');
  fb.textContent = '';
  fb.className   = 'feedback-bar';

  _hintFired = false;      // fresh verse — allow hint once
  if (typeof window.papaMakeVisible === 'function') window.papaMakeVisible();
  buildChoices(v);
  startTimer();
}

// ── Choices ───────────────────────────────────────────────

function buildChoices(correctVerse) {
  const grid = document.getElementById('choices-grid');
  grid.innerHTML = '';
  generateChoices(correctVerse).forEach((choice, i) => {
    const btn     = document.createElement('button');
    btn.className = 'choice-btn';
    btn.id        = `choice-${i}`;
    btn.onclick   = () => handleAnswer(i, choice.correct);
    btn.innerHTML = `
      <div class="choice-letter">${LETTERS[i]}</div>
      <div class="choice-text-wrap">
        <span class="choice-book">${choice.book}</span>
        <span class="choice-ref">Chapter ${choice.chapter} · Verse ${choice.verse}</span>
      </div>`;
    grid.appendChild(btn);
  });
}

function generateChoices(correctVerse) {
  const correct   = { book: correctVerse.book, chapter: correctVerse.chapter, verse: correctVerse.verse, correct: true };
  const wrongs    = [];
  const usedBooks = new Set([correctVerse.book]);
  while (wrongs.length < 3) {
    const book = ALL_BOOKS[Math.floor(Math.random() * ALL_BOOKS.length)];
    if (usedBooks.has(book)) continue;
    usedBooks.add(book);
    wrongs.push({ book, chapter: Math.floor(Math.random()*25)+1, verse: Math.floor(Math.random()*30)+1, correct: false });
  }
  return [...wrongs, correct].sort(() => Math.random() - 0.5);
}

// ── Answer Handler ────────────────────────────────────────
function handleAnswer(choiceIndex, isCorrect) {
  if (state.answered) return;
  state.answered = true;
  clearTimer();

  const buttons = document.querySelectorAll('.choice-btn');
  buttons.forEach(btn => btn.disabled = true);
  document.getElementById(`choice-${choiceIndex}`).classList.add(isCorrect ? 'correct' : 'wrong');

  if (isCorrect) {
    const bonus = awardPoints();
    showFeedback(true, bonus);
    state.results.push({ correct: true });
    updateDot(state.currentIndex, 'correct');
    // WHAM SLAM fires on correct — exact Whamgame spec
    setTimeout(() => fireWhamSlam(`${state.currentVerse.book} ${state.currentVerse.chapter}:${state.currentVerse.verse}`, 'Correct!', () => {
      showResult(true);
    }), 200);
  } else {
    buttons.forEach(btn => {
      if (btn.querySelector('.choice-book')?.textContent === state.currentVerse.book) btn.classList.add('reveal');
    });
    state.streak = 0;
    showFeedback(false);
    state.results.push({ correct: false });
    updateDot(state.currentIndex, 'wrong');
    // Wrong — go straight to recovery, no level select
    setTimeout(() => launchRecovery(), 800);
  }
}

// ── WHAM SLAM — exact Whamgame spec ──────────────────────
// Only fires on correct answers
function fireWhamSlam(label, subText, callback) {
  // Inject overlay if not present
  let overlay = document.getElementById('wham-slam');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'wham-slam';
    overlay.innerHTML = `
      <div class="wham-slam-word">WHAM!</div>
      <div class="wham-slam-ref">✅ —</div>
      <div class="wham-slam-sub">Correct!</div>`;
    document.body.appendChild(overlay);
  }

  overlay.querySelector('.wham-slam-ref').textContent = `✅ ${label}`;
  overlay.querySelector('.wham-slam-sub').textContent = subText || 'Correct!';

  // Phase 0: white bg, small WHAM!
  overlay.className    = 'wham-slam-overlay phase-0';
  overlay.style.display = 'flex';

  playWhamAudio();

  // Phase 1 at 300ms
  setTimeout(() => { overlay.className = 'wham-slam-overlay phase-1'; }, 300);

  // Phase 2 at 1120ms
  setTimeout(() => { overlay.className = 'wham-slam-overlay phase-2'; }, 1120);

  // Done at 1620ms
  setTimeout(() => {
    overlay.style.display = 'none';
    overlay.className     = 'wham-slam-overlay phase-0';
    callback();
  }, 1620);
}

// ── Wham Audio ────────────────────────────────────────────
function prewarmWhamAudio() {
  _whamAudio = new Audio(WHAM_AUDIO_URL);
  _whamAudio.preload = 'auto';
  _whamAudio.volume  = 1;
  _whamAudio.load();
}

function playWhamAudio() {
  try {
    if (!_whamAudio) prewarmWhamAudio();
    _whamAudio.currentTime = 0;
    _whamAudio.play().catch(() => {});
  } catch(e) {}
}

// ── Launch Recovery ───────────────────────────────────────
function launchRecovery() {
  const v   = state.currentVerse;
  const pts = state.pointsPerVerse;
  sessionStorage.setItem('wb_solo_score', state.score);
  const returnUrl = `game.html?level=${pts}&retIndex=${state.currentIndex}`;
  window.location.href = `recovery.html?verse=${v.id}&pts=${pts}&return=${encodeURIComponent(returnUrl)}`;
}

// ── Points ────────────────────────────────────────────────
// Exact Whamgame scoring:
// Correct = level points + streak bonus (every 5th correct in row = +5 bonus)
// Wrong   = 0 points, streak resets to 0
// Recovery success = flat +5 points (always, regardless of level)
const STREAK_EVERY = 5;   // every Nth correct gets bonus (Jx=5)
const STREAK_BONUS = 5;   // bonus points awarded        (Zx=5)

function awardPoints() {
  state.streak++;
  let pts = state.pointsPerVerse;
  let bonus = 0;
  if (state.streak % STREAK_EVERY === 0) bonus = STREAK_BONUS;
  state.score += pts + bonus;
  updateScoreDisplay();
  return bonus; // return so feedback can show streak bonus
}

// ── Feedback ──────────────────────────────────────────────
function showFeedback(correct, bonus) {
  const fb = document.getElementById('feedback-bar');
  if (correct) {
    const msgs = ['⚔️ Correct!', '🔥 Nailed it!', '✨ Excellent!', '👑 Outstanding!', '💎 Flawless!'];
    const base = msgs[Math.floor(Math.random() * msgs.length)];
    if (bonus > 0) {
      fb.textContent = `🔥 ${state.streak}x Streak! +${STREAK_BONUS} Bonus! ${base}`;
    } else {
      fb.textContent = base;
    }
    fb.className = 'feedback-bar correct';
  } else {
    fb.textContent = '📜 Wrong — Scroll Recovery incoming!';
    fb.className   = 'feedback-bar wrong';
  }
}

// ── Result Overlay ────────────────────────────────────────
function showResult(isCorrect) {
  const v = state.currentVerse;
  document.getElementById('result-icon').textContent       = isCorrect
    ? ['⚔️','✝️','🌟','🏆','📖'][Math.floor(Math.random()*5)] : '📖';
  document.getElementById('result-title').textContent      = isCorrect
    ? (state.streak >= 3 ? `🔥 ${state.streak}x Streak!` : 'Correct!') : 'Study the Word';
  document.getElementById('result-title').style.color      = isCorrect ? '#4caf7d' : '#c93030';
  document.getElementById('result-verse-ref').textContent  = `${v.book} ${v.chapter}:${v.verse}`;
  document.getElementById('result-body').textContent       = `"${v.text}"`;
  const _nBtn = document.getElementById('result-next-btn');
  if (_nBtn) _nBtn.textContent = isCorrect ? 'Next Verse ⚔️' : 'Continue 📖';
  document.getElementById('result-overlay').style.display  = 'flex';
}

window.nextVerse = function () {
  document.getElementById('result-overlay').style.display = 'none';
  state.currentIndex++;
  if (state.currentIndex >= state.queue.length) { showGameOver(); return; }
  loadVerse();
};

// ── Timer ─────────────────────────────────────────────────
function startTimer() {
  state.timeLeft = TIME_LIMIT;
  const bar = document.getElementById('timer-bar');
  bar.style.width  = '100%';
  bar.className    = 'timer-bar';

  state.timerInterval = setInterval(() => {
    state.timeLeft -= 0.1;
    const pct = (state.timeLeft / TIME_LIMIT) * 100;
    bar.style.width = pct + '%';
    if (pct < 30) bar.className = 'timer-bar danger';
    // ── Papa hint thresholds by level ──
    // Timer runs 20→0. "Xs have passed" = timeLeft <= (20 - X)
    // Squire(5pt)=10s passed → timeLeft<=10
    // Warrior(10pt)=13s passed → timeLeft<=7
    // Knight(15pt)=15s passed → timeLeft<=5
    // Champion(20pt)=17s passed → timeLeft<=3
    const _hintAt = { 5: 10, 10: 7, 15: 5, 20: 3 };
    const _ht = _hintAt[state.pointsPerVerse];
    if (!_hintFired && _ht && state.timeLeft <= _ht && state.timeLeft > (_ht - 0.2)) {
      _hintFired = true;
      if (typeof window.triggerPapaHint === 'function') window.triggerPapaHint();
    }
    if (state.timeLeft <= 0) { clearTimer(); timeUp(); }
  }, 100);
}

function clearTimer() { clearInterval(state.timerInterval); }

function timeUp() {
  if (state.answered) return;
  state.answered = true;
  document.querySelectorAll('.choice-btn').forEach(btn => {
    btn.disabled = true;
    if (btn.querySelector('.choice-book')?.textContent === state.currentVerse.book) btn.classList.add('reveal');
  });
  state.streak = 0;
  state.results.push({ correct: false, timeUp: true });
  updateDot(state.currentIndex, 'wrong');
  const fb = document.getElementById('feedback-bar');
  fb.textContent = '⏱️ Time\'s up — Scroll Recovery incoming!';
  fb.className   = 'feedback-bar wrong';
  setTimeout(() => launchRecovery(), 800);
}

// ── Game Over ─────────────────────────────────────────────
function showGameOver() {
  const correct = state.results.filter(r => r.correct).length;
  const total   = state.results.length;
  const pct     = Math.round((correct / total) * 100);
  let title = 'Battle Complete!', icon = '🏆';
  if (pct === 100) { title = '⚔️ Legendary Scholar!'; icon = '👑'; }
  else if (pct >= 80) { title = 'Champion of the Word!'; icon = '🌟'; }
  else if (pct >= 60) { title = 'Warrior of Scripture!'; icon = '⚔️'; }
  else if (pct >= 40) { title = 'Keep Studying!'; icon = '📖'; }
  else { title = 'Return to Training!'; icon = '🗡️'; }

  document.getElementById('final-title').textContent    = title;
  document.getElementById('gameover-overlay').querySelector('.result-icon').textContent = icon;
  document.getElementById('final-score-display').textContent = `You scored ${state.score} points`;
  document.getElementById('final-stats').innerHTML = `
    <div class="stat-item"><span class="stat-num" style="color:#4caf7d">${correct}</span><span class="stat-label">Correct</span></div>
    <div class="stat-item"><span class="stat-num" style="color:#c93030">${total-correct}</span><span class="stat-label">Wrong</span></div>
    <div class="stat-item"><span class="stat-num">${pct}%</span><span class="stat-label">Accuracy</span></div>`;
  document.getElementById('gameover-overlay').style.display = 'flex';
  // Record solo score for My Scores history
  try {
    if (typeof msRecordSolo === 'function') {
      const levelLabel = document.getElementById('hud-level')?.textContent || '—';
      msRecordSolo(state.score, levelLabel.replace(/[^0-9a-zA-Z ·]/g,'').trim());
    }
  } catch(e) {}

  // Persist best solo score locally (used as rank fallback when not logged in)
  try {
    const prev = parseInt(localStorage.getItem('wb_best_solo_score') || '0', 10);
    if (state.score > prev) localStorage.setItem('wb_best_solo_score', String(state.score));
  } catch(e) {}
}

window.restartGame = function () {
  state.score = 0; state.streak = 0; state.currentIndex = 0; state.results = [];
  _queueBuilt = false;
  window._pendingRecovery = false;
  sessionStorage.removeItem('wb_solo_score');
  document.getElementById('gameover-overlay').style.display = 'none';
  updateScoreDisplay();
  // Show level select — pre-highlight rank-appropriate level again
  getPlayerDefaultLevel().then(rl => preHighlightLevelCard(rl.pts));
  const screen = document.getElementById('solo-pick-screen');
  if (screen) {
    const heading = screen.querySelector('h1');
    if (heading) heading.textContent = 'Solo Battle';
    const sub = screen.querySelector('p');
    if (sub && sub.style.fontStyle === 'italic') sub.textContent = 'Choose your difficulty to begin';
    screen.style.display   = 'flex';
    screen.style.opacity   = '1';
    screen.style.transform = 'scale(1)';
  }
};

window.confirmExit = function () {
  if (confirm('Leave the battle? Your progress will be lost.')) {
    clearTimer();
    window.location.href = 'index.html';
  }
};
