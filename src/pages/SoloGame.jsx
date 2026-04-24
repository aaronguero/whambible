import { useState, useEffect, useRef } from "react";

// ── Asset URLs ──
const LANDSCAPE_BG  = "https://media.base44.com/images/public/69df9a909b33058a5ce47831/33b065c94_generated_image.png";
const CHAR_SOLO     = "https://media.base44.com/images/public/69df9a909b33058a5ce47831/b23c98cb8_generated_image.png";
const CHAR_GAMEOVER = "https://media.base44.com/images/public/69df9a909b33058a5ce47831/c5aa4771c_generated_image.png";
const CHAR_PRAYER   = "https://media.base44.com/images/public/69df9a909b33058a5ce47831/a21cde22c_generated_image.png";
const WHAM_AUDIO = "https://media.base44.com/videos/public/69c40c6701d9dfdb1df69d2b/5d143ab80_51a54c36d_wham-slam-voice1.webm";
const WHAM_CHARS    = "https://media.base44.com/images/public/69df9a909b33058a5ce47831/85be9d10e_generated_image.png";
// WHAM_TEXT_IMG retired — replaced by pure CSS text (no background dependency)

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
  { ref:"John 3:16",        book:"John",        ch:3,  vs:16, text:"For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life." },
  { ref:"Psalm 23:1",       book:"Psalms",       ch:23, vs:1,  text:"The Lord is my shepherd; I shall not want." },
  { ref:"Romans 8:28",      book:"Romans",       ch:8,  vs:28, text:"And we know that in all things God works for the good of those who love him, who have been called according to his purpose." },
  { ref:"Proverbs 3:5",     book:"Proverbs",     ch:3,  vs:5,  text:"Trust in the Lord with all your heart and lean not on your own understanding." },
  { ref:"Isaiah 40:31",     book:"Isaiah",       ch:40, vs:31, text:"But those who hope in the Lord will renew their strength. They will soar on wings like eagles; they will run and not grow weary, they will walk and not be faint." },
  { ref:"Jeremiah 29:11",   book:"Jeremiah",     ch:29, vs:11, text:"For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, plans to give you hope and a future." },
  { ref:"Philippians 4:13", book:"Philippians",  ch:4,  vs:13, text:"I can do all this through him who gives me strength." },
  { ref:"Matthew 5:9",      book:"Matthew",      ch:5,  vs:9,  text:"Blessed are the peacemakers, for they will be called children of God." },
  { ref:"Psalm 46:1",       book:"Psalms",       ch:46, vs:1,  text:"God is our refuge and strength, an ever-present help in trouble." },
  { ref:"John 14:6",        book:"John",         ch:14, vs:6,  text:"Jesus answered, 'I am the way and the truth and the life. No one comes to the Father except through me.'" },
];

const LEVELS = [
  { pts:5,  name:"Squire",   icon:"🗡️", color:"#1E7A8C", hint:10 },
  { pts:10, name:"Warrior",  icon:"⚔️", color:"#D4921A", hint:13 },
  { pts:15, name:"Knight",   icon:"🛡️", color:"#C05A2A", hint:15 },
  { pts:20, name:"Champion", icon:"👑", color:"#7B2D8B", hint:17 },
];

const BOOKS = ["Genesis","Exodus","Leviticus","Numbers","Deuteronomy","Joshua","Judges","Ruth","1 Samuel","2 Samuel","1 Kings","2 Kings","1 Chronicles","2 Chronicles","Ezra","Nehemiah","Esther","Job","Psalms","Proverbs","Ecclesiastes","Song of Solomon","Isaiah","Jeremiah","Lamentations","Ezekiel","Daniel","Hosea","Joel","Amos","Obadiah","Jonah","Micah","Nahum","Habakkuk","Zephaniah","Haggai","Zechariah","Malachi","Matthew","Mark","Luke","John","Acts","Romans","1 Corinthians","2 Corinthians","Galatians","Ephesians","Philippians","Colossians","1 Thessalonians","2 Thessalonians","1 Timothy","2 Timothy","Titus","Philemon","Hebrews","James","1 Peter","2 Peter","1 John","2 John","3 John","Jude","Revelation"];

