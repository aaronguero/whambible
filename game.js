// WhamBible — Game Engine
// Section 2: Verse Display + Multiple Choice

// ── Config ──────────────────────────────────────────────
const VERSES_PER_ROUND = 5;
const TIME_LIMIT = 20; // seconds per verse
const LETTERS = ['A', 'B', 'C', 'D'];

// ── State ────────────────────────────────────────────────
let state = {
  level: null,
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
  // Read level from URL param or default
  const params = new URLSearchParams(window.location.search);
  const lvl = parseInt(params.get('level')) || 10;
  setLevel(lvl);
  buildQueue();
  renderProgressDots();
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

// ── Queue ─────────────────────────────────────────────────
function buildQueue() {
  const shuffled = [...VERSES].sort(() => Math.random() - 0.5);
  state.queue = shuffled.slice(0, VERSES_PER_ROUND);
}

// ── Progress Dots ─────────────────────────────────────────
function renderProgressDots() {
  const wrap = document.getElementById('progress-dots');
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

  state.answered = false;
  state.currentVerse = state.queue[state.currentIndex];
  const v = state.currentVerse;

  // Update progress text
  document.getElementById('progress-text').textContent =
    `Verse ${state.currentIndex + 1} of ${VERSES_PER_ROUND}`;

  // Update dot
  updateDot(state.currentIndex, 'current');

  // Set verse text (animate in)
  const verseBody = document.getElementById('verse-body');
  verseBody.style.opacity = '0';
  verseBody.style.transform = 'translateY(8px)';
  setTimeout(() => {
    verseBody.textContent = `"${v.text}"`;
    verseBody.style.transition = 'all 0.4s ease';
    verseBody.style.opacity = '1';
    verseBody.style.transform = 'translateY(0)';
  }, 100);

  // Clear feedback
  const fb = document.getElementById('feedback-bar');
  fb.textContent = '';
  fb.className = 'feedback-bar';

  // Build choices
  buildChoices(v);

  // Start timer
  startTimer();
}

// ── Choices Builder ───────────────────────────────────────
function buildChoices(correctVerse) {
  const grid = document.getElementById('choices-grid');
  grid.innerHTML = '';

  const choices = generateChoices(correctVerse);

  choices.forEach((choice, i) => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    btn.id = `choice-${i}`;
    btn.onclick = () => handleAnswer(i, choice.correct);

    btn.innerHTML = `
      <div class="choice-letter">${LETTERS[i]}</div>
      <div class="choice-text-wrap">
        <span class="choice-book">${choice.book}</span>
        <span class="choice-ref">Chapter ${choice.chapter} · Verse ${choice.verse}</span>
      </div>
    `;
    grid.appendChild(btn);
  });
}

function generateChoices(correctVerse) {
  const correct = {
    book: correctVerse.book,
    chapter: correctVerse.chapter,
    verse: correctVerse.verse,
    correct: true,
  };

  const wrongs = [];
  const usedBooks = new Set([correctVerse.book]);

  while (wrongs.length < 3) {
    const randomBook = ALL_BOOKS[Math.floor(Math.random() * ALL_BOOKS.length)];
    if (usedBooks.has(randomBook)) continue;
    usedBooks.add(randomBook);

    // Generate plausible but wrong chapter/verse
    const chapter = Math.floor(Math.random() * 25) + 1;
    const verse = Math.floor(Math.random() * 30) + 1;

    // Make sure it doesn't accidentally match
    if (randomBook === correctVerse.book &&
        chapter === correctVerse.chapter &&
        verse === correctVerse.verse) continue;

    wrongs.push({ book: randomBook, chapter, verse, correct: false });
  }

  // Shuffle correct into random position
  const all = [...wrongs, correct];
  return all.sort(() => Math.random() - 0.5);
}

// ── Answer Handler ────────────────────────────────────────
function handleAnswer(choiceIndex, isCorrect) {
  if (state.answered) return;
  state.answered = true;
  clearTimer();

  const buttons = document.querySelectorAll('.choice-btn');
  buttons.forEach(btn => btn.disabled = true);

  const chosen = document.getElementById(`choice-${choiceIndex}`);

  if (isCorrect) {
    chosen.classList.add('correct');
    awardPoints();
    showFeedback(true);
    state.results.push({ correct: true });
    updateDot(state.currentIndex, 'correct');
  } else {
    chosen.classList.add('wrong');
    // Reveal correct answer
    buttons.forEach((btn, i) => {
      const isRight = btn.querySelector('.choice-book')?.textContent === state.currentVerse.book;
      if (isRight) btn.classList.add('reveal');
    });
    state.streak = 0;
    showFeedback(false);
    state.results.push({ correct: false });
    updateDot(state.currentIndex, 'wrong');
  }

  // Show result overlay after brief delay
  setTimeout(() => showResult(isCorrect), 900);
}

