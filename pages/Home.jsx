import { useState } from "react";

const LOGO_URL = "https://media.base44.com/images/public/69df9a909b33058a5ce47831/cad023820_generated_image.png";

const LANGUAGES = [
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "pt", label: "Português", flag: "🇵🇹" },
  { code: "it", label: "Italiano", flag: "🇮🇹" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
  { code: "ru", label: "Русский", flag: "🇷🇺" },
  { code: "ja", label: "日本語", flag: "🇯🇵" },
  { code: "ar", label: "العربية", flag: "🇸🇦" },
];

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #0d0800 0%, #1a0f02 30%, #2a1a05 60%, #1a0f02 100%)",
    fontFamily: "'Georgia', 'Times New Roman', serif",
    overflowX: "hidden",
    position: "relative",
  },
  bgOverlay: {
    position: "fixed",
    inset: 0,
    backgroundImage: `
      radial-gradient(ellipse at 50% 0%, rgba(201,162,39,0.15) 0%, transparent 60%),
      radial-gradient(ellipse at 20% 50%, rgba(180,100,20,0.08) 0%, transparent 50%),
      radial-gradient(ellipse at 80% 50%, rgba(180,100,20,0.08) 0%, transparent 50%)
    `,
    pointerEvents: "none",
    zIndex: 0,
  },
  content: {
    position: "relative",
    zIndex: 1,
    maxWidth: 480,
    margin: "0 auto",
    padding: "0 16px 40px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },

  // Language Bar
  langBar: {
    width: "100%",
    paddingTop: 12,
    paddingBottom: 8,
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "center",
  },
  langBtn: {
    background: "rgba(201,162,39,0.12)",
    border: "1px solid rgba(201,162,39,0.3)",
    borderRadius: 20,
    padding: "4px 10px",
    color: "rgba(201,162,39,0.7)",
    fontSize: 11,
    cursor: "default",
    display: "flex",
    alignItems: "center",
    gap: 4,
    opacity: 0.7,
    userSelect: "none",
    transition: "all 0.2s",
  },
  langBtnActive: {
    background: "rgba(201,162,39,0.3)",
    border: "1px solid rgba(201,162,39,0.8)",
    color: "#f5d87a",
    opacity: 1,
  },

  // Logo Section
  logoSection: {
    marginTop: 20,
    marginBottom: 8,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 0,
  },
  logoImg: {
    width: 260,
    height: 260,
    objectFit: "contain",
    filter: "drop-shadow(0 0 30px rgba(201,162,39,0.5))",
  },
  tagline: {
    color: "rgba(201,162,39,0.8)",
    fontSize: 13,
    letterSpacing: 3,
    textTransform: "uppercase",
    marginTop: -8,
    textAlign: "center",
  },

  // Decorative divider
  divider: {
    width: "80%",
    height: 1,
    background: "linear-gradient(90deg, transparent, rgba(201,162,39,0.5), transparent)",
    margin: "16px 0",
  },

  // Verse Preview Card
  verseCard: {
    width: "100%",
    background: "linear-gradient(135deg, rgba(40,25,5,0.95) 0%, rgba(25,15,3,0.95) 100%)",
    border: "1px solid rgba(201,162,39,0.4)",
    borderRadius: 12,
    padding: "20px 24px",
    boxShadow: "0 4px 30px rgba(0,0,0,0.5), inset 0 1px 0 rgba(201,162,39,0.2)",
    marginBottom: 20,
    position: "relative",
    overflow: "hidden",
  },
  verseCardBg: {
    position: "absolute",
    inset: 0,
    backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E")`,
    opacity: 0.5,
    pointerEvents: "none",
  },
  verseLabel: {
    color: "rgba(201,162,39,0.6)",
    fontSize: 10,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 10,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  verseText: {
    color: "#f0e4c0",
    fontSize: 15,
    lineHeight: 1.7,
    fontStyle: "italic",
    marginBottom: 10,
  },
  verseRef: {
    color: "rgba(201,162,39,0.8)",
    fontSize: 12,
    textAlign: "right",
    letterSpacing: 1,
  },

  // Main Buttons
  btnRow: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: 12,
    marginBottom: 16,
  },
  btnPrimary: {
    width: "100%",
    padding: "16px 24px",
    background: "linear-gradient(135deg, #c9a227 0%, #a07818 50%, #c9a227 100%)",
    backgroundSize: "200% 100%",
    border: "none",
    borderRadius: 8,
    color: "#1a0f02",
    fontSize: 17,
    fontWeight: "bold",
    fontFamily: "'Georgia', serif",
    letterSpacing: 2,
    textTransform: "uppercase",
    cursor: "pointer",
    boxShadow: "0 4px 20px rgba(201,162,39,0.4), inset 0 1px 0 rgba(255,255,255,0.2)",
    position: "relative",
    overflow: "hidden",
  },
  btnSecondary: {
    width: "100%",
    padding: "14px 24px",
    background: "transparent",
    border: "2px solid rgba(201,162,39,0.6)",
    borderRadius: 8,
    color: "#c9a227",
    fontSize: 15,
    fontWeight: "bold",
    fontFamily: "'Georgia', serif",
    letterSpacing: 2,
    textTransform: "uppercase",
    cursor: "pointer",
    boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
  },
  btnGhost: {
    width: "100%",
    padding: "12px 24px",
    background: "rgba(201,162,39,0.08)",
    border: "1px solid rgba(201,162,39,0.25)",
    borderRadius: 8,
    color: "rgba(201,162,39,0.7)",
    fontSize: 14,
    fontFamily: "'Georgia', serif",
    letterSpacing: 1,
    textTransform: "uppercase",
    cursor: "pointer",
  },

  // Level Preview
  levelSection: {
    width: "100%",
    marginBottom: 20,
  },
  levelTitle: {
    color: "rgba(201,162,39,0.6)",
    fontSize: 10,
    letterSpacing: 2,
    textTransform: "uppercase",
    textAlign: "center",
    marginBottom: 10,
  },
  levelRow: {
    display: "flex",
    gap: 8,
    justifyContent: "center",
  },
  levelCard: {
    flex: 1,
    background: "rgba(201,162,39,0.08)",
    border: "1px solid rgba(201,162,39,0.25)",
    borderRadius: 8,
    padding: "10px 4px",
    textAlign: "center",
    cursor: "pointer",
  },
  levelPoints: {
    color: "#c9a227",
    fontSize: 18,
    fontWeight: "bold",
  },
  levelPtLabel: {
    color: "rgba(201,162,39,0.5)",
    fontSize: 9,
    letterSpacing: 1,
    textTransform: "uppercase",
    display: "block",
  },
  levelIcon: {
    fontSize: 16,
    display: "block",
    marginBottom: 4,
  },

  // Donate Button
  btnDonate: {
    width: "100%",
    padding: "13px 24px",
    background: "linear-gradient(135deg, rgba(180,50,20,0.8) 0%, rgba(140,30,10,0.9) 100%)",
    border: "1px solid rgba(220,80,40,0.5)",
    borderRadius: 8,
    color: "#ffd0b0",
    fontSize: 14,
    fontWeight: "bold",
    fontFamily: "'Georgia', serif",
    letterSpacing: 1,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    boxShadow: "0 2px 15px rgba(180,50,20,0.3)",
    marginBottom: 24,
  },

  // Footer
  footer: {
    color: "rgba(201,162,39,0.3)",
    fontSize: 10,
    letterSpacing: 1,
    textAlign: "center",
    paddingTop: 8,
  },

  // Particles
  particle: {
    position: "fixed",
    width: 2,
    height: 2,
    borderRadius: "50%",
    background: "rgba(201,162,39,0.6)",
    pointerEvents: "none",
  },
};

