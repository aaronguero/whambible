// WhamBible — Game Engine
// Sections 2 + Recovery

const VERSES_PER_ROUND = 5;
const TIME_LIMIT = 20;
const LETTERS = ['A', 'B', 'C', 'D'];

// ── State ────────────────────────────────────────────────
let state = {
  pointsPerVerse: 10,
  levelName: 'Warrior',
  levelIcon: '⚔️',
  queue: [],
  currentIndex: 0,
  currentVerse: null,
  score: 0,
  streak: 0,
  results: [],
  answered: false,
  timerInterval: null,
  timeLeft: TIME_LIMIT,
};

// ── Init ─────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const lvl    = parseInt(params.get('level'))     || 10;
  const retIdx = parseInt(params.get('retIndex'))  || -1;
  const recovered = params.get('recovered');

  setLevel(lvl);
  buildQueue();
  renderProgressDots();

  // Coming back from recovery screen
  if (retIdx >= 0 && recovered !== null) {
    state.currentIndex = retIdx;
    restoreScoreFromStorage();

    if (recovered === '1') {
      // Recovery won — award points, pop WHAM correct
      state.score += lvl;
      updateScoreDisplay();
      updateDot(retIdx, 'recovered');
      state.results[retIdx] = { correct: true, recovered: true };
    } else {
      updateDot(retIdx, 'wrong');
      state.results[retIdx] = { correct: false };
    }
    state.currentIndex++;
  }

  loadVerse();
});

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
  document.getElementById('hud-level').textContent = `${l.icon} ${l.name} · ${pts}pts`;
}

function restoreScoreFromStorage() {
  const saved = sessionStorage.getItem('wb_solo_score');
  if (saved) state.score = parseInt(saved) || 0;
  updateScoreDisplay();
}

function updateScoreDisplay() {
  const scoreEl = document.getElementById('hud-score');
  if (scoreEl) {
    scoreEl.textContent = state.score;
    scoreEl.style.animation = 'none';
    setTimeout(() => { scoreEl.style.animation = 'scorePop 0.4s ease'; }, 10);
  }
}

// ── Queue ─────────────────────────────────────────────────
function buildQueue() {
  const shuffled = [...VERSES].sort(() => Math.random() - 0.5);
  state.queue = shuffled.slice(0, VERSES_PER_ROUND);
}

// ── Progress Dots ─────────────────────────────────────────
function renderProgressDots() {
  const wrap = document.getElementById('progress-dots');
  if (!wrap) return;
  wrap.innerHTML = '';
  state.queue.forEach((_, i) => {
    const dot = document.createElement('div');
    dot.className = 'progress-dot' + (i === 0 ? ' current' : '');
    dot.id = `dot-${i}`;
    wrap.appendChild(dot);
  });
}

function updateDot(index, status) {
  const dot = document.getElementById(`dot-${index}`);
  if (!dot) return;
  dot.className = `progress-dot ${status}`;
}

// ── Load Verse ────────────────────────────────────────────
function loadVerse() {
  if (state.currentIndex >= state.queue.length) {
    showGameOver();
    return;
  }

  state.answered    = false;
  state.currentVerse = state.queue[state.currentIndex];
  const v            = state.currentVerse;

  document.getElementById('progress-text').textContent =
    `Verse ${state.currentIndex + 1} of ${VERSES_PER_ROUND}`;
  updateDot(state.currentIndex, 'current');

  const verseBody = document.getElementById('verse-body');
  verseBody.style.opacity   = '0';
  verseBody.style.transform = 'translateY(8px)';
  setTimeout(() => {
    verseBody.textContent         = `"${v.text}"`;
    verseBody.style.transition    = 'all 0.4s ease';
    verseBody.style.opacity       = '1';
    verseBody.style.transform     = 'translateY(0)';
  }, 100);

  const fb = document.getElementById('feedback-bar');
  fb.textContent = '';
  fb.className   = 'feedback-bar';

  buildChoices(v);
  startTimer();
}

