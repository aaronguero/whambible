import { useState, useEffect, useRef } from "react";

// ── Asset URLs ──
const LANDSCAPE_BG = "https://media.base44.com/images/public/69df9a909b33058a5ce47831/33b065c94_generated_image.png";
const CHAR_SOLO    = "https://media.base44.com/images/public/69df9a909b33058a5ce47831/b23c98cb8_generated_image.png";
const CHAR_GAMEOVER= "https://media.base44.com/images/public/69df9a909b33058a5ce47831/c5aa4771c_generated_image.png";
const CHAR_PRAYER  = "https://media.base44.com/images/public/69df9a909b33058a5ce47831/a21cde22c_generated_image.png";

const C = {
  cobalt:    "#1A3A5C",
  cobaltDark:"#0D1F35",
  teal:      "#1E7A8C",
  tealLight: "#3ABDD4",
  gold:      "#D4921A",
  goldLight: "#F5C842",
  white:     "#FFFFFF",
  offWhite:  "#F4F0E8",
  terra:     "#C05A2A",
  emerald:   "#1A7A4A",
  red:       "#C0392B",
};

// ── Sample Verse Pool ──
const VERSES = [
  { ref:"John 3:16",    book:"John",    ch:3,  vs:16, text:"For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life." },
  { ref:"Psalm 23:1",   book:"Psalms",  ch:23, vs:1,  text:"The Lord is my shepherd; I shall not want." },
  { ref:"Romans 8:28",  book:"Romans",  ch:8,  vs:28, text:"And we know that in all things God works for the good of those who love him, who have been called according to his purpose." },
  { ref:"Proverbs 3:5", book:"Proverbs",ch:3,  vs:5,  text:"Trust in the Lord with all your heart and lean not on your own understanding." },
  { ref:"Isaiah 40:31", book:"Isaiah",  ch:40, vs:31, text:"But those who hope in the Lord will renew their strength. They will soar on wings like eagles; they will run and not grow weary, they will walk and not be faint." },
  { ref:"Jeremiah 29:11",book:"Jeremiah",ch:29,vs:11, text:"For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, plans to give you hope and a future." },
  { ref:"Philippians 4:13",book:"Philippians",ch:4,vs:13, text:"I can do all this through him who gives me strength." },
  { ref:"Matthew 5:9",  book:"Matthew", ch:5,  vs:9,  text:"Blessed are the peacemakers, for they will be called children of God." },
  { ref:"Psalm 46:1",   book:"Psalms",  ch:46, vs:1,  text:"God is our refuge and strength, an ever-present help in trouble." },
  { ref:"John 14:6",    book:"John",    ch:14, vs:6,  text:"Jesus answered, 'I am the way and the truth and the life. No one comes to the Father except through me.'" },
];

const LEVELS = [
  { pts:5,  name:"Squire",   icon:"🗡️",  color:"#1E7A8C", hint:10 },
  { pts:10, name:"Warrior",  icon:"⚔️",  color:"#D4921A", hint:13 },
  { pts:15, name:"Knight",   icon:"🛡️",  color:"#C05A2A", hint:15 },
  { pts:20, name:"Champion", icon:"👑",  color:"#7B2D8B", hint:17 },
];

const BOOKS = ["Genesis","Exodus","Leviticus","Numbers","Deuteronomy","Joshua","Judges","Ruth","1 Samuel","2 Samuel","1 Kings","2 Kings","1 Chronicles","2 Chronicles","Ezra","Nehemiah","Esther","Job","Psalms","Proverbs","Ecclesiastes","Song of Solomon","Isaiah","Jeremiah","Lamentations","Ezekiel","Daniel","Hosea","Joel","Amos","Obadiah","Jonah","Micah","Nahum","Habakkuk","Zephaniah","Haggai","Zechariah","Malachi","Matthew","Mark","Luke","John","Acts","Romans","1 Corinthians","2 Corinthians","Galatians","Ephesians","Philippians","Colossians","1 Thessalonians","2 Thessalonians","1 Timothy","2 Timothy","Titus","Philemon","Hebrews","James","1 Peter","2 Peter","1 John","2 John","3 John","Jude","Revelation"];

