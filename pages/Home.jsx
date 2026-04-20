import { useState } from "react";
import { createPageUrl } from "@/utils";

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

  return (
    <div style={{ minHeight: "100vh", background: C.cobaltDark, fontFamily: "'Georgia',serif", overflowX: "hidden", position: "relative" }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;800&display=swap');

        /* ─────────────── BACKGROUND LAYERS ─────────────── */

        /* Layer 1: The landscape — full brightness, fades to WHITE at bottom */
        .wb-bg-land {
          position: fixed; inset: 0; z-index: 0; pointer-events: none;
          background-image: url('${LANDSCAPE_BG}');
          background-size: cover; background-position: center top;
          opacity: 0.92;
          -webkit-mask-image: linear-gradient(to bottom,
            rgba(0,0,0,1)   0%,
            rgba(0,0,0,1)  48%,
            rgba(0,0,0,0.6) 65%,
            rgba(0,0,0,0.1) 82%,
            rgba(0,0,0,0)   100%
          );
          mask-image: linear-gradient(to bottom,
            rgba(0,0,0,1)   0%,
            rgba(0,0,0,1)  48%,
            rgba(0,0,0,0.6) 65%,
            rgba(0,0,0,0.1) 82%,
            rgba(0,0,0,0)   100%
          );
        }

        /* Layer 2: Logo/characters — centered, full color, fade bottom */
        .wb-bg-logo {
          position: fixed; inset: 0; z-index: 1; pointer-events: none;
          background-image: url('${LOGO_OVERLAY}');
          background-size: 85% auto;
          background-position: center 8%;
          background-repeat: no-repeat;
          opacity: 0.96;
          -webkit-mask-image: linear-gradient(to bottom,
            rgba(0,0,0,0)   0%,
            rgba(0,0,0,0.7) 8%,
            rgba(0,0,0,1)  20%,
            rgba(0,0,0,1)  55%,
            rgba(0,0,0,0.4) 72%,
            rgba(0,0,0,0)   88%
          );
          mask-image: linear-gradient(to bottom,
            rgba(0,0,0,0)   0%,
            rgba(0,0,0,0.7) 8%,
            rgba(0,0,0,1)  20%,
            rgba(0,0,0,1)  55%,
            rgba(0,0,0,0.4) 72%,
            rgba(0,0,0,0)   88%
          );
        }

        /* Layer 3: Color toning — cobalt/teal cast, bottom fades to warm sand-white */
        .wb-bg-tone {
          position: fixed; inset: 0; z-index: 2; pointer-events: none;
          background:
            linear-gradient(
              to bottom,
              rgba(13,31,53,0.08)  0%,
              rgba(30,122,140,0.06) 35%,
              rgba(232,213,160,0.22) 68%,
              rgba(255,252,245,0.88) 85%,
              rgba(255,252,245,1.0)  100%
            );
        }

        /* Layer 4: Subtle rim light at top */
        .wb-bg-rim {
          position: fixed; inset: 0; z-index: 3; pointer-events: none;
          background: radial-gradient(ellipse at 50% -10%, rgba(245,200,66,0.22) 0%, transparent 55%);
        }

        /* ─────────────── CONTENT ─────────────── */
        .wb-content {
          position: relative; z-index: 4;
          max-width: 480px; margin: 0 auto;
          padding: 0 16px 40px;
          display: flex; flex-direction: column; align-items: center;
        }

        /* ─────────────── LANG BAR ─────────────── */
        .wb-lang-bar {
          display: flex; flex-wrap: wrap; gap: 6px;
          justify-content: center; padding: 12px 0 6px; width: 100%;
        }
        .wb-lang-btn {
          background: rgba(255,255,255,0.25);
          border: 1px solid rgba(30,122,140,0.45);
          border-radius: 20px; padding: 4px 11px;
          color: ${C.cobalt}; font-size: 11px;
          font-weight: 600; cursor: pointer;
          backdrop-filter: blur(4px);
          transition: all 0.18s; font-family: 'Cinzel', serif; letter-spacing: 0.5px;
        }
        .wb-lang-btn:hover, .wb-lang-btn.active {
          background: ${C.teal}; border-color: ${C.tealLight};
          color: #fff; box-shadow: 0 2px 10px rgba(30,122,140,0.4);
        }

        /* ─────────────── HERO SPACER (logo bleeds through bg) ─────────────── */
        .wb-hero-space { height: 280px; width: 100%; }

        /* ─────────────── SCROLL PANEL ─────────────── */
        .wb-scroll-panel {
          width: 100%;
          background: linear-gradient(180deg,
            rgba(255,252,245,0.0)  0%,
            rgba(255,252,245,0.82) 12%,
            rgba(255,252,245,0.97) 25%,
            rgba(255,252,245,0.97) 100%
          );
          border-radius: 20px 20px 0 0;
          padding: 28px 20px 0;
          position: relative;
          z-index: 5;
          margin-top: -60px;
        }

        /* Scroll top curl decoration */
        .wb-scroll-curl {
          width: 80%; height: 6px; margin: 0 auto 18px;
          border-radius: 3px;
          background: linear-gradient(90deg, transparent, ${C.gold}, ${C.teal}, ${C.gold}, transparent);
          opacity: 0.55;
        }

        /* ─────────────── TAGLINE ─────────────── */
        .wb-tagline {
          font-family: 'Cinzel', serif;
          font-size: 0.80rem; letter-spacing: 0.18em;
          color: ${C.cobalt}; text-transform: uppercase;
          text-align: center; margin: 0 0 18px;
          opacity: 0.85;
          text-shadow: 0 1px 4px rgba(255,255,255,0.6);
        }

        /* ─────────────── MISSION LINE ─────────────── */
        .wb-mission {
          font-family: 'Cinzel', serif;
          font-size: 0.72rem; letter-spacing: 0.22em;
          text-transform: uppercase; text-align: center;
          margin: -10px 0 18px;
          opacity: 0.9;
        }
        .wb-mission-prefix {
          color: ${C.cobalt};
          text-shadow: 0 1px 4px rgba(255,255,255,0.6);
        }
        .wb-mission-wham {
          background: linear-gradient(135deg, ${C.gold} 0%, ${C.tealLight} 50%, ${C.gold} 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
          font-size: 1.05rem; font-weight: 800; letter-spacing: 0.28em;
          text-shadow: none;
          filter: drop-shadow(0 1px 6px rgba(58,189,212,0.45));
        }

        /* ─────────────── VERSE CARD ─────────────── */
        .wb-verse-card {
          width: 100%;
          background: linear-gradient(135deg, rgba(26,58,92,0.08) 0%, rgba(30,122,140,0.06) 100%);
          border: 1.5px solid rgba(30,122,140,0.35);
          border-radius: 12px; padding: 18px 22px;
          box-shadow: 0 3px 18px rgba(26,58,92,0.10), inset 0 1px 0 rgba(255,255,255,0.7);
          margin-bottom: 18px;
        }
        .wb-verse-label {
          color: ${C.teal}; font-size: 10px; letter-spacing: 2px;
          text-transform: uppercase; margin-bottom: 10px;
          font-family: 'Cinzel', serif; font-weight: 600;
        }
        .wb-verse-text {
          color: ${C.cobaltDark}; font-size: 14px;
          line-height: 1.75; font-style: italic; margin-bottom: 10px;
        }
        .wb-verse-ref {
          color: ${C.gold}; font-size: 12px;
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

        /* ─────────────── TUTORIAL ROW ─────────────── */
        .wb-tutorial-row {
          display: flex; align-items: center; justify-content: center;
          gap: 10px; margin-bottom: 10px;
          color: ${C.cobalt}; font-size: 12px; letter-spacing: 1px;
          font-family: 'Cinzel', serif; text-transform: uppercase; opacity: 0.75;
        }
        .wb-toggle {
          width: 42px; height: 22px; border-radius: 11px; border: none;
          cursor: pointer; position: relative; background: ${C.teal};
          box-shadow: 0 2px 8px rgba(30,122,140,0.4);
        }
        .wb-toggle-knob {
          position: absolute; top: 3px; left: 22px;
          width: 16px; height: 16px; border-radius: 50%; background: #fff;
          box-shadow: 0 1px 4px rgba(0,0,0,0.2);
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
        .wb-divider {
          width: 80%; height: 1.5px; margin: 14px 0;
          background: linear-gradient(90deg, transparent, ${C.teal}, ${C.gold}, ${C.teal}, transparent);
          opacity: 0.4; border-radius: 1px;
        }

        /* ─────────────── FOOTER ─────────────── */
        .wb-footer {
          color: rgba(26,58,92,0.40); font-size: 10px; letter-spacing: 1px;
          text-align: center; line-height: 1.8; padding-top: 8px;
        }
      `}</style>

      {/* ── Background stack ── */}
      <div className="wb-bg-land" />
      <div className="wb-bg-logo" />
      <div className="wb-bg-tone" />
      <div className="wb-bg-rim" />

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

        {/* Scroll Panel — rises from below the logo */}
        <div className="wb-scroll-panel">
          <div className="wb-scroll-curl" />

          <p className="wb-tagline">⚔️ Know the Word · Win the Battle ⚔️</p>
          <p className="wb-mission">
            <span className="wb-mission-prefix">We Have A Mission · </span>
            <span className="wb-mission-wham">WHAM</span>
          </p>

          {/* Verse Card */}
          <div className="wb-verse-card">
            <div className="wb-verse-label">📜 Today's Challenge Verse</div>
            <p className="wb-verse-text">
              "For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life."
            </p>
            <p className="wb-verse-ref">— John 3:16</p>
          </div>

          {/* Main CTA Buttons */}
          <div className="wb-btn-row">
            <button className="wb-btn-primary" onClick={() => window.location.href = createPageUrl("SoloGame")}>⚔️ Play Solo</button>
            <button className="wb-btn-secondary" onClick={() => window.location.href = createPageUrl("Challenge")}>👥 Challenge a Friend</button>
            <button className="wb-btn-ghost">📋 World Leaderboard</button>
          </div>

          {/* Tutorial Toggle */}
          <div className="wb-tutorial-row">
            <span>📖 Tutorial:</span>
            <div className="wb-toggle">
              <div className="wb-toggle-knob" />
            </div>
            <span style={{ color: C.teal, fontWeight: 700 }}>ON</span>
          </div>

          <div className="wb-divider" />

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
