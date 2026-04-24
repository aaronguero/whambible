import { useState, useEffect, useRef, useCallback } from "react";

// ── Assets ──
const LANDSCAPE_BG  = "https://media.base44.com/images/public/69df9a909b33058a5ce47831/33b065c94_generated_image.png";
const CHAR_RECOVERY = "https://media.base44.com/images/public/69df9a909b33058a5ce47831/833513c9d_generated_image.png";
const WHAM_AUDIO    = "https://media.base44.com/videos/public/69c40c6701d9dfdb1df69d2b/5d143ab80_51a54c36d_wham-slam-voice1.webm";

// ── Palette ──
const C = {
  cobalt:    "#1A3A5C",
  cobaltDark:"#0D1F35",
  teal:      "#1E7A8C",
  tealLight: "#3ABDD4",
  gold:      "#D4921A",
  goldLight: "#F5C842",
  offWhite:  "#F4F0E8",
  red:       "#C0392B",
  ink:       "#0A0500",
  inkLight:  "#1E1203",
};

// ── All 66 Bible Books ──
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
const CHAPTERS = Array.from({ length: 150 }, (_, i) => i + 1);
const VERSES_N = Array.from({ length: 176 }, (_, i) => i + 1);

// ── Wheel constants ──
const ITEM_H     = 42;
const VISIBLE    = 5;
const CENTER_ROW = 2;
const COPIES     = 5;

// ── Sample verse (in real game, passed via sessionStorage/params) ──
const DEMO_VERSE = {
  book: "John", chapter: 3, verse: 16,
  text: "For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.",
  pts: 10,
};