function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5); }

function makeOptions(verse) {
  const correct = { book: verse.book, ch: verse.ch, vs: verse.vs };
  const wrong = shuffle(
    BOOKS.filter(b => b !== verse.book).slice(0, 3).map((b, i) => ({
      book: b,
      ch: Math.floor(Math.random() * 20) + 1,
      vs: Math.floor(Math.random() * 30) + 1,
    }))
  );
  return shuffle([correct, ...wrong]).map(o => `${o.book} ${o.ch}:${o.vs}`);
}

// ── SCREEN: Level Select ──
function LevelSelect({ onSelect }) {
  return (
    <div className="wb-screen">
      <div className="wb-bg-land" />
      <div className="wb-bg-char" style={{ backgroundImage: `url('${CHAR_PRAYER}')` }} />
      <div className="wb-bg-tone" />
      <div className="wb-bg-rim" />
      <div className="wb-content">
        <div className="wb-hero-space" style={{ height: 370 }} />
        <div className="wb-scroll-panel">
          <div className="wb-scroll-curl" />
          <p className="wb-tagline">⚔️ Choose Your Challenge ⚔️</p>
          <div style={{ width:"100%", display:"flex", flexDirection:"column", gap:10, marginBottom:20 }}>
            {LEVELS.map(lv => (
              <button key={lv.pts} onClick={() => onSelect(lv)}
                style={{
                  width:"100%", padding:"16px 20px", borderRadius:10, border:"none",
                  background:`linear-gradient(135deg, ${lv.color}dd, ${lv.color}88)`,
                  color:"#fff", cursor:"pointer", textAlign:"left",
                  fontFamily:"'Cinzel',serif", display:"flex", alignItems:"center", gap:14,
                  boxShadow:`0 4px 18px ${lv.color}44`, transition:"all 0.18s",
                }}>
                <span style={{ fontSize:28 }}>{lv.icon}</span>
                <div>
                  <div style={{ fontSize:16, fontWeight:800, letterSpacing:2 }}>{lv.name}</div>
                  <div style={{ fontSize:11, opacity:0.85, letterSpacing:1 }}>{lv.pts} pts per verse</div>
                </div>
                <div style={{ marginLeft:"auto", fontSize:22, fontWeight:800, color: C.goldLight }}>
                  {lv.pts}
                </div>
              </button>
            ))}
          </div>
          <button className="wb-btn-ghost" onClick={() => window.location.href = "/"}>← Home</button>
          <div style={{ height:30 }} />
        </div>
      </div>
    </div>
  );
}

