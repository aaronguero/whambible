// ============================================================
// WhamBible — Challenge UI Helpers (Section 3)
// NOTE: Game flow (pickLevel, startNewGame, resumeGame) is
//       handled by the Firebase engine in challenge.html.
//       This file owns: answer UI, timer, round result, game over.
// ============================================================

const TOTAL_ROUNDS = 10;
const TIME_LIMIT   = 20;
const LETTERS      = ['A','B','C','D'];

// ── Screens ──────────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById('screen-' + id);
  if (el) el.classList.add('active');
  window.scrollTo(0, 0);
}

// ── Toast ─────────────────────────────────────────────────────
function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._tid);
  t._tid = setTimeout(() => t.classList.remove('show'), 2500);
}

// ── BUILD OPTIONS (4 choices, one correct) ────────────────────
function buildOptions(correctVerse) {
  const correct = {
    book: correctVerse.book,
    chapter: correctVerse.chapter,
    verse: correctVerse.verse,
    correct: true,
  };
  const usedBooks = new Set([correctVerse.book]);
  const wrongs    = [];
  while (wrongs.length < 3) {
    const book = ALL_BOOKS[Math.floor(Math.random() * ALL_BOOKS.length)];
    if (usedBooks.has(book)) continue;
    usedBooks.add(book);
    wrongs.push({
      book,
      chapter: Math.floor(Math.random() * 25) + 1,
      verse:   Math.floor(Math.random() * 30) + 1,
      correct: false,
    });
  }
  return [...wrongs, correct].sort(() => Math.random() - 0.5);
}

// ── RENDER ANSWER CHOICES ─────────────────────────────────────
window.renderAnswerChoices = function(verse, pts) {
  const options = buildOptions(verse);
  const grid    = document.getElementById('ans-choices-grid');
  if (!grid) return options;
  grid.innerHTML = '';
  options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    btn.id = 'ans-choice-' + i;
    btn.innerHTML = \`
      <div class="choice-letter">\${LETTERS[i]}</div>
      <div class="choice-text-wrap">
        <span class="choice-book">\${opt.book}</span>
        <span class="choice-ref">Chapter \${opt.chapter} · Verse \${opt.verse}</span>
      </div>
    \`;
    btn.onclick = () => window._onChoiceSelect && window._onChoiceSelect(opt, btn, options);
    grid.appendChild(btn);
  });
  return options;
};

// ── ANSWER TIMER ──────────────────────────────────────────────
let ansTimer    = null;
let ansTimeLeft = TIME_LIMIT;
let ansAnswered = false;

let _mpHintFired = false;

window.startAnswerTimer = function(seconds, onTimeout, levelPts) {
  ansTimeLeft  = seconds || TIME_LIMIT;
  ansAnswered  = false;
  _mpHintFired = false;
  const totalSecs = seconds || TIME_LIMIT;
  const bar = document.getElementById('ans-timer-bar');
  if (bar) { bar.style.width = '100%'; bar.className = 'timer-bar'; }
  clearInterval(ansTimer);
  ansTimer = setInterval(() => {
    ansTimeLeft -= 0.1;
    const pct = (ansTimeLeft / totalSecs) * 100;
    if (bar) {
      bar.style.width = pct + '%';
      bar.className = 'timer-bar' + (pct < 30 ? ' danger' : '');
    }
    // ── Papa hint thresholds (multiplayer) ──
    // Timer 20→0. Elapsed = 20 - ansTimeLeft
    // Squire(5pt)  = 7s elapsed  → timeLeft <= 13
    // Warrior(10pt)= 5s elapsed  → timeLeft <= 15
    // Knight(15pt) = 3s elapsed  → timeLeft <= 17
    // Champion(20pt)= no hint
    const _mpHintAt = { 5: 13, 10: 15, 15: 17 };
    const _mht = _mpHintAt[levelPts];
    if (!_mpHintFired && _mht && ansTimeLeft <= _mht && ansTimeLeft > (_mht - 0.2)) {
      _mpHintFired = true;
      if (typeof window.triggerPapaHint === 'function') window.triggerPapaHint();
    }
    if (ansTimeLeft <= 0) {
      clearInterval(ansTimer);
      if (onTimeout) onTimeout();
    }
  }, 100);
};

window.stopAnswerTimer = function() { clearInterval(ansTimer); };

// ── MARK CHOICE FEEDBACK ──────────────────────────────────────
window.markChoiceFeedback = function(chosenBtn, isCorrect, correctBook) {
  document.querySelectorAll('#ans-choices-grid .choice-btn').forEach(btn => {
    btn.disabled = true;
    const book = btn.querySelector('.choice-book')?.textContent;
    if (book === correctBook) btn.classList.add('correct');
  });
  if (!isCorrect && chosenBtn) chosenBtn.classList.add('wrong');
  const fb = document.getElementById('ans-feedback');
  if (fb) {
    fb.textContent = isCorrect ? '✅ Correct!' : '❌ Wrong!';
    fb.className   = 'feedback-bar ' + (isCorrect ? 'correct' : 'wrong');
  }
};

// ── SCROLL RECOVERY MECHANIC (placeholder) ────────────────────
// Full implementation in recovery.js / recovery.html
window.triggerScrollRecovery = function(pts, onResult) {
  // Stub — wired when recovery screen is built
  if (onResult) onResult(false, 0);
};
