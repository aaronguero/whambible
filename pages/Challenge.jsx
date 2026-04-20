import { useState, useEffect, useRef, useCallback } from "react";

// ── Assets ──
const LANDSCAPE_BG = "https://media.base44.com/images/public/69df9a909b33058a5ce47831/33b065c94_generated_image.png";
const CHAR_MP      = "https://media.base44.com/images/public/69df9a909b33058a5ce47831/10c016255_generated_image.png";
const CHAR_KNIGHT  = "https://media.base44.com/images/public/69df9a909b33058a5ce47831/9b51fedfd_generated_image.png";
const CHAR_VICTORY = "https://media.base44.com/images/public/69df9a909b33058a5ce47831/c5aa4771c_generated_image.png";
const WHAM_AUDIO   = "https://media.base44.com/videos/public/69c40c6701d9dfdb1df69d2b/5d143ab80_51a54c36d_wham-slam-voice1.webm";

const C = {
  cobalt:    "#1A3A5C",
  cobaltDark:"#0D1F35",
  teal:      "#1E7A8C",
  tealLight: "#3ABDD4",
  gold:      "#D4921A",
  goldLight: "#F5C842",
  white:     "#FFFFFF",
  offWhite:  "#F4F0E8",
  red:       "#C0392B",
  ink:       "#0A0500",
  dark:      "#0D0A02",
  goldDim:   "rgba(201,162,39,0.4)",
};

const TOTAL_ROUNDS = 10;
const TIME_LIMIT   = 20;
const LETTERS = ["A","B","C","D"];

const ALL_BOOKS = [
  "Genesis","Exodus","Leviticus","Numbers","Deuteronomy","Joshua","Judges","Ruth",
  "1 Samuel","2 Samuel","1 Kings","2 Kings","1 Chronicles","2 Chronicles","Ezra",
  "Nehemiah","Esther","Job","Psalms","Proverbs","Ecclesiastes","Song of Solomon",
  "Isaiah","Jeremiah","Lamentations","Ezekiel","Daniel","Hosea","Joel","Amos",
  "Obadiah","Jonah","Micah","Nahum","Habakkuk","Zephaniah","Haggai","Zechariah",
  "Malachi","Matthew","Mark","Luke","John","Acts","Romans","1 Corinthians",
  "2 Corinthians","Galatians","Ephesians","Philippians","Colossians",
  "1 Thessalonians","2 Thessalonians","1 Timothy","2 Timothy","Titus","Philemon",
  "Hebrews","James","1 Peter","2 Peter","1 John","2 John","3 John","Jude","Revelation"
];

const LEVELS = [
  { pts:5,  name:"Squire",   icon:"🗡️", sub:"Easiest · Common verses",   color:"#1E7A8C", cls:"squire"   },
  { pts:10, name:"Warrior",  icon:"⚔️", sub:"Moderate · Popular verses", color:"#D4921A", cls:"warrior", featured:true },
  { pts:15, name:"Knight",   icon:"🛡️", sub:"Hard · Deeper verses",      color:"#C05A2A", cls:"knight"   },
  { pts:20, name:"Champion", icon:"👑", sub:"Hardest · Rare verses",      color:"#7B2D8B", cls:"champion" },
];

const SAMPLE_VERSES = [
  { book:"John",         chapter:3,  verse:16, text:"For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life." },
  { book:"Psalm",        chapter:23, verse:1,  text:"The Lord is my shepherd; I shall not want." },
  { book:"Romans",       chapter:8,  verse:28, text:"And we know that in all things God works for the good of those who love him." },
  { book:"Proverbs",     chapter:3,  verse:5,  text:"Trust in the Lord with all your heart and lean not on your own understanding." },
  { book:"Isaiah",       chapter:40, verse:31, text:"But those who hope in the Lord will renew their strength. They will soar on wings like eagles." },
  { book:"Jeremiah",     chapter:29, verse:11, text:"For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you." },
  { book:"Philippians",  chapter:4,  verse:13, text:"I can do all this through him who gives me strength." },
  { book:"Matthew",      chapter:5,  verse:9,  text:"Blessed are the peacemakers, for they will be called children of God." },
  { book:"Psalm",        chapter:46, verse:1,  text:"God is our refuge and strength, an ever-present help in trouble." },
  { book:"John",         chapter:14, verse:6,  text:"Jesus answered, I am the way and the truth and the life." },
];

function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5); }

function buildOptions(verse) {
  const correct = { book: verse.book, chapter: verse.chapter, verse: verse.verse, isCorrect: true };
  const used = new Set([verse.book]);
  const wrongs = [];
  while (wrongs.length < 3) {
    const b = ALL_BOOKS[Math.floor(Math.random() * ALL_BOOKS.length)];
    if (used.has(b)) continue;
    used.add(b);
    wrongs.push({ book: b, chapter: Math.floor(Math.random()*25)+1, verse: Math.floor(Math.random()*30)+1, isCorrect: false });
  }
  return shuffle([correct, ...wrongs]);
}

function rankBadge(score) {
  if (score >= 700) return { icon:"👑", label:"Champion", color:"#7B2D8B" };
  if (score >= 300) return { icon:"🛡️", label:"Knight",   color:"#C05A2A" };
  if (score >= 100) return { icon:"⚔️", label:"Warrior",  color:"#D4921A" };
  if (score >= 1)   return { icon:"🗡️", label:"Squire",   color:"#1E7A8C" };
  return               { icon:"📜", label:"Scribe",   color:"#64748b" };
}