// ── SCREEN: Game Play ──
function GamePlay({ level, onDone }) {
  const queue = useRef(shuffle(VERSES).slice(0, 5).map(v => ({ ...v, options: makeOptions(v) })));
  const [idx, setIdx]         = useState(0);
  const [score, setScore]     = useState(0);
  const [timeLeft, setTime]   = useState(20);
  const [answered, setAnswered] = useState(false);
  const [chosen, setChosen]   = useState(null);
  const [results, setResults] = useState([]);
  const [showHint, setShowHint] = useState(false);
  const [whamSlam, setWhamSlam] = useState(false);
  const [whamCorrect, setWhamCorrect] = useState(true);
  const timerRef   = useRef(null);
  const hintRef    = useRef(null);
  const answeredRef = useRef(false); // ← live ref so timer always reads current value

  const verse = queue.current[idx];
  const correctAnswer = `${verse.book} ${verse.ch}:${verse.vs}`;

  useEffect(() => {
    answeredRef.current = false;
    setTime(20); setAnswered(false); setChosen(null); setShowHint(false);
    timerRef.current = setInterval(() => {
      setTime(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          if (!answeredRef.current) handleAnswer(null); // safe — reads live ref
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    hintRef.current = setTimeout(() => setShowHint(true), (20 - level.hint) * 1000);
    return () => { clearInterval(timerRef.current); clearTimeout(hintRef.current); };
  }, [idx]);

  function handleAnswer(opt) {
    if (answeredRef.current) return; // guard against double-fire
    answeredRef.current = true;
    clearInterval(timerRef.current);
    clearTimeout(hintRef.current);
    setAnswered(true);
    setChosen(opt);
    const correct = opt === correctAnswer;
    const pts = correct ? level.pts : 0;
    setWhamCorrect(correct);
    setWhamSlam(true);
    // Use functional updaters so closures always get fresh state
    setScore(prevScore => {
      const newScore = prevScore + (correct ? pts : 0);
      setResults(prevResults => {
        const newResults = [...prevResults, { correct, ref: verse.ref }];
        setTimeout(() => {
          setWhamSlam(false);
          setTimeout(() => {
            if (idx + 1 >= queue.current.length) {
              onDone({ score: newScore, results: newResults });
            } else { setIdx(i => i + 1); }
          }, 300);
        }, correct ? 1400 : 900);
        return newResults;
      });
      return newScore;
    });
  }

  const timerPct = (timeLeft / 20) * 100;
  const timerColor = timeLeft > 10 ? C.teal : timeLeft > 5 ? C.gold : C.red;

  return (
    <div className="wb-screen">
      <div className="wb-bg-land" />
      <div className="wb-bg-char" style={{ backgroundImage: `url('${CHAR_SOLO}')` }} />
      <div className="wb-bg-tone" />
      <div className="wb-bg-rim" />

      {/* WHAM SLAM overlay */}
      {whamSlam && (
        <div className="wb-wham-slam" style={{ background: whamCorrect ? "rgba(212,146,26,0.92)" : "rgba(192,58,43,0.88)" }}>
          <div className="wb-wham-text">{whamCorrect ? "WHAM!" : "MISSED"}</div>
          <div className="wb-wham-sub">{whamCorrect ? `+${level.pts} pts · ${verse.ref}` : `It was ${verse.ref}`}</div>
        </div>
      )}

      <div className="wb-content">
        {/* Top bar */}
        <div style={{ width:"100%", display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 0 6px" }}>
          <button onClick={() => window.location.href = "/"} style={{
            background:`${C.teal}80`, border:"none", cursor:"pointer",
            width:44, height:44, borderRadius:10,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:22, lineHeight:1,
            boxShadow:`0 2px 8px ${C.teal}66`,
          }} title="Exit to Home">⚔️</button>
          <div style={{ fontFamily:"'Cinzel',serif", fontSize:16, fontWeight:800, color:C.gold }}>
            {score} pts
          </div>
          <div style={{
            fontFamily:"'Cinzel',serif", fontSize:22, color:level.color, letterSpacing:1, opacity:1,
            background:`${C.gold}80`, borderRadius:20,
            padding:"4px 14px", display:"inline-flex", alignItems:"center", gap:6,
            boxShadow:`0 2px 8px ${C.gold}44`,
          }}>
            {level.icon} {level.name}
          </div>
        </div>

        {/* Progress dots */}
        <div style={{ display:"flex", gap:6, marginBottom:10 }}>
          {queue.current.map((_, i) => (
            <div key={i} style={{
              width:10, height:10, borderRadius:"50%",
              background: i < idx ? (results[i]?.correct ? C.teal : C.red)
                        : i === idx ? C.gold : "rgba(26,58,92,0.2)",
              transition:"all 0.3s",
            }} />
          ))}
        </div>

        <div className="wb-hero-space" style={{ height: 269 }} />

        <div className="wb-scroll-panel">
          <div className="wb-scroll-curl" />

          {/* Timer bar */}
          <div style={{ width:"100%", height:5, background:"rgba(26,58,92,0.1)", borderRadius:3, marginBottom:14, overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${timerPct}%`, background:timerColor, borderRadius:3, transition:"width 1s linear, background 0.5s" }} />
          </div>
          <div style={{ textAlign:"right", fontSize:11, fontFamily:"'Cinzel',serif", color:timerColor, marginTop:-12, marginBottom:10 }}>
            {timeLeft}s
          </div>

          {/* Verse */}
          <div className="wb-verse-card">
            <div className="wb-verse-label">📜 Know This Verse</div>
            <p className="wb-verse-text">"{verse.text}"</p>
          </div>

          {/* Papa hint */}
          {showHint && !answered && (
            <div style={{
              width:"100%", boxSizing:"border-box",
              background:"rgba(26,58,92,0.06)", border:`1px solid ${C.teal}44`,
              borderRadius:10, padding:"10px 14px", marginBottom:10,
              fontFamily:"'Cinzel',serif", fontSize:11, color:C.cobalt, letterSpacing:0.5,
              animation:"wb-hint-in 0.4s ease", overflowWrap:"break-word", wordBreak:"break-word",
            }}>
              💡 <strong>Papa says:</strong> This verse is from <em>{verse.book}</em>, chapter {verse.ch}.
            </div>
          )}

          {/* Options */}
          <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:16 }}>
            {verse.options.map((opt, i) => {
              const isCorrect = opt === correctAnswer;
              const isChosen  = opt === chosen;
              let bg = "rgba(255,255,255,0.7)";
              let border = `1.5px solid rgba(26,58,92,0.18)`;
              let color = C.cobaltDark;
              if (answered) {
                if (isCorrect) { bg = `${C.teal}22`; border = `2px solid ${C.teal}`; color = C.teal; }
                else if (isChosen) { bg = `${C.red}11`; border = `2px solid ${C.red}`; color = C.red; }
              }
              return (
                <button key={i} onClick={() => handleAnswer(opt)} disabled={answered}
                  style={{
                    width:"100%", padding:"13px 16px", borderRadius:10, cursor: answered ? "default" : "pointer",
                    background:bg, border, color, fontFamily:"'Cinzel',serif",
                    fontSize:13, fontWeight:600, textAlign:"left", transition:"all 0.2s",
                    display:"flex", alignItems:"center", gap:12,
                    boxShadow: answered && isCorrect ? `0 0 16px ${C.teal}44` : "none",
                  }}>
                  <span style={{ fontWeight:800, fontSize:15, opacity:1, minWidth:18 }}>
                    {["A","B","C","D"][i]}
                  </span>
                  {opt}
                  {answered && isCorrect && <span style={{ marginLeft:"auto" }}>✓</span>}
                  {answered && isChosen && !isCorrect && <span style={{ marginLeft:"auto" }}>✗</span>}
                </button>
              );
            })}
          </div>
          <div style={{ height:20 }} />
        </div>
      </div>
    </div>
  );
}

// ── SCREEN: Game Over ──
function GameOver({ score, results, level, onReplay, onHome }) {
  const total   = results.length * level.pts;
  const correct = results.filter(r => r.correct).length;
  const pct     = Math.round((correct / results.length) * 100);
  const rank    = score >= 700 ? "Champion 👑" : score >= 300 ? "Knight 🛡️" : score >= 100 ? "Warrior ⚔️" : score >= 1 ? "Squire 🗡️" : "Scribe 📜";

  return (
    <div className="wb-screen">
      <div className="wb-bg-land" />
      <div className="wb-bg-char" style={{ backgroundImage: `url('${CHAR_GAMEOVER}')` }} />
      <div className="wb-bg-tone" />
      <div className="wb-bg-rim" />
      <div className="wb-content">
        <div className="wb-hero-space" style={{ height: 336 }} />
        <div className="wb-scroll-panel">
          <div className="wb-scroll-curl" />
          <p className="wb-tagline" style={{ fontSize:"1rem", marginBottom:4 }}>
            {pct >= 80 ? "⚔️ Victory!" : pct >= 50 ? "📜 Well Fought!" : "🙏 Keep Studying"}
          </p>
          <p style={{ fontFamily:"'Cinzel',serif", fontSize:11, color:C.teal, letterSpacing:2, textAlign:"center", marginBottom:18, textTransform:"uppercase" }}>
            {rank}
          </p>

          {/* Score ring */}
          <div style={{ textAlign:"center", margin:"0 auto 20px", width:120, height:120, borderRadius:"50%",
            background:`conic-gradient(${C.gold} ${pct}%, rgba(26,58,92,0.1) 0%)`,
            display:"flex", alignItems:"center", justifyContent:"center",
            boxShadow:`0 0 28px ${C.gold}44`, position:"relative" }}>
            <div style={{ width:90, height:90, borderRadius:"50%", background:C.offWhite,
              display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
              <div style={{ fontFamily:"'Cinzel',serif", fontSize:28, fontWeight:800, color:C.gold }}>{score}</div>
              <div style={{ fontFamily:"'Cinzel',serif", fontSize:9, color:C.cobalt, letterSpacing:1 }}>POINTS</div>
            </div>
          </div>

          {/* Results breakdown */}
          <div style={{ width:"100%", display:"flex", gap:8, marginBottom:16 }}>
            {results.map((r, i) => (
              <div key={i} style={{ flex:1, padding:"10px 6px", borderRadius:8, textAlign:"center",
                background: r.correct ? `${C.teal}18` : `${C.red}12`,
                border: `1.5px solid ${r.correct ? C.teal : C.red}44` }}>
                <div style={{ fontSize:16 }}>{r.correct ? "✓" : "✗"}</div>
                <div style={{ fontFamily:"'Cinzel',serif", fontSize:8, color:C.cobalt, marginTop:3, opacity:0.7 }}>
                  {r.ref.split(" ").slice(-1)[0]}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap:10, width:"100%", marginBottom:20 }}>
            <button className="wb-btn-primary" onClick={onReplay}>⚔️ Play Again</button>
            <button className="wb-btn-secondary" onClick={onHome}>🏠 Home</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── ROOT ──
export default function SoloGame() {
  const [screen, setScreen] = useState("level");  // level | game | gameover
  const [level,  setLevel]  = useState(null);
  const [gameResult, setGameResult] = useState(null);

  return (
    <div style={{ minHeight:"100vh", background:C.cobaltDark, fontFamily:"'Georgia',serif", overflowX:"hidden", position:"relative" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;800&display=swap');

        .wb-screen { min-height:100vh; position:relative; overflow-y:auto; overflow-x:hidden; }

        .wb-bg-land {
          position:fixed; inset:0; z-index:0; pointer-events:none;
          background-image: url('${LANDSCAPE_BG}');
          background-size:cover; background-position:center top; opacity:1;
          
          
        }
        .wb-bg-char {
          position:fixed; inset:0; z-index:1; pointer-events:none;
          background-size:80% auto; background-position:center 6%; background-repeat:no-repeat; opacity:1;
          
          
        }
        .wb-bg-tone {
          position:fixed; inset:0; z-index:2; pointer-events:none;
          display: none;
        }
        .wb-bg-rim {
          position:fixed; inset:0; z-index:3; pointer-events:none;
          background: radial-gradient(ellipse at 50% -10%, rgba(245,200,66,0.20) 0%, transparent 55%);
        }
        .wb-content {
          position:relative; z-index:4; max-width:480px; margin:0 auto;
          padding:0 16px 40px; display:flex; flex-direction:column; align-items:center;
        }
        .wb-hero-space { width:100%; }
        .wb-scroll-panel {
          width:100%;
          background: transparent;
          border-radius:20px 20px 0 0; padding:24px 20px 60px; position:relative; z-index:5; margin-top:-56px;
          overflow-y:auto; -webkit-overflow-scrolling:touch;
        }
        .wb-scroll-curl {
          width:80%; height:5px; margin:0 auto 16px; border-radius:3px;
          background: linear-gradient(90deg, transparent, ${C.gold}, ${C.teal}, ${C.gold}, transparent);
          opacity:0.5;
        }
        .wb-tagline {
          font-family:'Cinzel',serif; font-size:0.78rem; letter-spacing:0.16em;
          color:${C.cobalt}; text-transform:uppercase; text-align:center; margin:0 0 16px; opacity:0.85;
        }
        .wb-verse-card {
          width:100%; box-sizing:border-box;
          background:linear-gradient(135deg, rgba(26,58,92,0.07) 0%, rgba(30,122,140,0.05) 100%);
          border:1.5px solid rgba(30,122,140,0.30); border-radius:12px; padding:16px 20px;
          box-shadow:0 3px 16px rgba(26,58,92,0.08), inset 0 1px 0 rgba(255,255,255,0.7); margin-bottom:14px;
          overflow:hidden;
        }
        .wb-verse-label { color:${C.teal}; font-size:10px; letter-spacing:2px; text-transform:uppercase; margin-bottom:8px; font-family:'Cinzel',serif; font-weight:600; word-break:break-word; }
        .wb-verse-text  { color:${C.cobaltDark}; font-size:13px; line-height:1.7; font-style:italic; margin:0; overflow-wrap:break-word; word-break:break-word; }
        .wb-btn-primary {
          width:100%; padding:15px 24px;
          background:linear-gradient(135deg, ${C.gold} 0%, #b87614 50%, ${C.gold} 100%);
          background-size:200% 100%; border:none; border-radius:10px;
          color:#fff; font-size:15px; font-weight:700; font-family:'Cinzel',serif;
          letter-spacing:3px; text-transform:uppercase; cursor:pointer; transition:all 0.2s;
          box-shadow:0 4px 20px rgba(212,146,26,0.38);
        }
        .wb-btn-secondary {
          width:100%; padding:13px 24px; background:${C.teal}; border:none; border-radius:10px;
          color:#fff; font-size:14px; font-weight:700; font-family:'Cinzel',serif;
          letter-spacing:2px; text-transform:uppercase; cursor:pointer; transition:all 0.2s;
          box-shadow:0 3px 14px rgba(30,122,140,0.35);
        }
        .wb-btn-ghost {
          width:100%; padding:11px 24px; background:rgba(26,58,92,0.07);
          border:1.5px solid rgba(26,58,92,0.20); border-radius:10px; color:${C.cobalt};
          font-size:13px; font-family:'Cinzel',serif; letter-spacing:1px; text-transform:uppercase;
          cursor:pointer; transition:all 0.18s;
        }
        .wb-wham-slam {
          position:fixed; inset:0; z-index:99; display:flex; flex-direction:column;
          align-items:center; justify-content:center; backdrop-filter:blur(6px);
          animation:wham-in 0.15s ease;
        }
        .wb-wham-text {
          font-family:'Cinzel',serif; font-size:72px; font-weight:800; color:#fff;
          text-shadow:0 4px 30px rgba(0,0,0,0.4); letter-spacing:6px;
          animation:wham-pop 0.4s cubic-bezier(0.34,1.56,0.64,1);
        }
        .wb-wham-sub {
          font-family:'Cinzel',serif; font-size:14px; color:rgba(255,255,255,0.9);
          letter-spacing:2px; margin-top:8px; text-transform:uppercase;
        }
        @keyframes wham-in  { from { opacity:0 } to { opacity:1 } }
        @keyframes wham-pop { from { transform:scale(0.4); opacity:0 } to { transform:scale(1); opacity:1 } }
        @keyframes wb-hint-in { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:none } }
      `}</style>

      {screen === "level" && (
        <LevelSelect onSelect={(lv) => { setLevel(lv); setScreen("game"); }} />
      )}
      {screen === "game" && level && (
        <GamePlay level={level} onDone={(result) => { setGameResult(result); setScreen("gameover"); }} />
      )}
      {screen === "gameover" && (
        <GameOver
          score={gameResult.score}
          results={gameResult.results}
          level={level}
          onReplay={() => { setScreen("level"); setGameResult(null); }}
          onHome={() => window.location.href = "/"}
        />
      )}
    </div>
  );
}
