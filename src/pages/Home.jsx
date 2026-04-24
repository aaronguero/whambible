import { useState } from "react";


// ── Asset URLs ──
const LANDSCAPE_BG  = "https://media.base44.com/images/public/69df9a909b33058a5ce47831/33b065c94_generated_image.png";
const LOGO_OVERLAY  = "https://media.base44.com/images/public/69df9a909b33058a5ce47831/1caa728f7_generated_image.png";

// ── New Palette — modern, luminous, cinematic ──
const C = {
  cobalt:    "#1A3A5C",
  cobaltDark:"#0D1F35",
  teal:      "#1E7A8C",
  tealLight: "#3ABDD4",
  gold:      "#D4921A",
  goldLight: "#F5C842",
  goldDim:   "rgba(212,146,26,0.30)",
  sand:      "#E8D5A0",
  sandDim:   "rgba(232,213,160,0.65)",
  white:     "#FFFFFF",
  offWhite:  "#F4F0E8",
  terra:     "#C05A2A",
  emerald:   "#1A7A4A",
};

const LANGUAGES = [
  { code: "en", flag: "🇺🇸" }, { code: "es", flag: "🇪🇸" }, { code: "fr", flag: "🇫🇷" },
  { code: "de", flag: "🇩🇪" }, { code: "pt", flag: "🇵🇹" }, { code: "it", flag: "🇮🇹" },
  { code: "zh", flag: "🇨🇳" }, { code: "ru", flag: "🇷🇺" }, { code: "ja", flag: "🇯🇵" },
  { code: "ar", flag: "🇸🇦" },
];