// ── Points ────────────────────────────────────────────────
function awardPoints() {
  state.streak++;
  let pts = state.pointsPerVerse;
  // Streak bonus
  if (state.streak >= 3) pts = Math.round(pts * 1.5);
  if (state.streak >= 5) pts = Math.round(pts * 2);

  state.score += pts;

  const scoreEl = document.getElementById('hud-score');
  scoreEl.textContent = state.score;
  scoreEl.style.animation = 'none';
  setTimeout(() => {
    scoreEl.style.animation = 'scorePop 0.4s ease';
  }, 10);
}

// ── Feedback ──────────────────────────────────────────────
function showFeedback(correct) {
  const fb = document.getElementById('feedback-bar');
  if (correct) {
    const msgs = ['⚔️ Correct!', '🔥 Nailed it!', '✨ Excellent!', '👑 Outstanding!', '💎 Flawless!'];
    fb.textContent = state.streak >= 3
      ? `🔥 ${state.streak}x Streak! ${msgs[Math.floor(Math.random() * msgs.length)]}`
      : msgs[Math.floor(Math.random() * msgs.length)];
    fb.className = 'feedback-bar correct';
  } else {
    fb.textContent = '❌ Wrong answer — study the Scriptures!';
    fb.className = 'feedback-bar wrong';
  }
}

// ── Result Overlay ────────────────────────────────────────
function showResult(isCorrect) {
  const v = state.currentVerse;
  const overlay = document.getElementById('result-overlay');
  const icon    = document.getElementById('result-icon');
  const title   = document.getElementById('result-title');
  const ref     = document.getElementById('result-verse-ref');
  const body    = document.getElementById('result-body');

  if (isCorrect) {
    icon.textContent  = ['⚔️','✝️','🌟','🏆','📖'][Math.floor(Math.random()*5)];
    title.textContent = state.streak >= 3 ? `🔥 ${state.streak}x Streak!` : 'Correct!';
    title.style.color = '#4caf7d';
  } else {
    icon.textContent  = '📖';
    title.textContent = 'Study the Word';
    title.style.color = '#c93030';
  }

  ref.textContent  = `${v.book} ${v.chapter}:${v.verse}`;
  body.textContent = `"${v.text}"`;
  overlay.style.display = 'flex';
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
    if (state.timeLeft <= 0) {
      clearTimer();
      timeUp();
    }
  }, 100);
}

function clearTimer() {
  clearInterval(state.timerInterval);
}

function timeUp() {
  if (state.answered) return;
  state.answered = true;

  const buttons = document.querySelectorAll('.choice-btn');
  buttons.forEach(btn => {
    btn.disabled = true;
    const bookText = btn.querySelector('.choice-book')?.textContent;
    if (bookText === state.currentVerse.book) btn.classList.add('reveal');
  });

  state.streak = 0;
  state.results.push({ correct: false, timeUp: true });
  updateDot(state.currentIndex, 'wrong');

  const fb = document.getElementById('feedback-bar');
  fb.textContent = '⏱️ Time\'s up! Know your Scriptures!';
  fb.className = 'feedback-bar wrong';

  setTimeout(() => showResult(false), 800);
}

// ── Game Over ─────────────────────────────────────────────
function showGameOver() {
  const correct = state.results.filter(r => r.correct).length;
  const total   = state.results.length;
  const pct     = Math.round((correct / total) * 100);

  let title = 'Battle Complete!';
  let icon  = '🏆';
  if (pct === 100) { title = '⚔️ Legendary Scholar!'; icon = '👑'; }
  else if (pct >= 80) { title = 'Champion of the Word!'; icon = '🌟'; }
  else if (pct >= 60) { title = 'Warrior of Scripture!'; icon = '⚔️'; }
  else if (pct >= 40) { title = 'Keep Studying!'; icon = '📖'; }
  else { title = 'Return to Training!'; icon = '🗡️'; }

  document.getElementById('final-title').textContent = title;
  document.getElementById('gameover-overlay').querySelector('.result-icon').textContent = icon;
  document.getElementById('final-score-display').textContent =
    `You scored ${state.score} points`;

  document.getElementById('final-stats').innerHTML = `
    <div class="stat-item">
      <span class="stat-num" style="color:#4caf7d">${correct}</span>
      <span class="stat-label">Correct</span>
    </div>
    <div class="stat-item">
      <span class="stat-num" style="color:#c93030">${total - correct}</span>
      <span class="stat-label">Wrong</span>
    </div>
    <div class="stat-item">
      <span class="stat-num">${pct}%</span>
      <span class="stat-label">Accuracy</span>
    </div>
  `;

  document.getElementById('gameover-overlay').style.display = 'flex';
}

window.restartGame = function () {
  state.score = 0;
  state.streak = 0;
  state.currentIndex = 0;
  state.results = [];
  document.getElementById('gameover-overlay').style.display = 'none';
  document.getElementById('hud-score').textContent = '0';
  buildQueue();
  renderProgressDots();
  loadVerse();
};

// ── Exit ──────────────────────────────────────────────────
window.confirmExit = function () {
  if (confirm('Leave the battle? Your progress will be lost.')) {
    clearTimer();
    window.location.href = 'index.html';
  }
};