// ════════════════════════════════════════════════
// Wheel Component — full physics, momentum, snap
// ════════════════════════════════════════════════
function ScrollWheel({ items, startIndex, label, widthClass, onChange }) {
  const outerRef  = useRef(null);
  const innerRef  = useRef(null);
  const stateRef  = useRef({
    offset: 0, dragging: false,
    startY: 0, startOffset: 0,
    lastY: 0, lastT: 0, velocity: 0,
    rafId: null, currentIdx: startIndex,
  });

  // ── Helpers ──
  const normalize = useCallback((offset) => {
    const len    = items.length;
    const minOff = len * ITEM_H;
    const maxOff = len * ITEM_H * 3;
    let o = offset;
    while (o < minOff) o += len * ITEM_H;
    while (o > maxOff) o -= len * ITEM_H;
    return o;
  }, [items]);

  const offsetToIdx = useCallback((offset) => {
    const len = items.length;
    const row = Math.round((offset + CENTER_ROW * ITEM_H) / ITEM_H);
    return ((row % len) + len) % len;
  }, [items]);

  const applyHighlight = useCallback((idx) => {
    const inner = innerRef.current;
    if (!inner) return;
    const len  = items.length;
    inner.querySelectorAll(".sw-item").forEach((el, i) => {
      const rel  = ((i % len) + len) % len;
      const dist = Math.min(
        Math.abs(rel - idx),
        Math.abs(rel - idx + len),
        Math.abs(rel - idx - len)
      );
      el.className = "sw-item" + (rel === idx ? " selected" : dist === 1 ? " near1" : dist === 2 ? " near2" : "");
    });
  }, [items]);

  const setOffset = useCallback((offset, animate) => {
    const inner = innerRef.current;
    if (!inner) return;
    inner.style.transition = animate ? "transform 0.18s cubic-bezier(.22,.68,0,1.2)" : "none";
    inner.style.transform  = `translateY(-${offset}px)`;
    stateRef.current.offset = offset;
    const idx = offsetToIdx(offset);
    stateRef.current.currentIdx = idx;
    applyHighlight(idx);
    onChange?.(idx);
  }, [offsetToIdx, applyHighlight, onChange]);

  const snap = useCallback((offset) => {
    const ctr      = offset + CENTER_ROW * ITEM_H;
    const snappedC = Math.round(ctr / ITEM_H) * ITEM_H;
    const snapped  = normalize(snappedC - CENTER_ROW * ITEM_H);
    setOffset(snapped, true);
  }, [normalize, setOffset]);

  // ── Init ──
  useEffect(() => {
    const inner = innerRef.current;
    if (!inner) return;
    inner.innerHTML = "";
    const allItems = Array(COPIES).fill(items).flat();
    allItems.forEach(item => {
      const el = document.createElement("div");
      el.className   = "sw-item";
      el.textContent = String(item);
      inner.appendChild(el);
    });
    const initialOffset = normalize(
      (items.length * 2 + startIndex) * ITEM_H - CENTER_ROW * ITEM_H
    );
    setOffset(initialOffset, false);
  }, [items, startIndex]);

  // ── Drag handlers ──
  const onStart = useCallback((y) => {
    const s = stateRef.current;
    cancelAnimationFrame(s.rafId);
    s.dragging    = true;
    s.startY      = y;
    s.lastY       = y;
    s.lastT       = performance.now();
    s.velocity    = 0;
    s.startOffset = s.offset;
    if (innerRef.current) innerRef.current.style.transition = "none";
  }, []);

  const onMove = useCallback((y) => {
    const s = stateRef.current;
    if (!s.dragging) return;
    const now  = performance.now();
    const dt   = now - s.lastT || 16;
    s.velocity = (s.lastY - y) / dt;
    s.lastY    = y;
    s.lastT    = now;
    const raw  = s.startOffset + (s.startY - y);
    setOffset(normalize(raw), false);
  }, [normalize, setOffset]);

  const onEnd = useCallback(() => {
    const s = stateRef.current;
    if (!s.dragging) return;
    s.dragging = false;
    let vel    = s.velocity * 1000;
    let offset = s.offset;
    const FRICTION = 0.94;
    const MIN_VEL  = 0.5;

    const coast = () => {
      if (Math.abs(vel) < MIN_VEL) { snap(offset); return; }
      vel    *= FRICTION;
      offset += vel / 60;
      setOffset(normalize(offset), false);
      s.rafId = requestAnimationFrame(coast);
    };

    Math.abs(vel) > 80 ? coast() : snap(offset);
  }, [snap, normalize, setOffset]);

  // ── Touch / Mouse listeners ──
  useEffect(() => {
    const outer = outerRef.current;
    if (!outer) return;

    const touchStart = (e) => onStart(e.touches[0].clientY);
    const touchMove  = (e) => { e.preventDefault(); onMove(e.touches[0].clientY); };
    const touchEnd   = () => onEnd();
    const mouseDown  = (e) => { onStart(e.clientY); e.preventDefault(); };
    const mouseMove  = (e) => { if (stateRef.current.dragging) onMove(e.clientY); };
    const mouseLeave = () => { if (stateRef.current.dragging) onEnd(); };
    const mouseUp    = () => { if (stateRef.current.dragging) onEnd(); };

    outer.addEventListener("touchstart",  touchStart, { passive: true });
    outer.addEventListener("touchmove",   touchMove,  { passive: false });
    outer.addEventListener("touchend",    touchEnd,   { passive: true });
    outer.addEventListener("mousedown",   mouseDown);
    outer.addEventListener("mousemove",   mouseMove);
    outer.addEventListener("mouseleave",  mouseLeave);
    document.addEventListener("mouseup",  mouseUp);
    return () => {
      outer.removeEventListener("touchstart",  touchStart);
      outer.removeEventListener("touchmove",   touchMove);
      outer.removeEventListener("touchend",    touchEnd);
      outer.removeEventListener("mousedown",   mouseDown);
      outer.removeEventListener("mousemove",   mouseMove);
      outer.removeEventListener("mouseleave",  mouseLeave);
      document.removeEventListener("mouseup",  mouseUp);
    };
  }, [onStart, onMove, onEnd]);

  const wheelH = ITEM_H * VISIBLE;

  return (
    <div className={`sw-wrap ${widthClass}`}>
      <div className="sw-label">{label}</div>
      <div ref={outerRef} className="sw-outer" style={{ height: wheelH }}>
        {/* selector band */}
        <div className="sw-band" style={{ top: CENTER_ROW * ITEM_H, height: ITEM_H }} />
        {/* gradient fade top */}
        <div className="sw-fade sw-fade-top" />
        {/* gradient fade bottom */}
        <div className="sw-fade sw-fade-bot" />
        {/* scrollable inner */}
        <div ref={innerRef} className="sw-inner" />
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════
// WHAM SLAM Overlay
// ════════════════════════════════════════════════
function WhamSlam({ active, ref_text, sub }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (!active) return;
    setPhase(0);
    const t1 = setTimeout(() => setPhase(1), 300);
    const t2 = setTimeout(() => setPhase(2), 1120);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [active]);

  if (!active) return null;

  const phaseStyles = [
    { bg: "#ffffff", wordSize: 60, wordOp: 1, wordScale: 1,    refOp: 0, subOp: 0 },
    { bg: "#020617", wordSize: 96, wordOp: 1, wordScale: 1.08, refOp: 1, subOp: 1 },
    { bg: "#020617", wordSize: 96, wordOp: 0, wordScale: 1,    refOp: 0, subOp: 0 },
  ][phase];

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      background: phaseStyles.bg, transition: "background 0.15s",
    }}>
      <div style={{
        fontSize: phaseStyles.wordSize, fontWeight: 900, letterSpacing: 6,
        background: "linear-gradient(135deg, #f472b6, #c084fc, #818cf8)",
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        backgroundClip: "text", marginBottom: 16,
        opacity: phaseStyles.wordOp, transform: `scale(${phaseStyles.wordScale})`,
        transition: "font-size 0.2s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s, transform 0.2s cubic-bezier(0.34,1.56,0.64,1)",
        fontFamily: "'Cinzel', serif",
      }}>WHAM!</div>
      <div style={{
        color: "#4ade80", fontSize: 22, fontWeight: 800,
        letterSpacing: 2, textTransform: "uppercase",
        opacity: phaseStyles.refOp, transition: "opacity 0.3s",
        fontFamily: "'Cinzel', serif",
      }}>✅ {ref_text}</div>
      <div style={{
        color: "#475569", fontSize: 13, marginTop: 8,
        opacity: phaseStyles.subOp, transition: "opacity 0.3s 0.1s",
        fontFamily: "'Cinzel', serif",
      }}>{sub}</div>
    </div>
  );
}

