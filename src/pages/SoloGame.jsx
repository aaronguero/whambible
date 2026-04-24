import { useState, useEffect, useRef, useCallback } from "react";

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


// ── Recovery asset ──
const CHAR_RECOVERY = "https://media.base44.com/images/public/69df9a909b33058a5ce47831/833513c9d_generated_image.png";

// ── Wheel data ──
const ALL_BOOKS = ["Genesis","Exodus","Leviticus","Numbers","Deuteronomy","Joshua","Judges","Ruth","1 Samuel","2 Samuel","1 Kings","2 Kings","1 Chronicles","2 Chronicles","Ezra","Nehemiah","Esther","Job","Psalms","Proverbs","Ecclesiastes","Song of Solomon","Isaiah","Jeremiah","Lamentations","Ezekiel","Daniel","Hosea","Joel","Amos","Obadiah","Jonah","Micah","Nahum","Habakkuk","Zephaniah","Haggai","Zechariah","Malachi","Matthew","Mark","Luke","John","Acts","Romans","1 Corinthians","2 Corinthians","Galatians","Ephesians","Philippians","Colossians","1 Thessalonians","2 Thessalonians","1 Timothy","2 Timothy","Titus","Philemon","Hebrews","James","1 Peter","2 Peter","1 John","2 John","3 John","Jude","Revelation"];
const W_CHAPTERS = Array.from({ length: 150 }, (_, i) => i + 1);
const W_VERSES   = Array.from({ length: 176 }, (_, i) => i + 1);
const SP_RECOVERY_SEC = 7;
const WHEEL_ITEM_H    = 42;
const WHEEL_VISIBLE   = 5;
const WHEEL_CENTER    = 2;
const WHEEL_COPIES    = 5;

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