// ── WHAM SLAM ──
function WhamSlam({ active, refText, sub }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    if (!active) return;
    setPhase(0);
    const t1 = setTimeout(() => setPhase(1), 300);
    const t2 = setTimeout(() => setPhase(2), 1120);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [active]);
  if (!active) return null;
  const p = [
    { bg:"#fff",    sz:60, op:1, sc:1,    rOp:0, sOp:0 },
    { bg:"#020617", sz:96, op:1, sc:1.08, rOp:1, sOp:1 },
    { bg:"#020617", sz:96, op:0, sc:1,    rOp:0, sOp:0 },
  ][phase];
  return (
    <div style={{ position:"fixed", inset:0, zIndex:9999, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", background:p.bg, transition:"background 0.15s" }}>
      <div style={{ fontSize:p.sz, fontWeight:900, letterSpacing:6, background:"linear-gradient(135deg,#f472b6,#c084fc,#818cf8)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text", marginBottom:16, opacity:p.op, transform:`scale(${p.sc})`, transition:"font-size 0.2s cubic-bezier(0.34,1.56,0.64,1),opacity 0.3s,transform 0.2s", fontFamily:"'Cinzel',serif" }}>WHAM!</div>
      <div style={{ color:"#4ade80", fontSize:22, fontWeight:800, letterSpacing:2, textTransform:"uppercase", opacity:p.rOp, transition:"opacity 0.3s", fontFamily:"'Cinzel',serif" }}>✅ {refText}</div>
      <div style={{ color:"#475569", fontSize:13, marginTop:8, opacity:p.sOp, transition:"opacity 0.3s 0.1s", fontFamily:"'Cinzel',serif" }}>{sub}</div>
    </div>
  );
}

// ── Shared background layers ──
function BgLayers({ charUrl }) {
  return (
    <>
      <div className="ch-bg-land" />
      <div className="ch-bg-char" style={{ backgroundImage: `url('${charUrl}')` }} />
      <div className="ch-bg-dark" />
      <div className="ch-bg-rim" />
    </>
  );
}

// ── VS Strip ──
function VsStrip({ p1Name, p2Name, p1Score, p2Score, round }) {
  return (
    <div className="ch-vs-strip">
      <div className="ch-vs-player left">
        <span className="ch-vs-name">{p1Name}</span>
        <span className="ch-vs-score">{p1Score}</span>
        <span className="ch-vs-label">pts</span>
      </div>
      <div className="ch-vs-divider">
        <div className="ch-vs-vs">VS</div>
        <div className="ch-vs-round">{round}</div>
      </div>
      <div className="ch-vs-player right">
        <span className="ch-vs-name">{p2Name}</span>
        <span className="ch-vs-score">{p2Score}</span>
        <span className="ch-vs-label">pts</span>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// SCREEN: Lobby
// ══════════════════════════════════════════════
function ScreenLobby({ state, onNewChallenge, onOpenGame }) {
  const myRank = rankBadge(state.myScore);
  return (
    <div className="ch-screen">
      <BgLayers charUrl={CHAR_MP} />
      <div className="ch-content">
        <div style={{ height:160 }} />
        <div className="ch-panel">
          <div className="ch-curl" />
          {/* Header */}
          <div style={{ textAlign:"center", marginBottom:18 }}>
            <div style={{ fontSize:32, marginBottom:6 }}>⚔️</div>
            <h1 className="ch-title">WhamBible</h1>
            <p className="ch-sub">Challenge · Compete · Win Glory</p>
          </div>

          {/* Player banner */}
          <div className="ch-player-banner">
            <div className="ch-avatar">👤</div>
            <div className="ch-player-info">
              <div className="ch-player-name">{state.myName}</div>
              <div className="ch-player-stats">
                {state.myScore} pts &nbsp;·&nbsp; {state.myGames} games
              </div>
              <div style={{ marginTop:4 }}>
                <span className="ch-rank-badge" style={{ background:`${myRank.color}22`, border:`1px solid ${myRank.color}66`, color:myRank.color }}>
                  {myRank.icon} {myRank.label}
                </span>
              </div>
            </div>
          </div>

          {/* New Challenge CTA */}
          <button className="ch-btn-challenge" onClick={onNewChallenge}>
            ⚔️ Issue New Challenge
          </button>

          {/* Active games */}
          <div className="ch-ag-section">
            <div className="ch-ag-header">
              <span className="ch-ag-title">Active Battles</span>
              <span className="ch-ag-badge">{state.activeGames.length}</span>
            </div>
            {state.activeGames.length === 0 ? (
              <div className="ch-ag-empty">
                <div style={{ fontSize:28, marginBottom:8 }}>🏹</div>
                <div>No active battles yet</div>
                <div className="ch-ag-empty-hint">Issue a challenge to get started</div>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {state.activeGames.map((g, i) => {
                  const isMyTurn = g.currentTurn === "me";
                  const isComplete = g.status === "complete";
                  return (
                    <div key={i} className={`ch-ag-card ${isComplete?"complete":isMyTurn?"your-turn":"waiting"}`} onClick={() => onOpenGame(g)}>
                      <div className="ch-ag-avatar">👤</div>
                      <div className="ch-ag-body">
                        <div className="ch-ag-opp">{g.oppName}</div>
                        <div className="ch-ag-turn">
                          {isComplete ? "🏁 Battle ended" : isMyTurn ? "⚔️ Your turn!" : "⏳ Waiting for opponent"}
                        </div>
                      </div>
                      <div className="ch-ag-score">{g.myScore}–{g.oppScore}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <button className="ch-btn-ghost" style={{ marginTop:14 }} onClick={() => window.location.href = "/"}>← Home</button>
          <div style={{ height:30 }} />
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// SCREEN: Select Level (MP or Round pick)
// ══════════════════════════════════════════════
function ScreenPickLevel({ title, sub, game, isRound, onPick, onBack }) {
  return (
    <div className="ch-screen">
      <BgLayers charUrl={CHAR_KNIGHT} />
      <div className="ch-content">
        <div style={{ height:120 }} />
        <div className="ch-panel">
          <div className="ch-curl" />

          {isRound && game && (
            <>
              <div className="ch-turn-banner">
                <span style={{ fontSize:22 }}>⚔️</span>
                <div>
                  <div className="ch-turn-name">{game.myName}</div>
                  <div className="ch-turn-sub">Choose your challenge for the opponent</div>
                </div>
              </div>
              <VsStrip p1Name={game.myName} p2Name={game.oppName} p1Score={game.myScore} p2Score={game.oppScore} round={`Round ${game.round || 1}`} />
            </>
          )}

          {!isRound && (
            <div style={{ textAlign:"center", marginBottom:22 }}>
              <div style={{ fontSize:34, marginBottom:8 }}>⚔️</div>
              <h1 className="ch-title">{title || "Choose Level"}</h1>
              <p className="ch-sub">{sub || "Select your challenge difficulty"}</p>
            </div>
          )}

          {isRound && <p className="ch-pick-instruction">⚔️ Select a difficulty to challenge your opponent</p>}

          <div style={{ display:"flex", flexDirection:"column", gap:9, marginBottom:20, width:"100%" }}>
            {LEVELS.map(lv => (
              <button key={lv.pts} onClick={() => onPick(lv)}
                className={`ch-level-card ${lv.featured?"featured":""}`}
                style={{ "--lv-color": lv.color }}>
                <span className="ch-level-icon">{lv.icon}</span>
                <div className="ch-level-info">
                  <span className="ch-level-title">{lv.name.toUpperCase()}</span>
                  <span className="ch-level-sub">{lv.sub}</span>
                </div>
                <div className="ch-level-pts">
                  <span className="ch-level-pts-num">{lv.pts}</span>
                  <span className="ch-level-pts-label">PTS</span>
                </div>
              </button>
            ))}
          </div>

          <button className="ch-btn-ghost" onClick={onBack}>← Back</button>
          <div style={{ height:24 }} />
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// SCREEN: Verse Stack (pick 1 of 10)
// ══════════════════════════════════════════════
function ScreenVerseStack({ level, onPick, onBack }) {
  const verses = useRef(shuffle(SAMPLE_VERSES)).current;
  const [selected, setSelected] = useState(null);

  return (
    <div className="ch-screen">
      <BgLayers charUrl={CHAR_MP} />
      <div className="ch-content">
        <div style={{ height:100 }} />
        <div className="ch-panel">
          <div className="ch-curl" />
          <div style={{ textAlign:"center", marginBottom:18 }}>
            <div className="ch-label-tiny">Choose Your Challenge</div>
            <h1 className="ch-title">Pick a Verse</h1>
            <p className="ch-sub">Select the verse your opponent must identify</p>
          </div>

          {/* 2×5 grid */}
          <div className="ch-verse-grid">
            {verses.map((v, i) => (
              <button key={i}
                className={`ch-vs-card ${selected===i?"selected":""}`}
                onClick={() => { setSelected(i); setTimeout(() => onPick(v), 220); }}>
                <div className="ch-vs-ref">{v.book}<br/>{v.chapter}:{v.verse}</div>
                <div className="ch-vs-snippet">"{v.text.slice(0,48)}…"</div>
              </button>
            ))}
          </div>

          <div style={{ textAlign:"center", marginTop:16 }}>
            <button className="ch-btn-ghost" onClick={onBack}>← Back</button>
          </div>
          <div style={{ height:24 }} />
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// SCREEN: Select Opponent
// ══════════════════════════════════════════════
function ScreenSelectChallenger({ recentOpps, onChallenge, onBack }) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const searchTid = useRef(null);

  function handleSearch(val) {
    setSearch(val);
    clearTimeout(searchTid.current);
    if (val.length < 2) { setResults([]); return; }
    searchTid.current = setTimeout(() => {
      // Simulated search — in real game hits Firestore
      setResults(val.length > 1 ? [{ name: val, sub: "Search result" }] : []);
    }, 380);
  }

  return (
    <div className="ch-screen">
      <BgLayers charUrl={CHAR_MP} />
      <div className="ch-content">
        <div style={{ height:100 }} />
        <div className="ch-panel">
          <div className="ch-curl" />
          <div style={{ textAlign:"center", marginBottom:20 }}>
            <div style={{ fontSize:30, marginBottom:6 }}>🎯</div>
            <h1 className="ch-title">Select Opponent</h1>
            <p className="ch-sub">Challenge a recent opponent or search</p>
          </div>

          <div className="ch-section-label">Recent Opponents</div>
          <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:18 }}>
            {recentOpps.length === 0 ? (
              <div className="ch-empty-hint">No recent opponents yet — search below</div>
            ) : recentOpps.map((opp, i) => (
              <div key={i} className="ch-opp-row">
                <div className="ch-opp-avatar">👤</div>
                <div className="ch-opp-info">
                  <div className="ch-opp-name">{opp.name}</div>
                  <div className="ch-opp-meta">Recent opponent</div>
                </div>
                <button className="ch-opp-challenge-btn" onClick={() => onChallenge(opp)}>⚔️ Challenge</button>
              </div>
            ))}
          </div>

          <div className="ch-divider-or">
            <div className="ch-divider-line" />
            <span className="ch-divider-text">OR SEARCH</span>
            <div className="ch-divider-line" />
          </div>

          <input className="ch-search-input" placeholder="Name or email…"
            value={search} onChange={e => handleSearch(e.target.value)} />

          {results.length > 0 && (
            <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:12 }}>
              {results.map((r,i) => (
                <div key={i} className="ch-opp-row" style={{ cursor:"pointer" }} onClick={() => onChallenge(r)}>
                  <div className="ch-opp-avatar" style={{ width:30, height:30, fontSize:14 }}>👤</div>
                  <div className="ch-opp-info"><div className="ch-opp-name">{r.name}</div></div>
                  <button className="ch-opp-challenge-btn">⚔️ Challenge</button>
                </div>
              ))}
            </div>
          )}

          {search.length >= 2 && results.length === 0 && (
            <button className="ch-btn-primary" style={{ marginBottom:10 }} onClick={() => onChallenge({ name: search })}>
              ⚔️ Challenge "{search}"
            </button>
          )}

          <button className="ch-btn-ghost" onClick={onBack}>← Back</button>
          <div style={{ height:24 }} />
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// SCREEN: Accept Challenge
// ══════════════════════════════════════════════
function ScreenAcceptChallenge({ challenge, onAccept, onDecline }) {
  return (
    <div className="ch-screen">
      <BgLayers charUrl={CHAR_MP} />
      <div className="ch-content">
        <div style={{ height:100 }} />
        <div className="ch-panel" style={{ display:"flex", flexDirection:"column", alignItems:"center", paddingBottom:32 }}>
          <div className="ch-curl" />
          {/* Challenger avatar */}
          <div className="ch-ac-avatar">👤</div>
          <div className="ch-label-tiny" style={{ marginBottom:6 }}>Incoming Challenge</div>
          <h1 className="ch-title" style={{ marginBottom:4 }}>{challenge.fromName}</h1>
          <p className="ch-sub" style={{ marginBottom:24 }}>has challenged you!</p>

          {/* Level badge */}
          <div className="ch-ac-level-badge">
            <span style={{ fontSize:22 }}>{challenge.levelIcon}</span>
            <span className="ch-ac-level-name">{challenge.levelName}</span>
            <span style={{ color:"rgba(255,255,255,0.3)" }}>·</span>
            <span className="ch-ac-pts">{challenge.pts} pts</span>
          </div>

          {/* Verse card */}
          <div className="ch-ac-verse-card">
            <div className="ch-verse-label">Your Challenge Verse</div>
            <p className="ch-ac-verse-text">"{challenge.verse?.text?.slice(0,120) || "A verse is waiting for you…"}"</p>
            {challenge.verse && (
              <div className="ch-ac-verse-ref">
                — {challenge.verse.book} {challenge.verse.chapter}:{challenge.verse.verse}
              </div>
            )}
          </div>

          <button className="ch-btn-primary" onClick={onAccept}>⚔️ Accept Challenge</button>
          <button className="ch-btn-ghost" style={{ marginTop:10 }} onClick={onDecline}>← Decline</button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// SCREEN: Answer
// ══════════════════════════════════════════════
function ScreenAnswer({ challenge, game, onResult }) {
  const [timeLeft, setTime] = useState(TIME_LIMIT);
  const [answered, setAnswered] = useState(false);
  const [chosen, setChosen] = useState(null);
  const [showHint, setShowHint] = useState(false);
  const [whamActive, setWhamActive] = useState(false);
  const [whamCorrect, setWhamCorrect] = useState(true);
  const timerRef = useRef(null);
  const audioRef = useRef(null);

  const verse = challenge.verse;
  const options = useRef(buildOptions(verse)).current;
  const correctRef = `${verse.book} ${verse.chapter}:${verse.verse}`;

  // Papa hint thresholds (MP): Squire@13s, Warrior@15s, Knight@17s, Champion=none
  const hintAt = { 5:13, 10:15, 15:17 };
  const hintThreshold = hintAt[challenge.pts] || null;

  useEffect(() => {
    audioRef.current = new Audio(WHAM_AUDIO);
    audioRef.current.preload = "auto";
    audioRef.current.load();
    timerRef.current = setInterval(() => {
      setTime(t => {
        if (t <= 1) { clearInterval(timerRef.current); handleAnswer(null); return 0; }
        if (hintThreshold && t <= hintThreshold && !showHint) setShowHint(true);
        return parseFloat((t - 0.1).toFixed(1));
      });
    }, 100);
    return () => clearInterval(timerRef.current);
  }, []);

  function handleAnswer(opt) {
    if (answered) return;
    clearInterval(timerRef.current);
    setAnswered(true);
    setChosen(opt);
    const isCorrect = opt && opt.isCorrect;
    setWhamCorrect(isCorrect);
    if (isCorrect) {
      try { audioRef.current.currentTime = 0; audioRef.current.play().catch(()=>{}); } catch(e) {}
      setWhamActive(true);
      setTimeout(() => { setWhamActive(false); setTimeout(() => onResult({ correct: isCorrect, opt, verse, pts: challenge.pts }), 300); }, 1620);
    } else {
      setTimeout(() => onResult({ correct: false, opt, verse, pts: challenge.pts }), 900);
    }
  }

  const timerPct = (timeLeft / TIME_LIMIT) * 100;
  const timerColor = timeLeft > 10 ? C.teal : timeLeft > 5 ? C.gold : C.red;

  return (
    <div className="ch-screen">
      <BgLayers charUrl={CHAR_KNIGHT} />
      <WhamSlam active={whamActive} refText={correctRef} sub="Correct!" />
      <div className="ch-content">
        <div style={{ height:80 }} />
        <div className="ch-panel">
          <div className="ch-curl" />

          {/* Header */}
          <div className="ch-answer-header">
            <div className="ch-challenge-from">⚔️ {challenge.fromName} challenged you!</div>
            <div className="ch-pts-badge">{challenge.pts} pts</div>
          </div>

          {/* Timer bar */}
          <div className="ch-timer-bar-wrap">
            <div className="ch-timer-bar" style={{ width:`${timerPct}%`, background:timerColor }} />
          </div>

          {/* Verse */}
          <div className="ch-verse-card">
            <div className="ch-verse-ornament">✦ ✦ ✦</div>
            <p className="ch-verse-body">"{verse.text}"</p>
            <div className="ch-verse-ornament">✦ ✦ ✦</div>
            <div className="ch-verse-where">Where is this verse found?</div>
          </div>

          {/* Papa hint */}
          {showHint && !answered && (
            <div className="ch-papa-hint">
              💡 <strong>Papa says:</strong> This verse is from <em>{verse.book}</em>, chapter {verse.chapter}.
            </div>
          )}

          {/* Choices */}
          <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:14 }}>
            <p className="ch-choices-label">Select the correct Book · Chapter · Verse</p>
            {options.map((opt, i) => {
              let cls = "ch-choice-btn";
              if (answered) {
                if (opt.isCorrect) cls += " correct";
                else if (opt === chosen) cls += " wrong";
              }
              return (
                <button key={i} className={cls} onClick={() => handleAnswer(opt)} disabled={answered}>
                  <div className="ch-choice-letter">{LETTERS[i]}</div>
                  <div className="ch-choice-text">
                    <span className="ch-choice-book">{opt.book}</span>
                    <span className="ch-choice-ref">Chapter {opt.chapter} · Verse {opt.verse}</span>
                  </div>
                  {answered && opt.isCorrect && <span style={{ marginLeft:"auto" }}>✓</span>}
                  {answered && opt === chosen && !opt.isCorrect && <span style={{ marginLeft:"auto", color:C.red }}>✗</span>}
                </button>
              );
            })}
          </div>

          {answered && (
            <div className={`ch-feedback-bar ${whamCorrect?"correct":"wrong"}`}>
              {whamCorrect ? "✅ Correct!" : `❌ Wrong! It was ${correctRef}`}
            </div>
          )}
          <div style={{ height:20 }} />
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// SCREEN: Round Result
// ══════════════════════════════════════════════
function ScreenRoundResult({ result, game, onNext }) {
  const { correct, verse, pts } = result;
  return (
    <div className="ch-screen">
      <BgLayers charUrl={CHAR_KNIGHT} />
      <div className="ch-content">
        <div style={{ height:100 }} />
        <div className="ch-panel">
          <div className="ch-curl" />
          <div className="ch-round-result-card">
            <div style={{ fontSize:40, marginBottom:8 }}>{correct ? "✅" : "❌"}</div>
            <h2 className="ch-title" style={{ marginBottom:4 }}>{correct ? "Correct!" : "Missed It"}</h2>
            <p className="ch-verse-ref-small">{verse.book} {verse.chapter}:{verse.verse}</p>
            <p className="ch-verse-body-small">"{verse.text?.slice(0,100)}…"</p>

            <VsStrip p1Name={game.myName} p2Name={game.oppName} p1Score={game.myScore} p2Score={game.oppScore} round={`Round ${game.round}`} />

            <div className="ch-share-wrap">
              <div className="ch-share-label">📋 Game Code — Share with opponent</div>
              <div className="ch-share-code" onClick={() => navigator.clipboard?.writeText(game.gameCode||"").catch(()=>{})}>
                {game.gameCode || "——"}
              </div>
              <div className="ch-share-hint">Tap to copy</div>
            </div>

            <button className="ch-btn-primary" onClick={onNext}>
              {game.round >= TOTAL_ROUNDS ? "🏆 View Results" : "Next Turn ⚔️"}
            </button>
          </div>
          <div style={{ height:24 }} />
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// SCREEN: Game Complete
// ══════════════════════════════════════════════
function ScreenGameComplete({ game, onNewBattle, onHome }) {
  const won = game.myScore > game.oppScore;
  const draw = game.myScore === game.oppScore;
  const myRank = rankBadge(game.myScore);

  return (
    <div className="ch-screen">
      <BgLayers charUrl={CHAR_VICTORY} />
      <div className="ch-content">
        <div style={{ height:180 }} />
        <div className="ch-panel">
          <div className="ch-curl" />
          <div style={{ textAlign:"center", paddingBottom:32 }}>
            <div className="ch-gc-trophy">{won ? "🏆" : draw ? "🤝" : "⚔️"}</div>
            <h2 className="ch-title" style={{ marginBottom:4 }}>Battle Complete!</h2>
            <p className="ch-sub" style={{ marginBottom:12 }}>{TOTAL_ROUNDS} rounds fought</p>

            <div className={`ch-gc-result-banner ${won?"win":draw?"draw":"loss"}`}>
              {won ? "⚔️ VICTORY" : draw ? "🤝 DRAW" : "💀 DEFEAT"}
            </div>

            {/* Scoreboard */}
            <div className="ch-gc-scoreboard">
              <div className="ch-gc-player">
                <div className="ch-gc-avatar">👤</div>
                <div className="ch-gc-name">{game.myName}</div>
                <div className="ch-gc-score">{game.myScore}</div>
              </div>
              <div className="ch-gc-vs">VS</div>
              <div className="ch-gc-player">
                <div className="ch-gc-avatar">👤</div>
                <div className="ch-gc-name">{game.oppName}</div>
                <div className="ch-gc-score">{game.oppScore}</div>
              </div>
            </div>

            {/* Stats row */}
            <div className="ch-gc-stats">
              <div className="ch-gc-stat">
                <div className="ch-gc-stat-val">{won ? `+${game.myScore}` : `+0`}</div>
                <div className="ch-gc-stat-lbl">Pts Earned</div>
              </div>
              <div className="ch-gc-stat">
                <div className="ch-gc-stat-val">{TOTAL_ROUNDS}</div>
                <div className="ch-gc-stat-lbl">Rounds</div>
              </div>
              <div className="ch-gc-stat">
                <div className="ch-gc-stat-val">{myRank.icon}</div>
                <div className="ch-gc-stat-lbl">Rank</div>
              </div>
            </div>

            <button className="ch-btn-primary" onClick={onNewBattle}>⚔️ New Battle</button>
            <button className="ch-btn-ghost" style={{ marginTop:10, width:"100%" }} onClick={onHome}>← Home</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// ROOT — State Machine
// ══════════════════════════════════════════════
const DEMO_GAME = {
  myName: "You", oppName: "Warrior", myScore: 0, oppScore: 0,
  round: 1, gameCode: "WHAM1234",
  activeGames: [
    { oppName:"Brother James", currentTurn:"me",   status:"waiting_for_answer", myScore:10, oppScore:5 },
    { oppName:"Sister Ruth",   currentTurn:"them",  status:"pick_level",         myScore:0,  oppScore:0 },
  ],
  myScore: 45, myGames: 7,
};

const DEMO_CHALLENGE = {
  fromName: "Warrior",
  levelName: "Warrior", levelIcon: "⚔️", pts: 10,
  verse: { book:"John", chapter:3, verse:16, text:"For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life." },
};

export default function Challenge() {
  const [screen,    setScreen]    = useState("lobby");
  const [game,      setGame]      = useState(DEMO_GAME);
  const [level,     setLevel]     = useState(null);
  const [verse,     setVerse]     = useState(null);
  const [challenge, setChallenge] = useState(null);
  const [result,    setResult]    = useState(null);

  function goLobby() {
    setScreen("lobby");
    setResult(null);
  }

  return (
    <div style={{ minHeight:"100vh", background:C.dark, fontFamily:"'Georgia',serif", overflowX:"hidden", position:"relative" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800;900&display=swap');

        /* ── Backgrounds ── */
        .ch-bg-land {
          position:fixed; inset:0; z-index:0; pointer-events:none;
          background-image:url('${LANDSCAPE_BG}');
          background-size:cover; background-position:center top; opacity:0.55;
          -webkit-mask-image:linear-gradient(to bottom,rgba(0,0,0,1) 0%,rgba(0,0,0,1) 38%,rgba(0,0,0,0.25) 62%,rgba(0,0,0,0) 100%);
          mask-image:linear-gradient(to bottom,rgba(0,0,0,1) 0%,rgba(0,0,0,1) 38%,rgba(0,0,0,0.25) 62%,rgba(0,0,0,0) 100%);
        }
        .ch-bg-char {
          position:fixed; inset:0; z-index:1; pointer-events:none;
          background-size:90% auto; background-position:center 4%; background-repeat:no-repeat; opacity:0.92;
          -webkit-mask-image:linear-gradient(to bottom,rgba(0,0,0,0) 0%,rgba(0,0,0,0.75) 6%,rgba(0,0,0,1) 16%,rgba(0,0,0,1) 46%,rgba(0,0,0,0.25) 63%,rgba(0,0,0,0) 78%);
          mask-image:linear-gradient(to bottom,rgba(0,0,0,0) 0%,rgba(0,0,0,0.75) 6%,rgba(0,0,0,1) 16%,rgba(0,0,0,1) 46%,rgba(0,0,0,0.25) 63%,rgba(0,0,0,0) 78%);
        }
        .ch-bg-dark {
          position:fixed; inset:0; z-index:2; pointer-events:none;
          background:linear-gradient(to bottom,rgba(10,5,0,0.12) 0%,rgba(10,5,0,0.42) 44%,rgba(10,5,0,0.85) 68%,rgba(10,5,0,0.98) 84%,rgba(10,5,0,1) 100%);
        }
        .ch-bg-rim {
          position:fixed; inset:0; z-index:3; pointer-events:none;
          background:radial-gradient(ellipse at 50% -5%,rgba(212,146,26,0.20) 0%,transparent 55%);
        }

        /* ── Content / Panel ── */
        .ch-screen { min-height:100vh; position:relative; overflow:hidden; }
        .ch-content { position:relative; z-index:4; max-width:480px; margin:0 auto; padding:0 16px 40px; display:flex; flex-direction:column; align-items:center; }
        .ch-panel {
          width:100%;
          background:linear-gradient(180deg,rgba(10,5,0,0) 0%,rgba(10,5,0,0.84) 9%,rgba(10,5,0,0.97) 20%,rgba(10,5,0,0.97) 100%);
          border-radius:20px 20px 0 0; padding:22px 18px 0; margin-top:-20px;
        }
        .ch-curl { width:70%; height:4px; margin:0 auto 14px; border-radius:2px; background:linear-gradient(90deg,transparent,rgba(212,146,26,0.7),rgba(58,189,212,0.5),rgba(212,146,26,0.7),transparent); }

        /* ── Typography ── */
        .ch-title { font-family:'Cinzel',serif; font-size:22px; font-weight:900; color:${C.gold}; letter-spacing:2px; margin:0 0 4px; text-align:center; }
        .ch-sub { font-size:14px; font-style:italic; color:rgba(240,228,192,0.5); margin:0; text-align:center; }
        .ch-label-tiny { font-family:'Cinzel',serif; font-size:10px; letter-spacing:3px; color:${C.goldDim}; text-transform:uppercase; margin-bottom:6px; text-align:center; }
        .ch-section-label { font-family:'Cinzel',serif; font-size:10px; letter-spacing:2px; color:rgba(201,162,39,0.45); text-transform:uppercase; margin-bottom:10px; }
        .ch-pick-instruction { font-family:'Cinzel',serif; font-size:12px; color:rgba(201,162,39,0.6); text-align:center; margin-bottom:14px; letter-spacing:1px; }

        /* ── Player banner ── */
        .ch-player-banner { display:flex; align-items:center; gap:12px; padding:12px 14px; background:rgba(201,162,39,0.07); border:1px solid rgba(201,162,39,0.2); border-radius:12px; margin-bottom:14px; }
        .ch-avatar { width:44px; height:44px; border-radius:50%; background:rgba(201,162,39,0.15); border:2px solid rgba(201,162,39,0.4); display:flex; align-items:center; justify-content:center; font-size:22px; flex-shrink:0; }
        .ch-player-info { flex:1; }
        .ch-player-name { font-family:'Cinzel',serif; font-size:14px; font-weight:700; color:#e2e8f0; margin-bottom:2px; }
        .ch-player-stats { font-size:12px; color:rgba(201,162,39,0.6); }
        .ch-rank-badge { font-family:'Cinzel',serif; font-size:10px; padding:3px 10px; border-radius:20px; font-weight:700; letter-spacing:0.5px; }

        /* ── Active games ── */
        .ch-btn-challenge { width:100%; padding:14px; background:linear-gradient(135deg,${C.gold},#a07720); border:none; border-radius:12px; color:#0f172a; font-family:'Cinzel',serif; font-size:14px; font-weight:800; letter-spacing:2px; text-transform:uppercase; cursor:pointer; margin-bottom:16px; box-shadow:0 4px 20px rgba(212,146,26,0.35); }
        .ch-ag-section { width:100%; margin-bottom:8px; }
        .ch-ag-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; }
        .ch-ag-title { font-family:'Cinzel',serif; font-size:11px; letter-spacing:2px; color:rgba(201,162,39,0.6); text-transform:uppercase; }
        .ch-ag-badge { background:rgba(201,162,39,0.2); color:${C.gold}; font-size:11px; font-family:'Cinzel',serif; padding:2px 10px; border-radius:20px; font-weight:700; }
        .ch-ag-empty { text-align:center; padding:20px; color:rgba(255,255,255,0.35); font-size:13px; }
        .ch-ag-empty-hint { font-size:11px; color:rgba(255,255,255,0.2); margin-top:4px; }
        .ch-ag-card { display:flex; align-items:center; gap:10px; padding:12px 14px; border-radius:12px; cursor:pointer; border:1px solid rgba(201,162,39,0.15); background:rgba(201,162,39,0.04); transition:all 0.15s; }
        .ch-ag-card.your-turn { border-color:rgba(212,146,26,0.5); background:rgba(212,146,26,0.1); }
        .ch-ag-card.complete  { opacity:0.55; }
        .ch-ag-avatar { width:36px; height:36px; border-radius:50%; background:rgba(201,162,39,0.15); display:flex; align-items:center; justify-content:center; font-size:18px; flex-shrink:0; }
        .ch-ag-body { flex:1; }
        .ch-ag-opp { font-family:'Cinzel',serif; font-size:13px; color:#e2e8f0; font-weight:700; }
        .ch-ag-turn { font-size:11px; color:rgba(255,255,255,0.4); margin-top:2px; }
        .ch-ag-score { font-family:'Cinzel',serif; font-size:13px; color:${C.gold}; font-weight:700; white-space:nowrap; }

        /* ── Level cards ── */
        .ch-level-card { display:flex; align-items:center; gap:12px; padding:14px 16px; border-radius:12px; cursor:pointer; border:1px solid rgba(var(--lv-color),0.3); background:rgba(0,0,0,0.4); border-color:rgba(201,162,39,0.2); transition:all 0.18s; width:100%; text-align:left; }
        .ch-level-card.featured { border-color:${C.gold}; background:rgba(212,146,26,0.1); box-shadow:0 0 18px rgba(212,146,26,0.2); }
        .ch-level-card:hover { transform:translateX(3px); border-color:${C.goldDim}; background:rgba(201,162,39,0.1); }
        .ch-level-icon { font-size:26px; flex-shrink:0; }
        .ch-level-info { display:flex; flex-direction:column; gap:2px; flex:1; }
        .ch-level-title { font-family:'Cinzel',serif; font-size:13px; font-weight:800; color:#e2e8f0; letter-spacing:1px; }
        .ch-level-sub { font-size:11px; color:rgba(240,228,192,0.45); }
        .ch-level-pts { display:flex; flex-direction:column; align-items:flex-end; flex-shrink:0; }
        .ch-level-pts-num { font-family:'Cinzel',serif; font-size:22px; font-weight:900; color:${C.gold}; line-height:1; }
        .ch-level-pts-label { font-family:'Cinzel',serif; font-size:9px; color:rgba(201,162,39,0.5); letter-spacing:1px; }

        /* ── VS Strip ── */
        .ch-vs-strip { display:flex; align-items:center; width:100%; padding:12px 0; margin-bottom:16px; }
        .ch-vs-player { display:flex; flex-direction:column; align-items:center; flex:1; gap:2px; }
        .ch-vs-player.left { align-items:flex-start; }
        .ch-vs-player.right { align-items:flex-end; }
        .ch-vs-name  { font-family:'Cinzel',serif; font-size:12px; color:rgba(240,228,192,0.7); letter-spacing:1px; }
        .ch-vs-score { font-family:'Cinzel',serif; font-size:24px; font-weight:900; color:${C.gold}; }
        .ch-vs-label { font-size:10px; color:rgba(201,162,39,0.4); }
        .ch-vs-divider { display:flex; flex-direction:column; align-items:center; padding:0 14px; }
        .ch-vs-vs { font-family:'Cinzel',serif; font-size:14px; font-weight:900; color:rgba(255,255,255,0.2); }
        .ch-vs-round { font-family:'Cinzel',serif; font-size:9px; color:rgba(201,162,39,0.4); letter-spacing:1px; margin-top:2px; }

        /* ── Turn banner ── */
        .ch-turn-banner { display:flex; align-items:center; gap:12px; padding:12px 14px; background:rgba(201,162,39,0.08); border:1px solid rgba(201,162,39,0.2); border-radius:12px; margin-bottom:14px; }
        .ch-turn-name { font-family:'Cinzel',serif; font-size:14px; font-weight:700; color:${C.gold}; }
        .ch-turn-sub  { font-size:12px; color:rgba(240,228,192,0.5); margin-top:2px; }

        /* ── Verse stack grid ── */
        .ch-verse-grid { display:grid; grid-template-columns:repeat(5,1fr); grid-template-rows:1fr 1fr; gap:8px; margin-bottom:20px; width:100%; }
        .ch-vs-card { padding:8px 5px; border-radius:10px; border:1px solid rgba(201,162,39,0.18); background:rgba(201,162,39,0.04); cursor:pointer; text-align:center; transition:all 0.15s; }
        .ch-vs-card:hover, .ch-vs-card.selected { border-color:${C.gold}; background:rgba(212,146,26,0.14); transform:scale(1.03); }
        .ch-vs-ref { font-family:'Cinzel',serif; font-size:9px; color:${C.gold}; line-height:1.3; margin-bottom:4px; font-weight:700; }
        .ch-vs-snippet { font-size:8px; color:rgba(240,228,192,0.4); line-height:1.3; font-style:italic; display:none; }

        /* ── Opponent search ── */
        .ch-opp-row { display:flex; align-items:center; gap:10px; padding:10px 12px; border-radius:10px; background:rgba(201,162,39,0.04); border:1px solid rgba(201,162,39,0.12); }
        .ch-opp-avatar { width:36px; height:36px; border-radius:50%; background:rgba(201,162,39,0.15); display:flex; align-items:center; justify-content:center; font-size:18px; flex-shrink:0; }
        .ch-opp-info { flex:1; }
        .ch-opp-name { font-family:'Cinzel',serif; font-size:13px; color:#e2e8f0; font-weight:700; }
        .ch-opp-meta { font-size:11px; color:rgba(255,255,255,0.35); }
        .ch-opp-challenge-btn { padding:7px 12px; background:linear-gradient(135deg,${C.gold},#a07720); border:none; border-radius:8px; color:#0f172a; font-family:'Cinzel',serif; font-size:11px; font-weight:800; cursor:pointer; white-space:nowrap; }
        .ch-divider-or { display:flex; align-items:center; gap:10px; margin:16px 0; }
        .ch-divider-line { flex:1; height:1px; background:rgba(201,162,39,0.15); }
        .ch-divider-text { font-family:'Cinzel',serif; font-size:9px; color:rgba(201,162,39,0.35); letter-spacing:2px; }
        .ch-search-input { width:100%; padding:11px 14px; background:rgba(0,0,0,0.5); border:1px solid rgba(201,162,39,0.3); border-radius:10px; color:#e2e8f0; font-size:14px; outline:none; margin-bottom:10px; box-sizing:border-box; font-family:'Cinzel',serif; }
        .ch-search-input::placeholder { color:rgba(201,162,39,0.35); }
        .ch-empty-hint { font-size:13px; color:rgba(255,255,255,0.25); font-style:italic; text-align:center; padding:12px; }

        /* ── Accept Challenge ── */
        .ch-ac-avatar { width:72px; height:72px; border-radius:50%; background:rgba(201,162,39,0.15); border:2px solid rgba(201,162,39,0.4); display:flex; align-items:center; justify-content:center; font-size:34px; margin-bottom:14px; box-shadow:0 0 28px rgba(201,162,39,0.25); }
        .ch-ac-level-badge { display:inline-flex; align-items:center; gap:8px; background:rgba(201,162,39,0.12); border:1px solid rgba(201,162,39,0.35); border-radius:50px; padding:8px 20px; margin-bottom:22px; }
        .ch-ac-level-name { font-family:'Cinzel',serif; font-size:14px; font-weight:800; color:${C.gold}; letter-spacing:1px; }
        .ch-ac-pts { font-family:'Cinzel',serif; font-size:14px; font-weight:700; color:#e2e8f0; }
        .ch-ac-verse-card { background:rgba(201,162,39,0.05); border:1px solid rgba(201,162,39,0.15); border-radius:14px; padding:16px 20px; width:100%; max-width:340px; margin-bottom:28px; }
        .ch-ac-verse-text { font-size:15px; font-style:italic; color:rgba(240,228,192,0.8); line-height:1.55; margin:0 0 10px; }
        .ch-ac-verse-ref { font-family:'Cinzel',serif; font-size:11px; font-weight:700; color:rgba(201,162,39,0.55); text-align:right; }
        .ch-verse-label { font-family:'Cinzel',serif; font-size:9px; letter-spacing:2px; color:rgba(201,162,39,0.45); text-transform:uppercase; margin-bottom:8px; }

        /* ── Answer screen ── */
        .ch-answer-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; }
        .ch-challenge-from { font-family:'Cinzel',serif; font-size:12px; color:rgba(201,162,39,0.7); letter-spacing:1px; }
        .ch-pts-badge { background:rgba(212,146,26,0.2); color:${C.gold}; padding:4px 12px; border-radius:20px; font-family:'Cinzel',serif; font-size:12px; font-weight:800; }
        .ch-timer-bar-wrap { width:100%; height:5px; background:rgba(255,255,255,0.08); border-radius:3px; overflow:hidden; margin-bottom:14px; }
        .ch-timer-bar { height:100%; border-radius:3px; transition:width 0.1s linear, background 0.5s; }
        .ch-verse-card { background:rgba(201,162,39,0.05); border:1px solid rgba(201,162,39,0.18); border-radius:14px; padding:16px 20px; margin-bottom:14px; text-align:center; }
        .ch-verse-ornament { font-size:10px; color:rgba(201,162,39,0.35); letter-spacing:8px; margin:6px 0; }
        .ch-verse-body { font-size:14px; line-height:1.7; color:rgba(240,228,192,0.85); font-style:italic; margin:0; }
        .ch-verse-where { font-family:'Cinzel',serif; font-size:10px; letter-spacing:2px; color:rgba(201,162,39,0.5); text-transform:uppercase; margin-top:10px; }
        .ch-papa-hint { width:100%; background:rgba(26,58,92,0.12); border:1px solid rgba(58,189,212,0.3); border-radius:10px; padding:10px 14px; margin-bottom:10px; font-family:'Cinzel',serif; font-size:11px; color:rgba(240,228,192,0.8); letter-spacing:0.5px; animation:chHintIn 0.4s ease; }
        .ch-choices-label { font-family:'Cinzel',serif; font-size:10px; letter-spacing:2px; color:rgba(201,162,39,0.45); text-transform:uppercase; text-align:center; margin-bottom:10px; }
        .ch-choice-btn { display:flex; align-items:center; gap:12px; width:100%; padding:12px 14px; border-radius:10px; cursor:pointer; border:1px solid rgba(201,162,39,0.15); background:rgba(0,0,0,0.45); color:#e2e8f0; text-align:left; transition:all 0.15s; }
        .ch-choice-btn:hover:not(:disabled) { border-color:rgba(201,162,39,0.4); background:rgba(201,162,39,0.08); }
        .ch-choice-btn.correct { border-color:${C.teal}; background:rgba(30,122,140,0.18); box-shadow:0 0 14px rgba(30,122,140,0.3); }
        .ch-choice-btn.wrong   { border-color:${C.red};  background:rgba(192,58,43,0.12); }
        .ch-choice-btn:disabled { cursor:default; }
        .ch-choice-letter { font-family:'Cinzel',serif; font-size:14px; font-weight:800; opacity:0.5; min-width:18px; color:${C.gold}; }
        .ch-choice-text { display:flex; flex-direction:column; gap:2px; }
        .ch-choice-book { font-family:'Cinzel',serif; font-size:13px; font-weight:700; color:#e2e8f0; }
        .ch-choice-ref  { font-size:11px; color:rgba(240,228,192,0.45); }
        .ch-feedback-bar { width:100%; padding:10px 14px; border-radius:10px; text-align:center; font-family:'Cinzel',serif; font-size:13px; font-weight:700; letter-spacing:1px; margin-bottom:10px; }
        .ch-feedback-bar.correct { background:rgba(30,122,140,0.18); color:${C.teal}; border:1px solid rgba(30,122,140,0.4); }
        .ch-feedback-bar.wrong   { background:rgba(192,58,43,0.12); color:${C.red};  border:1px solid rgba(192,58,43,0.3); }

        /* ── Round result ── */
        .ch-round-result-card { width:100%; display:flex; flex-direction:column; align-items:center; text-align:center; padding-bottom:24px; }
        .ch-verse-ref-small { font-family:'Cinzel',serif; font-size:12px; color:${C.gold}; margin-bottom:6px; }
        .ch-verse-body-small { font-size:13px; font-style:italic; color:rgba(240,228,192,0.6); line-height:1.6; margin:0 0 16px; }
        .ch-share-wrap { width:100%; padding:14px 16px; background:rgba(201,162,39,0.06); border:1px solid rgba(201,162,39,0.2); border-radius:12px; margin:16px 0; }
        .ch-share-label { font-family:'Cinzel',serif; font-size:10px; letter-spacing:2px; color:rgba(201,162,39,0.5); text-transform:uppercase; margin-bottom:8px; }
        .ch-share-code { font-family:'Cinzel',serif; font-size:22px; font-weight:900; color:${C.gold}; letter-spacing:4px; cursor:pointer; }
        .ch-share-hint { font-size:11px; color:rgba(201,162,39,0.35); margin-top:4px; }

        /* ── Game complete ── */
        .ch-gc-trophy { font-size:72px; margin-bottom:10px; animation:chTrophyPop 0.5s cubic-bezier(0.34,1.56,0.64,1); }
        .ch-gc-result-banner { font-family:'Cinzel',serif; font-size:16px; font-weight:900; letter-spacing:3px; padding:10px 28px; border-radius:50px; margin:12px auto; display:inline-block; }
        .ch-gc-result-banner.win  { background:rgba(212,146,26,0.2); color:${C.gold}; border:1.5px solid ${C.gold}; }
        .ch-gc-result-banner.draw { background:rgba(58,189,212,0.15); color:${C.tealLight}; border:1.5px solid ${C.tealLight}; }
        .ch-gc-result-banner.loss { background:rgba(192,58,43,0.15); color:${C.red}; border:1.5px solid ${C.red}; }
        .ch-gc-scoreboard { display:flex; align-items:center; justify-content:center; gap:20px; margin:20px 0; }
        .ch-gc-player { display:flex; flex-direction:column; align-items:center; gap:5px; }
        .ch-gc-avatar { font-size:28px; }
        .ch-gc-name { font-family:'Cinzel',serif; font-size:12px; color:rgba(240,228,192,0.7); }
        .ch-gc-score { font-family:'Cinzel',serif; font-size:32px; font-weight:900; color:${C.gold}; }
        .ch-gc-vs { font-family:'Cinzel',serif; font-size:16px; color:rgba(255,255,255,0.2); font-weight:900; }
        .ch-gc-stats { display:flex; gap:12px; justify-content:center; margin-bottom:22px; }
        .ch-gc-stat { background:rgba(201,162,39,0.07); border:1px solid rgba(201,162,39,0.18); border-radius:12px; padding:12px 18px; text-align:center; }
        .ch-gc-stat-val { font-family:'Cinzel',serif; font-size:20px; font-weight:900; color:${C.gold}; }
        .ch-gc-stat-lbl { font-size:10px; color:rgba(201,162,39,0.45); margin-top:4px; letter-spacing:1px; }

        /* ── Shared Buttons ── */
        .ch-btn-primary { width:100%; padding:14px; background:linear-gradient(135deg,${C.gold},#a07720); border:none; border-radius:12px; color:#0f172a; font-family:'Cinzel',serif; font-size:14px; font-weight:800; letter-spacing:2px; text-transform:uppercase; cursor:pointer; transition:all 0.18s; box-shadow:0 4px 18px rgba(212,146,26,0.35); }
        .ch-btn-primary:hover { transform:translateY(-2px); box-shadow:0 7px 26px rgba(212,146,26,0.5); }
        .ch-btn-ghost { width:100%; padding:11px 20px; background:transparent; border:1px solid rgba(201,162,39,0.25); border-radius:10px; color:rgba(201,162,39,0.65); font-family:'Cinzel',serif; font-size:12px; letter-spacing:1px; text-transform:uppercase; cursor:pointer; transition:all 0.15s; }
        .ch-btn-ghost:hover { background:rgba(201,162,39,0.08); color:${C.gold}; }

        @keyframes chHintIn    { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:none } }
        @keyframes chTrophyPop { from { transform:scale(0.4); opacity:0 } to { transform:scale(1); opacity:1 } }
      `}</style>

      {screen === "lobby" && (
        <ScreenLobby
          state={game}
          onNewChallenge={() => setScreen("pick-level-new")}
          onOpenGame={(g) => {
            if (g.currentTurn === "me") {
              setChallenge({ ...DEMO_CHALLENGE, fromName: g.oppName });
              setScreen("accept");
            }
          }}
        />
      )}

      {screen === "pick-level-new" && (
        <ScreenPickLevel
          title="Choose Level" sub="Select your challenge difficulty"
          isRound={false}
          onPick={(lv) => { setLevel(lv); setScreen("verse-stack"); }}
          onBack={() => setScreen("lobby")}
        />
      )}

      {screen === "verse-stack" && (
        <ScreenVerseStack
          level={level}
          onPick={(v) => { setVerse(v); setScreen("select-challenger"); }}
          onBack={() => setScreen("pick-level-new")}
        />
      )}

      {screen === "select-challenger" && (
        <ScreenSelectChallenger
          recentOpps={[{ name:"Brother James" }, { name:"Sister Ruth" }]}
          onChallenge={(opp) => {
            // Simulate challenge sent → round result / waiting screen
            setGame(g => ({ ...g, oppName: opp.name, round: 1, gameCode: "WHAM" + Math.random().toString(36).slice(2,6).toUpperCase() }));
            setResult({ correct:true, verse: verse || DEMO_CHALLENGE.verse, pts: level?.pts || 10 });
            setScreen("round-result");
          }}
          onBack={() => setScreen("verse-stack")}
        />
      )}

      {screen === "accept" && challenge && (
        <ScreenAcceptChallenge
          challenge={challenge}
          onAccept={() => {
            setScreen("answer");
          }}
          onDecline={() => setScreen("lobby")}
        />
      )}

      {screen === "answer" && (
        <ScreenAnswer
          challenge={challenge || DEMO_CHALLENGE}
          game={game}
          onResult={(res) => {
            setResult(res);
            setGame(g => ({ ...g, myScore: g.myScore + (res.correct ? (challenge?.pts || 10) : 0), round: (g.round || 1) + 1 }));
            setScreen("round-result");
          }}
        />
      )}

      {screen === "round-result" && result && (
        <ScreenRoundResult
          result={result}
          game={game}
          onNext={() => {
            if (game.round >= TOTAL_ROUNDS) {
              setScreen("complete");
            } else {
              setScreen("lobby");
            }
          }}
        />
      )}

      {screen === "complete" && (
        <ScreenGameComplete
          game={game}
          onNewBattle={() => { setGame(DEMO_GAME); setScreen("lobby"); }}
          onHome={() => window.location.href = "/"}
        />
      )}
    </div>
  );
}
