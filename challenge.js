// ============================================================
// WhamBible — Challenge Engine (Section 3)
// Mirrors Whamgame.base44.app mechanic exactly:
//
// FLOW:
//   1. Player 1 creates game → enters names → gets Game Code
//   2. Player 1 PICKS LEVEL (challenge for opponent)
//   3. A verse is selected → game saved to localStorage with code
//   4. Player 2 loads game via code → ANSWERS the verse challenge
//   5. Round result shown → scores updated
//   6. Turn flips: Player 2 now picks level → Player 1 answers
//   7. Repeat until 10 rounds → Game Over / Winner declared
//
// STATUS MAP (mirrors Whamgame Game entity):
//   'waiting_category'  → active player must pick level
//   'waiting_answer'    → opponent must answer verse
//   'round_result'      → show round result
//   'completed'         → game over
// ============================================================

const TOTAL_ROUNDS = 10;
const TIME_LIMIT   = 20;
const LETTERS      = ['A','B','C','D'];

// ── State ────────────────────────────────────────────────────
let G = {}; // Game state — mirrors Whamgame Game entity

// ── Screens ──────────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + id).classList.add('active');
  window.scrollTo(0, 0);
}

// ── Toast ─────────────────────────────────────────────────────
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

// ── Game Code Generator ───────────────────────────────────────
function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({length: 6}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// ── Save / Load game via localStorage ────────────────────────
function saveGame() {
  localStorage.setItem('wb_game_' + G.code, JSON.stringify(G));
}

function loadGame(code) {
  const raw = localStorage.getItem('wb_game_' + code.toUpperCase());
  if (!raw) return null;
  return JSON.parse(raw);
}

// ── LOBBY: Start New Game ─────────────────────────────────────
window.startNewGame = function() {
  const myName  = document.getElementById('my-name').value.trim();
  const oppName = document.getElementById('opp-name').value.trim();

  if (!myName || !oppName) {
    showToast('Enter both warrior names ⚔️');
    return;
  }

  G = {
    code:           generateCode(),
    player1_name:   myName,
    player2_name:   oppName,
    player1_score:  0,
    player2_score:  0,
    current_turn:   'player1',   // whose turn to PICK level
    round:          1,
    status:         'waiting_category',
    // pending challenge fields (set after level pick)
    pending_points:      null,
    pending_level_name:  null,
    pending_verse_id:    null,
    pending_verse_text:  null,
    pending_verse_book:  null,
    pending_verse_chapter: null,
    pending_verse_verse: null,
    pending_options:     null,
    // last round memory
    last_verse_text:     null,
    last_verse_ref:      null,
    last_answer_correct: null,
    last_answerer:       null,
  };

  saveGame();
  renderPickLevel();
  showScreen('pick-level');
};

// ── LOBBY: Resume Game ────────────────────────────────────────
window.resumeGame = function() {
  const code = document.getElementById('game-code').value.trim().toUpperCase();
  if (!code || code.length < 4) {
    showToast('Enter a valid game code');
    return;
  }

  const saved = loadGame(code);
  if (!saved) {
    showToast('Game not found. Check the code and try again.');
    return;
  }

  G = saved;

  if (G.status === 'waiting_category') {
    renderPickLevel();
    showScreen('pick-level');
  } else if (G.status === 'waiting_answer') {
    renderAnswerScreen();
    showScreen('answer');
  } else if (G.status === 'completed') {
    showGameOver();
  }
};

// ── PICK LEVEL: Render ────────────────────────────────────────
function renderPickLevel() {
  const active = G.current_turn === 'player1' ? G.player1_name : G.player2_name;
  const icons  = { player1: '⚔️', player2: '🛡️' };

  document.getElementById('pick-turn-name').textContent = active;
  document.getElementById('pick-avatar').textContent = icons[G.current_turn];
  document.getElementById('round-label').textContent = `Round ${G.round} of ${TOTAL_ROUNDS}`;

  // VS strip
  document.getElementById('vs-p1-name').textContent  = G.player1_name;
  document.getElementById('vs-p1-score').textContent = G.player1_score;
  document.getElementById('vs-p2-name').textContent  = G.player2_name;
  document.getElementById('vs-p2-score').textContent = G.player2_score;

  // Highlight active player
  document.getElementById('vs-p1').classList.toggle('active-turn', G.current_turn === 'player1');
  document.getElementById('vs-p2').classList.toggle('active-turn', G.current_turn === 'player2');
}

// ── PICK LEVEL: Player picks difficulty ───────────────────────
window.pickLevel = function(pts, levelName, icon) {
  // Select a random verse for this challenge
  const verse = VERSES[Math.floor(Math.random() * VERSES.length)];
  const options = buildOptions(verse);

  // Store pending challenge
  G.pending_points        = pts;
  G.pending_level_name    = levelName;
  G.pending_verse_id      = verse.id;
  G.pending_verse_text    = verse.text;
  G.pending_verse_book    = verse.book;
  G.pending_verse_chapter = verse.chapter;
  G.pending_verse_verse   = verse.verse;
  G.pending_options       = options;
  G.status                = 'waiting_answer';

  saveGame();

  // Animate selection
  showToast(`${icon} ${levelName} challenge issued! (${pts} pts)`);
  setTimeout(() => {
    renderAnswerScreen();
    showScreen('answer');
  }, 700);
};

// ── BUILD OPTIONS (4 choices, one correct) ────────────────────
function buildOptions(correctVerse) {
  const correct = {
    book: correctVerse.book,
    chapter: correctVerse.chapter,
    verse: correctVerse.verse,
    correct: true,
  };

  const wrongs = [];
  const usedBooks = new Set([correctVerse.book]);

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

// ── ANSWER SCREEN: Render ─────────────────────────────────────
function renderAnswerScreen() {
  const answerer = G.current_turn === 'player1' ? G.player2_name : G.player1_name;
  const challenger = G.current_turn === 'player1' ? G.player1_name : G.player2_name;

  document.getElementById('challenge-from-label').textContent =
    `⚔️ ${challenger} challenged you, ${answerer}!`;
  document.getElementById('challenge-pts-badge').textContent =
    `${G.pending_points} pts`;

  // Verse
  document.getElementById('ans-verse-body').textContent = `"${G.pending_verse_text}"`;

  // Choices
  const grid = document.getElementById('ans-choices-grid');
  grid.innerHTML = '';
  G.pending_options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    btn.id = `ans-choice-${i}`;
    btn.onclick = () => handleChallengeAnswer(i, opt.correct);
    btn.innerHTML = `
      <div class="choice-letter">${LETTERS[i]}</div>
      <div class="choice-text-wrap">
        <span class="choice-book">${opt.book}</span>
        <span class="choice-ref">Chapter ${opt.chapter} · Verse ${opt.verse}</span>
      </div>
    `;
    grid.appendChild(btn);
  });

  document.getElementById('ans-feedback').textContent = '';
  document.getElementById('ans-feedback').className = 'feedback-bar';

  startAnswerTimer();
}