function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5); }

function makeOptions(verse) {
  const correct = { book: verse.book, ch: verse.ch, vs: verse.vs };
  const wrong = shuffle(
    BOOKS.filter(b => b !== verse.book).slice(0, 3).map(b => ({
      book: b,
      ch: Math.floor(Math.random() * 20) + 1,
      vs: Math.floor(Math.random() * 30) + 1,
    }))
  );
  return shuffle([correct, ...wrong]).map(o => `${o.book} ${o.ch}:${o.vs}`);
}

// ══════════════════════════════════════════════════════════════════
// ── WHAM SLAM ────────────────────────────────────────────────────
//
// Universal correct-answer celebration. 4-layer cinematic sequence.
//
// PHASE TIMELINE:
//   Phase 0 │   0ms –  140ms │ WHITE FLASH full screen only
//   Phase 1 │ 140ms –  500ms │ Characters materialize bottom→top
//   Phase 2 │ 500ms –  800ms │ Ball lightning orb drops in ON TOP of chars at knee height
//   Phase 3 │ 800ms – 1400ms │ WHAM CSS text explodes from orb, rubber-band expand
//   Phase 4 │1400ms – 1750ms │ Full fade out
//   onDone  │ 1750ms          │ Fires — round advances
//
// z-index stack (bottom→top):
//   cobalt bg (1) → characters (2) → orb + smoke (3) → WHAM text (4)
//
// WHAM text is pure CSS — gold gradient + layered text-shadow lightning.
// No image asset. No background. Works on any surface.
//
// Props:
//   message  {string} — shown under WHAM text (e.g. "+5")
//   onDone   {fn}     — fires when sequence completes
// ══════════════════════════════════════════════════════════════════