// ════════════════════════════════════════════════
// Main Recovery Screen
// ════════════════════════════════════════════════
export default function Recovery() {
  // ── Load verse from sessionStorage or use demo ──
  const verse = (() => {
    try {
      const v = JSON.parse(sessionStorage.getItem("wb_recovery_verse") || "null");
      if (v?.book) return v;
    } catch (e) {}
    return DEMO_VERSE;
  })();

  const RECOVERY_SEC = 7;
  const circumference = 163.4;

  // ── State ──
  const [timeLeft,   setTimeLeft]   = useState(RECOVERY_SEC);
  const [submitted,  setSubmitted]  = useState(false);
  const [result,     setResult]     = useState(null);   // "correct" | "wrong" | null
  const [whamActive, setWhamActive] = useState(false);
  const [whamDrain,  setWhamDrain]  = useState(false);   // SP only — wrong answer vortex
  const [showDone,   setShowDone]   = useState(false);

  // ── Current wheel selections ──
  const bookIdxRef    = useRef(startIdx(ALL_BOOKS, verse.book, 8));
  const chapterIdxRef = useRef(startIdx(CHAPTERS,  verse.chapter, 4));
  const verseIdxRef   = useRef(startIdx(VERSES_N,  verse.verse,  4));

  const timerRef  = useRef(null);
  const panelRef  = useRef(null);   // WhamDrain clone target
  const audioRef = useRef(null);

  // ── Pre-warm audio ──
  useEffect(() => {
    audioRef.current = new Audio(WHAM_AUDIO);
    audioRef.current.preload = "auto";
    audioRef.current.load();
    return () => clearInterval(timerRef.current);
  }, []);

  // ── Timer ──
  useEffect(() => {
    let t = RECOVERY_SEC;
    timerRef.current = setInterval(() => {
      t -= 0.1;
      setTimeLeft(parseFloat(t.toFixed(1)));
      if (t <= 0) { clearInterval(timerRef.current); handleSubmit(); }
    }, 100);
    return () => clearInterval(timerRef.current);
  }, []);

  function startIdx(arr, correct, offset) {
    const idx = arr.findIndex ? arr.findIndex(v => String(v) === String(correct)) : -1;
    const len = arr.length;
    return ((idx - offset) % len + len) % len;
  }

  function playAudio() {
    try {
      if (audioRef.current) { audioRef.current.currentTime = 0; audioRef.current.play().catch(() => {}); }
    } catch (e) {}
  }

  function handleSubmit() {
    if (submitted) return;
    setSubmitted(true);
    clearInterval(timerRef.current);

    const selBook    = ALL_BOOKS[bookIdxRef.current];
    const selChapter = CHAPTERS[chapterIdxRef.current];
    const selVerse   = VERSES_N[verseIdxRef.current];
    const correct    = selBook === verse.book && selChapter === verse.chapter && selVerse === verse.verse;

    setResult(correct ? "correct" : "wrong");

    if (correct) {
      playAudio();
      setWhamActive(true);
      setTimeout(() => { setWhamActive(false); setShowDone(true); }, 1620);
    } else {
      // ── WHAM Drain: vortex fires immediately on wrong, onDone advances ──
      setWhamDrain(true);
    }
  }

  // ── Timer ring progress ──
  const timerPct    = timeLeft / RECOVERY_SEC;
  const dashOffset  = circumference * (1 - timerPct);
  const isRed       = timeLeft <= 3;
  const timerColor  = isRed ? "#C0392B" : C.gold;

  // ── Start indices for wheels ──
  const bookStart    = startIdx(ALL_BOOKS, verse.book,    8);
  const chapterStart = startIdx(CHAPTERS,  verse.chapter, 4);
  const verseStart   = startIdx(VERSES_N,  verse.verse,   4);

  return (
    <div ref={panelRef} style={{ minHeight: "100vh", background: C.ink, fontFamily: "'Georgia',serif", overflowX: "hidden", position: "relative" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800;900&display=swap');

        /* ── Backgrounds ── */
        .rec-bg-land {
          position:fixed; inset:0; z-index:0; pointer-events:none;
          background-image:url('${LANDSCAPE_BG}');
          background-size:cover; background-position:center top; opacity:0.55;
          -webkit-mask-image:linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 40%, rgba(0,0,0,0.3) 65%, rgba(0,0,0,0) 100%);
          mask-image:linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 40%, rgba(0,0,0,0.3) 65%, rgba(0,0,0,0) 100%);
        }
        .rec-bg-char {
          position:fixed; inset:0; z-index:1; pointer-events:none;
          background-image:url('${CHAR_RECOVERY}');
          background-size:78% auto; background-position:center 5%; background-repeat:no-repeat; opacity:0.9;
          -webkit-mask-image:linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.7) 7%, rgba(0,0,0,1) 18%, rgba(0,0,0,1) 48%, rgba(0,0,0,0.3) 65%, rgba(0,0,0,0) 80%);
          mask-image:linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.7) 7%, rgba(0,0,0,1) 18%, rgba(0,0,0,1) 48%, rgba(0,0,0,0.3) 65%, rgba(0,0,0,0) 80%);
        }
        .rec-bg-dark {
          position:fixed; inset:0; z-index:2; pointer-events:none;
          background:linear-gradient(to bottom,
            rgba(10,5,0,0.18) 0%,
            rgba(10,5,0,0.35) 45%,
            rgba(10,5,0,0.80) 70%,
            rgba(10,5,0,0.97) 85%,
            rgba(10,5,0,1.0)  100%
          );
        }
        .rec-bg-rim {
          position:fixed; inset:0; z-index:3; pointer-events:none;
          background:radial-gradient(ellipse at 50% -5%, rgba(212,146,26,0.18) 0%, transparent 55%);
        }

        /* ── Content ── */
        .rec-content {
          position:relative; z-index:4; max-width:480px; margin:0 auto;
          padding:0 16px 50px; display:flex; flex-direction:column; align-items:center;
        }
        .rec-hero-space { width:100%; }

        /* ── Panel ── */
        .rec-panel {
          width:100%;
          background:linear-gradient(180deg,
            rgba(10,5,0,0.0)   0%,
            rgba(10,5,0,0.82)  8%,
            rgba(10,5,0,0.97) 18%,
            rgba(10,5,0,0.97) 100%
          );
          border-radius:20px 20px 0 0;
          padding:22px 18px 0;
          margin-top:-30px;
        }
        .rec-curl {
          width:70%; height:4px; margin:0 auto 14px; border-radius:2px;
          background:linear-gradient(90deg, transparent, rgba(212,146,26,0.7), rgba(58,189,212,0.5), rgba(212,146,26,0.7), transparent);
        }

        /* ── Badge / Header ── */
        .rec-badge {
          font-family:'Cinzel',serif; font-size:10px; letter-spacing:2px;
          color:rgba(212,146,26,0.85); background:rgba(212,146,26,0.1);
          border:1px solid rgba(212,146,26,0.3); border-radius:20px; padding:5px 14px;
          text-transform:uppercase; margin-bottom:12px; text-align:center;
        }

        /* ── Verse card ── */
        .rec-verse-card {
          width:100%;
          background:rgba(201,162,39,0.06);
          border:1px solid rgba(201,162,39,0.22);
          border-radius:12px; padding:14px 18px; margin-bottom:14px;
        }
        .rec-verse-label {
          font-family:'Cinzel',serif; font-size:9px; letter-spacing:2px;
          color:rgba(201,162,26,0.5); text-transform:uppercase; margin-bottom:8px;
        }
        .rec-verse-text {
          font-size:13px; line-height:1.7; color:rgba(240,228,192,0.85);
          font-style:italic; margin:0 0 8px;
        }
        .rec-verse-ref {
          font-family:'Cinzel',serif; font-size:11px; color:${C.gold};
          text-align:right; letter-spacing:1px;
        }

        /* ── Instruction ── */
        .rec-instruction {
          font-family:'Cinzel',serif; font-size:10px; letter-spacing:1px;
          color:rgba(201,162,39,0.45); text-align:center; text-transform:uppercase;
          line-height:1.8; margin-bottom:10px;
        }

        /* ── Wheels container ── */
        .rec-wheels {
          display:flex; gap:8px; width:100%; justify-content:center;
          align-items:flex-start; margin-bottom:14px;
        }

        /* ── Individual wheel ── */
        .sw-wrap { display:flex; flex-direction:column; align-items:center; gap:5px; flex:1; }
        .sw-wrap.book-wrap    { flex:2.4; max-width:175px; }
        .sw-wrap.chapter-wrap { flex:1;   max-width:80px; }
        .sw-wrap.verse-wrap   { flex:1;   max-width:80px; }
        .sw-label {
          font-family:'Cinzel',serif; font-size:8px; letter-spacing:3px;
          color:rgba(201,162,39,0.35); text-transform:uppercase;
        }
        .sw-outer {
          position:relative; width:100%; border-radius:12px; overflow:hidden;
          background:linear-gradient(180deg, rgba(10,5,0,0.98) 0%, rgba(30,18,3,0.98) 50%, rgba(10,5,0,0.98) 100%);
          border:1px solid rgba(201,162,39,0.3);
          box-shadow:inset 0 0 24px rgba(0,0,0,0.6), 0 4px 16px rgba(0,0,0,0.4);
          cursor:grab; user-select:none; touch-action:none;
        }
        .sw-outer:active { cursor:grabbing; }
        .sw-inner  { display:flex; flex-direction:column; will-change:transform; position:absolute; left:0; right:0; top:0; }
        .sw-item {
          height:42px; display:flex; align-items:center; justify-content:center;
          font-family:'Cinzel',serif; font-size:12px;
          color:rgba(201,162,39,0.25); padding:0 5px; text-align:center; line-height:1.15;
          white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex-shrink:0;
          pointer-events:none; transition:color 0.12s, font-size 0.12s;
        }
        .sw-item.near2   { color:rgba(201,162,39,0.28); font-size:11.5px; }
        .sw-item.near1   { color:rgba(201,162,39,0.55); font-size:12.5px; }
        .sw-item.selected {
          color:#f0e4c0; font-size:14px; font-weight:700;
          text-shadow:0 0 12px rgba(201,162,39,0.7);
        }
        /* selector band */
        .sw-band {
          position:absolute; left:0; right:0; z-index:4; pointer-events:none;
          background:rgba(201,162,39,0.07);
          border-top:1px solid rgba(201,162,39,0.45);
          border-bottom:1px solid rgba(201,162,39,0.45);
        }
        /* fade overlays */
        .sw-fade {
          position:absolute; left:0; right:0; z-index:3; pointer-events:none; height:65px;
        }
        .sw-fade-top { top:0;    background:linear-gradient(180deg, rgba(10,5,0,0.96) 0%, transparent 100%); }
        .sw-fade-bot { bottom:0; background:linear-gradient(0deg,   rgba(10,5,0,0.96) 0%, transparent 100%); }

        /* ── Timer row ── */
        .rec-timer-row {
          display:flex; align-items:center; justify-content:center; gap:10px; margin-bottom:14px;
        }
        .rec-timer-ring { position:relative; width:64px; height:64px; flex-shrink:0; }
        .timer-svg { width:64px; height:64px; transform:rotate(-90deg); }
        .timer-track    { fill:none; stroke:rgba(212,146,26,0.1); stroke-width:4; }
        .timer-progress { fill:none; stroke-width:4; stroke-linecap:round; stroke-dasharray:163.4; transition:stroke-dashoffset 0.1s linear, stroke 0.3s; }
        .timer-num {
          position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
          font-family:'Cinzel',serif; font-size:20px; font-weight:700;
        }

        /* ── Submit button ── */
        .rec-submit {
          width:100%; padding:15px; border:none; border-radius:12px;
          font-family:'Cinzel',serif; font-size:15px; font-weight:800;
          letter-spacing:2px; text-transform:uppercase; cursor:pointer;
          background:linear-gradient(135deg, ${C.gold}, #a07720);
          color:#0f172a; transition:opacity 0.15s, transform 0.1s;
          box-shadow:0 4px 20px rgba(212,146,26,0.4); margin-bottom:14px;
        }
        .rec-submit:active { transform:scale(0.98); opacity:0.9; }
        .rec-submit:disabled { opacity:0.5; cursor:not-allowed; }

        /* ── Result banner ── */
        .rec-result {
          width:100%; border-radius:12px; padding:16px 20px;
          text-align:center; margin-bottom:14px;
          font-family:'Cinzel',serif;
          animation:recResultIn 0.35s ease;
        }
        .rec-result.correct {
          background:rgba(26,122,74,0.18); border:1.5px solid rgba(26,122,74,0.5);
        }
        .rec-result.wrong {
          background:rgba(192,58,43,0.14); border:1.5px solid rgba(192,58,43,0.4);
        }
        .rec-result-icon { font-size:32px; margin-bottom:6px; }
        .rec-result-title { font-size:16px; font-weight:800; letter-spacing:2px; margin-bottom:4px; }
        .rec-result.correct .rec-result-title { color:#4ade80; }
        .rec-result.wrong   .rec-result-title { color:#f87171; }
        .rec-result-sub { font-size:11px; letter-spacing:1px; color:rgba(240,228,192,0.55); }

        /* ── Home button ── */
        .rec-home-btn {
          width:100%; padding:13px; border:1.5px solid rgba(201,162,39,0.28);
          border-radius:10px; background:transparent; color:rgba(201,162,39,0.7);
          font-family:'Cinzel',serif; font-size:13px; letter-spacing:1px;
          text-transform:uppercase; cursor:pointer; transition:all 0.18s; margin-bottom:30px;
        }
        .rec-home-btn:hover { background:rgba(201,162,39,0.08); color:${C.gold}; }

        @keyframes recResultIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
      `}</style>

      {/* WHAM SLAM */}
      <WhamSlam active={whamActive} ref_text={`${verse.book} ${verse.chapter}:${verse.verse}`} sub="Recovered!" />

      {/* WHAM DRAIN — SP wrong answer vortex */}
      {whamDrain && (
        <WhamDrain
          panelRef={panelRef}
          onDone={() => { setWhamDrain(false); setShowDone(true); }}
        />
      )}

      {/* Background layers */}
      <div className="rec-bg-land" />
      <div className="rec-bg-char" />
      <div className="rec-bg-dark" />
      <div className="rec-bg-rim" />

      {/* Content */}
      <div className="rec-content">
        <div className="rec-hero-space" style={{ height: 175 }} />

        <div className="rec-panel">
          <div className="rec-curl" />

          {/* Badge */}
          <div className="rec-badge">📜 Scroll Recovery · {
            {5:"🗡️ Squire", 10:"⚔️ Warrior", 15:"🛡️ Knight", 20:"👑 Champion"}[verse.pts] || `${verse.pts}pt`
          } · Recover +5</div>

          {/* Verse */}
          <div className="rec-verse-card">
            <div className="rec-verse-label">📖 The Verse You Missed</div>
            <p className="rec-verse-text">"{verse.text}"</p>
            <div className="rec-verse-ref">— {verse.book} {verse.chapter}:{verse.verse}</div>
          </div>

          {!showDone ? (
            <>
              {/* Instruction */}
              <p className="rec-instruction">
                Spin the wheels to the <strong>correct Book · Chapter · Verse</strong><br />
                Then hit Submit before time runs out
              </p>

              {/* Timer + Wheels */}
              <div className="rec-timer-row">
                <div className="rec-timer-ring">
                  <svg className="timer-svg" viewBox="0 0 56 56">
                    <circle className="timer-track"    cx="28" cy="28" r="26" />
                    <circle className="timer-progress" cx="28" cy="28" r="26"
                      style={{ strokeDashoffset: dashOffset, stroke: timerColor }} />
                  </svg>
                  <div className="timer-num" style={{ color: timerColor }}>
                    {Math.ceil(timeLeft)}
                  </div>
                </div>
              </div>

              {/* Wheels */}
              <div className="rec-wheels">
                <ScrollWheel
                  items={ALL_BOOKS} startIndex={bookStart} label="Book" widthClass="book-wrap"
                  onChange={(idx) => { bookIdxRef.current = idx; }}
                />
                <ScrollWheel
                  items={CHAPTERS} startIndex={chapterStart} label="Chapter" widthClass="chapter-wrap"
                  onChange={(idx) => { chapterIdxRef.current = idx; }}
                />
                <ScrollWheel
                  items={VERSES_N} startIndex={verseStart} label="Verse" widthClass="verse-wrap"
                  onChange={(idx) => { verseIdxRef.current = idx; }}
                />
              </div>

              {/* Submit */}
              <button className="rec-submit" onClick={handleSubmit} disabled={submitted}>
                ⚔️ Submit Recovery
              </button>
            </>
          ) : (
            /* Result */
            <>
              <div className={`rec-result ${result}`}>
                <div className="rec-result-icon">{result === "correct" ? "✅" : "❌"}</div>
                <div className="rec-result-title">
                  {result === "correct" ? "RECOVERED! +5 pts" : "MISSED IT"}
                </div>
                <div className="rec-result-sub">
                  {result === "correct"
                    ? `${verse.book} ${verse.chapter}:${verse.verse} — locked in!`
                    : `The answer was ${verse.book} ${verse.chapter}:${verse.verse}`
                  }
                </div>
              </div>
              <button className="rec-home-btn" onClick={() => window.location.href = "/"}>
                ← Back to Game
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
// Build: 1776917765
// ══════════════════════════════════════════════════════════════════
// ── WHAM DRAIN v4 ────────────────────────────────────────────────
// Designer spec: uniform X/Y scale, circular tangential stretch
// along the spiral path, orbital velocity that ACCELERATES toward
// center (slow outer → violent inner), pixel-pull vacuum effect,
// final implosion once everything hits dead center.
//
// PHYSICS:
//   — scale(X,Y) always congruent — object shrinks as one piece
//   — scaleX stretches TANGENTIALLY (along direction of travel)
//   — scaleY compresses RADIALLY (gravity squeezing inward)
//   — rotate() uses custom cubic-bezier: slow start → exponential
//     acceleration as the spiral tightens
//   — translate() pulls the whole mass toward center, accelerating
//   — blur/brightness only spike at the very end — implosion frame
//
// TIMELINE (1700ms total):
//   0ms        — Stamp frozen. Intact on white void.
//   0–300ms    — Gravity detected. Gentle tilt, first orbital pull.
//   300–700ms  — Orbit established. Circular stretch begins along
//                path. Scale ~0.7, rotate ~120°, speed building.
//   700–1150ms — Acceleration phase. Tighter spiral, scale ~0.3,
//                rotate ~270°. Tangential stretch peaks here.
//   1150–1500ms— Terminal velocity. Scale ~0.05, rotate ~450°.
//                Everything blurring toward singularity.
//   1500–1650ms— IMPLOSION. Scale 0, rotate 540°. Bright white
//                flash-point expands then collapses in 150ms.
//   1700ms     — onDone → SPRecovery slides in.
// ══════════════════════════════════════════════════════════════════
function WhamDrain({ panelRef, onDone }) {
  const cloneRef  = useRef(null);
  const singRef   = useRef(null);

  useEffect(() => {
    // ── Stamp the panel as a frozen clone ──
    const source = panelRef?.current;
    if (source && cloneRef.current) {
      const clone = source.cloneNode(true);
      const rect  = source.getBoundingClientRect();
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

    // ── Double-rAF: mount first, then trigger ──
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (cloneRef.current) cloneRef.current.classList.add("wd-vortex");
      });
    });

    // ── Implosion fires at 1500ms (150ms before onDone) ──
    const implosionT = setTimeout(() => {
      if (singRef.current) singRef.current.classList.add("wd-implode");
    }, 1500);

    const doneT = setTimeout(() => onDone && onDone(), 1700);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(implosionT);
      clearTimeout(doneT);
    };
  }, []);

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:9000,
      background:"#ffffff",
      display:"flex", alignItems:"center", justifyContent:"center",
      overflow:"hidden",
    }}>
      {/* ── The frozen stamp — one intact object pulled into the vortex ── */}
      <div ref={cloneRef} className="wd-stamp" style={{
        position:"relative",
        width:"100%", maxWidth:480,
        transformOrigin:"50% 50%",
        zIndex:2,
      }} />

      {/* ── Implosion point at dead center ── */}
      <div ref={singRef} className="wd-implode-ring" style={{
        position:"absolute",
        top:"50%", left:"50%",
        transform:"translate(-50%,-50%)",
        zIndex:5, pointerEvents:"none",
      }} />

      <style>{`
        /* ══ BASE STAMP ══ */
        .wd-stamp {
          will-change: transform, opacity, filter;
        }

        /* ══ VORTEX DRAIN ══════════════════════════════════════════════
           Circular stretch = scaleX elongates ALONG direction of travel
           while scaleY compresses inward. Both start equal and diverge
           as the spiral tightens. Rotation accelerates exponentially —
           the custom timing function front-loads the slow outer orbit
           and back-loads the violent terminal pull.
           translate(-2%,-2%) nudges mass toward center continuously.
        ══════════════════════════════════════════════════════════════ */
        .wd-vortex {
          animation: wdVortex 1.5s cubic-bezier(0.12, 0, 0.95, 1) forwards;
        }

        @keyframes wdVortex {

          /* FRAME 0: Intact. Gravity just beginning to bite. */
          0% {
            transform:
              translate(0%, 0%)
              rotate(0deg)
              scale(1, 1)
              skewX(0deg);
            opacity: 1;
            filter: blur(0px) brightness(1);
          }

          /* FRAME 1 ~18% (270ms): First orbital tug.
             Slight tilt, tangential stretch just starting.
             scaleX > scaleY — stretching along the path. */
          18% {
            transform:
              translate(-1%, -1%)
              rotate(45deg)
              scale(0.88, 0.82)
              skewX(-4deg);
            opacity: 1;
            filter: blur(0.3px) brightness(1.02);
          }

          /* FRAME 2 ~38% (570ms): Orbit established.
             Circular stretch visible — object curves with path.
             Velocity building. */
          38% {
            transform:
              translate(-2%, -2%)
              rotate(120deg)
              scale(0.62, 0.54)
              skewX(-10deg);
            opacity: 0.95;
            filter: blur(0.8px) brightness(1.08) contrast(1.1);
          }

          /* FRAME 3 ~57% (855ms): Mid-spiral. Speed doubling.
             scaleX tangential stretch peaks — wide along path.
             scaleY radial compression — squeezed by gravity. */
          57% {
            transform:
              translate(-3%, -2%)
              rotate(228deg)
              scale(0.36, 0.26)
              skewX(-18deg);
            opacity: 0.82;
            filter: blur(2px) brightness(1.2) contrast(1.25);
          }

          /* FRAME 4 ~74% (1110ms): Acceleration phase.
             Orbital path tightening rapidly. Almost gone. */
          74% {
            transform:
              translate(-2%, -1%)
              rotate(348deg)
              scale(0.14, 0.09)
              skewX(-26deg);
            opacity: 0.55;
            filter: blur(5px) brightness(1.6) contrast(1.8);
          }

          /* FRAME 5 ~88% (1320ms): Terminal velocity.
             Pixels racing toward singularity. */
          88% {
            transform:
              translate(-1%, 0%)
              rotate(450deg)
              scale(0.04, 0.025)
              skewX(-30deg);
            opacity: 0.25;
            filter: blur(10px) brightness(2.5) contrast(3);
          }

          /* FRAME 6 100% (1500ms): Everything hits center. White out. */
          100% {
            transform:
              translate(0%, 0%)
              rotate(540deg)
              scale(0, 0)
              skewX(0deg);
            opacity: 0;
            filter: blur(18px) brightness(6) contrast(5);
          }
        }

        /* ══ IMPLOSION RING ════════════════════════════════════════════
           Fires at 1500ms. Expands fast from 0 → 80px, then
           collapses violently back to 0 in 150ms. Final punctuation.
        ══════════════════════════════════════════════════════════════ */
        .wd-implode-ring {
          width: 0; height: 0;
          border-radius: 50%;
          opacity: 0;
        }
        .wd-implode {
          animation: wdImplode 0.2s cubic-bezier(0.2, 0, 0.4, 1) forwards;
        }
        @keyframes wdImplode {
          0%   {
            width: 0; height: 0; opacity: 0;
            box-shadow: none;
            background: transparent;
          }
          35%  {
            width: 80px; height: 80px; opacity: 1;
            background: radial-gradient(circle, #ffffff 0%, rgba(30,122,140,0.9) 40%, rgba(26,58,92,0.6) 70%, transparent 100%);
            box-shadow: 0 0 60px 30px rgba(255,255,255,0.9), 0 0 20px 8px rgba(30,122,140,0.8);
            transform: translate(-50%, -50%);
          }
          70%  {
            width: 20px; height: 20px; opacity: 0.8;
            background: radial-gradient(circle, #ffffff 0%, rgba(30,122,140,1) 60%, transparent 100%);
            box-shadow: 0 0 16px 8px rgba(30,122,140,0.6);
            transform: translate(-50%, -50%);
          }
          100% {
            width: 0; height: 0; opacity: 0;
            box-shadow: none;
            transform: translate(-50%, -50%);
          }
        }
      `}</style>
    </div>
  );
}