// ══════════════════════════════════════════════════════════════════
// ── SCROLL WHEEL ─────────────────────────────────────────────────
// Momentum physics, center-snap, 5-item visible window.
// ══════════════════════════════════════════════════════════════════
function ScrollWheel({ items, startIndex, label, widthClass, onChange }) {
  const outerRef = useRef(null);
  const innerRef = useRef(null);
  const s = useRef({
    offset:0, dragging:false, startY:0, startOffset:0,
    lastY:0, lastT:0, velocity:0, rafId:null, currentIdx:startIndex,
  });

  const normalize = useCallback((offset) => {
    const len = items.length, minOff = len * WHEEL_ITEM_H, maxOff = len * WHEEL_ITEM_H * 3;
    let o = offset;
    while (o < minOff) o += len * WHEEL_ITEM_H;
    while (o > maxOff) o -= len * WHEEL_ITEM_H;
    return o;
  }, [items]);

  const offsetToIdx = useCallback((offset) => {
    const len = items.length;
    const row = Math.round((offset + WHEEL_CENTER * WHEEL_ITEM_H) / WHEEL_ITEM_H);
    return ((row % len) + len) % len;
  }, [items]);

  const applyHighlight = useCallback((idx) => {
    const inner = innerRef.current; if (!inner) return;
    const len = items.length;
    inner.querySelectorAll(".spw-item").forEach((el, i) => {
      const rel  = ((i % len) + len) % len;
      const dist = Math.min(Math.abs(rel-idx), Math.abs(rel-idx+len), Math.abs(rel-idx-len));
      el.className = "spw-item" + (rel===idx?" selected":dist===1?" near1":dist===2?" near2":"");
    });
  }, [items]);

  const setOff = useCallback((offset, animate) => {
    const inner = innerRef.current; if (!inner) return;
    inner.style.transition = animate ? "transform 0.18s cubic-bezier(.22,.68,0,1.2)" : "none";
    inner.style.transform  = `translateY(-${offset}px)`;
    s.current.offset = offset;
    const idx = offsetToIdx(offset);
    s.current.currentIdx = idx;
    applyHighlight(idx);
    onChange?.(idx);
  }, [offsetToIdx, applyHighlight, onChange]);

  const snap = useCallback((offset) => {
    const ctr = offset + WHEEL_CENTER * WHEEL_ITEM_H;
    const snappedC = Math.round(ctr / WHEEL_ITEM_H) * WHEEL_ITEM_H;
    setOff(normalize(snappedC - WHEEL_CENTER * WHEEL_ITEM_H), true);
  }, [normalize, setOff]);

  useEffect(() => {
    const inner = innerRef.current; if (!inner) return;
    inner.innerHTML = "";
    const all = Array(WHEEL_COPIES).fill(items).flat();
    all.forEach(item => {
      const el = document.createElement("div");
      el.className = "spw-item";
      el.textContent = String(item);
      inner.appendChild(el);
    });
    const init = normalize((items.length * 2 + startIndex) * WHEEL_ITEM_H - WHEEL_CENTER * WHEEL_ITEM_H);
    setOff(init, false);
  }, [items, startIndex]);

  const onStart = useCallback((y) => {
    cancelAnimationFrame(s.current.rafId);
    Object.assign(s.current, { dragging:true, startY:y, lastY:y, lastT:performance.now(), velocity:0, startOffset:s.current.offset });
    if (innerRef.current) innerRef.current.style.transition = "none";
  }, []);

  const onMove = useCallback((y) => {
    if (!s.current.dragging) return;
    const now = performance.now(), dt = now - s.current.lastT || 16;
    s.current.velocity = (s.current.lastY - y) / dt;
    s.current.lastY = y; s.current.lastT = now;
    setOff(normalize(s.current.startOffset + (s.current.startY - y)), false);
  }, [normalize, setOff]);

  const onEnd = useCallback(() => {
    if (!s.current.dragging) return;
    s.current.dragging = false;
    let vel = s.current.velocity * 1000, offset = s.current.offset;
    const coast = () => {
      if (Math.abs(vel) < 0.5) { snap(offset); return; }
      vel *= 0.94; offset += vel / 60;
      setOff(normalize(offset), false);
      s.current.rafId = requestAnimationFrame(coast);
    };
    Math.abs(vel) > 80 ? coast() : snap(offset);
  }, [snap, normalize, setOff]);

  useEffect(() => {
    const outer = outerRef.current; if (!outer) return;
    const tStart = e => onStart(e.touches[0].clientY);
    const tMove  = e => { e.preventDefault(); onMove(e.touches[0].clientY); };
    const tEnd   = () => onEnd();
    const mDown  = e => { onStart(e.clientY); e.preventDefault(); };
    const mMove  = e => { if (s.current.dragging) onMove(e.clientY); };
    const mUp    = () => { if (s.current.dragging) onEnd(); };
    const mLeave = () => { if (s.current.dragging) onEnd(); };
    outer.addEventListener("touchstart", tStart, { passive:true });
    outer.addEventListener("touchmove",  tMove,  { passive:false });
    outer.addEventListener("touchend",   tEnd,   { passive:true });
    outer.addEventListener("mousedown",  mDown);
    outer.addEventListener("mousemove",  mMove);
    outer.addEventListener("mouseleave", mLeave);
    document.addEventListener("mouseup", mUp);
    return () => {
      outer.removeEventListener("touchstart", tStart);
      outer.removeEventListener("touchmove",  tMove);
      outer.removeEventListener("touchend",   tEnd);
      outer.removeEventListener("mousedown",  mDown);
      outer.removeEventListener("mousemove",  mMove);
      outer.removeEventListener("mouseleave", mLeave);
      document.removeEventListener("mouseup", mUp);
    };
  }, [onStart, onMove, onEnd]);

  return (
    <div className={`spw-wrap ${widthClass}`}>
      <div className="spw-label">{label}</div>
      <div ref={outerRef} className="spw-outer" style={{ height: WHEEL_ITEM_H * WHEEL_VISIBLE }}>
        <div className="spw-band" style={{ top: WHEEL_CENTER * WHEEL_ITEM_H, height: WHEEL_ITEM_H }} />
        <div className="spw-fade spw-fade-top" />
        <div className="spw-fade spw-fade-bot" />
        <div ref={innerRef} className="spw-inner" />
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// ── SP RECOVERY OVERLAY ──────────────────────────────────────────
// Fires inline over GamePlay when player answers wrong.
// Props: verse { book, ch, vs, text }, onDone(recovered:bool)
// 7s countdown — spin wheels to correct Book/Chapter/Verse, hit Submit.
// Correct = +5 pts, WHAM SLAM fires. Wrong/timeout = 0 pts, round advances.
// ══════════════════════════════════════════════════════════════════
function SPRecovery({ verse, onDone }) {
  const bookIdxRef    = useRef(spStartIdx(ALL_BOOKS, verse.book, 8));
  const chapterIdxRef = useRef(spStartIdx(W_CHAPTERS, verse.ch, 4));
  const verseIdxRef   = useRef(spStartIdx(W_VERSES,   verse.vs, 4));

  const [timeLeft,   setTimeLeft]  = useState(SP_RECOVERY_SEC);
  const [submitted,  setSubmitted] = useState(false);
  const [result,     setResult]    = useState(null);
  const [slamActive, setSlamActive] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const timerRef = useRef(null);
  const audioRef = useRef(null);
  const circumference = 163.4;

  useEffect(() => {
    audioRef.current = new Audio(WHAM_AUDIO);
    audioRef.current.preload = "auto";
    audioRef.current.load();
    return () => clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    let t = SP_RECOVERY_SEC;
    timerRef.current = setInterval(() => {
      t -= 0.1;
      setTimeLeft(parseFloat(t.toFixed(1)));
      if (t <= 0) { clearInterval(timerRef.current); handleSubmit(); }
    }, 100);
    return () => clearInterval(timerRef.current);
  }, []);

  function spStartIdx(arr, correct, offset) {
    const idx = arr.findIndex(v => String(v) === String(correct));
    const len = arr.length;
    return idx >= 0 ? ((idx - offset) % len + len) % len : 0;
  }

  function handleSubmit() {
    if (submitted) return;
    setSubmitted(true);
    clearInterval(timerRef.current);
    const selBook = ALL_BOOKS[bookIdxRef.current];
    const selCh   = W_CHAPTERS[chapterIdxRef.current];
    const selVs   = W_VERSES[verseIdxRef.current];
    const correct = selBook === verse.book && selCh === verse.ch && selVs === verse.vs;
    setResult(correct ? "correct" : "wrong");
    if (correct) {
      try { audioRef.current.currentTime=0; audioRef.current.play().catch(()=>{}); } catch {}
      setSlamActive(true);
      setTimeout(() => { setSlamActive(false); setShowResult(true); }, 1750);
      setTimeout(() => onDone(true),  2600); // brief result shown, then advance
    } else {
      setShowResult(true);
      setTimeout(() => onDone(false), 1400);
    }
  }

  const timerPct  = timeLeft / SP_RECOVERY_SEC;
  const dashOff   = circumference * (1 - timerPct);
  const isRed     = timeLeft <= 3;
  const timerClr  = isRed ? C.red : C.gold;

  const bookStart    = spStartIdx(ALL_BOOKS, verse.book, 8);
  const chapterStart = spStartIdx(W_CHAPTERS, verse.ch,   4);
  const verseStart   = spStartIdx(W_VERSES,   verse.vs,   4);

  return (
    <div style={{
      position:"fixed",inset:0,zIndex:900,overflowY:"auto",
      background:"rgba(10,5,0,0.97)",
      animation:"spRec-in 0.28s cubic-bezier(0.22,1,0.36,1)",
    }}>
      {/* WHAM SLAM mini overlay inside recovery */}
      {slamActive && <WhamSlam message="+5" onDone={() => {}} />}

      {/* Background layers */}
      <div style={{
        position:"fixed",inset:0,zIndex:0,pointerEvents:"none",
        backgroundImage:`url('${LANDSCAPE_BG}')`,
        backgroundSize:"cover",backgroundPosition:"center top",opacity:0.35,
      }}/>
      <div style={{
        position:"fixed",inset:0,zIndex:1,pointerEvents:"none",
        backgroundImage:`url('${CHAR_RECOVERY}')`,
        backgroundSize:"70% auto",backgroundPosition:"center 4%",backgroundRepeat:"no-repeat",opacity:0.7,
        WebkitMaskImage:"linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.8) 10%, rgba(0,0,0,1) 22%, rgba(0,0,0,1) 50%, rgba(0,0,0,0.2) 68%, rgba(0,0,0,0) 82%)",
        maskImage:"linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.8) 10%, rgba(0,0,0,1) 22%, rgba(0,0,0,1) 50%, rgba(0,0,0,0.2) 68%, rgba(0,0,0,0) 82%)",
      }}/>
      <div style={{
        position:"fixed",inset:0,zIndex:2,pointerEvents:"none",
        background:"linear-gradient(to bottom,rgba(10,5,0,0.1) 0%,rgba(10,5,0,0.6) 45%,rgba(10,5,0,0.95) 75%,rgba(10,5,0,1) 100%)",
      }}/>

      {/* Content */}
      <div style={{
        position:"relative",zIndex:4,maxWidth:480,margin:"0 auto",
        padding:"0 16px 60px",display:"flex",flexDirection:"column",alignItems:"center",
      }}>
        <div style={{ height:290, width:"100%" }} />

        {/* Panel */}
        <div style={{
          width:"100%",borderRadius:"20px 20px 0 0",padding:"22px 18px 0",
          background:"linear-gradient(180deg,rgba(10,5,0,0) 0%,rgba(10,5,0,0.88) 8%,rgba(10,5,0,0.98) 18%,rgba(10,5,0,0.98) 100%)",
        }}>
          {/* Curl */}
          <div style={{
            width:"70%",height:4,margin:"0 auto 14px",borderRadius:2,
            background:"linear-gradient(90deg,transparent,rgba(212,146,26,0.7),rgba(58,189,212,0.5),rgba(212,146,26,0.7),transparent)",
          }}/>

          {/* Badge */}
          <div style={{
            fontFamily:"'Cinzel',serif",fontSize:10,letterSpacing:2,
            color:"rgba(212,146,26,0.85)",background:"rgba(212,146,26,0.1)",
            border:"1px solid rgba(212,146,26,0.3)",borderRadius:20,padding:"5px 14px",
            textTransform:"uppercase",marginBottom:12,textAlign:"center",display:"inline-block",
            alignSelf:"center",
          }}>📜 Scroll Recovery · Recover +5</div>

          {/* Verse */}
          <div style={{
            width:"100%",background:"rgba(201,162,39,0.06)",
            border:"1px solid rgba(201,162,39,0.22)",borderRadius:12,padding:"14px 18px",marginBottom:14,
          }}>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:9,letterSpacing:2,color:"rgba(201,162,26,0.5)",textTransform:"uppercase",marginBottom:8}}>📖 The Verse You Missed</div>
            <p style={{fontSize:13,lineHeight:1.7,color:"rgba(240,228,192,0.85)",fontStyle:"italic",margin:"0 0 8px"}}>"{verse.text}"</p>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:11,color:C.gold,textAlign:"right",letterSpacing:1}}>— {verse.book} {verse.ch}:{verse.vs}</div>
          </div>

          {!showResult ? (
            <>
              <p style={{
                fontFamily:"'Cinzel',serif",fontSize:10,letterSpacing:1,
                color:"rgba(201,162,39,0.45)",textAlign:"center",textTransform:"uppercase",
                lineHeight:1.8,marginBottom:10,
              }}>Spin to <strong>Book · Chapter · Verse</strong><br/>Submit before time runs out</p>

              {/* Timer ring */}
              <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,marginBottom:14}}>
                <div style={{position:"relative",width:64,height:64,flexShrink:0}}>
                  <svg viewBox="0 0 56 56" style={{width:64,height:64,transform:"rotate(-90deg)"}}>
                    <circle cx="28" cy="28" r="26" fill="none" stroke="rgba(212,146,26,0.1)" strokeWidth="4"/>
                    <circle cx="28" cy="28" r="26" fill="none" strokeWidth="4" strokeLinecap="round"
                      strokeDasharray="163.4"
                      style={{strokeDashoffset:dashOff,stroke:timerClr,transition:"stroke-dashoffset 0.1s linear,stroke 0.3s"}}/>
                  </svg>
                  <div style={{
                    position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",
                    fontFamily:"'Cinzel',serif",fontSize:20,fontWeight:700,color:timerClr,
                  }}>{Math.ceil(timeLeft)}</div>
                </div>
              </div>

              {/* Wheels */}
              <div style={{display:"flex",gap:8,width:"100%",justifyContent:"center",alignItems:"flex-start",marginBottom:14}}>
                <ScrollWheel items={ALL_BOOKS} startIndex={bookStart}    label="Book"    widthClass="spw-book"    onChange={idx => bookIdxRef.current=idx}/>
                <ScrollWheel items={W_CHAPTERS} startIndex={chapterStart} label="Chapter" widthClass="spw-chapter" onChange={idx => chapterIdxRef.current=idx}/>
                <ScrollWheel items={W_VERSES}   startIndex={verseStart}   label="Verse"   widthClass="spw-verse"   onChange={idx => verseIdxRef.current=idx}/>
              </div>

              <button onClick={handleSubmit} disabled={submitted} style={{
                width:"100%",padding:"15px 24px",
                background:"linear-gradient(135deg,#D4921A 0%,#b87614 50%,#D4921A 100%)",
                border:"none",borderRadius:12,color:"#fff",
                fontFamily:"'Cinzel',serif",fontSize:15,fontWeight:700,letterSpacing:3,
                textTransform:"uppercase",cursor:submitted?"default":"pointer",
                boxShadow:"0 4px 20px rgba(212,146,26,0.4)",marginBottom:20,
              }}>⚔️ Submit Recovery</button>
            </>
          ) : (
            <div style={{textAlign:"center",padding:"20px 0"}}>
              <div style={{fontSize:36,marginBottom:12}}>{result==="correct"?"✅":"❌"}</div>
              <div style={{
                fontFamily:"'Cinzel',serif",fontSize:18,fontWeight:800,letterSpacing:2,
                color:result==="correct"?C.teal:C.red,marginBottom:8,
              }}>{result==="correct"?"RECOVERED! +5 pts":"MISSED IT"}</div>
              <div style={{fontFamily:"'Cinzel',serif",fontSize:11,color:C.offWhite,opacity:0.7}}>
                {result==="correct"
                  ?`${verse.book} ${verse.ch}:${verse.vs} — locked in!`
                  :`The answer was ${verse.book} ${verse.ch}:${verse.vs}`}
              </div>
            </div>
          )}

        </div>
      </div>

      <style>{`
        @keyframes spRec-in {
          from { transform:translateY(100%); opacity:0.6; }
          to   { transform:translateY(0);    opacity:1; }
        }
        .spw-wrap { display:flex; flex-direction:column; align-items:center; gap:5px; flex:1; }
        .spw-book    { flex:2.4; max-width:175px; }
        .spw-chapter { flex:1;   max-width:80px; }
        .spw-verse   { flex:1;   max-width:80px; }
        .spw-label {
          font-family:'Cinzel',serif; font-size:8px; letter-spacing:3px;
          color:rgba(201,162,39,0.35); text-transform:uppercase;
        }
        .spw-outer {
          position:relative; width:100%; border-radius:12px; overflow:hidden;
          background:linear-gradient(180deg,rgba(10,5,0,0.98) 0%,rgba(30,18,3,0.98) 50%,rgba(10,5,0,0.98) 100%);
          border:1px solid rgba(201,162,39,0.3);
          box-shadow:inset 0 0 24px rgba(0,0,0,0.6),0 4px 16px rgba(0,0,0,0.4);
          cursor:grab; user-select:none; touch-action:none;
        }
        .spw-outer:active { cursor:grabbing; }
        .spw-inner { display:flex; flex-direction:column; will-change:transform; position:absolute; left:0; right:0; top:0; }
        .spw-item {
          height:42px; display:flex; align-items:center; justify-content:center;
          font-family:'Cinzel',serif; font-size:12px;
          color:rgba(201,162,39,0.25); padding:0 5px; text-align:center;
          white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex-shrink:0;
          pointer-events:none; transition:color 0.12s,font-size 0.12s;
        }
        .spw-item.near2   { color:rgba(201,162,39,0.28); font-size:11.5px; }
        .spw-item.near1   { color:rgba(201,162,39,0.55); font-size:12.5px; }
        .spw-item.selected { color:#f0e4c0; font-size:14px; font-weight:700; text-shadow:0 0 12px rgba(201,162,39,0.7); }
        .spw-band {
          position:absolute; left:0; right:0; z-index:4; pointer-events:none;
          background:rgba(201,162,39,0.07);
          border-top:1px solid rgba(201,162,39,0.45); border-bottom:1px solid rgba(201,162,39,0.45);
        }
        .spw-fade { position:absolute; left:0; right:0; z-index:3; pointer-events:none; height:65px; }
        .spw-fade-top { top:0;    background:linear-gradient(180deg,rgba(10,5,0,0.96) 0%,transparent 100%); }
        .spw-fade-bot { bottom:0; background:linear-gradient(0deg,  rgba(10,5,0,0.96) 0%,transparent 100%); }
      `}</style>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════