function playWhamSound(audioRef) {
  try {
    if (audioRef && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  } catch(e) {}
}

function WhamSlam({ message = "+5", onDone }) {
  const [phase, setPhase] = useState(0);
  const audioRef = useRef(null);

  // Pre-warm audio on mount so it fires instantly at t=0
  useEffect(() => {
    audioRef.current = new Audio(WHAM_AUDIO);
    audioRef.current.preload = "auto";
    audioRef.current.volume = 1.0;
    audioRef.current.load();
  }, []);

  useEffect(() => {
    playWhamSound(audioRef);  // fires at t=0 — phase 0 (white flash)
    const t1 = setTimeout(() => setPhase(1), 140);   // chars materialize
    const t2 = setTimeout(() => setPhase(2), 500);   // orb drops in
    const t3 = setTimeout(() => setPhase(3), 800);   // WHAM text explodes
    const t4 = setTimeout(() => setPhase(4), 1400);  // fade out
    const t5 = setTimeout(() => onDone && onDone(), 1750);
    return () => { [t1,t2,t3,t4,t5].forEach(clearTimeout); };
  }, []);

  const exiting = phase === 4;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 999, overflow: "hidden",
      background: phase === 0 ? "#FFFFFF" : "#0D1F35",
      opacity: exiting ? 0 : 1,
      transition: exiting ? "opacity 0.35s ease" : phase === 0 ? "background 0.2s ease" : "background 0.25s ease",
    }}>

      {/* ── LAYER 1 (z:2): Characters ── */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none",
        clipPath: phase === 0 ? "inset(100% 0 0 0)" : "inset(0% 0 0 0)",
        transition: phase === 1 ? "clip-path 0.72s cubic-bezier(0.22, 1, 0.36, 1)" : "none",
        opacity: exiting ? 0 : 1,
        ...(exiting && { transition: "opacity 0.35s ease" }),
      }}>
        <img src={WHAM_CHARS} alt="" style={{
          position: "absolute", bottom: 0, left: "50%",
          transform: "translateX(-50%)",
          width: "100vw", maxWidth: 680, minWidth: 320,
          objectFit: "contain", objectPosition: "bottom center",
        }} />
      </div>

      {/* ── LAYER 2 (z:3): Ball lightning orb + smoke ── */}
      {phase >= 2 && (
        <div style={{
          position: "absolute", left: "50%", top: "27%",
          transform: "translate(-50%, -50%)",
          width: 300, height: 140, borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(180,220,255,0.15) 0%, rgba(91,200,255,0.07) 45%, transparent 72%)",
          filter: "blur(22px)", zIndex: 3, pointerEvents: "none",
          opacity: exiting ? 0 : 0.95,
          transition: exiting ? "opacity 0.35s ease" : "opacity 0.4s ease",
          animation: "wb-smoke-drift 1.4s ease-in-out infinite alternate",
        }} />
      )}

      <div style={{
        position: "absolute", left: "50%", top: "27%",
        transform: "translate(-50%, -50%)",
        width:  phase < 2 ? 0 : phase === 2 ? 120 : phase === 3 ? 100 : 80,
        height: phase < 2 ? 0 : phase === 2 ? 120 : phase === 3 ? 100 : 80,
        borderRadius: "50%",
        background: phase < 2 ? "transparent"
          : "radial-gradient(circle, #FFFFFF 0%, #c8eeff 20%, #5bc8ff 40%, rgba(30,122,140,0.45) 60%, transparent 80%)",
        boxShadow: phase < 2 ? "none"
          : "0 0 50px 24px rgba(91,200,255,0.75), 0 0 100px 50px rgba(30,122,140,0.35), 0 0 8px 4px #fff",
        zIndex: 3, pointerEvents: "none",
        transition: phase === 2
          ? "width 0.35s cubic-bezier(0.34,1.56,0.64,1), height 0.35s cubic-bezier(0.34,1.56,0.64,1), background 0.3s ease, box-shadow 0.3s ease"
          : "all 0.3s ease",
        animation: (phase === 2 || phase === 3) ? "wb-orb-pulse 0.55s ease-in-out infinite alternate" : "none",
      }} />

      {/* ── LAYER 3 (z:4): WHAM — pure CSS text, no image, no background ── */}
      <div style={{
        position: "absolute",
        left: "50%",
        top: "30%",
        transform: `translate(-50%, -50%) scale(${phase < 3 ? 0 : phase === 3 ? 1.0 : 0.9})`,
        transformOrigin: "center 215%",
        zIndex: 4, pointerEvents: "none",
        opacity: phase < 3 ? 0 : exiting ? 0 : 1,
        transition: phase === 3
          ? "transform 0.42s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.12s ease"
          : "transform 0.25s ease, opacity 0.35s ease",
        textAlign: "center",
      }}>
        {/* CSS WHAM text — gold gradient + lightning glow shadows */}
        <div style={{
          fontFamily: "'Cinzel', serif",
          fontSize: "clamp(72px, 22vw, 120px)",
          fontWeight: 900,
          letterSpacing: "0.06em",
          lineHeight: 1,
          // Gold gradient fill via background-clip
          background: "linear-gradient(160deg, #fff8c0 0%, #F5C842 25%, #D4921A 55%, #F5C842 75%, #b87614 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          // Lightning glow via layered text-shadow
          // (text-shadow doesn't apply to gradient text in all browsers,
          //  so we use filter: drop-shadow instead — works perfectly)
          filter: phase === 3
            ? [
                "drop-shadow(0 0 6px rgba(255,255,255,0.95))",
                "drop-shadow(0 0 18px rgba(245,200,66,1))",
                "drop-shadow(0 0 40px rgba(245,200,66,0.85))",
                "drop-shadow(0 0 70px rgba(91,200,255,0.7))",
                "drop-shadow(0 0 120px rgba(30,122,140,0.5))",
              ].join(" ")
            : "drop-shadow(0 0 8px rgba(245,200,66,0.4))",
          transition: "filter 0.3s ease",
          animation: phase === 3 ? "wb-wham-flicker 0.25s step-end 3" : "none",
          userSelect: "none",
        }}>
          WHAM
        </div>

        {/* "+5" message */}
        <div style={{
          fontFamily: "'Cinzel', serif",
          fontSize: 26,
          fontWeight: 800,
          letterSpacing: 8,
          color: "#F5C842",
          textShadow: "0 0 24px rgba(245,200,66,0.9), 0 0 48px rgba(245,200,66,0.5)",
          marginTop: 10,
          opacity: phase === 3 ? 1 : 0,
          transform: phase === 3 ? "translateY(0)" : "translateY(10px)",
          transition: "opacity 0.3s ease 0.18s, transform 0.3s ease 0.18s",
          textTransform: "uppercase",
        }}>
          {message}
        </div>

        {/* Gold divider */}
        <div style={{
          width: phase === 3 ? 110 : 0,
          height: 1,
          background: "linear-gradient(90deg, transparent, rgba(245,200,66,0.75), transparent)",
          margin: "10px auto 0",
          transition: "width 0.4s ease 0.22s",
        }} />
      </div>

      {/* ── Electric arc screen flicker (phases 2–3) ── */}
      {(phase === 2 || phase === 3) && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 5, pointerEvents: "none",
          animation: "wb-electric-flicker 0.2s step-end infinite",
          opacity: 0.05, mixBlendMode: "screen", background: "transparent",
        }} />
      )}

      <style>{`
        @keyframes wb-orb-pulse {
          from { box-shadow: 0 0 50px 24px rgba(91,200,255,0.75), 0 0 100px 50px rgba(30,122,140,0.35), 0 0 8px 4px #fff; }
          to   { box-shadow: 0 0 70px 34px rgba(91,200,255,0.95), 0 0 130px 65px rgba(30,122,140,0.5),  0 0 12px 6px #fff; }
        }
        @keyframes wb-smoke-drift {
          from { transform: translate(-50%, -50%) scaleX(1.0)  scaleY(1.0);  opacity: 0.8; }
          to   { transform: translate(-50%, -53%) scaleX(1.15) scaleY(0.85); opacity: 0.55; }
        }
        @keyframes wb-electric-flicker {
          0%  { background: rgba(180,230,255,0.0); }
          20% { background: rgba(180,230,255,0.09); }
          40% { background: rgba(180,230,255,0.0); }
          70% { background: rgba(245,200,66,0.05); }
          100%{ background: rgba(180,230,255,0.0); }
        }
        @keyframes wb-wham-flicker {
          0%   { opacity: 1; }
          33%  { opacity: 0.7; }
          66%  { opacity: 1; }
          100% { opacity: 0.85; }
        }
      `}</style>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════