// ── ANSWER TIMER ──────────────────────────────────────────────
let ansTimer = null;
let ansTimeLeft = TIME_LIMIT;

function startAnswerTimer() {
  ansTimeLeft = TIME_LIMIT;
  const bar = document.getElementById('ans-timer-bar');
  bar.style.width = '100%';
  bar.className = 'timer-bar';

  clearInterval(ansTimer);
  ansTimer = setInterval(() => {
    ansTimeLeft -= 0.1;
    const pct = (ansTimeLeft / TIME_LIMIT) * 100;
    bar.style.width = pct + '%';
    if (pct < 30) bar.className = 'timer-bar danger';
    if (ansTimeLeft <= 0) {
      clearInterval(ansTimer);
      handleChallengeAnswer(-1, false, true);
    }
  }, 100);
}

// ── HANDLE CHALLENGE ANSWER ───────────────────────────────────
let ansAnswered = false;

function handleChallengeAnswer(choiceIndex, isCorrect, timeUp = false) {
  if (ansAnswered) return;
  ansAnswered = true;
  clearInterval(ansTimer);

  const buttons = document.querySelectorAll('#ans-choices-grid .choice-btn');
  buttons.forEach(btn => btn.disabled = true);

  // Determine who answered (opponent of current_turn picker)
  const answererKey = G.current_turn === 'player1' ? 'player2' : 'player1';

  // Score
  const ptsEarned = isCorrect ? G.pending_points : 0;

  if (answererKey === 'player1') {
    G.player1_score += ptsEarned;
  } else {
    G.player2_score += ptsEarned;
  }

  G.last_answer_correct = isCorrect;
  G.last_answerer       = answererKey;
  G.last_verse_text     = G.pending_verse_text;
  G.last_verse_ref      = `${G.pending_verse_book} ${G.pending_verse_chapter}:${G.pending_verse_verse}`;

  // Visual feedback
  if (!timeUp && choiceIndex >= 0) {
    const chosen = document.getElementById(`ans-choice-${choiceIndex}`);
    chosen.classList.add(isCorrect ? 'correct' : 'wrong');
    if (!isCorrect) {
      buttons.forEach(btn => {
        if (btn.querySelector('.choice-book')?.textContent === G.pending_verse_book) {
          btn.classList.add('reveal');
        }
      });
    }
  }

  const fb = document.getElementById('ans-feedback');
  if (timeUp) {
    fb.textContent = "⏱️ Time's up!";
    fb.className = 'feedback-bar wrong';
  } else if (isCorrect) {
    fb.textContent = `✅ Correct! +${ptsEarned} pts`;
    fb.className = 'feedback-bar correct';
  } else {
    fb.textContent = '❌ Wrong answer!';
    fb.className = 'feedback-bar wrong';
  }

  // Advance round
  G.round++;
  G.status = G.round > TOTAL_ROUNDS ? 'completed' : 'waiting_category';

  // Flip turn
  G.current_turn = G.current_turn === 'player1' ? 'player2' : 'player1';

  // Clear pending
  G.pending_points        = null;
  G.pending_verse_text    = null;
  G.pending_verse_book    = null;
  G.pending_verse_chapter = null;
  G.pending_verse_verse   = null;
  G.pending_options       = null;

  saveGame();
  ansAnswered = false;

  setTimeout(() => showRoundResult(isCorrect, ptsEarned, answererKey), 900);
}