export default function Home() {
  const [lang, setLang] = useState("en");
  const [verseOpen, setVerseOpen] = useState(false);

  return (
    <div style={{ height: "100vh", background: "transparent", fontFamily: "'Georgia',serif", overflowX: "hidden", overflowY: "scroll", WebkitOverflowScrolling: "touch", position: "relative" }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;800&display=swap');

        /* ─────────────── BACKGROUND LAYERS ─────────────── */

        /* Layer 1: Deep night sky base */
        .wb-bg-land {
          position: fixed; inset: 0; z-index: 0; pointer-events: none;
          background:
            radial-gradient(ellipse at 50% 0%, rgba(26,58,92,0.95) 0%, #0D1F35 55%, #060e1c 100%);
        }

        /* Layer 2: Landscape photo — lower third, creates horizon floor */
        .wb-bg-landscape {
          position: fixed; bottom: 0; left: 0; right: 0;
          height: 52%; z-index: 1; pointer-events: none;
          background-image: url('${LANDSCAPE_BG}');
          background-size: cover; background-position: center bottom;
          -webkit-mask-image: linear-gradient(to bottom,
            rgba(0,0,0,0) 0%, rgba(0,0,0,0.6) 20%, rgba(0,0,0,1) 55%, rgba(0,0,0,1) 100%
          );
          mask-image: linear-gradient(to bottom,
            rgba(0,0,0,0) 0%, rgba(0,0,0,0.6) 20%, rgba(0,0,0,1) 55%, rgba(0,0,0,1) 100%
          );
          opacity: 0.55;
        }

        /* Layer 3: Logo centered in upper sky zone */
        .wb-bg-logo {
          position: fixed; inset: 0; z-index: 2; pointer-events: none;
          background-image: url('${LOGO_OVERLAY}');
          background-size: 72% auto;
          background-position: center 6%;
          background-repeat: no-repeat;
          opacity: 0.90;
          -webkit-mask-image: linear-gradient(to bottom,
            rgba(0,0,0,0) 0%,
            rgba(0,0,0,0.85) 6%,
            rgba(0,0,0,1) 18%,
            rgba(0,0,0,1) 50%,
            rgba(0,0,0,0.2) 68%,
            rgba(0,0,0,0) 80%
          );
          mask-image: linear-gradient(to bottom,
            rgba(0,0,0,0) 0%,
            rgba(0,0,0,0.85) 6%,
            rgba(0,0,0,1) 18%,
            rgba(0,0,0,1) 50%,
            rgba(0,0,0,0.2) 68%,
            rgba(0,0,0,0) 80%
          );
        }

        /* Layer 4: Gold rim crown at top */
        .wb-bg-rim {
          position: fixed; inset: 0; z-index: 3; pointer-events: none;
          background: radial-gradient(ellipse at 50% -5%, rgba(245,200,66,0.28) 0%, transparent 52%);
        }

        /* Layer 5: Vignette edges */
        .wb-bg-tone {
          position: fixed; inset: 0; z-index: 3; pointer-events: none;
          background:
            radial-gradient(ellipse at 0% 50%, rgba(6,14,28,0.55) 0%, transparent 50%),
            radial-gradient(ellipse at 100% 50%, rgba(6,14,28,0.55) 0%, transparent 50%);
        }

        /* ─────────────── ARCH FRAME ─────────────── */
        /* Stone arch framing the viewport — purely decorative SVG overlay */
        .wb-arch-frame {
          position: fixed; inset: 0; z-index: 4; pointer-events: none;
        }
        .wb-arch-frame svg {
          width: 100%; height: 100%;
        }

        /* ─────────────── CONTENT ─────────────── */
        .wb-content {
          position: relative; z-index: 5;
          max-width: 480px; margin: 0 auto;
          padding: 0 16px 120px;
          display: flex; flex-direction: column; align-items: center;
        }

        /* ─────────────── LANG BAR ─────────────── */
        .wb-lang-bar {
          display: flex; flex-wrap: wrap; gap: 7px;
          justify-content: center; padding: 12px 0 6px; width: 100%;
        }
        .wb-lang-btn {
          background: rgba(13,31,53,0.55);
          border: 1px solid rgba(245,200,66,0.25);
          border-radius: 22px; padding: 4px 12px;
          color: rgba(245,200,66,0.75); font-size: 12px;
          font-weight: 600; cursor: pointer;
          backdrop-filter: blur(6px);
          transition: all 0.18s; font-family: 'Cinzel', serif; letter-spacing: 0.5px;
        }
        .wb-lang-btn:hover, .wb-lang-btn.active {
          background: rgba(30,122,140,0.55); border-color: ${C.tealLight};
          color: #fff; box-shadow: 0 2px 10px rgba(30,122,140,0.4);
        }

        /* ─────────────── HERO SPACER ─────────────── */
        .wb-hero-space { height: 360px; width: 100%; }

        /* ─────────────── SCROLL PANEL ─────────────── */
        /* Parchment scroll rising from the scene floor */
        .wb-scroll-panel {
          width: 100%;
          background:
            linear-gradient(180deg,
              rgba(13,31,53,0.0) 0%,
              rgba(13,31,53,0.82) 6%,
              rgba(13,31,53,0.96) 14%,
              rgba(9,22,40,0.99) 100%
            );
          border-radius: 28px 28px 0 0;
          padding: 0 20px 78px;
          position: relative;
          z-index: 6;
          margin-top: -100px;
          overflow-y: visible;
          /* Outer gold border glow */
          box-shadow:
            0 -4px 32px rgba(212,146,26,0.18),
            inset 0 1px 0 rgba(245,200,66,0.12);
        }

        /* ── Scroll header — ornate top rod ── */
        .wb-scroll-header {
          position: relative;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 22px;
          padding-top: 20px;
        }

        /* Left & right finials (scroll rod ends) */
        .wb-scroll-header::before,
        .wb-scroll-header::after {
          content: '';
          flex: 1;
          height: 3px;
          background: linear-gradient(90deg, transparent, rgba(212,146,26,0.7), rgba(245,200,66,0.9));
          border-radius: 2px;
        }
        .wb-scroll-header::after {
          background: linear-gradient(90deg, rgba(245,200,66,0.9), rgba(212,146,26,0.7), transparent);
        }

        /* Center ornament */
        .wb-scroll-ornament {
          font-size: 20px;
          margin: 0 12px;
          filter: drop-shadow(0 0 6px rgba(245,200,66,0.6));
          line-height: 1;
        }

        /* Vertical side borders — scroll edge lines */
        .wb-scroll-panel::before {
          content: '';
          position: absolute;
          top: 28px; bottom: 0;
          left: 10px;
          width: 2px;
          background: linear-gradient(180deg,
            rgba(212,146,26,0.6) 0%,
            rgba(212,146,26,0.2) 30%,
            transparent 70%
          );
          border-radius: 1px;
          pointer-events: none;
        }
        .wb-scroll-panel::after {
          content: '';
          position: absolute;
          top: 28px; bottom: 0;
          right: 10px;
          width: 2px;
          background: linear-gradient(180deg,
            rgba(212,146,26,0.6) 0%,
            rgba(212,146,26,0.2) 30%,
            transparent 70%
          );
          border-radius: 1px;
          pointer-events: none;
        }

        /* Scroll top curl — now a divider below the rod */
        .wb-scroll-curl {
          width: 85%; height: 1px; margin: 0 auto 20px;
          background: linear-gradient(90deg, transparent, rgba(212,146,26,0.45), rgba(58,189,212,0.35), rgba(212,146,26,0.45), transparent);
        }

        /* ─────────────── TAGLINE ─────────────── */; text-transform: uppercase;
          text-align: center; margin: 0 0 18px;
          opacity: 0.85;
          text-shadow: 0 1px 4px rgba(255,255,255,0.6);
        }

        /* ─────────────── MISSION LINE ─────────────── */;
          text-shadow: 0 1px 4px rgba(255,255,255,0.6);
        } 0%, ${C.tealLight} 50%, ${C.gold} 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
          font-size: 1.05rem; font-weight: 800; letter-spacing: 0.28em;
          text-shadow: none;
          filter: drop-shadow(0 1px 6px rgba(58,189,212,0.45));
        }

        /* ─────────────── VERSE CARD ─────────────── */
        .wb-verse-card {
          width: 100%; box-sizing: border-box;
          background: rgba(13,31,53,0.72);
          border: 1.5px solid rgba(212,146,26,0.60);
          border-radius: 12px;
          box-shadow: 0 3px 18px rgba(0,0,0,0.30);
          margin-bottom: 18px; overflow: hidden;
        }
        .wb-verse-card-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 18px; cursor: pointer; user-select: none;
          background: rgba(30,122,140,0.60);
          width: 100%; border: none; text-align: left;
          border-radius: 12px;
          transition: background 0.18s;
        }
        .wb-verse-card-header:active {
          background: rgba(30,122,140,0.90);
        }
        .wb-verse-card-body {
          padding: 0 18px 16px;
        }
        .wb-verse-label {
          color: #FFFFFF; font-size: 10px; letter-spacing: 2px;
          text-transform: uppercase; margin: 0;
          font-family: 'Cinzel', serif; font-weight: 600;
        }
        .wb-verse-text {
          color: #000000; font-size: 14px;
          line-height: 1.75; font-style: italic; margin-bottom: 10px;
        }
        .wb-verse-ref {
          color: #000000; font-size: 12px;
          text-align: right; letter-spacing: 1px;
          font-family: 'Cinzel', serif; font-weight: 600;
        }

        /* ─────────────── BUTTONS ─────────────── */
        .wb-btn-row { width: 100%; display: flex; flex-direction: column; gap: 11px; margin-bottom: 14px; }

        .wb-btn-primary {
          width: 100%; padding: 15px 24px;
          background: linear-gradient(135deg, ${C.gold} 0%, #b87614 50%, ${C.gold} 100%);
          background-size: 200% 100%; border: none; border-radius: 10px;
          color: #fff; font-size: 16px; font-weight: 700;
          font-family: 'Cinzel', serif; letter-spacing: 3px; text-transform: uppercase;
          cursor: pointer; transition: all 0.2s;
          box-shadow: 0 4px 20px rgba(212,146,26,0.40), inset 0 1px 0 rgba(255,255,255,0.25);
          text-shadow: 0 1px 3px rgba(0,0,0,0.3);
        }
        .wb-btn-primary:hover {
          background-position: right; transform: translateY(-2px);
          box-shadow: 0 7px 28px rgba(212,146,26,0.55);
        }

        .wb-btn-secondary {
          width: 100%; padding: 13px 24px;
          background: ${C.teal};
          border: none; border-radius: 10px;
          color: #fff; font-size: 14px; font-weight: 700;
          font-family: 'Cinzel', serif; letter-spacing: 2px; text-transform: uppercase;
          cursor: pointer; transition: all 0.2s;
          box-shadow: 0 3px 14px rgba(30,122,140,0.40);
        }
        .wb-btn-secondary:hover {
          background: ${C.tealLight}; transform: translateY(-2px);
          box-shadow: 0 6px 22px rgba(58,189,212,0.50);
        }

        .wb-btn-ghost {
          width: 100%; padding: 11px 24px;
          background: rgba(26,58,92,0.07);
          border: 1.5px solid rgba(26,58,92,0.22); border-radius: 10px;
          color: ${C.cobalt}; font-size: 13px;
          font-family: 'Cinzel', serif; letter-spacing: 1px; text-transform: uppercase;
          cursor: pointer; transition: all 0.18s;
        }
        .wb-btn-ghost:hover {
          background: rgba(26,58,92,0.13); border-color: ${C.teal};
          color: ${C.teal}; transform: translateY(-1px);
        }


        /* ─────────────── DONATE ─────────────── */
        .wb-btn-donate {
          width: 100%; padding: 13px 24px;
          background: linear-gradient(135deg, ${C.terra} 0%, #8C320E 100%);
          border: none; border-radius: 10px;
          color: #fff; font-size: 13px; font-weight: 700;
          font-family: 'Cinzel', serif; letter-spacing: 1px;
          cursor: pointer; transition: all 0.2s;
          box-shadow: 0 3px 16px rgba(192,90,42,0.35);
          margin-bottom: 24px; text-transform: uppercase;
        }
        .wb-btn-donate:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 24px rgba(192,90,42,0.50);
        }

        /* ─────────────── DIVIDER ─────────────── */
                .wb-tagline {
          font-family: 'Cinzel', serif;
          font-size: 12px;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: #1E7A8C;
          text-align: center;
          margin: 4px 0 12px;
        }

        .wb-mission {
          font-family: 'Cinzel', serif;
          font-size: 12px;
          letter-spacing: 2px;
          text-transform: uppercase;
          text-align: center;
          margin: 10px 0;
          color: rgba(212,146,26,0.75);
        }
        .wb-mission-prefix { color: #FFFFFF; }
        .wb-mission-wham   { color: #FFFFFF; font-weight: 700; }

        .wb-divider {
          width: 80%; height: 1.5px; margin: 14px 0;
          background: linear-gradient(90deg, transparent, ${C.teal}, ${C.gold}, ${C.teal}, transparent);
          opacity: 0.4; border-radius: 1px;
        }

        /* ─────────────── FOOTER ─────────────── */
        .wb-footer {
          color: rgba(255,255,255,0.85); font-size: 10px; letter-spacing: 1px;
          text-align: center; line-height: 1.8; padding-top: 8px;
        }
      `}</style>

      {/* ── Background stack ── */}
      <div className="wb-bg-land" />
      <div className="wb-bg-landscape" />
      <div className="wb-bg-logo" />
      <div className="wb-bg-tone" />
      <div className="wb-bg-rim" />

      {/* ── Arch frame SVG overlay ── */}
      <div className="wb-arch-frame">
        <svg viewBox="0 0 390 844" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="archGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor="#D4921A" stopOpacity="0.9"/>
              <stop offset="40%"  stopColor="#F5C842" stopOpacity="1"/>
              <stop offset="70%"  stopColor="#D4921A" stopOpacity="0.85"/>
              <stop offset="100%" stopColor="#8B6010" stopOpacity="0.7"/>
            </linearGradient>
            <linearGradient id="archGoldV" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%"   stopColor="#F5C842" stopOpacity="1"/>
              <stop offset="60%"  stopColor="#D4921A" stopOpacity="0.7"/>
              <stop offset="100%" stopColor="#D4921A" stopOpacity="0"/>
            </linearGradient>
            <filter id="archGlow">
              <feGaussianBlur stdDeviation="2.5" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>

          {/* ── LEFT PILLAR ── */}
          {/* Outer edge */}
          <rect x="0" y="0" width="4" height="620" fill="url(#archGoldV)" opacity="0.9"/>
          {/* Inner pillar line */}
          <rect x="18" y="0" width="2" height="600" fill="url(#archGoldV)" opacity="0.55"/>
          {/* Stone block texture marks */}
          {[80,160,240,320,400,480].map((y,i) => (
            <line key={i} x1="4" y1={y} x2="20" y2={y} stroke="#D4921A" strokeWidth="0.8" opacity="0.3"/>
          ))}
          {/* Pillar ornament knot at top */}
          <circle cx="11" cy="44" r="7" fill="none" stroke="#F5C842" strokeWidth="1.5" opacity="0.8" filter="url(#archGlow)"/>
          <circle cx="11" cy="44" r="3" fill="#F5C842" opacity="0.9"/>

          {/* ── RIGHT PILLAR ── */}
          <rect x="386" y="0" width="4" height="620" fill="url(#archGoldV)" opacity="0.9"/>
          <rect x="370" y="0" width="2" height="600" fill="url(#archGoldV)" opacity="0.55"/>
          {[80,160,240,320,400,480].map((y,i) => (
            <line key={i} x1="370" y1={y} x2="386" y2={y} stroke="#D4921A" strokeWidth="0.8" opacity="0.3"/>
          ))}
          <circle cx="379" cy="44" r="7" fill="none" stroke="#F5C842" strokeWidth="1.5" opacity="0.8" filter="url(#archGlow)"/>
          <circle cx="379" cy="44" r="3" fill="#F5C842" opacity="0.9"/>

          {/* ── TOP ARCH ── */}
          {/* Outer arch stroke */}
          <path
            d="M 4,200 Q 4,28 195,28 Q 386,28 386,200"
            fill="none" stroke="url(#archGold)" strokeWidth="4"
            strokeLinecap="round" filter="url(#archGlow)" opacity="0.95"
          />
          {/* Inner arch line */}
          <path
            d="M 20,210 Q 20,48 195,48 Q 370,48 370,210"
            fill="none" stroke="rgba(245,200,66,0.35)" strokeWidth="1.5"
            strokeLinecap="round" strokeDasharray="8 5"
          />
          {/* Arch keystone — center top */}
          <path d="M 183,28 L 195,10 L 207,28 Z" fill="#F5C842" opacity="0.85" filter="url(#archGlow)"/>
          <rect x="189" y="4" width="12" height="4" rx="2" fill="#F5C842" opacity="0.7"/>

          {/* ── ARCH CORNER FLOURISHES ── */}
          {/* Top-left corner */}
          <path d="M 4,195 Q 4,170 22,162" fill="none" stroke="#F5C842" strokeWidth="1.8" opacity="0.6"/>
          <path d="M 4,215 Q 4,182 26,172" fill="none" stroke="rgba(245,200,66,0.3)" strokeWidth="1" opacity="0.5"/>
          {/* Top-right corner */}
          <path d="M 386,195 Q 386,170 368,162" fill="none" stroke="#F5C842" strokeWidth="1.8" opacity="0.6"/>
          <path d="M 386,215 Q 386,182 364,172" fill="none" stroke="rgba(245,200,66,0.3)" strokeWidth="1" opacity="0.5"/>

          {/* ── HORIZONTAL HEADER BAR ── */}
          <line x1="4" y1="72" x2="386" y2="72" stroke="rgba(245,200,66,0.18)" strokeWidth="1"/>

          {/* ── BOTTOM FLOOR LINE — scroll panel boundary ── */}
          <line x1="0" y1="490" x2="390" y2="490" stroke="url(#archGold)" strokeWidth="1.5" opacity="0.3"/>
        </svg>
      </div>

      <div className="wb-content">

        {/* Language Bar */}
        <div className="wb-lang-bar">
          {LANGUAGES.map(l => (
            <button
              key={l.code}
              className={`wb-lang-btn${lang === l.code ? " active" : ""}`}
              onClick={() => setLang(l.code)}
              title={`${l.code.toUpperCase()} (coming soon)`}
            >
              {l.flag} {l.code.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Hero space — logo/characters bleed through BG layers here */}
        <div className="wb-hero-space" />

        {/* Scroll Panel — rises from scene floor, ornate parchment styling */}
        <div className="wb-scroll-panel">
          {/* Scroll rod header */}
          <div className="wb-scroll-header">
            <div className="wb-scroll-ornament">✦</div>
          </div>
          <div className="wb-scroll-curl" />

          {/* Verse Card */}
          <div className="wb-verse-card">
            <button className="wb-verse-card-header" onClick={() => setVerseOpen(v => !v)}>
              <div className="wb-verse-label">📜 Today's Challenge Verse</div>
              <span style={{ fontSize:14, color:C.teal, fontWeight:700, transition:"transform 0.25s", display:"inline-block", transform: verseOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
            </button>
            {verseOpen && (
              <div className="wb-verse-card-body">
                <p className="wb-verse-text">
                  "For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life."
                </p>
                <p className="wb-verse-ref">— John 3:16</p>
              </div>
            )}
          </div>

          {/* Tagline */}
          <p className="wb-tagline">⚔️ Know the Word · Win the Battle ⚔️</p>

          {/* Main CTA Buttons */}
          <div className="wb-btn-row">
            <button className="wb-btn-primary" onClick={() => window.location.href = "/solo"}>⚔️ Play Solo</button>
            <button className="wb-btn-secondary" onClick={() => window.location.href = "/challenge"}>👥 Challenge a Friend</button>
          </div>


          <p className="wb-mission">
            <span className="wb-mission-prefix">We Have A Mission · </span>
            <span className="wb-mission-wham">WHAM</span>
          </p>

          {/* Donate */}
          <button className="wb-btn-donate" onClick={() => window.open("https://whambible.org", "_blank")}>
            ❤️ Support WhamBible.org — Donate
          </button>

          {/* Footer */}
          <div className="wb-footer">
            © 2026 WhamBible · A WhamWorld Production · whambible.com<br />
            🌐 Multilingual Support Coming Soon
          </div>

        </div>{/* /scroll-panel */}
      </div>
    </div>
  );
}