// ── STREAK FLASH ──────────────────────────────────────────────────
//
// Fires after 3 consecutive correct answers. +5 fixed bonus.
// Battle-style cinematic: sword-clash characters, gold sparks, +5 at contact.
// Total runtime: 900ms. Then onDone fires.
//
// PHASE TIMELINE:
//   Phase 0 │   0ms – 120ms │ White-gold flash
//   Phase 1 │ 120ms – 400ms │ WHAM_CHARS slide in from both sides
//   Phase 2 │ 400ms – 650ms │ "+5 STREAK" explodes at center contact point
//   Phase 3 │ 650ms – 900ms │ Fade out → onDone
// ══════════════════════════════════════════════════════════════════
function StreakFlash({ onDone }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 120);
    const t2 = setTimeout(() => setPhase(2), 400);
    const t3 = setTimeout(() => setPhase(3), 650);
    const t4 = setTimeout(() => { onDone && onDone(); }, 900);
    return () => { [t1,t2,t3,t4].forEach(clearTimeout); };
  }, []);

  const fading = phase === 3;

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:998, overflow:"hidden",
      background: phase === 0 ? "rgba(245,200,66,0.92)" : "rgba(13,31,53,0.96)",
      opacity: fading ? 0 : 1,
      transition: fading ? "opacity 0.25s ease" : phase === 0 ? "none" : "background 0.2s ease",
      display:"flex", alignItems:"center", justifyContent:"center",
      pointerEvents:"none",
    }}>

      {/* Left character — slides in from left */}
      <div style={{
        position:"absolute", bottom:0, left: phase >= 1 ? "5%" : "-60%",
        transition: phase === 1 ? "left 0.28s cubic-bezier(0.22,1,0.36,1)" : "none",
        zIndex:2, pointerEvents:"none",
        transform:"scaleX(-1)",
        opacity: fading ? 0 : 1,
      }}>
        <img src={WHAM_CHARS} alt="" style={{
          width:"55vw", maxWidth:320, minWidth:180,
          objectFit:"contain", objectPosition:"bottom center",
          display:"block",
        }}/>
      </div>

      {/* Right character — slides in from right */}
      <div style={{
        position:"absolute", bottom:0, right: phase >= 1 ? "5%" : "-60%",
        transition: phase === 1 ? "right 0.28s cubic-bezier(0.22,1,0.36,1)" : "none",
        zIndex:2, pointerEvents:"none",
        opacity: fading ? 0 : 1,
      }}>
        <img src={WHAM_CHARS} alt="" style={{
          width:"55vw", maxWidth:320, minWidth:180,
          objectFit:"contain", objectPosition:"bottom center",
          display:"block",
        }}/>
      </div>

      {/* Spark burst at center contact */}
      {phase >= 2 && (
        <div style={{
          position:"absolute", top:"44%", left:"50%",
          transform:"translate(-50%,-50%)",
          zIndex:4, pointerEvents:"none",
          animation:"streak-spark-burst 0.35s ease-out forwards",
        }}>
          {/* Spark rays */}
          {[0,45,90,135,180,225,270,315].map(deg => (
            <div key={deg} style={{
              position:"absolute", top:"50%", left:"50%",
              width: fading ? 0 : 40, height:2,
              background:"linear-gradient(90deg,#F5C842,transparent)",
              transformOrigin:"left center",
              transform:`rotate(${deg}deg)`,
              borderRadius:2,
              opacity: fading ? 0 : 0.85,
              transition:"width 0.2s ease, opacity 0.25s ease",
            }}/>
          ))}
        </div>
      )}

      {/* "+5 STREAK" text — explodes at sword contact point */}
      <div style={{
        position:"absolute", top:"36%", left:"50%",
        transform:`translate(-50%,-50%) scale(${phase < 2 ? 0 : fading ? 0.7 : 1.0})`,
        zIndex:5, pointerEvents:"none",
        opacity: phase < 2 ? 0 : fading ? 0 : 1,
        transition: phase === 2
          ? "transform 0.28s cubic-bezier(0.34,1.56,0.64,1), opacity 0.12s ease"
          : "transform 0.2s ease, opacity 0.25s ease",
        textAlign:"center",
        whiteSpace:"nowrap",
      }}>
        <div style={{
          fontFamily:"'Cinzel',serif",
          fontSize:"clamp(42px,13vw,72px)",
          fontWeight:900,
          letterSpacing:4,
          background:"linear-gradient(180deg,#FFFFFF 0%,#F5C842 40%,#D4921A 100%)",
          WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
          textShadow:"none",
          filter:"drop-shadow(0 0 18px rgba(245,200,66,0.9)) drop-shadow(0 0 36px rgba(245,200,66,0.5))",
          lineHeight:1,
        }}>+5</div>
        <div style={{
          fontFamily:"'Cinzel',serif",
          fontSize:"clamp(11px,3.5vw,16px)",
          fontWeight:800, letterSpacing:6,
          color:"#F5C842",
          textShadow:"0 0 12px rgba(245,200,66,0.8)",
          marginTop:4,
          textTransform:"uppercase",
        }}>STREAK BONUS</div>
      </div>

      <style>{`
        @keyframes streak-spark-burst {
          from { transform: translate(-50%,-50%) scale(0.2); opacity:0; }
          to   { transform: translate(-50%,-50%) scale(1);   opacity:1; }
        }
      `}</style>
    </div>
  );
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
          <p style={{ fontSize:11, color:"rgba(245,200,66,0.55)", letterSpacing:1.5, textAlign:"center", marginBottom:14, marginTop:-8 }}>ALL LEVELS OPEN · ANY RANK</p>
          <div style={{ width:"100%", display:"flex", flexDirection:"column", gap:10, marginBottom:20 }}>
            {LEVELS.map(lv => (
              <button key={lv.pts} onClick={() => onSelect(lv)}
                style={{
                  width:"100%", padding:"16px 20px", borderRadius:10,
                  border:`1.5px solid ${lv.color}66`,
                  background:`linear-gradient(135deg, ${lv.color}22, ${lv.color}11)`,
                  color:"#fff", cursor:"pointer", textAlign:"left",
                  fontFamily:"'Cinzel',serif", display:"flex", alignItems:"center", gap:14,
                  boxShadow:`0 2px 12px ${lv.color}22`, transition:"all 0.18s",
                }}
                onMouseEnter={e=>{e.currentTarget.style.background=`linear-gradient(135deg, ${lv.color}55, ${lv.color}33)`;e.currentTarget.style.boxShadow=`0 4px 20px ${lv.color}55`;}}
                onMouseLeave={e=>{e.currentTarget.style.background=`linear-gradient(135deg, ${lv.color}22, ${lv.color}11)`;e.currentTarget.style.boxShadow=`0 2px 12px ${lv.color}22`;}}>
                <span style={{ fontSize:28 }}>{lv.icon}</span>
                <div>
                  <div style={{ fontSize:16, fontWeight:800, letterSpacing:2 }}>{lv.name}</div>
                  <div style={{ fontSize:11, opacity:0.75, letterSpacing:1 }}>{lv.pts} pts per correct answer</div>
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
  const queue       = useRef(shuffle(VERSES).slice(0, 5).map(v => ({ ...v, options: makeOptions(v) })));
  const [idx, setIdx]           = useState(0);
  const [score, setScore]       = useState(0);
  const [timeLeft, setTime]     = useState(20);
  const [answered, setAnswered] = useState(false);
  const [chosen, setChosen]     = useState(null);
  const [results, setResults]   = useState([]);
  const [showHint, setShowHint] = useState(false);
  const [whamSlam, setWhamSlam] = useState(false);
  const [whamDrain, setWhamDrain] = useState(false); // eslint-disable-line no-unused-vars
  const timerRef    = useRef(null);
  const hintRef     = useRef(null);
  const answeredRef = useRef(false);
  const [streak,      setStreak]      = useState(0);
  const [streakFlash, setStreakFlash] = useState(false);

  const verse         = queue.current[idx];
  const correctAnswer = `${verse.book} ${verse.ch}:${verse.vs}`;

  useEffect(() => {
    answeredRef.current = false;
    setTime(20); setAnswered(false); setChosen(null); setShowHint(false);
    timerRef.current = setInterval(() => {
      setTime(t => {
        if (t <= 1) { clearInterval(timerRef.current); handleTimeout(); return 0; }
        return t - 1;
      });
    }, 1000);
    hintRef.current = setTimeout(() => setShowHint(true), (20 - level.hint) * 1000);
    return () => { clearInterval(timerRef.current); clearTimeout(hintRef.current); };
  }, [idx]);

  function handleTimeout() { if (!answeredRef.current) handleAnswer(null); }

  function handleAnswer(opt) {
    if (answeredRef.current) return;
    answeredRef.current = true;
    clearInterval(timerRef.current);
    clearTimeout(hintRef.current);
    setAnswered(true);
    setChosen(opt);
    const correct = opt === correctAnswer;
    if (correct) setScore(s => s + level.pts);
    setResults(r => [...r, { correct, ref: verse.ref }]);
    if (correct) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak >= 3 && newStreak % 3 === 0) {
        // Every 3rd consecutive correct — streak bonus +5, flash fires BEFORE wham slam
        setScore(s => s + 5);
        setStreakFlash(true);
      } else {
        setWhamSlam(true);
      }
    } else {
      setStreak(0);
      setWhamDrain(true);
      setTimeout(() => { setWhamDrain(false); advance(); }, 900);
    }
  }

  function advance() {
    if (idx + 1 >= queue.current.length) onDone({ score, results });
    else setIdx(i => i + 1);
  }

  function handleWhamSlamDone() {
    setWhamSlam(false);
    setTimeout(() => advance(), 100);
  }

  function handleStreakFlashDone() {
    setStreakFlash(false);
    // After streak flash, fire WHAM SLAM for the correct answer
    setWhamSlam(true);
  }

  const timerPct   = (timeLeft / 20) * 100;
  const timerColor = timeLeft > 10 ? C.teal : timeLeft > 5 ? C.gold : C.red;

  return (
    <div className="wb-screen">
      <div className="wb-bg-land" />
      <div className="wb-bg-char" style={{ backgroundImage: `url('${CHAR_SOLO}')` }} />
      <div className="wb-bg-tone" />
      <div className="wb-bg-rim" />

      {streakFlash && <StreakFlash onDone={handleStreakFlashDone} />}
      {whamSlam && <WhamSlam message="+5" onDone={handleWhamSlamDone} />}

      <div className="wb-content">
        <div style={{ width:"100%", display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 0 6px" }}>
          <div style={{ fontFamily:"'Cinzel',serif", fontSize:11, color:C.cobalt, letterSpacing:1, opacity:0.7 }}>{level.icon} {level.name}</div>
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
            <div style={{ fontFamily:"'Cinzel',serif", fontSize:16, fontWeight:800, color:C.gold }}>{score} pts</div>
            {streak >= 2 && (
              <div style={{fontFamily:"'Cinzel',serif",fontSize:9,letterSpacing:2,color:"#F5C842",
                animation:"wb-streak-pulse 0.6s ease infinite alternate"}}>
                🔥 {streak} STREAK{streak >= 3 ? " +5!" : ""}
              </div>
            )}
          </div>
          <div style={{ fontFamily:"'Cinzel',serif", fontSize:11, color:C.cobalt, opacity:0.7 }}>{idx+1} / {queue.current.length}</div>
        </div>

        <div style={{ display:"flex", gap:6, marginBottom:10 }}>
          {queue.current.map((_, i) => (
            <div key={i} style={{
              width:10, height:10, borderRadius:"50%",
              background: i < idx ? (results[i]?.correct ? C.teal : C.red) : i === idx ? C.gold : "rgba(26,58,92,0.2)",
              transition:"all 0.3s",
            }} />
          ))}
        </div>

        <div className="wb-hero-space" style={{ height: 269 }} />

        <div className="wb-scroll-panel">
          <div className="wb-scroll-curl" />

          <div style={{ width:"100%", height:5, background:"rgba(26,58,92,0.1)", borderRadius:3, marginBottom:14, overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${timerPct}%`, background:timerColor, borderRadius:3, transition:"width 1s linear, background 0.5s" }} />
          </div>
          <div style={{ textAlign:"right", fontSize:11, fontFamily:"'Cinzel',serif", color:timerColor, marginTop:-12, marginBottom:10 }}>
            {timeLeft}s
          </div>

          <div className="wb-verse-card">
            <div className="wb-verse-label">📜 Know This Verse</div>
            <p className="wb-verse-text">"{verse.text}"</p>
          </div>

          {showHint && !answered && (
            <div style={{
              width:"100%", background:"rgba(26,58,92,0.06)", border:`1px solid ${C.teal}44`,
              borderRadius:10, padding:"10px 14px", marginBottom:10,
              fontFamily:"'Cinzel',serif", fontSize:11, color:C.cobalt, letterSpacing:0.5,
              animation:"wb-hint-in 0.4s ease",
            }}>
              💡 <strong>Papa says:</strong> This verse is from <em>{verse.book}</em>, chapter {verse.ch}.
            </div>
          )}

          <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:16 }}>
            {verse.options.map((opt, i) => {
              const isCorrect = opt === correctAnswer;
              const isChosen  = opt === chosen;
              let bg = "rgba(255,255,255,0.7)", border = `1.5px solid rgba(26,58,92,0.18)`, color = C.cobaltDark;
              if (answered) {
                if (isCorrect)     { bg = `${C.teal}22`; border = `2px solid ${C.teal}`; color = C.teal; }
                else if (isChosen) { bg = `${C.red}11`;  border = `2px solid ${C.red}`;  color = C.red;  }
              }
              return (
                <button key={i} onClick={() => handleAnswer(opt)} disabled={answered}
                  style={{
                    width:"100%", padding:"13px 16px", borderRadius:10,
                    cursor: answered ? "default" : "pointer",
                    background:bg, border, color, fontFamily:"'Cinzel',serif",
                    fontSize:13, fontWeight:600, textAlign:"left", transition:"all 0.2s",
                    display:"flex", alignItems:"center", gap:12,
                    boxShadow: answered && isCorrect ? `0 0 16px ${C.teal}44` : "none",
                  }}>
                  <span style={{ fontWeight:800, fontSize:15, opacity:0.6, minWidth:18 }}>{["A","B","C","D"][i]}</span>
                  {opt}
                  {answered && isCorrect  && <span style={{ marginLeft:"auto" }}>✓</span>}
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
  const correct = results.filter(r => r.correct).length;
  const pct     = Math.round((correct / results.length) * 100);
  const rank    = score >= 1000 ? "Champion 👑" : score >= 600 ? "Knight 🛡️" : score >= 300 ? "Warrior ⚔️" : score >= 100 ? "Squire 🗡️" : "Scribe 📜";

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
  const [screen,     setScreen]     = useState("level");
  const [level,      setLevel]      = useState(null);
  const [gameResult, setGameResult] = useState(null);

  return (
    <div style={{ minHeight:"100vh", background:C.cobaltDark, fontFamily:"'Georgia',serif", overflowX:"hidden", position:"relative" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;800;900&display=swap');

        .wb-screen { min-height:100vh; position:relative; overflow-y:auto; overflow-x:hidden; }

        .wb-bg-land {
          position:fixed; inset:0; z-index:0; pointer-events:none;
          background-image: url('${LANDSCAPE_BG}');
          background-size:cover; background-position:center top;
        }
        .wb-bg-char {
          position:fixed; inset:0; z-index:1; pointer-events:none;
          background-size:80% auto; background-position:center 6%; background-repeat:no-repeat;
        }
        .wb-bg-tone { position:fixed; inset:0; z-index:2; pointer-events:none; display:none; }
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
          width:100%; border-radius:20px 20px 0 0; padding:24px 20px 60px;
          position:relative; z-index:5; margin-top:-56px;
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
          width:100%;
          background:linear-gradient(135deg, rgba(26,58,92,0.07) 0%, rgba(30,122,140,0.05) 100%);
          border:1.5px solid rgba(30,122,140,0.30); border-radius:12px; padding:16px 20px;
          box-shadow:0 3px 16px rgba(26,58,92,0.08), inset 0 1px 0 rgba(255,255,255,0.7);
          margin-bottom:14px;
        }
        .wb-verse-label { color:${C.teal}; font-size:10px; letter-spacing:2px; text-transform:uppercase; margin-bottom:8px; font-family:'Cinzel',serif; font-weight:600; }
        .wb-verse-text  { color:${C.cobaltDark}; font-size:13px; line-height:1.7; font-style:italic; margin:0; }
        .wb-btn-primary {
          width:100%; padding:15px 24px;
          background:linear-gradient(135deg, ${C.gold} 0%, #b87614 50%, ${C.gold} 100%);
          border:none; border-radius:10px; color:#fff; font-size:15px; font-weight:700;
          font-family:'Cinzel',serif; letter-spacing:3px; text-transform:uppercase;
          cursor:pointer; transition:all 0.2s; box-shadow:0 4px 20px rgba(212,146,26,0.38);
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
          font-size:13px; font-family:'Cinzel',serif; letter-spacing:1px; text-transform:uppercase; cursor:pointer; transition:all 0.18s;
        }
        @keyframes wb-hint-in { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:none } }
        @keyframes wb-streak-pulse {
          from { opacity: 0.7; transform: scale(1.0); }
          to   { opacity: 1.0; transform: scale(1.08); }
        }
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