// ── ROUND RESULT SCREEN ───────────────────────────────────────
function showRoundResult(isCorrect, ptsEarned, answererKey) {
  const answererName = answererKey === 'player1' ? G.player1_name : G.player2_name;

  document.getElementById('rr-icon').textContent  = isCorrect ? '✅' : '📖';
  document.getElementById('rr-title').textContent  = isCorrect
    ? `${answererName} got it!`
    : `${answererName} missed it!`;
  document.getElementById('rr-title').style.color  = isCorrect ? '#4caf7d' : '#c93030';

  document.getElementById('rr-verse-ref').textContent  = G.last_verse_ref;
  document.getElementById('rr-verse-text').textContent = `"${G.last_verse_text}"`;

  // P1 scores
  document.getElementById('rr-p1-name').textContent  = G.player1_name;
  document.getElementById('rr-p1-delta').textContent = answererKey === 'player1' && isCorrect
    ? `+${ptsEarned}` : (answererKey === 'player1' ? '+0' : '');
  document.getElementById('rr-p1-delta').className = 'rr-delta' + (answererKey === 'player1' && isCorrect ? ' gained' : '');
  document.getElementById('rr-p1-total').textContent = `Total: ${G.player1_score} pts`;

  // P2 scores
  document.getElementById('rr-p2-name').textContent  = G.player2_name;
  document.getElementById('rr-p2-delta').textContent = answererKey === 'player2' && isCorrect
    ? `+${ptsEarned}` : (answererKey === 'player2' ? '+0' : '');
  document.getElementById('rr-p2-delta').className = 'rr-delta' + (answererKey === 'player2' && isCorrect ? ' gained' : '');
  document.getElementById('rr-p2-total').textContent = `Total: ${G.player2_score} pts`;

  // Winner highlight
  document.getElementById('rr-p1-block').className = 'rr-player' + (answererKey === 'player1' ? (isCorrect ? ' winner' : ' loser') : '');
  document.getElementById('rr-p2-block').className = 'rr-player' + (answererKey === 'player2' ? (isCorrect ? ' winner' : ' loser') : '');

  // Game code
  document.getElementById('share-code').textContent = G.code;
  document.getElementById('go-code').textContent    = G.code;

  // Next button label
  const nextBtn = document.getElementById('rr-next-btn');
  if (G.status === 'completed') {
    nextBtn.textContent = '🏆 See Final Results';
  } else {
    const nextPicker = G.current_turn === 'player1' ? G.player1_name : G.player2_name;
    nextBtn.textContent = `${nextPicker}'s Turn ⚔️`;
  }

  showScreen('round-result');
}