// ── WHAM DRAIN v3 ────────────────────────────────────────────────
// Revised spaghettification per Designer spec:
//
// FRAME 1 (0ms)      — Stamp frozen on white void. Fully intact.
// FRAME 2 (0–500ms)  — Full 360° spin while stretching outward
//                      circularly — panel orbits the drain point,
//                      scaleX/Y expand then begin thinning
// FRAME 3 (500–1100ms)— The stretched loop fragments into 2° increments
//                      across the full 360° arc, each shard scales
//                      100%→0% as it spirals inward — 180 shards
//                      raining into the center drain
// FRAME 5 (1100–1650ms)— Singularity: all mass collapses to a single
//                      bright point at dead center, then snaps to white
// 1700ms             — onDone fires → SPRecovery slides in
// ══════════════════════════════════════════════════════════════════
function WhamDrain({ panelRef, onDone }) {
  const overlayRef  = useRef(null);
  const shardRefs   = useRef([]);
  const cloneRef    = useRef(null);
  const singRef     = useRef(null);

  useEffect(() => {
    // ── Stamp: deep-clone the panel at this exact frame ──
    const source = panelRef?.current;
    let rect = { width: 360, height: 600 };
    if (source) rect = source.getBoundingClientRect();

    // Build clone for Frame 2 (spin phase)
    if (source && cloneRef.current) {
      const clone = source.cloneNode(true);
      clone.style.cssText = `
        position:absolute; top:0; left:0;
        width:${rect.width}px;
        pointer-events:none; overflow:visible;
        border-radius:inherit;
      `;
      clone.querySelectorAll("*").forEach(el => {
        el.style.transition = "none";
        el.style.animation  = "none";
      });
      cloneRef.current.appendChild(clone);
    }

    // ── Double-rAF: mount first, then animate ──
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // FRAME 2: spin the main clone 360° while stretching
        if (cloneRef.current) {
          cloneRef.current.style.transition = "none";
          cloneRef.current.classList.add("wd-spin360");
        }

        // FRAME 3: after spin (500ms), explode into 2° shards
        setTimeout(() => {
          // Hide the spin clone
          if (cloneRef.current) {
            cloneRef.current.style.opacity = "0";
            cloneRef.current.style.transition = "opacity 80ms";
          }
          // Activate each shard
          shardRefs.current.forEach((el, i) => {
            if (!el) return;
            const delay = i * 1.5; // stagger each 2° shard by 1.5ms = ~270ms total spread
            el.style.animationDelay = `${delay}ms`;
            el.classList.add("wd-shard-fall");
          });

          // FRAME 5: singularity at 1100ms (600ms into shard phase)
          setTimeout(() => {
            if (singRef.current) singRef.current.classList.add("wd-sing-collapse");
          }, 600);
        }, 500);
      });
    });

    const t = setTimeout(() => onDone && onDone(), 1700);
    return () => { clearTimeout(t); cancelAnimationFrame(raf); };
  }, []);

  // Build 180 shard elements (one per 2° of the 360° arc)
  const shards = Array.from({ length: 180 }, (_, i) => {
    const angleDeg = i * 2;          // 0°, 2°, 4° ... 358°
    const angleRad = (angleDeg * Math.PI) / 180;
    // Each shard starts on a circle radius ~140px from center, angled outward
    const r = 140;
    const tx = Math.cos(angleRad) * r;
    const ty = Math.sin(angleRad) * r;
    return { angleDeg, tx, ty, i };
  });

  return (
    <div ref={overlayRef} style={{
      position:"fixed", inset:0, zIndex:9000,
      background:"#ffffff",
      display:"flex", alignItems:"center", justifyContent:"center",
      overflow:"hidden",
    }}>
      {/* ── FRAME 2: the main clone for the 360° spin ── */}
      <div ref={cloneRef} className="wd-stamp" style={{
        position:"absolute",
        width:"100%", maxWidth:480,
        transformOrigin:"50% 50%",
        zIndex:2,
      }} />

      {/* ── FRAME 3: 180 shard arcs, one per 2° ── */}
      <div style={{
        position:"absolute", inset:0,
        display:"flex", alignItems:"center", justifyContent:"center",
        pointerEvents:"none", zIndex:3,
      }}>
        {shards.map(({ angleDeg, tx, ty, i }) => (
          <div
            key={i}
            ref={el => shardRefs.current[i] = el}
            className="wd-shard"
            style={{
              // Each shard is a thin colored sliver, rotated to its angle
              position:"absolute",
              width: 3,
              height: 28,
              borderRadius: 2,
              background: `hsl(${200 + (angleDeg * 0.3)}, 55%, ${30 + (i % 4) * 8}%)`,
              transformOrigin: "50% 100%",  // pivot at bottom = toward center
              // Start position: translated out on the circle
              transform: `translate(${tx}px, ${ty}px) rotate(${angleDeg + 90}deg) scaleY(1)`,
              opacity: 0,
              // CSS var for the inward collapse translation
              "--tx": `${tx}px`,
              "--ty": `${ty}px`,
              "--angle": `${angleDeg + 90}deg`,
            }}
          />
        ))}
      </div>

      {/* ── FRAME 5: singularity point at dead center ── */}
      <div ref={singRef} className="wd-singularity" style={{
        position:"absolute",
        top:"50%", left:"50%",
        transform:"translate(-50%,-50%)",
        zIndex:4,
      }} />

      <style>{`
        /* ══ FRAME 2: 360° orbital spin + circular stretch ══ */
        .wd-stamp { will-change: transform, opacity, filter; }

        .wd-spin360 {
          animation: wdSpin360 0.5s cubic-bezier(0.3, 0, 0.7, 1) forwards;
        }
        @keyframes wdSpin360 {
          0%   {
            transform: scale(1, 1) rotate(0deg);
            opacity: 1;
            filter: blur(0px) brightness(1);
          }
          30%  {
            transform: scale(1.12, 1.12) rotate(108deg);
            opacity: 1;
            filter: blur(1px) brightness(1.1);
          }
          65%  {
            transform: scale(1.18, 1.18) rotate(234deg);
            opacity: 0.85;
            filter: blur(2.5px) brightness(1.25);
          }
          100% {
            transform: scale(0.9, 0.9) rotate(360deg);
            opacity: 0;
            filter: blur(5px) brightness(1.5);
          }
        }

        /* ══ FRAME 3: shard fragments rain inward over 600ms ══
           Each shard starts on the arc, scales 100→0 as it pulls
           toward dead center. staggered by delay set in JS.       */
        .wd-shard {
          will-change: transform, opacity;
        }
        .wd-shard-fall {
          animation: wdShardFall 0.55s ease-in forwards;
        }
        @keyframes wdShardFall {
          0% {
            opacity: 0.9;
            transform: translate(var(--tx, 0px), var(--ty, 0px))
                       rotate(var(--angle, 90deg))
                       scaleY(1);
          }
          45% {
            opacity: 0.65;
            transform: translate(calc(var(--tx, 0px) * 0.45), calc(var(--ty, 0px) * 0.45))
                       rotate(var(--angle, 90deg))
                       scaleY(0.55);
          }
          100% {
            opacity: 0;
            transform: translate(0px, 0px)
                       rotate(var(--angle, 90deg))
                       scaleY(0);
          }
        }

        /* ══ FRAME 5: singularity collapse ══ */
        .wd-singularity {
          width: 0; height: 0;
          border-radius: 50%;
          background: radial-gradient(circle,
            rgba(255,255,255,1) 0%,
            rgba(30,122,140,0.9) 30%,
            rgba(26,58,92,0.7) 60%,
            transparent 100%
          );
          opacity: 0;
        }
        .wd-sing-collapse {
          animation: wdSingCollapse 0.6s ease-out forwards;
        }
        @keyframes wdSingCollapse {
          0%   { width:0;    height:0;    opacity:0; }
          20%  { width:60px; height:60px; opacity:1;
                 box-shadow: 0 0 40px 20px rgba(30,122,140,0.6); }
          50%  { width:24px; height:24px; opacity:1;
                 box-shadow: 0 0 20px 10px rgba(26,58,92,0.8); }
          80%  { width:6px;  height:6px;  opacity:0.8; }
          100% { width:0;    height:0;    opacity:0; }
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
  // whamDrain removed — replaced by SPRecovery overlay
  const timerRef    = useRef(null);
  const hintRef     = useRef(null);
  const answeredRef = useRef(false);
  const [streak,      setStreak]      = useState(0);
  const [streakFlash, setStreakFlash] = useState(false);
  const [spRecovery,  setSpRecovery] = useState(false);
  const [whamDrain,   setWhamDrain]  = useState(false);
  const panelRef = useRef(null);

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
      setWhamDrain(true); // Black-hole drain first, then recovery
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

  function handleDrainDone() {
    setWhamDrain(false);
    setSpRecovery(true);  // Drain complete → Recovery slides in
  }

  function handleRecoveryDone(recovered) {
    setSpRecovery(false);
    if (recovered) {
      // Player nailed the recovery — award +5 and fire WHAM SLAM
      setScore(s => s + 5);
      setWhamSlam(true);
    } else {
      // Missed recovery — just advance
      advance();
    }
  }

  const timerPct   = (timeLeft / 20) * 100;
  const timerColor = timeLeft > 10 ? C.teal : timeLeft > 5 ? C.gold : C.red;

  return (
    <div className="wb-screen">
      <div className="wb-bg-land" />
      <div className="wb-bg-char" style={{ backgroundImage: `url('${CHAR_SOLO}')` }} />
      <div className="wb-bg-tone" />
      <div className="wb-bg-rim" />

      {whamDrain   && <WhamDrain panelRef={panelRef} onDone={handleDrainDone} />}
      {spRecovery && <SPRecovery verse={verse} onDone={handleRecoveryDone} />}
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

        <div className="wb-scroll-panel" ref={panelRef}>
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