export default function Home() {
  const [selectedLang, setSelectedLang] = useState("en");

  const handleDonate = () => {
    window.open("https://whambible.org", "_blank");
  };

  const handlePlayGuest = () => {
    alert("Single Player — Guest Mode\n(Game loading coming soon!)");
  };

  const handleLogin = () => {
    alert("Multiplayer Login / Create Profile\n(Auth system coming soon!)");
  };

  const handleLeaderboard = () => {
    alert("Leaderboard coming soon!");
  };

  return (
    <div style={styles.page}>
      <div style={styles.bgOverlay} />

      {/* Ambient particles */}
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          style={{
            ...styles.particle,
            left: `${10 + i * 12}%`,
            top: `${20 + (i % 3) * 30}%`,
            animation: `float${i % 3} ${3 + i * 0.5}s ease-in-out infinite`,
            opacity: 0.3 + (i % 4) * 0.1,
          }}
        />
      ))}

      <style>{`
        @keyframes float0 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes float1 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-14px)} }
        @keyframes float2 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        .btn-primary:hover { background-position: right center; transform: translateY(-1px); box-shadow: 0 6px 25px rgba(201,162,39,0.5) !important; }
        .btn-secondary:hover { background: rgba(201,162,39,0.1); transform: translateY(-1px); }
        .btn-donate:hover { transform: translateY(-1px); box-shadow: 0 4px 20px rgba(180,50,20,0.5) !important; }
        .lang-btn:hover { opacity: 0.9 !important; background: rgba(201,162,39,0.2) !important; }
        .level-card:hover { background: rgba(201,162,39,0.15) !important; border-color: rgba(201,162,39,0.5) !important; transform: translateY(-2px); }
        * { box-sizing: border-box; transition: transform 0.15s ease; }
      `}</style>

      <div style={styles.content}>

        {/* Language Bar — Unwired placeholders */}
        <div style={styles.langBar}>
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              className="lang-btn"
              style={{
                ...styles.langBtn,
                ...(lang.code === selectedLang ? styles.langBtnActive : {}),
              }}
              onClick={() => setSelectedLang(lang.code)}
              title={`${lang.label} (coming soon)`}
            >
              <span>{lang.flag}</span>
              <span>{lang.code === "en" ? lang.label : lang.code.toUpperCase()}</span>
            </button>
          ))}
        </div>

        {/* Logo */}
        <div style={styles.logoSection}>
          <img src={LOGO_URL} alt="WhamBible" style={styles.logoImg} />
          <p style={styles.tagline}>⚔️ Know the Word. Win the Battle. ⚔️</p>
        </div>

        <div style={styles.divider} />

        {/* Daily Verse Preview Card */}
        <div style={styles.verseCard}>
          <div style={styles.verseCardBg} />
          <div style={styles.verseLabel}>
            <span>📜</span>
            <span>Today's Challenge Verse</span>
          </div>
          <p style={styles.verseText}>
            "For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life."
          </p>
          <p style={styles.verseRef}>John 3:16</p>
        </div>

        {/* Level Preview */}
        <div style={styles.levelSection}>
          <p style={styles.levelTitle}>⚔️ Choose Your Battle ⚔️</p>
          <div style={styles.levelRow}>
            {[
              { pts: 5, icon: "🗡️", label: "Squire" },
              { pts: 10, icon: "⚔️", label: "Warrior" },
              { pts: 15, icon: "🛡️", label: "Knight" },
              { pts: 20, icon: "👑", label: "Champion" },
            ].map((level) => (
              <div
                key={level.pts}
                className="level-card"
                style={styles.levelCard}
                onClick={() => alert(`Level ${level.pts}pts — ${level.label}\n(Game coming soon!)`)}
              >
                <span style={styles.levelIcon}>{level.icon}</span>
                <span style={styles.levelPoints}>{level.pts}</span>
                <span style={styles.levelPtLabel}>pts</span>
                <div style={{ color: "rgba(201,162,39,0.5)", fontSize: 9, marginTop: 3 }}>{level.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Main CTAs */}
        <div style={styles.btnRow}>
          <button className="btn-primary" style={styles.btnPrimary} onClick={handlePlayGuest}>
            ⚔️ Play Solo (Guest)
          </button>
          <button className="btn-secondary" style={styles.btnSecondary} onClick={handleLogin}>
            🏆 Multiplayer — Login / Sign Up
          </button>
          <button style={styles.btnGhost} onClick={handleLeaderboard}>
            📜 World Leaderboard
          </button>
        </div>

        {/* Donate Button */}
        <button className="btn-donate" style={styles.btnDonate} onClick={handleDonate}>
          ❤️ Support WhamBible.org — Donate
        </button>

        <div style={styles.divider} />

        <footer style={styles.footer}>
          <p>© 2026 WhamBible · A WhamWorld Production · whambible.org</p>
          <p style={{ marginTop: 4 }}>🌍 Multilingual support coming soon</p>
        </footer>
      </div>
    </div>
  );
}