// ── NEXT TURN ─────────────────────────────────────────────────
window.nextTurn = function() {
  if (G.status === 'completed') {
    showGameOver();
  } else {
    renderPickLevel();
    showScreen('pick-level');
  }
};

// ── COPY CODE ─────────────────────────────────────────────────
window.copyCode = function() {
  navigator.clipboard.writeText(G.code).then(() => {
    showToast(`Copied: ${G.code} ⚔️`);
    document.getElementById('copy-hint').textContent = '✅ Copied!';
    setTimeout(() => {
      document.getElementById('copy-hint').textContent = 'Tap to copy';
    }, 2000);
  }).catch(() => {
    showToast(`Game Code: ${G.code}`);
  });
};

// ── GAME OVER ─────────────────────────────────────────────────
function showGameOver() {
  const p1 = G.player1_score;
  const p2 = G.player2_score;

  let icon, title, subtitle;
  if (p1 > p2) {
    icon = '👑'; title = `${G.player1_name} Wins!`;
    subtitle = `${p1} pts vs ${p2} pts — Victory!`;
  } else if (p2 > p1) {
    icon = '👑'; title = `${G.player2_name} Wins!`;
    subtitle = `${p2} pts vs ${p1} pts — Victory!`;
  } else {
    icon = '🤝'; title = 'It\'s a Draw!';
    subtitle = `${p1} pts each — Evenly matched warriors!`;
  }

  document.getElementById('go-icon').textContent    = icon;
  document.getElementById('go-title').textContent   = title;
  document.getElementById('go-subtitle').textContent = subtitle;
  document.getElementById('go-code').textContent    = G.code;

  document.getElementById('go-stats').innerHTML = `
    <div class="stat-item">
      <span class="stat-num">${G.player1_name}</span>
      <span class="stat-label">${p1} pts</span>
    </div>
    <div class="stat-item">
      <span class="stat-num">VS</span>
      <span class="stat-label">——</span>
    </div>
    <div class="stat-item">
      <span class="stat-num">${G.player2_name}</span>
      <span class="stat-label">${p2} pts</span>
    </div>
  `;

  showScreen('gameover');
}

// ── NEW GAME ──────────────────────────────────────────────────
window.newGame = function() {
  G = {};
  showScreen('lobby');
};

// ── INIT ──────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  // Check URL for game code param (for deep linking)
  const params = new URLSearchParams(window.location.search);
  const code   = params.get('code');
  if (code) {
    document.getElementById('game-code').value = code;
    resumeGame();
  } else {
    showScreen('lobby');
  }
});

// ============================================================
// Push Notification Hooks — wired into challenge flow
// Calls sendPushNotification() from notifications.js
// ============================================================

// Called after pickLevel() saves game state
async function notifyChallengeSent(opponentToken, challengerName, gameCode) {
  if (!opponentToken) return;
  await sendPushNotification('challenge_received', opponentToken, challengerName, gameCode);
}

// Called after handleChallengeAnswer() saves result
async function notifyChallengeAnswered(pickerToken, answererName, gameCode) {
  if (!pickerToken) return;
  await sendPushNotification('challenge_answered', pickerToken, answererName, gameCode);
}

// Called when final round completes
async function notifyGameComplete(opponentToken, playerName, gameCode) {
  if (!opponentToken) return;
  await sendPushNotification('game_completed', opponentToken, playerName, gameCode);
}

// Called when new game is created
async function notifyGameInvite(opponentToken, challengerName, gameCode) {
  if (!opponentToken) return;
  await sendPushNotification('game_invite', opponentToken, challengerName, gameCode);
}