// ── Choices ───────────────────────────────────────────────
function buildChoices(correctVerse) {
  const grid = document.getElementById('choices-grid');
  grid.innerHTML = '';
  generateChoices(correctVerse).forEach((choice, i) => {
    const btn = document.createElement('button');
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
  const correct  = { book: correctVerse.book, chapter: correctVerse.chapter, verse: correctVerse.verse, correct: true };
  const wrongs   = [];
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
    awardPoints();
    showFeedback(true);
    state.results.push({ correct: true });
    updateDot(state.currentIndex, 'correct');
    // Correct WHAM SLAM then next verse
    setTimeout(() => triggerCorrectSlam(), 300);
  } else {
    buttons.forEach(btn => {
      if (btn.querySelector('.choice-book')?.textContent === state.currentVerse.book) btn.classList.add('reveal');
    });
    state.streak = 0;
    showFeedback(false);
    state.results.push({ correct: false });
    updateDot(state.currentIndex, 'wrong');
    // Wrong WHAM SLAM then recovery screen
    setTimeout(() => launchRecovery(), 400);
  }
}

// ── WHAM SLAM — Correct (inline, no nav needed) ──────────
function triggerCorrectSlam() {
  const v   = state.currentVerse;
  const pts = state.pointsPerVerse;

  // Inject slam overlay directly into game.html
  let slam = document.getElementById('inline-correct-slam');
  if (!slam) {
    slam = document.createElement('div');
    slam.id        = 'inline-correct-slam';
    slam.className = 'wham-slam-overlay correct-slam';
    slam.style.cssText = 'display:flex;position:fixed;inset:0;z-index:999;align-items:center;justify-content:center;pointer-events:none;';
    slam.innerHTML = `
      <div class="wham-slam-bg correct-bg" style="position:absolute;inset:0;background:radial-gradient(ellipse at center,rgba(20,120,60,0.97)0%,rgba(10,70,30,0.99)60%,rgba(0,10,0,1)100%);animation:slamBgIn 0.12s ease-out both;"></div>
      <div class="wham-slam-content" style="position:relative;z-index:2;text-align:center;">
        <div class="wham-slam-word" style="font-family:'Cinzel',serif;font-size:clamp(56px,18vw,96px);font-weight:900;color:#fff;text-shadow:0 0 30px rgba(255,255,255,0.8),0 0 60px rgba(100,255,150,0.6);animation:slamWordPulse 0.3s ease-out both;">WHAM!</div>
        <div class="wham-slam-sub" style="font-family:'Cinzel',serif;font-size:18px;letter-spacing:4px;color:rgba(255,255,255,0.7);margin-top:8px;">✝️ Correct!</div>
        <div class="wham-slam-pts" style="font-family:'Cinzel',serif;font-size:32px;font-weight:700;color:#6bffaa;margin-top:10px;">+${pts} pts</div>
      </div>`;
    document.body.appendChild(slam);
  } else {
    slam.style.display = 'flex';
    slam.querySelector('.wham-slam-pts').textContent = `+${pts} pts`;
  }

  spawnInlineParticles(slam, '#c9a227', '#ffd700', '#4caf7d');

  setTimeout(() => {
    slam.style.transition = 'opacity 0.3s';
    slam.style.opacity    = '0';
    setTimeout(() => {
      slam.style.display  = 'none';
      slam.style.opacity  = '1';
      showResult(true);
    }, 300);
  }, 1400);
}

// ── Launch Recovery Screen ────────────────────────────────
function launchRecovery() {
  const v   = state.currentVerse;
  const pts = state.pointsPerVerse;
  // Save score to sessionStorage so recovery screen can read it
  sessionStorage.setItem('wb_solo_score', state.score);
  const returnUrl = `game.html?level=${pts}&retIndex=${state.currentIndex}`;
  window.location.href = `recovery.html?verse=${v.id}&pts=${pts}&return=${encodeURIComponent(returnUrl)}&mode=wrong`;
}

// ── Points ────────────────────────────────────────────────
function awardPoints() {
  state.streak++;
  let pts = state.pointsPerVerse;
  if (state.streak >= 3) pts = Math.round(pts * 1.5);
  if (state.streak >= 5) pts = Math.round(pts * 2);
  state.score += pts;
  updateScoreDisplay();
}

// ── Feedback ──────────────────────────────────────────────
function showFeedback(correct) {
  const fb = document.getElementById('feedback-bar');
  if (correct) {
    const msgs = ['⚔️ Correct!', '🔥 Nailed it!', '✨ Excellent!', '👑 Outstanding!', '💎 Flawless!'];
    fb.textContent = state.streak >= 3
      ? `🔥 ${state.streak}x Streak! ${msgs[Math.floor(Math.random()*msgs.length)]}`
      : msgs[Math.floor(Math.random()*msgs.length)];
    fb.className = 'feedback-bar correct';
  } else {
    fb.textContent = '📜 Scroll Recovery — Spin the wheels!';
    fb.className   = 'feedback-bar wrong';
  }
}

// ── Result Overlay ────────────────────────────────────────
function showResult(isCorrect) {
  const v = state.currentVerse;
  document.getElementById('result-icon').textContent  = isCorrect
    ? ['⚔️','✝️','🌟','🏆','📖'][Math.floor(Math.random()*5)] : '📖';
  document.getElementById('result-title').textContent = isCorrect
    ? (state.streak >= 3 ? `🔥 ${state.streak}x Streak!` : 'Correct!') : 'Scroll Recovery Time!';
  document.getElementById('result-title').style.color = isCorrect ? '#4caf7d' : '#c93030';
  document.getElementById('result-verse-ref').textContent = `${v.book} ${v.chapter}:${v.verse}`;
  document.getElementById('result-body').textContent      = `"${v.text}"`;
  document.getElementById('result-overlay').style.display = 'flex';
}

window.nextVerse = function () {
  document.getElementById('result-overlay').style.display = 'none';
  state.currentIndex++;
  loadVerse();
};

// ── Timer ─────────────────────────────────────────────────
function startTimer() {
  state.timeLeft = TIME_LIMIT;
  const bar = document.getElementById('timer-bar');
  bar.style.width = '100%';
  bar.className = 'timer-bar';

  state.timerInterval = setInterval(() => {
    state.timeLeft -= 0.1;
    const pct = (state.timeLeft / TIME_LIMIT) * 100;
    bar.style.width = pct + '%';
    if (pct < 30) bar.className = 'timer-bar danger';
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
  fb.textContent = '⏱️ Time\'s up! Scroll Recovery incoming...';
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
  document.getElementById('final-title').textContent = title;
  document.getElementById('gameover-overlay').querySelector('.result-icon').textContent = icon;
  document.getElementById('final-score-display').textContent = `You scored ${state.score} points`;
  document.getElementById('final-stats').innerHTML = `
    <div class="stat-item"><span class="stat-num" style="color:#4caf7d">${correct}</span><span class="stat-label">Correct</span></div>
    <div class="stat-item"><span class="stat-num" style="color:#c93030">${total - correct}</span><span class="stat-label">Wrong</span></div>
    <div class="stat-item"><span class="stat-num">${pct}%</span><span class="stat-label">Accuracy</span></div>`;
  document.getElementById('gameover-overlay').style.display = 'flex';
}

window.restartGame = function () {
  state.score = 0; state.streak = 0; state.currentIndex = 0; state.results = [];
  sessionStorage.removeItem('wb_solo_score');
  document.getElementById('gameover-overlay').style.display = 'none';
  updateScoreDisplay();
  buildQueue();
  renderProgressDots();
  loadVerse();
};

window.confirmExit = function () {
  if (confirm('Leave the battle? Your progress will be lost.')) {
    clearTimer();
    window.location.href = 'index.html';
  }
};

// ── Inline Particle System (for correct slam) ─────────────
function spawnInlineParticles(container, ...colors) {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;z-index:1;pointer-events:none;';
  container.appendChild(canvas);
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext('2d');
  const particles = Array.from({length:70}, () => ({
    x: Math.random()*canvas.width, y: Math.random()*canvas.height*0.5,
    vx: (Math.random()-0.5)*8, vy: (Math.random()-2)*6,
    size: Math.random()*6+2,
    color: colors[Math.floor(Math.random()*colors.length)],
    alpha: 1, rot: Math.random()*Math.PI*2, rspd: (Math.random()-0.5)*0.2,
  }));
  let frame;
  (function draw() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    let alive = false;
    particles.forEach(p => {
      if (p.alpha <= 0) return;
      alive = true;
      p.x += p.vx; p.y += p.vy; p.vy += 0.25; p.alpha -= 0.02; p.rot += p.rspd;
      ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot);
      ctx.globalAlpha = Math.max(0,p.alpha); ctx.fillStyle = p.color;
      ctx.fillRect(-p.size/2,-p.size/2,p.size,p.size); ctx.restore();
    });
    if (alive) frame = requestAnimationFrame(draw);
  })();
  setTimeout(() => cancelAnimationFrame(frame), 2000);
}
