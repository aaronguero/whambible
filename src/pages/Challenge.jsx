import { useState, useEffect, useRef, useCallback } from "react";

// ══════════════════════════════════════════════════════════════
// WhamBible — Challenge.jsx v10.0  REAL MULTIPLAYER
// NO Firebase. NO FCM. NO @/api/* imports. NO Base44 SDK.
//
// Auth     → localStorage (accounts + sessions)
// Profiles → Base44 REST API (PlayerProfile entity)
// Sessions → Base44 REST API (GameSession entity)
// Notify   → Twilio SMS via /.netlify/functions/send-sms
//
// Multiplayer turn model (mirrors Whamgame):
//   Player 1 = Challenger  (creates game, picks level each odd round)
//   Player 2 = Answerer    (joins game, picks level each even round)
//   Roles alternate who picks level each round.
//   5 rounds total. Async — each player acts on their own device/time.
//   Both players poll every 4s to see game state updates.
// ══════════════════════════════════════════════════════════════

// ── Asset URLs ──
const LANDSCAPE_BG  = "https://media.base44.com/images/public/69df9a909b33058a5ce47831/33b065c94_generated_image.png";
const LANDSCAPE_VIVID = "https://media.base44.com/images/public/69df9a909b33058a5ce47831/b9bcd9d15_generated_image.png";
const CHAR_MP       = "https://media.base44.com/images/public/69df9a909b33058a5ce47831/b23c98cb8_generated_image.png";
const CHAR_KNIGHT   = "https://media.base44.com/images/public/69df9a909b33058a5ce47831/9b51fedfd_generated_image.png";
const CHAR_VICTORY  = "https://media.base44.com/images/public/69df9a909b33058a5ce47831/c5aa4771c_generated_image.png";
const CHAR_WAITING    = "https://media.base44.com/images/public/69df9a909b33058a5ce47831/68682726c_generated_image.png";
const CHAR_GAMEOVER   = "https://media.base44.com/images/public/69df9a909b33058a5ce47831/027de5f28_generated_image.png";
const CHAR_RECOVERY_MP = "https://media.base44.com/images/public/69df9a909b33058a5ce47831/ba0922036_generated_image.png";
const WHAM_CHARS    = "https://media.base44.com/images/public/69df9a909b33058a5ce47831/85be9d10e_generated_image.png";
const WHAM_TEXT_IMG = "https://media.base44.com/images/public/69df9a909b33058a5ce47831/5e80bbcf2_generated_image.png";
const WHAM_AUDIO    = "https://media.base44.com/videos/public/69c40c6701d9dfdb1df69d2b/5d143ab80_51a54c36d_wham-slam-voice1.webm";

// ── Base44 proxy helpers ──
// On preview (base44.app): call Base44 API directly (no proxy needed, token injected by platform)
// On production (whambible.com): route through Netlify function (token stays server-side)
const IS_PREVIEW = window.location.hostname.includes("base44.app");
const DB_URL     = "/.netlify/functions/db";
const B44_API    = "https://app.base44.com/api/apps/69df9a909b33058a5ce47831/entities";
// Service token — read-only, non-secret, same token in Netlify env
// Needed for direct API calls on the Base44 preview domain
// Token injected at build time — never hardcode here (Memory #29)
const B44_TOKEN  = import.meta.env.VITE_B44_TOKEN || "";

const B44 = {
  async _call(payload) {
    if (IS_PREVIEW) {
      let url = `${B44_API}/${payload.entity}`;
      let opts = {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${B44_TOKEN}`,
        }
      };
      if (payload.action === "list") {
        if (payload.query && Object.keys(payload.query).length) {
          url += "?" + new URLSearchParams(
            Object.entries(payload.query).map(([k,v])=>["filter_"+k, v])
          ).toString();
        }
        opts.method = "GET";
      } else if (payload.action === "get") {
        url += "/" + payload.id;
        opts.method = "GET";
      } else if (payload.action === "create") {
        opts.method = "POST";
        opts.body   = JSON.stringify(payload.data);
      } else if (payload.action === "update") {
        url += "/" + payload.id;
        opts.method = "PUT";
        opts.body   = JSON.stringify(payload.data);
      }
      const r = await fetch(url, opts);
      if (!r.ok) throw new Error(`B44 ${payload.action} ${payload.entity}: ${r.status}`);
      return r.json();
    }
    // Netlify proxy (production)
    const r = await fetch(DB_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({ error: r.statusText }));
      throw new Error(`B44 ${payload.action} ${payload.entity}: ${r.status} ${JSON.stringify(err)}`);
    }
    return r.json();
  },
  async list(entity, query = {}) {
    const d = await this._call({ action: "list", entity, query: Object.keys(query).length ? query : undefined });
    return Array.isArray(d) ? d : (d.records || []);
  },
  async get(entity, id) {
    return this._call({ action: "get", entity, id });
  },
  async create(entity, data) {
    return this._call({ action: "create", entity, data });
  },
  async update(entity, id, data) {
    return this._call({ action: "update", entity, id, data });
  },
  async delete(entity, id) {
    return this._call({ action: "delete", entity, id });
  },
};

// ── SMS via Twilio (Netlify function) ──
async function sendSMS(to, message, gameId) {
  if (!to) return;
  try {
    await fetch("/.netlify/functions/send-sms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, message, gameId }),
    });
  } catch (e) {
    console.warn("[sendSMS] failed:", e.message);
  }
}

// ── Palette ──
const C = {
  cobaltDark: "#0D1F35",
  teal:       "#1E7A8C",
  gold:       "#D4921A",
  goldLight:  "#F5C842",
  offWhite:   "#F4F0E8",
  red:        "#C0392B",
  goldDim:    "rgba(201,162,39,0.4)",
};

// ── Constants ──
const TOTAL_ROUNDS = 5;
const TIME_LIMIT   = 20;
const POLL_MS      = 4000;   // steady-state poll interval
const POLL_FAST_MS = 2000;   // fast poll for first 10s after screen mounts
const LETTERS      = ["A","B","C","D"];
const SESSION_KEY  = "wb_session_v2";

const LEVELS = [
  { pts:5,  name:"Squire",   icon:"🗡️", sub:"Easiest · Common verses",   color:"#1E7A8C" },
  { pts:10, name:"Warrior",  icon:"⚔️", sub:"Moderate · Popular verses", color:"#D4921A" },
  { pts:15, name:"Knight",   icon:"🛡️", sub:"Hard · Deeper verses",      color:"#C05A2A" },
  { pts:20, name:"Champion", icon:"👑", sub:"Hardest · Rare verses",      color:"#7B2D8B" },
];

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

// ── Wheel data for MPRecovery ──
const MP_CHAPTERS = Array.from({ length: 150 }, (_, i) => i + 1);
const MP_VERSES_N = Array.from({ length: 176 }, (_, i) => i + 1);
const MP_ITEM_H   = 44;
const MP_VISIBLE  = 5;
const MP_CENTER   = 2;
const MP_COPIES   = 5;

const VERSES = [
  { book:"John",        chapter:3,  verse:16, text:"For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life." },
  { book:"Psalms",      chapter:23, verse:1,  text:"The Lord is my shepherd; I shall not want." },
  { book:"Romans",      chapter:8,  verse:28, text:"And we know that in all things God works for the good of those who love him, who have been called according to his purpose." },
  { book:"Proverbs",    chapter:3,  verse:5,  text:"Trust in the Lord with all your heart and lean not on your own understanding." },
  { book:"Isaiah",      chapter:40, verse:31, text:"But those who hope in the Lord will renew their strength. They will soar on wings like eagles." },
  { book:"Jeremiah",    chapter:29, verse:11, text:"For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you." },
  { book:"Philippians", chapter:4,  verse:13, text:"I can do all this through him who gives me strength." },
  { book:"Matthew",     chapter:5,  verse:9,  text:"Blessed are the peacemakers, for they will be called children of God." },
  { book:"Psalms",      chapter:46, verse:1,  text:"God is our refuge and strength, an ever-present help in trouble." },
  { book:"John",        chapter:14, verse:6,  text:"Jesus answered, I am the way and the truth and the life. No one comes to the Father except through me." },
  { book:"Genesis",     chapter:1,  verse:1,  text:"In the beginning God created the heavens and the earth." },
  { book:"Matthew",     chapter:6,  verse:33, text:"But seek first his kingdom and his righteousness, and all these things will be given to you as well." },
  { book:"Ephesians",   chapter:2,  verse:8,  text:"For it is by grace you have been saved, through faith — and this is not from yourselves, it is the gift of God." },
  { book:"Romans",      chapter:3,  verse:23, text:"For all have sinned and fall short of the glory of God." },
  { book:"Hebrews",     chapter:11, verse:1,  text:"Now faith is confidence in what we hope for and assurance about what we do not see." },
];

// ── Utilities ──
function shuffle(a) { return [...a].sort(() => Math.random() - 0.5); }
function rndVerse() { return VERSES[Math.floor(Math.random() * VERSES.length)]; }

function buildOptions(v) {
  const correct = { book:v.book, chapter:v.chapter, verse:v.verse, isCorrect:true };
  const used = new Set([v.book]);
  const wrongs = [];
  while (wrongs.length < 3) {
    const b = ALL_BOOKS[Math.floor(Math.random() * ALL_BOOKS.length)];
    if (used.has(b)) continue;
    used.add(b);
    wrongs.push({ book:b, chapter:Math.floor(Math.random()*25)+1, verse:Math.floor(Math.random()*30)+1, isCorrect:false });
  }
  return shuffle([correct, ...wrongs]);
}

function rankBadge(score) {
  // Thresholds based on open difficulty — 5 rounds × 20pt max = 100pt/game
  if (score >= 1000) return { icon:"👑", label:"Champion", color:"#7B2D8B" };
  if (score >= 600)  return { icon:"🛡️", label:"Knight",   color:"#C05A2A" };
  if (score >= 300)  return { icon:"⚔️", label:"Warrior",  color:"#D4921A" };
  if (score >= 100)  return { icon:"🗡️", label:"Squire",   color:"#1E7A8C" };
  return                    { icon:"📜", label:"Scribe",   color:"#64748b" };
}

function parseError(e) {
  const msg = e?.message || String(e || "");
  if (/already exist/i.test(msg)) return "Account already exists. Sign in instead.";
  if (/not found|no account/i.test(msg)) return "No account found. Try creating one.";
  if (/password/i.test(msg))    return "Incorrect password.";
  if (/email/i.test(msg))       return "Please enter a valid email address.";
  if (/network|fetch/i.test(msg)) return "Network error. Check your connection.";
  return msg || "Something went wrong. Try again.";
}

// ── Local Auth (localStorage — no SDK) ──
const LocalAuth = {
  _key: "wb_accounts_v2",
  _accounts() { try { return JSON.parse(localStorage.getItem(this._key) || "{}"); } catch { return {}; } },
  _save(a)    { localStorage.setItem(this._key, JSON.stringify(a)); },
  create(email, password, displayName) {
    const accounts = this._accounts();
    const key = email.toLowerCase().trim();
    if (accounts[key]) throw new Error("Account already exists. Sign in instead.");
    const user = { email: key, displayName: displayName || key.split("@")[0] };
    accounts[key] = { ...user, password };
    this._save(accounts);
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    return user;
  },
  signIn(email, password) {
    const accounts = this._accounts();
    const key = email.toLowerCase().trim();
    const acct = accounts[key];
    if (!acct)                    throw new Error("No account found for this email.");
    if (acct.password !== password) throw new Error("Incorrect password.");
    const user = { email: acct.email, displayName: acct.displayName };
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    return user;
  },
  currentUser() { try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch { return null; } },
  signOut()     { localStorage.removeItem(SESSION_KEY); },
};

// ══════════════════════════════════════════════════════════════
// CSS
// ══════════════════════════════════════════════════════════════
const S = `
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&display=swap');
*,*::before,*::after{box-sizing:border-box;}
html,body,#root{height:100%;margin:0;padding:0;overflow:hidden;}
.c-screen{position:fixed;inset:0;font-family:'Cinzel',serif;}
.c-scroll{position:absolute;inset:0;overflow-y:auto;-webkit-overflow-scrolling:touch;z-index:10;background:transparent;}
.c-pad{padding:80px 16px 56px;}
.c-hdr{position:fixed;top:0;left:0;right:0;z-index:20;display:flex;align-items:center;justify-content:space-between;padding:14px 18px 10px;background:linear-gradient(180deg,rgba(13,31,53,0.97) 0%,transparent 100%);}
.c-logo{font-size:20px;font-weight:900;color:#F5C842;letter-spacing:3px;}
.c-pill{display:flex;align-items:center;gap:7px;background:rgba(30,122,140,0.25);border:1px solid rgba(245,200,66,0.25);border-radius:20px;padding:5px 12px 5px 8px;cursor:pointer;}
.c-av{width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#1E7A8C,#D4921A);display:flex;align-items:center;justify-content:center;font-size:13px;color:#fff;font-weight:700;}
.c-un{font-size:11px;color:#F4F0E8;letter-spacing:1px;}
.c-card{background:rgba(10,20,38,0.72);border:1px solid rgba(245,200,66,0.25);border-radius:20px;padding:28px 20px 32px;backdrop-filter:blur(12px);margin-bottom:14px;position:relative;}
.c-curl{position:absolute;top:0;left:50%;transform:translateX(-50%);width:40px;height:4px;background:rgba(245,200,66,0.35);border-radius:0 0 6px 6px;}
.c-h1{font-size:22px;font-weight:900;color:#F5C842;margin:0 0 6px;letter-spacing:2px;text-align:center;}
.c-sub{font-size:12px;color:rgba(212,146,26,0.7);text-align:center;margin:0 0 22px;letter-spacing:1px;line-height:1.5;}
.c-badge{display:inline-flex;align-items:center;gap:6px;border-radius:20px;padding:6px 14px;font-size:11px;letter-spacing:1.5px;margin-bottom:16px;}
.c-btn-a{width:100%;padding:16px;background:linear-gradient(135deg,#1E7A8C,#D4921A);color:#F4F0E8;font-family:'Cinzel',serif;font-size:15px;font-weight:900;letter-spacing:2px;border:none;border-radius:12px;cursor:pointer;margin-bottom:12px;text-transform:uppercase;transition:opacity .15s,transform .1s;box-shadow:0 4px 18px rgba(30,122,140,0.45);}
.c-btn-a:hover{opacity:.92}.c-btn-a:active{transform:scale(.98)}.c-btn-a:disabled{opacity:.4;cursor:not-allowed;}
.c-btn-b{width:100%;padding:15px;background:rgba(245,200,66,0.07);color:rgba(245,200,66,0.85);font-family:'Cinzel',serif;font-size:14px;font-weight:700;letter-spacing:2px;border:1.5px solid rgba(245,200,66,0.35);border-radius:12px;cursor:pointer;margin-bottom:12px;text-transform:uppercase;transition:background .15s,transform .1s;}
.c-btn-b:hover{background:rgba(245,200,66,0.14)}.c-btn-b:active{transform:scale(.98)}.c-btn-b:disabled{opacity:.4;cursor:not-allowed;}
.c-btn-c{width:100%;padding:15px;background:linear-gradient(135deg,rgba(26,58,92,0.9),rgba(13,31,53,0.95));color:#F4F0E8;font-family:'Cinzel',serif;font-size:14px;font-weight:700;letter-spacing:1.5px;border:1px solid rgba(30,122,140,0.4);border-radius:12px;cursor:pointer;margin-bottom:10px;display:flex;align-items:center;justify-content:center;gap:10px;transition:background .15s,transform .1s;}
.c-btn-c:hover{background:rgba(30,122,140,0.25)}.c-btn-c:active{transform:scale(.98)}.c-btn-c:disabled{opacity:.4;cursor:not-allowed;}
.c-div{display:flex;align-items:center;gap:10px;margin:4px 0 16px;}
.c-div-line{flex:1;height:1px;background:rgba(245,200,66,0.12);}
.c-div-txt{font-size:10px;color:rgba(245,200,66,0.35);letter-spacing:3px;}
.c-lbl{font-size:10px;color:rgba(212,146,26,0.7);letter-spacing:2px;margin-bottom:6px;display:block;text-transform:uppercase;}
.c-inp{width:100%;padding:13px 14px;background:rgba(255,255,255,0.05);border:1px solid rgba(245,200,66,0.2);border-radius:10px;color:#F4F0E8;font-family:'Cinzel',serif;font-size:13px;margin-bottom:14px;outline:none;transition:border-color .15s;}
.c-inp:focus{border-color:rgba(245,200,66,0.5);}
.c-err{color:#e74c3c;font-size:12px;text-align:center;margin:0 0 14px;letter-spacing:0.5px;line-height:1.6;min-height:18px;}
.c-back{display:block;text-align:center;margin-top:14px;font-size:11px;color:rgba(244,240,232,0.3);letter-spacing:1.5px;cursor:pointer;padding:8px;}
.c-back:hover{color:rgba(244,240,232,0.55);}
.c-auth-center{position:absolute;inset:0;z-index:10;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px 16px 40px;overflow-y:auto;-webkit-overflow-scrolling:touch;}
.c-auth-center .c-card{width:100%;max-width:420px;flex-shrink:0;}
.c-spin{width:32px;height:32px;border:3px solid rgba(245,200,66,0.15);border-top-color:#F5C842;border-radius:50%;animation:spin .8s linear infinite;margin:0 auto 14px;}
@keyframes spin{to{transform:rotate(360deg);}}
.c-score-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;}
.c-score-box{text-align:center;flex:1;}
.c-score-val{font-size:22px;font-weight:900;color:#F5C842;}
.c-score-lbl{font-size:9px;color:rgba(212,146,26,0.6);letter-spacing:2px;}
.c-pips{display:flex;justify-content:center;gap:5px;margin-bottom:16px;flex-wrap:wrap;}
.c-pip{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,0.15);}
.c-pip.done{background:#1E7A8C;}.c-pip.now{background:#F5C842;}.c-pip.win{background:#1A7A4A;}.c-pip.loss{background:#C0392B;}
.c-tbar{height:4px;background:rgba(255,255,255,0.08);border-radius:2px;overflow:hidden;margin-bottom:16px;}
.c-tfill{height:100%;border-radius:2px;transition:width 1s linear,background .5s;}
.c-vcard{background:rgba(26,58,92,0.38);border:1px solid rgba(245,200,66,0.13);border-radius:14px;padding:18px 16px;margin-bottom:16px;text-align:center;}
.c-vtxt{font-size:14px;color:#F4F0E8;line-height:1.65;font-style:italic;margin-bottom:8px;}
.c-vq{font-size:11px;color:rgba(212,146,26,0.65);letter-spacing:2px;}
.c-opts{display:flex;flex-direction:column;gap:10px;margin-bottom:16px;position:relative;z-index:5;}
.c-opt{padding:14px 16px;background:rgba(10,22,42,0.88);border:1px solid rgba(245,200,66,0.28);border-radius:12px;cursor:pointer;display:flex;align-items:center;gap:12px;transition:all .15s;backdrop-filter:blur(4px);}
.c-opt:hover{background:rgba(26,58,92,0.95);border-color:rgba(245,200,66,0.55);}
.c-opt-ltr{width:28px;height:28px;border-radius:50%;background:rgba(212,146,26,0.18);display:flex;align-items:center;justify-content:center;font-size:11px;color:#F5C842;font-weight:700;flex-shrink:0;}
.c-opt-txt{font-size:13px;color:#F4F0E8;font-family:'Cinzel',serif;font-weight:600;line-height:1.4;letter-spacing:0.5px;}
.c-opt.correct{background:rgba(26,122,74,0.22);border-color:rgba(26,200,100,0.45);}
.c-opt.wrong{background:rgba(192,58,43,0.18);border-color:rgba(192,58,43,0.4);}
.c-lv{padding:18px 16px;border-radius:14px;cursor:pointer;margin-bottom:10px;border:2px solid rgba(245,200,66,0.12);display:flex;align-items:center;gap:14px;transition:all .18s;background:rgba(13,31,53,0.4);}
.c-lv:hover{border-color:rgba(245,200,66,0.4);background:rgba(26,58,92,0.5);}
.c-lv-icon{font-size:28px;flex-shrink:0;}
.c-lv-name{font-size:15px;font-weight:900;color:#F5C842;letter-spacing:2px;}
.c-lv-sub{font-size:10px;color:rgba(212,146,26,0.6);letter-spacing:1px;margin-top:3px;}
.c-lv-pts{font-size:20px;font-weight:900;color:#F5C842;margin-left:auto;flex-shrink:0;}
.c-wait{text-align:center;padding:32px 0;}
.c-wait-icon{font-size:48px;margin-bottom:12px;animation:pulse 2s ease-in-out infinite;}
@keyframes rr-lock-drain{from{width:100%}to{width:0%}}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.6;transform:scale(0.92)}}
.c-pl-row{display:flex;align-items:center;gap:12px;padding:12px 14px;background:rgba(26,58,92,0.3);border:1px solid rgba(245,200,66,0.1);border-radius:12px;margin-bottom:8px;cursor:pointer;transition:all .15s;}
.c-pl-row:hover{background:rgba(30,122,140,0.2);border-color:rgba(245,200,66,0.3);}
.c-pl-av{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#1E7A8C,#D4921A);display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;color:#fff;flex-shrink:0;}
.c-pl-name{font-size:13px;color:#F4F0E8;font-weight:700;letter-spacing:1px;}
.c-pl-rank{font-size:10px;color:rgba(212,146,26,0.65);letter-spacing:1.5px;}
.c-empty{text-align:center;padding:24px;color:rgba(245,200,66,0.35);font-size:12px;letter-spacing:1.5px;}
.c-result-banner{padding:12px 16px;border-radius:12px;text-align:center;margin-bottom:14px;font-size:13px;font-weight:700;letter-spacing:1px;}
`;

// ── Background ──
function Bg({ char, charPos = "center 18%", charOpacity = 0.82, bgScale = 1.0 }) {
  return (
    <div style={{
      position:"fixed",inset:0,zIndex:0,
      transform:`scale(${bgScale})`,
      transformOrigin:"center center",
      transition: bgScale !== 1.0 ? "none" : "transform 0.36s cubic-bezier(.34,1.56,.64,1)",
    }}>
      {/* Layer 1: Landscape atmosphere — behind character */}
      <div style={{position:"fixed",inset:0,backgroundImage:`url(${LANDSCAPE_BG})`,backgroundSize:"cover",backgroundPosition:"center top",opacity:0.38}}/>
      {/* Layer 2: Character — PRIMARY underlay, front and center */}
      {char && <div style={{position:"fixed",inset:0,backgroundImage:`url(${char})`,backgroundSize:"contain",backgroundPosition:charPos,backgroundRepeat:"no-repeat",opacity:charOpacity}}/>}
      {/* Layer 3: Tone gradient — cobalt atmosphere, fades to warm sand at base */}
      <div style={{position:"fixed",inset:0,background:`linear-gradient(180deg,${C.cobaltDark}cc 0%,${C.cobaltDark}22 32%,rgba(13,31,53,0.04) 56%,rgba(13,31,53,0.62) 100%)`}}/>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════
// MENU OVERLAY ASSET MAP
// ══════════════════════════════════════════════════════════════
const MENU_CHARS = {
  profile:  "https://media.base44.com/images/public/69df9a909b33058a5ce47831/954b4f3ac_generated_image.png",
  leader:   "https://media.base44.com/images/public/69df9a909b33058a5ce47831/01bb86cea_generated_image.png",
  players:  "https://media.base44.com/images/public/69df9a909b33058a5ce47831/6768995b4_generated_image.png",
  scores:   "https://media.base44.com/images/public/69df9a909b33058a5ce47831/344c7ea6e_generated_image.png",
  verses:   "https://media.base44.com/images/public/69df9a909b33058a5ce47831/674863114_generated_image.png",
  language: "https://media.base44.com/images/public/69df9a909b33058a5ce47831/848e9abc5_generated_image.png",
  tutorial: "https://media.base44.com/images/public/69df9a909b33058a5ce47831/292372d85_generated_image.png",
};

// ── Shared overlay shell ──────────────────────────────────────
// charKey: key into MENU_CHARS
// title: tab title string
// onClose: close handler
// children: scroll panel content
function MenuOverlay({ charKey, title, onClose, children }) {
  // ── Constants ─────────────────────────────────────────────
  const MARGIN      = 16;   // px gap on all sides when floating
  const SNAP_UP     = 0.30; // top snap: 30% from top of screen
  const SNAP_DOWN   = 0.60; // bottom snap: 60% from top (panel hovers mid-screen)
  const LIMIT_TOP   = 0.18; // hard top limit (below title)
  const LIMIT_BOT   = 0.72; // hard bottom limit
  const MAX_H_FRAC  = 0.60; // panel never taller than 60% of screen height
  const RUBBER      = 0.28; // resistance factor beyond limits (0=none, 1=full)

  // ── State ─────────────────────────────────────────────────
  const [snapPos,   setSnapPos]   = useState("up");   // "up" | "down"
  const [rawTop,    setRawTop]    = useState(SNAP_UP);
  const [dragging,  setDragging]  = useState(false);
  const [bgScale,   setBgScale]   = useState(1.0);
  const dragRef = useRef(null);

  // Derived: displayed top (with rubber-band beyond limits)
  const displayTop = (() => {
    if (rawTop < LIMIT_TOP) {
      const over = LIMIT_TOP - rawTop;
      return LIMIT_TOP - over * RUBBER;
    }
    if (rawTop > LIMIT_BOT) {
      const over = rawTop - LIMIT_BOT;
      return LIMIT_BOT + over * RUBBER;
    }
    return rawTop;
  })();

  // Panel height = from displayTop to (screen - MARGIN), capped at MAX_H_FRAC
  const winH      = window.innerHeight;
  const topPx     = Math.round(displayTop * winH);
  const maxHpx    = Math.round(MAX_H_FRAC * winH);
  const panelH    = Math.min(winH - topPx - MARGIN, maxHpx);

  // ── Helpers ───────────────────────────────────────────────
  function applyRubberBg(frac) {
    if (frac < LIMIT_TOP) {
      const t = Math.min((LIMIT_TOP - frac) / 0.10, 1);
      setBgScale(1 + t * 0.045);
    } else if (frac > LIMIT_BOT) {
      const t = Math.min((frac - LIMIT_BOT) / 0.10, 1);
      setBgScale(1 + t * 0.045);
    } else {
      setBgScale(1.0);
    }
  }

  function snapToPos(frac) {
    const mid = (SNAP_UP + SNAP_DOWN) / 2;
    const target = frac < mid ? SNAP_UP : SNAP_DOWN;
    setRawTop(target);
    setSnapPos(target === SNAP_UP ? "up" : "down");
    setBgScale(1.0);
  }

  // ── Touch ─────────────────────────────────────────────────
  function onTouchStart(e) {
    dragRef.current = { startY: e.touches[0].clientY, startFrac: rawTop };
    setDragging(true);
  }
  function onTouchMove(e) {
    if (!dragRef.current) return;
    const dy   = e.touches[0].clientY - dragRef.current.startY;
    const frac = dragRef.current.startFrac + dy / winH;
    setRawTop(frac);
    applyRubberBg(frac);
  }
  function onTouchEnd() {
    setDragging(false);
    snapToPos(rawTop);
    dragRef.current = null;
  }

  // ── Mouse ─────────────────────────────────────────────────
  function onMouseDown(e) {
    dragRef.current = { startY: e.clientY, startFrac: rawTop };
    setDragging(true);
    e.preventDefault();
  }
  useEffect(() => {
    if (!dragging) return;
    function onMouseMove(e) {
      if (!dragRef.current) return;
      const dy   = e.clientY - dragRef.current.startY;
      const frac = dragRef.current.startFrac + dy / winH;
      setRawTop(frac);
      applyRubberBg(frac);
    }
    function onMouseUp() {
      setDragging(false);
      snapToPos(rawTop);
      dragRef.current = null;
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup",   onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup",   onMouseUp);
    };
  }, [dragging, rawTop]);

  // ── Expand / Collapse button ───────────────────────────────
  function toggleSnap() {
    const target = snapPos === "down" ? SNAP_UP : SNAP_DOWN;
    setRawTop(target);
    setSnapPos(snapPos === "down" ? "up" : "down");
    setBgScale(1.0);
  }

  // ── Transition string ─────────────────────────────────────
  const sheetTransition = dragging
    ? "none"
    : "top 0.36s cubic-bezier(.34,1.56,.64,1), height 0.36s cubic-bezier(.34,1.56,.64,1)";

  return (
    <div style={{
      position:"fixed",inset:0,zIndex:1500,
      fontFamily:"'Cinzel',serif",
      overflow:"hidden",
    }}>
      {/* ── Scene layers — scale on rubber-band ── */}
      <div style={{
        position:"fixed",inset:0,zIndex:0,
        transform:`scale(${bgScale})`,
        transformOrigin:"center center",
        transition: dragging ? "none" : "transform 0.36s cubic-bezier(.34,1.56,.64,1)",
      }}>
        {/* Character at full cover scale — landscape stored in src/constants/assets.js */}
        <div style={{
          position:"absolute",inset:0,
          backgroundImage:`url(${MENU_CHARS[charKey]})`,
          backgroundSize:"cover",
          backgroundPosition:"center center",
          backgroundRepeat:"no-repeat",
        }}/>
      </div>

      {/* Layer 3 — top vignette (not scaled) */}
      <div style={{
        position:"fixed",inset:0,zIndex:1,
        background:"linear-gradient(180deg,rgba(0,0,0,0.32) 0%,rgba(0,0,0,0.0) 28%)",
        pointerEvents:"none",
      }}/>
      {/* Layer 4 — gold rim */}
      <div style={{
        position:"fixed",top:0,left:0,right:0,height:3,zIndex:2,
        background:"linear-gradient(90deg,transparent,#F5C842,transparent)",
        pointerEvents:"none",
      }}/>

      {/* ── Close button ── */}
      <button onClick={onClose} style={{
        position:"fixed",top:14,right:14,zIndex:1600,
        width:44,height:44,borderRadius:"50%",
        background:"rgba(212,146,26,0.22)",
        border:"1.5px solid rgba(245,200,66,0.45)",
        color:"#F5C842",fontSize:20,cursor:"pointer",
        display:"flex",alignItems:"center",justifyContent:"center",
        boxShadow:"0 2px 12px rgba(0,0,0,0.45)",
        transition:"background 0.15s",
      }}
        onMouseEnter={e=>e.currentTarget.style.background="rgba(212,146,26,0.4)"}
        onMouseLeave={e=>e.currentTarget.style.background="rgba(212,146,26,0.22)"}
      >⚔️</button>

      {/* ── Title ── */}
      <div style={{
        position:"fixed",top:52,left:0,right:0,zIndex:3,
        textAlign:"center",pointerEvents:"none",
      }}>
        <div style={{
          fontSize:22,fontWeight:900,color:"#F5C842",
          letterSpacing:4,textTransform:"uppercase",
          textShadow:"0 2px 18px rgba(0,0,0,0.7),0 0 24px rgba(212,146,26,0.5)",
        }}>{title}</div>
        <div style={{
          width:60,height:2,margin:"8px auto 0",
          background:"linear-gradient(90deg,transparent,#F5C842,transparent)",
        }}/>
      </div>

      {/* ── Floating draggable panel ── */}
      <div style={{
        position:"fixed",
        left:MARGIN,
        right:MARGIN,
        top: topPx,
        height: panelH,
        zIndex:10,
        borderRadius:18,
        overflow:"hidden",
        boxShadow:"0 8px 40px rgba(0,0,0,0.55), 0 0 0 1px rgba(245,200,66,0.18)",
        display:"flex",
        flexDirection:"column",
        transition: sheetTransition,
      }}>

        {/* ── Handle bar + expand/collapse button ── */}
        <div
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onMouseDown={onMouseDown}
          style={{
            flexShrink:0,
            display:"flex",alignItems:"center",justifyContent:"center",
            position:"relative",
            paddingTop:10,paddingBottom:8,
            background:"rgba(13,31,53,0.60)",
            borderBottom:"1px solid rgba(245,200,66,0.15)",
            cursor:"grab",
            userSelect:"none",
            touchAction:"none",
          }}
        >
          {/* Gold pill handle */}
          <div style={{
            width:40,height:4,borderRadius:2,
            background:"rgba(245,200,66,0.50)",
          }}/>

          {/* Expand / Collapse button — right side of handle bar */}
          <button
            onClick={e => { e.stopPropagation(); toggleSnap(); }}
            onMouseDown={e => e.stopPropagation()}
            onTouchStart={e => e.stopPropagation()}
            style={{
              position:"absolute",right:12,top:"50%",
              transform:"translateY(-50%)",
              background:"rgba(212,146,26,0.20)",
              border:"1px solid rgba(245,200,66,0.35)",
              borderRadius:8,
              color:"#F5C842",
              fontSize:16,
              width:32,height:26,
              display:"flex",alignItems:"center",justifyContent:"center",
              cursor:"pointer",
              transition:"background 0.15s, transform 0.3s",
            }}
            title={snapPos === "down" ? "Expand" : "Collapse"}
          >
            {snapPos === "down" ? "▲" : "▼"}
          </button>
        </div>

        {/* ── Scrollable content ── */}
        <div style={{
          flex:1,
          overflowY:"auto",
          background:"rgba(13,31,53,0.50)",
          backdropFilter:"blur(10px)",
          WebkitBackdropFilter:"blur(10px)",
        }}>
          <div style={{
            maxWidth:440,margin:"0 auto",
            padding:"0 16px",
          }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Semi-transparent button style ────────────────────────────
const btnStyle = (color="#D4921A") => ({
  width:"100%",padding:"13px 0",borderRadius:12,
  background:`rgba(${color==="teal"?"30,122,140":"212,146,26"},0.50)`,
  border:`1.5px solid rgba(${color==="teal"?"58,189,212":"245,200,66"},0.45)`,
  color: color==="teal" ? "#3ABDD4" : "#F5C842",
  fontFamily:"'Cinzel',serif",fontSize:13,fontWeight:700,
  letterSpacing:2,cursor:"pointer",
  backdropFilter:"blur(4px)",
  transition:"background 0.15s",
});

// ══════════════════════════════════════════════════════════════
// 1. MY PROFILE OVERLAY (upgraded with cinematic underlay)
// ══════════════════════════════════════════════════════════════
function ProfileOverlay({ user, profile, rank, onClose, onSmsToggle }) {
  const name    = profile?.display_name || user?.displayName || user?.email?.split("@")[0] || "Warrior";
  const email   = user?.email || profile?.email || "";
  const score   = profile?.total_score  || 0;
  const played  = profile?.games_played || 0;
  const won     = profile?.games_won    || 0;
  const lost    = Math.max(0, played - won);
  const winPct  = played > 0 ? Math.round((won/played)*100) : 0;
  const init    = name[0].toUpperCase();
  const r       = rank || { icon:"📜", label:"Scribe", color:"#64748b" };
  const RANKS   = [
    {label:"Scribe",   min:0,    max:100,  color:"#64748b"},
    {label:"Squire",   min:100,  max:300,  color:"#1E7A8C"},
    {label:"Warrior",  min:300,  max:600,  color:"#D4921A"},
    {label:"Knight",   min:600,  max:1000, color:"#C05A2A"},
    {label:"Champion", min:1000, max:1000, color:"#7B2D8B"},
  ];
  const cur     = RANKS.find(rk=>rk.label===r.label)||RANKS[0];
  const nxt     = RANKS[RANKS.indexOf(cur)+1];
  const prog    = nxt ? Math.min(100,Math.round(((score-cur.min)/(nxt.min-cur.min))*100)) : 100;
  const toNext  = nxt ? Math.max(0,nxt.min-score) : 0;

  return (
    <MenuOverlay charKey="profile" title="My Profile" onClose={onClose}>
      <div style={{padding:"24px 20px 28px"}}>
        {/* Avatar */}
        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{
            width:72,height:72,borderRadius:"50%",margin:"0 auto 14px",
            background:"rgba(212,146,26,0.18)",border:`3px solid ${r.color}`,
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:30,fontWeight:900,color:"#F5C842",
            boxShadow:`0 0 20px ${r.color}55`,
          }}>{init}</div>
          <div style={{fontSize:20,fontWeight:900,color:"#F5C842",letterSpacing:2,marginBottom:4,textTransform:"uppercase"}}>{name}</div>
          <div style={{fontSize:11,color:"rgba(245,200,66,0.45)",letterSpacing:1,marginBottom:8}}>{email}</div>
          <div style={{display:"inline-block",padding:"4px 14px",borderRadius:20,
            background:`${r.color}22`,border:`1px solid ${r.color}66`,
            color:r.color,fontSize:11,fontWeight:700,letterSpacing:2}}>
            {r.icon} {r.label.toUpperCase()}
          </div>
        </div>
        {/* Progress */}
        {nxt && (
          <div style={{marginBottom:16,padding:"14px 16px",background:"rgba(255,255,255,0.04)",borderRadius:10,border:"1px solid rgba(245,200,66,0.1)"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
              <span style={{fontSize:9,color:"rgba(245,200,66,0.45)",letterSpacing:2}}>RANK PROGRESS</span>
              <span style={{fontSize:9,color:r.color,letterSpacing:1}}>{toNext} pts to {nxt.label}</span>
            </div>
            <div style={{height:5,borderRadius:3,background:"rgba(255,255,255,0.08)",overflow:"hidden"}}>
              <div style={{height:"100%",borderRadius:3,background:`linear-gradient(90deg,${r.color},#F5C842)`,width:`${prog}%`,transition:"width 0.8s ease"}}/>
            </div>
          </div>
        )}
        {/* Stats */}
        {[["✨","Total Score",score],["🎮","Games Played",played],["🏆","Victories",won],["💀","Defeats",lost],["📊","Win Rate",winPct+"%"]].map(([icon,label,val],i,arr)=>(
          <div key={label} style={{display:"flex",alignItems:"center",justifyContent:"space-between",
            padding:"11px 0",borderBottom:i<arr.length-1?"1px solid rgba(245,200,66,0.07)":"none"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:15}}>{icon}</span>
              <span style={{fontSize:12,color:"rgba(245,200,66,0.65)",letterSpacing:1}}>{label}</span>
            </div>
            <span style={{fontSize:17,fontWeight:900,color:"#F5C842"}}>{val}</span>
          </div>
        ))}
        {/* ── Task 3: SMS Toggle + Re-consent ── */}
        {profile?.phone ? (
          <div style={{marginTop:20,padding:"16px",background:"rgba(255,255,255,0.04)",borderRadius:12,border:"1px solid rgba(212,146,26,0.15)"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
              <div>
                <div style={{fontSize:13,color:"rgba(245,200,66,0.85)",fontWeight:700,letterSpacing:1}}>📱 Game Alerts</div>
                <div style={{fontSize:10,color:"rgba(245,200,66,0.4)",marginTop:2}}>{profile.phone}</div>
              </div>
              {/* Toggle switch */}
              <div
                onClick={() => onSmsToggle && onSmsToggle(!profile.sms_enabled)}
                style={{
                  width:46,height:26,borderRadius:13,cursor:"pointer",
                  background: profile.sms_enabled ? "#D4921A" : "rgba(255,255,255,0.12)",
                  border:`1px solid ${profile.sms_enabled ? "#F5C842" : "rgba(255,255,255,0.2)"}`,
                  position:"relative",transition:"background 0.25s",flexShrink:0,
                }}>
                <div style={{
                  position:"absolute",top:3,
                  left: profile.sms_enabled ? 23 : 3,
                  width:18,height:18,borderRadius:"50%",
                  background:"#fff",transition:"left 0.25s",
                  boxShadow:"0 1px 4px rgba(0,0,0,0.4)",
                }}/>
              </div>
            </div>
            {profile.sms_enabled ? (
              <p style={{fontSize:10,color:"rgba(245,200,66,0.45)",margin:0,lineHeight:1.6}}>
                SMS alerts active. Reply <strong style={{color:"rgba(245,200,66,0.7)"}}>STOP</strong> to any message to unsubscribe anytime.
                Msg &amp; data rates may apply.
              </p>
            ) : (
              <p style={{fontSize:10,color:"rgba(245,200,66,0.35)",margin:0,lineHeight:1.6}}>
                SMS alerts off. Toggle on to receive challenge notifications.
                By enabling, you consent to receive WhamBible game alert texts.
                Msg frequency varies. Msg &amp; data rates may apply.
                Reply <strong style={{color:"rgba(245,200,66,0.5)"}}>STOP</strong> to unsubscribe anytime.
              </p>
            )}
          </div>
        ) : null}

        <div style={{marginTop:20}}>
          <button style={btnStyle()} onClick={onClose}>BACK TO BATTLE</button>
        </div>
      </div>
    </MenuOverlay>
  );
}

// ══════════════════════════════════════════════════════════════
// 2. LEADERBOARD OVERLAY
// ══════════════════════════════════════════════════════════════
function LeaderboardOverlay({ profile, onClose }) {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    B44.list("PlayerProfile", {})
      .then(data => {
        const sorted = [...data].sort((a,b)=>(b.total_score||0)-(a.total_score||0)).slice(0,20);
        setPlayers(sorted);
      })
      .catch(()=>setPlayers([]))
      .finally(()=>setLoading(false));
  }, []);

  const myEmail = profile?.email || "";

  return (
    <MenuOverlay charKey="leader" title="Leaderboard" onClose={onClose}>
      <div style={{padding:"20px 20px 28px"}}>
        {loading ? (
          <div style={{textAlign:"center",padding:32,color:"rgba(245,200,66,0.5)",fontSize:13,letterSpacing:2}}>LOADING...</div>
        ) : players.length === 0 ? (
          <div style={{textAlign:"center",padding:32,color:"rgba(245,200,66,0.4)",fontSize:12}}>No warriors on the board yet.</div>
        ) : (
          players.map((p,i) => {
            const r    = rankBadge(p.total_score||0);
            const isMe = p.email === myEmail;
            const medal= i===0?"🥇":i===1?"🥈":i===2?"🥉":null;
            return (
              <div key={p.id||i} style={{
                display:"flex",alignItems:"center",gap:12,
                padding:"12px 0",
                borderBottom: i<players.length-1 ? "1px solid rgba(245,200,66,0.07)" : "none",
                background: isMe ? "rgba(212,146,26,0.08)" : "none",
                borderRadius: isMe ? 8 : 0,
                paddingLeft: isMe ? 8 : 0,
              }}>
                <div style={{width:28,textAlign:"center",fontSize:i<3?18:13,color:"rgba(245,200,66,0.5)",fontWeight:900}}>
                  {medal || `#${i+1}`}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:700,color:isMe?"#F5C842":"rgba(245,200,66,0.85)",letterSpacing:1}}>
                    {p.display_name || p.email?.split("@")[0]}
                    {isMe && <span style={{fontSize:9,marginLeft:6,color:"#3ABDD4",letterSpacing:2}}> YOU</span>}
                  </div>
                  <div style={{fontSize:10,color:r.color,letterSpacing:1,marginTop:2}}>{r.icon} {r.label}</div>
                </div>
                <div style={{fontSize:18,fontWeight:900,color:"#F5C842"}}>{p.total_score||0}</div>
              </div>
            );
          })
        )}
        <div style={{marginTop:20}}>
          <button style={btnStyle()} onClick={onClose}>BACK TO BATTLE</button>
        </div>
      </div>
    </MenuOverlay>
  );
}

// ══════════════════════════════════════════════════════════════
// 3. PLAYER LIST OVERLAY
// ══════════════════════════════════════════════════════════════
function PlayerListOverlay({ user, profile, onClose, onChallenge }) {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    B44.list("PlayerProfile", {})
      .then(data => setPlayers(data.filter(p=>p.email !== (user?.email||""))))
      .catch(()=>setPlayers([]))
      .finally(()=>setLoading(false));
  }, []);

  return (
    <MenuOverlay charKey="players" title="Challenge a Warrior" onClose={onClose}>
      <div style={{padding:"20px 20px 28px"}}>
        <div style={{fontSize:10,color:"rgba(245,200,66,0.4)",letterSpacing:3,textAlign:"center",marginBottom:16}}>SELECT YOUR OPPONENT</div>
        {loading ? (
          <div style={{textAlign:"center",padding:32,color:"rgba(245,200,66,0.5)",fontSize:13,letterSpacing:2}}>LOADING...</div>
        ) : players.length === 0 ? (
          <div style={{textAlign:"center",padding:32,color:"rgba(245,200,66,0.4)",fontSize:12}}>No warriors available.</div>
        ) : (
          players.map((p,i)=>{
            const r = rankBadge(p.total_score||0);
            return (
              <div key={p.id||i} style={{
                display:"flex",alignItems:"center",gap:12,
                padding:"13px 0",
                borderBottom: i<players.length-1 ? "1px solid rgba(245,200,66,0.07)" : "none",
              }}>
                <div style={{
                  width:40,height:40,borderRadius:"50%",flexShrink:0,
                  background:"rgba(212,146,26,0.15)",border:`2px solid ${r.color}44`,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:16,fontWeight:900,color:"#F5C842",
                }}>
                  {(p.display_name||p.email||"W")[0].toUpperCase()}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:700,color:"rgba(245,200,66,0.9)",letterSpacing:1}}>
                    {p.display_name||p.email?.split("@")[0]}
                  </div>
                  <div style={{fontSize:10,color:r.color,letterSpacing:1,marginTop:2}}>{r.icon} {r.label} · {p.total_score||0} pts</div>
                </div>
                <button
                  onClick={()=>{ onClose(); onChallenge && onChallenge(p); }}
                  style={{
                    padding:"8px 14px",borderRadius:10,
                    background:"rgba(212,146,26,0.50)",
                    border:"1.5px solid rgba(245,200,66,0.45)",
                    color:"#F5C842",fontFamily:"'Cinzel',serif",fontSize:11,
                    fontWeight:700,letterSpacing:1,cursor:"pointer",
                    backdropFilter:"blur(4px)",
                  }}>
                  ⚔️ SEND
                </button>
              </div>
            );
          })
        )}
        <div style={{marginTop:20}}>
          <button style={btnStyle()} onClick={onClose}>BACK TO BATTLE</button>
        </div>
      </div>
    </MenuOverlay>
  );
}

// ══════════════════════════════════════════════════════════════
// 4. MY SCORES OVERLAY
// ══════════════════════════════════════════════════════════════
function MyScoresOverlay({ user, profile, onClose }) {
  const [games,   setGames]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const email = user?.email || "";
    Promise.all([
      B44.list("GameSession", {}).then(all => (Array.isArray(all)?all:[]).filter(s=>s.challenger_id===email)),
      B44.list("GameSession", {}).then(all => (Array.isArray(all)?all:[]).filter(s=>s.answerer_id===email)),
    ])
      .then(([asC, asA]) => {
        const all = [...asC, ...asA]
          .filter(g=>g.status==="complete"||g.status==="finished")
          .sort((a,b)=>new Date(b.created_date)-new Date(a.created_date))
          .slice(0,15);
        setGames(all);
      })
      .catch(()=>setGames([]))
      .finally(()=>setLoading(false));
  }, []);

  const score   = profile?.total_score  || 0;
  const played  = profile?.games_played || 0;
  const won     = profile?.games_won    || 0;
  const winPct  = played > 0 ? Math.round((won/played)*100) : 0;

  return (
    <MenuOverlay charKey="scores" title="My Scores" onClose={onClose}>
      <div style={{padding:"20px 20px 28px"}}>
        {/* Summary row */}
        <div style={{display:"flex",justifyContent:"space-around",marginBottom:20,paddingBottom:16,borderBottom:"1px solid rgba(245,200,66,0.1)"}}>
          {[["✨",score,"TOTAL"],["🏆",won,"WINS"],["📊",winPct+"%","WIN RATE"]].map(([icon,val,lbl])=>(
            <div key={lbl} style={{textAlign:"center"}}>
              <div style={{fontSize:11,marginBottom:4}}>{icon}</div>
              <div style={{fontSize:22,fontWeight:900,color:"#F5C842"}}>{val}</div>
              <div style={{fontSize:9,color:"rgba(245,200,66,0.4)",letterSpacing:2}}>{lbl}</div>
            </div>
          ))}
        </div>
        {/* Game history */}
        <div style={{fontSize:10,color:"rgba(245,200,66,0.4)",letterSpacing:3,marginBottom:12}}>RECENT BATTLES</div>
        {loading ? (
          <div style={{textAlign:"center",padding:24,color:"rgba(245,200,66,0.5)",fontSize:13,letterSpacing:2}}>LOADING...</div>
        ) : games.length === 0 ? (
          <div style={{textAlign:"center",padding:24,color:"rgba(245,200,66,0.4)",fontSize:12}}>No completed battles yet. Go fight!</div>
        ) : (
          games.map((g,i)=>{
            const email  = user?.email||"";
            const isChallenger = g.challenger_id===email;
            const myScore  = isChallenger ? (g.challenger_score||0) : (g.answerer_score||0);
            const oppScore = isChallenger ? (g.answerer_score||0)   : (g.challenger_score||0);
            const oppName  = isChallenger ? (g.answerer_name||g.answerer_id||"Opponent") : (g.challenger_name||g.challenger_id||"Opponent");
            const won      = myScore > oppScore;
            return (
              <div key={g.id||i} style={{
                display:"flex",alignItems:"center",gap:10,
                padding:"11px 0",
                borderBottom: i<games.length-1 ? "1px solid rgba(245,200,66,0.07)" : "none",
              }}>
                <div style={{fontSize:16}}>{won?"🏆":"💀"}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,color:"rgba(245,200,66,0.85)",letterSpacing:1}}>vs {oppName}</div>
                  <div style={{fontSize:10,color:"rgba(245,200,66,0.4)",marginTop:2}}>
                    {new Date(g.created_date).toLocaleDateString()}
                  </div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:14,fontWeight:900,color:won?"#F5C842":"#C05A2A"}}>{myScore} – {oppScore}</div>
                  <div style={{fontSize:9,color:won?"#3ABDD4":"#C05A2A",letterSpacing:1}}>{won?"VICTORY":"DEFEAT"}</div>
                </div>
              </div>
            );
          })
        )}
        <div style={{marginTop:20}}>
          <button style={btnStyle()} onClick={onClose}>BACK TO BATTLE</button>
        </div>
      </div>
    </MenuOverlay>
  );
}

// ══════════════════════════════════════════════════════════════
// 5. CUSTOM VERSE PACK OVERLAY
// ══════════════════════════════════════════════════════════════
const VERSE_PACK_KEY = "wb_custom_verses";
function CustomVersePackOverlay({ onClose }) {
  const load = () => { try { return JSON.parse(localStorage.getItem(VERSE_PACK_KEY)||"[]"); } catch { return []; } };
  const [slots, setSlots] = useState(load);
  const [editing, setEditing] = useState(null); // index or null
  const [draft,   setDraft]   = useState({ref:"",text:""});

  function save(updated) {
    setSlots(updated);
    localStorage.setItem(VERSE_PACK_KEY, JSON.stringify(updated));
  }
  function openEdit(i) {
    setEditing(i);
    setDraft(slots[i] ? { ref:slots[i].ref||"", text:slots[i].text||"" } : {ref:"",text:""});
  }
  function saveSlot() {
    if (!draft.ref.trim()||!draft.text.trim()) return;
    const updated = [...slots];
    updated[editing] = { ref:draft.ref.trim(), text:draft.text.trim() };
    save(updated); setEditing(null);
  }
  function deleteSlot(i) {
    const updated = [...slots];
    updated.splice(i,1);
    save(updated);
  }

  const SLOTS = 10;

  return (
    <MenuOverlay charKey="verses" title="Custom Verse Pack" onClose={onClose}>
      <div style={{padding:"20px 20px 28px"}}>
        <div style={{fontSize:10,color:"rgba(245,200,66,0.4)",letterSpacing:3,textAlign:"center",marginBottom:16}}>
          {slots.length}/{SLOTS} SLOTS USED
        </div>
        {/* Slot progress bar */}
        <div style={{height:4,borderRadius:2,background:"rgba(255,255,255,0.08)",overflow:"hidden",marginBottom:20}}>
          <div style={{height:"100%",borderRadius:2,background:"linear-gradient(90deg,#1E7A8C,#F5C842)",width:`${(slots.length/SLOTS)*100}%`,transition:"width 0.5s"}}/>
        </div>

        {editing !== null ? (
          /* Edit form */
          <div>
            <div style={{fontSize:11,color:"rgba(245,200,66,0.5)",letterSpacing:2,marginBottom:8}}>VERSE REFERENCE</div>
            <input value={draft.ref} onChange={e=>setDraft(d=>({...d,ref:e.target.value}))}
              placeholder="e.g. John 3:16"
              style={{width:"100%",boxSizing:"border-box",padding:"10px 12px",borderRadius:10,
                border:"1.5px solid rgba(245,200,66,0.3)",background:"rgba(13,31,53,0.6)",
                color:"#F4F0E8",fontFamily:"'Cinzel',serif",fontSize:13,marginBottom:12,outline:"none"}}/>
            <div style={{fontSize:11,color:"rgba(245,200,66,0.5)",letterSpacing:2,marginBottom:8}}>VERSE TEXT</div>
            <textarea value={draft.text} onChange={e=>setDraft(d=>({...d,text:e.target.value}))}
              placeholder="Enter verse text..."
              rows={4}
              style={{width:"100%",boxSizing:"border-box",padding:"10px 12px",borderRadius:10,
                border:"1.5px solid rgba(245,200,66,0.3)",background:"rgba(13,31,53,0.6)",
                color:"#F4F0E8",fontFamily:"sans-serif",fontSize:13,resize:"vertical",outline:"none",marginBottom:16}}/>
            <div style={{display:"flex",gap:10}}>
              <button style={{...btnStyle("teal"),flex:1}} onClick={saveSlot}>💾 SAVE</button>
              <button style={{...btnStyle(),flex:1,background:"rgba(255,255,255,0.08)"}} onClick={()=>setEditing(null)}>CANCEL</button>
            </div>
          </div>
        ) : (
          /* Slot list */
          <div>
            {slots.map((v,i)=>(
              <div key={i} style={{
                display:"flex",alignItems:"center",gap:10,padding:"12px 0",
                borderBottom:"1px solid rgba(245,200,66,0.07)",
              }}>
                <div style={{
                  width:28,height:28,borderRadius:6,flexShrink:0,
                  background:"rgba(212,146,26,0.18)",border:"1px solid rgba(245,200,66,0.25)",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:10,fontWeight:900,color:"#F5C842",
                }}>{i+1}</div>
                <div style={{flex:1,overflow:"hidden"}}>
                  <div style={{fontSize:12,fontWeight:700,color:"#F5C842",letterSpacing:1}}>{v.ref}</div>
                  <div style={{fontSize:10,color:"rgba(245,200,66,0.45)",marginTop:2,
                    overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{v.text}</div>
                </div>
                <button onClick={()=>openEdit(i)} style={{background:"none",border:"none",color:"rgba(245,200,66,0.5)",fontSize:15,cursor:"pointer",padding:"4px 6px"}}>✏️</button>
                <button onClick={()=>deleteSlot(i)} style={{background:"none",border:"none",color:"rgba(192,90,42,0.7)",fontSize:15,cursor:"pointer",padding:"4px 6px"}}>🗑️</button>
              </div>
            ))}
            {slots.length < SLOTS && (
              <button
                onClick={()=>openEdit(slots.length)}
                style={{
                  width:"100%",padding:"12px 0",marginTop:14,borderRadius:12,
                  background:"rgba(30,122,140,0.50)",border:"1.5px solid rgba(58,189,212,0.45)",
                  color:"#3ABDD4",fontFamily:"'Cinzel',serif",fontSize:12,fontWeight:700,
                  letterSpacing:2,cursor:"pointer",backdropFilter:"blur(4px)",
                }}>
                + ADD VERSE
              </button>
            )}
            {slots.length === 0 && (
              <div style={{textAlign:"center",padding:"24px 0",color:"rgba(245,200,66,0.3)",fontSize:12}}>
                Your verse pack is empty.<br/>Add up to 10 personal verses.
              </div>
            )}
            <div style={{marginTop:16}}>
              <button style={btnStyle()} onClick={onClose}>BACK TO BATTLE</button>
            </div>
          </div>
        )}
      </div>
    </MenuOverlay>
  );
}

// ══════════════════════════════════════════════════════════════
// 6. LANGUAGE OVERLAY
// ══════════════════════════════════════════════════════════════
const LANGUAGES = [
  { code:"en", flag:"🇺🇸", name:"English",    native:"English"    },
  { code:"es", flag:"🇪🇸", name:"Spanish",    native:"Español"    },
  { code:"fr", flag:"🇫🇷", name:"French",     native:"Français"   },
  { code:"de", flag:"🇩🇪", name:"German",     native:"Deutsch"    },
  { code:"pt", flag:"🇵🇹", name:"Portuguese", native:"Português"  },
  { code:"it", flag:"🇮🇹", name:"Italian",    native:"Italiano"   },
  { code:"zh", flag:"🇨🇳", name:"Chinese",    native:"中文"        },
  { code:"ru", flag:"🇷🇺", name:"Russian",    native:"Русский"    },
  { code:"ja", flag:"🇯🇵", name:"Japanese",   native:"日本語"      },
  { code:"ar", flag:"🇸🇦", name:"Arabic",     native:"العربية"    },
  { code:"ko", flag:"🇰🇷", name:"Korean",     native:"한국어"      },
  { code:"hi", flag:"🇮🇳", name:"Hindi",      native:"हिन्दी"     },
];
const LANG_KEY = "wb_language";

function LanguageOverlay({ onClose }) {
  const [selected, setSelected] = useState(()=>localStorage.getItem(LANG_KEY)||"en");

  function pick(code) {
    setSelected(code);
    localStorage.setItem(LANG_KEY, code);
  }

  return (
    <MenuOverlay charKey="language" title="Language" onClose={onClose}>
      <div style={{padding:"20px 20px 28px"}}>
        <div style={{fontSize:10,color:"rgba(245,200,66,0.4)",letterSpacing:3,textAlign:"center",marginBottom:6}}>SELECT YOUR LANGUAGE</div>
        <div style={{fontSize:10,color:"rgba(58,189,212,0.5)",letterSpacing:2,textAlign:"center",marginBottom:18}}>🌐 MULTILINGUAL SUPPORT COMING SOON</div>
        {LANGUAGES.map((lang,i)=>{
          const active = selected===lang.code;
          return (
            <button key={lang.code}
              onClick={()=>pick(lang.code)}
              style={{
                width:"100%",display:"flex",alignItems:"center",gap:14,
                padding:"13px 16px",
                borderRadius:10,marginBottom:6,
                background: active ? "rgba(212,146,26,0.50)" : "rgba(255,255,255,0.04)",
                border: active ? "1.5px solid rgba(245,200,66,0.55)" : "1px solid rgba(245,200,66,0.1)",
                cursor:"pointer",textAlign:"left",
                backdropFilter:"blur(4px)",
                transition:"background 0.15s",
              }}>
              <span style={{fontSize:22}}>{lang.flag}</span>
              <div style={{flex:1}}>
                <div style={{fontFamily:"'Cinzel',serif",fontSize:13,fontWeight:700,
                  color:active?"#F5C842":"rgba(245,200,66,0.75)",letterSpacing:1}}>{lang.name}</div>
                <div style={{fontSize:11,color:"rgba(245,200,66,0.4)",marginTop:1}}>{lang.native}</div>
              </div>
              {active && <span style={{color:"#F5C842",fontSize:16}}>✓</span>}
            </button>
          );
        })}
        <div style={{marginTop:16}}>
          <button style={btnStyle()} onClick={onClose}>BACK TO BATTLE</button>
        </div>
      </div>
    </MenuOverlay>
  );
}

// ══════════════════════════════════════════════════════════════
// 7. TUTORIAL OVERLAY
// ══════════════════════════════════════════════════════════════
const TUTORIAL_STEPS = [
  {
    icon:"⚔️",
    title:"The Challenge",
    body:"Challenge any warrior to a 5-round Bible verse battle. Each round, one player picks the difficulty — the other must answer.",
  },
  {
    icon:"📖",
    title:"Know the Verse",
    body:"A Bible verse appears. You must identify the correct Book, Chapter, and Verse from 4 choices. Higher difficulty = more points.",
  },
  {
    icon:"⏱️",
    title:"The Timer",
    body:"You have 20 seconds. At higher ranks, Papa's hint fires earlier to help you learn — but the Word rewards those who study.",
  },
  {
    icon:"📜",
    title:"The Recovery Scroll",
    body:"Answer wrong? You get one chance to recover. Spin the scroll wheels to the correct Book, Chapter, and Verse in 7 seconds.",
  },
  {
    icon:"💥",
    title:"WHAM SLAM",
    body:"Nail the correct answer and WHAM SLAM fires — a cinematic explosion of glory. The crowd knows who knows the Word.",
  },
  {
    icon:"🏆",
    title:"Rank Up",
    body:"Every correct answer earns points. Pick any difficulty — any rank. Scribe (0) → Squire (100) → Warrior (300) → Knight (600) → Champion (1000+). Know the Word. Win the battle.",
  },
];

function TutorialOverlay({ onClose }) {
  const [step, setStep] = useState(0);
  const cur = TUTORIAL_STEPS[step];
  const isLast = step === TUTORIAL_STEPS.length - 1;

  return (
    <MenuOverlay charKey="tutorial" title="How to Play" onClose={onClose}>
      <div style={{padding:"28px 24px 28px"}}>
        {/* Step indicator */}
        <div style={{display:"flex",justifyContent:"center",gap:6,marginBottom:24}}>
          {TUTORIAL_STEPS.map((_,i)=>(
            <div key={i} onClick={()=>setStep(i)} style={{
              width: i===step ? 20 : 7,height:7,borderRadius:4,cursor:"pointer",
              background: i===step ? "#F5C842" : i<step ? "rgba(245,200,66,0.4)" : "rgba(245,200,66,0.15)",
              transition:"all 0.25s",
            }}/>
          ))}
        </div>

        {/* Step content */}
        <div style={{textAlign:"center",padding:"0 8px",minHeight:160}}>
          <div style={{fontSize:48,marginBottom:16,
            filter:"drop-shadow(0 0 12px rgba(212,146,26,0.6))"}}>{cur.icon}</div>
          <div style={{
            fontSize:17,fontWeight:900,color:"#F5C842",
            letterSpacing:2,textTransform:"uppercase",marginBottom:14,
          }}>{cur.title}</div>
          <div style={{
            fontSize:13,color:"rgba(244,240,232,0.85)",
            lineHeight:1.7,fontFamily:"sans-serif",letterSpacing:0.3,
          }}>{cur.body}</div>
        </div>

        {/* Navigation */}
        <div style={{display:"flex",gap:10,marginTop:28}}>
          {step > 0 && (
            <button style={{...btnStyle(),flex:1,background:"rgba(255,255,255,0.08)"}} onClick={()=>setStep(s=>s-1)}>
              ← PREV
            </button>
          )}
          <button style={{...btnStyle("teal"),flex:1}} onClick={isLast ? onClose : ()=>setStep(s=>s+1)}>
            {isLast ? "BEGIN THE BATTLE ⚔️" : "NEXT →"}
          </button>
        </div>
      </div>
    </MenuOverlay>
  );
}



function Hdr({ user, profile, onOut, onSmsToggle, onChallenge }) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(null); // "profile"|"leader"|"players"|"scores"|"verses"|"language"|"tutorial"
  const init = user ? (user.displayName || user.email || "W")[0].toUpperCase() : null;
  const rank = profile ? rankBadge(profile.total_score || 0) : null;

  const MENU_ITEMS = [
    { icon:"👤", label:"My Profile",       action:"profile"   },
    { icon:"🏆", label:"Leaderboard",      action:"leader"    },
    { icon:"⚔️", label:"Player List",      action:"players"   },
    { icon:"📊", label:"My Scores",        action:"scores"    },
    { icon:"📖", label:"Custom Verse Pack",action:"verses"    },
    { icon:"🌐", label:"Language",         action:"language"  },
    { icon:"📜", label:"Tutorial",         action:"tutorial"  },
  ];

  function handleItem(action) {
    setOpen(false);
    setActiveTab(action);
  }

  return (
    <>
      {/* Header bar */}
      <div className="c-hdr">
        <div className="c-logo" onClick={()=>onOut && onOut("lobby")} style={{cursor:"pointer"}} title="Back to Lobby">⚔️ WHAM</div>
        {user && (
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div className="c-pill" style={{cursor:"default",pointerEvents:"none"}}>
              <div className="c-av">{init}</div>
              <div className="c-un">{user.displayName || user.email?.split("@")[0]}</div>
            </div>
            <button
              onClick={()=>setOpen(o=>!o)}
              style={{background:"rgba(245,200,66,0.12)",border:"1.5px solid rgba(245,200,66,0.3)",borderRadius:8,width:38,height:38,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:5,cursor:"pointer",padding:0}}
            >
              {[0,1,2].map(i=>(
                <span key={i} style={{display:"block",width:18,height:2,background:"#F5C842",borderRadius:2,
                  transition:"all 0.2s",
                  transform: open ? (i===0?"rotate(45deg) translate(4px,4px)":i===2?"rotate(-45deg) translate(4px,-4px)":"scaleX(0)") : "none",
                  opacity: open && i===1 ? 0 : 1
                }}/>
              ))}
            </button>
          </div>
        )}
      </div>

      {/* Backdrop */}
      {open && (
        <div onClick={()=>setOpen(false)}
          style={{position:"fixed",inset:0,zIndex:900,background:"rgba(0,0,0,0.45)"}}
        />
      )}

      {/* Drawer */}
      <div style={{
        position:"fixed",top:0,right:0,bottom:0,zIndex:901,
        width:260,
        background:"linear-gradient(180deg,#0D1F35 0%,#1A3A5C 100%)",
        borderLeft:"1.5px solid rgba(245,200,66,0.2)",
        transform: open ? "translateX(0)" : "translateX(100%)",
        transition:"transform 0.28s cubic-bezier(.4,0,.2,1)",
        display:"flex",flexDirection:"column",
        boxShadow:"-8px 0 32px rgba(0,0,0,0.5)",
      }}>
        {/* Drawer header — profile summary */}
        <div style={{padding:"52px 20px 20px",borderBottom:"1px solid rgba(245,200,66,0.1)"}}>
          <div style={{width:52,height:52,borderRadius:"50%",background:"rgba(212,146,26,0.2)",border:"2px solid rgba(245,200,66,0.4)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,fontWeight:900,color:"#F5C842",fontFamily:"'Cinzel',serif",marginBottom:10}}>
            {init}
          </div>
          <div style={{fontFamily:"'Cinzel',serif",fontWeight:700,color:"#F5C842",fontSize:15,marginBottom:4}}>
            {user?.displayName || user?.email?.split("@")[0]}
          </div>
          {rank && (
            <div style={{fontSize:11,color:rank.color,letterSpacing:2}}>
              {rank.icon} {rank.label} · {profile?.total_score||0} pts
            </div>
          )}
          <div style={{display:"flex",gap:16,marginTop:10}}>
            {[["Games",profile?.games_played||0],["Wins",profile?.games_won||0]].map(([l,v])=>(
              <div key={l} style={{textAlign:"center"}}>
                <div style={{fontSize:18,fontWeight:900,color:"#F5C842",fontFamily:"'Cinzel',serif"}}>{v}</div>
                <div style={{fontSize:9,color:"rgba(245,200,66,0.45)",letterSpacing:2}}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Menu items */}
        <div style={{flex:1,overflowY:"auto",padding:"8px 0"}}>
          {MENU_ITEMS.map(({icon,label,action})=>(
            <button key={action} onClick={()=>handleItem(action)}
              style={{width:"100%",display:"flex",alignItems:"center",gap:14,padding:"14px 20px",background:"none",border:"none",cursor:"pointer",textAlign:"left",borderBottom:"1px solid rgba(245,200,66,0.05)",transition:"background 0.15s"}}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(245,200,66,0.07)"}
              onMouseLeave={e=>e.currentTarget.style.background="none"}
            >
              <span style={{fontSize:18,width:24,textAlign:"center"}}>{icon}</span>
              <span style={{fontFamily:"'Cinzel',serif",fontSize:13,fontWeight:600,color:"rgba(245,200,66,0.85)",letterSpacing:1}}>{label}</span>
              <span style={{marginLeft:"auto",color:"rgba(245,200,66,0.3)",fontSize:16}}>›</span>
            </button>
          ))}
        </div>

        {/* Sign out */}
        <div style={{padding:"16px 20px",borderTop:"1px solid rgba(245,200,66,0.1)"}}>
          <button onClick={()=>{setOpen(false); onOut && onOut();}}
            style={{width:"100%",padding:"12px 0",borderRadius:10,border:"1.5px solid rgba(212,146,26,0.4)",background:"rgba(212,146,26,0.1)",color:"#D4921A",fontFamily:"'Cinzel',serif",fontSize:13,fontWeight:700,letterSpacing:1,cursor:"pointer"}}>
            🚪 Sign Out
          </button>
        </div>
      </div>
      {/* Menu Overlays — all 7 tabs */}
      {activeTab==="profile"  && <ProfileOverlay   user={user} profile={profile} rank={rank} onClose={()=>setActiveTab(null)} onSmsToggle={onSmsToggle}/>}
      {activeTab==="leader"   && <LeaderboardOverlay profile={profile} onClose={()=>setActiveTab(null)}/>}
      {activeTab==="players"  && <PlayerListOverlay  user={user} profile={profile} onClose={()=>setActiveTab(null)} onChallenge={(p)=>{ setActiveTab(null); onChallenge && onChallenge(p); }}/>}
      {activeTab==="scores"   && <MyScoresOverlay    user={user} profile={profile} onClose={()=>setActiveTab(null)}/>}
      {activeTab==="verses"   && <CustomVersePackOverlay onClose={()=>setActiveTab(null)}/>}
      {activeTab==="language" && <LanguageOverlay    onClose={()=>setActiveTab(null)}/>}
      {activeTab==="tutorial" && <TutorialOverlay    onClose={()=>setActiveTab(null)}/>}
    </>
  );
}

// ══════════════════════════════════════════════════════════════
// PROFILE MODAL — full-screen cinematic overlay
// ══════════════════════════════════════════════════════════════
function ProfileModal({ user, profile, rank, onClose }) {
  const name       = profile?.display_name || user?.displayName || user?.email?.split("@")[0] || "Warrior";
  const email      = user?.email || profile?.email || "";
  const score      = profile?.total_score   || 0;
  const played     = profile?.games_played  || 0;
  const won        = profile?.games_won     || 0;
  const lost       = Math.max(0, played - won);
  const winPct     = played > 0 ? Math.round((won / played) * 100) : 0;
  const init       = name[0].toUpperCase();
  const r          = rank || { icon:"📜", label:"Scribe", color:"#64748b" };

  // Next rank threshold + progress
  const RANKS = [
    { label:"Scribe",   min:0,    max:100,  color:"#64748b" },
    { label:"Squire",   min:100,  max:300,  color:"#1E7A8C" },
    { label:"Warrior",  min:300,  max:600,  color:"#D4921A" },
    { label:"Knight",   min:600,  max:1000, color:"#C05A2A" },
    { label:"Champion", min:1000, max:1000, color:"#7B2D8B" },
  ];
  const currentRank = RANKS.find(rk => rk.label === r.label) || RANKS[0];
  const nextRank    = RANKS[RANKS.indexOf(currentRank) + 1];
  const progress    = nextRank
    ? Math.min(100, Math.round(((score - currentRank.min) / (nextRank.min - currentRank.min)) * 100))
    : 100;
  const ptsToNext   = nextRank ? Math.max(0, nextRank.min - score) : 0;

  const STAT_ROWS = [
    { label:"Total Score",  value: score,   icon:"✨" },
    { label:"Games Played", value: played,  icon:"🎮" },
    { label:"Victories",    value: won,     icon:"🏆" },
    { label:"Defeats",      value: lost,    icon:"💀" },
    { label:"Win Rate",     value: winPct+"%", icon:"📊" },
  ];

  return (
    <div style={{
      position:"fixed",inset:0,zIndex:1200,
      background:"linear-gradient(180deg,#0D1F35 0%,#1A3A5C 60%,#0D1F35 100%)",
      overflowY:"auto",fontFamily:"'Cinzel',serif",
    }}>
      {/* Gold rim light */}
      <div style={{position:"fixed",top:0,left:0,right:0,height:3,background:"linear-gradient(90deg,transparent,#F5C842,transparent)",zIndex:1}}/>

      {/* Close button */}
      <button onClick={onClose} style={{
        position:"fixed",top:16,right:16,zIndex:1201,
        width:40,height:40,borderRadius:"50%",
        background:"rgba(245,200,66,0.12)",border:"1.5px solid rgba(245,200,66,0.3)",
        color:"#F5C842",fontSize:18,cursor:"pointer",
        display:"flex",alignItems:"center",justifyContent:"center",
      }}>✕</button>

      <div style={{maxWidth:420,margin:"0 auto",padding:"56px 20px 48px"}}>

        {/* Avatar + name block */}
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{
            width:80,height:80,borderRadius:"50%",margin:"0 auto 16px",
            background:"rgba(212,146,26,0.15)",
            border:`3px solid ${r.color}`,
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:34,fontWeight:900,color:"#F5C842",
            boxShadow:`0 0 24px ${r.color}55`,
          }}>{init}</div>
          <div style={{fontSize:22,fontWeight:900,color:"#F5C842",letterSpacing:2,marginBottom:6,textTransform:"uppercase"}}>
            {name}
          </div>
          <div style={{fontSize:12,color:"rgba(245,200,66,0.5)",letterSpacing:2,marginBottom:4}}>
            {email}
          </div>
          <div style={{
            display:"inline-block",padding:"4px 14px",borderRadius:20,
            background:`${r.color}22`,border:`1px solid ${r.color}66`,
            color:r.color,fontSize:12,fontWeight:700,letterSpacing:2,
          }}>
            {r.icon} {r.label.toUpperCase()}
          </div>
        </div>

        {/* Rank progress bar */}
        {nextRank && (
          <div style={{
            background:"rgba(255,255,255,0.04)",border:"1px solid rgba(245,200,66,0.12)",
            borderRadius:12,padding:"16px 18px",marginBottom:20,
          }}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
              <span style={{fontSize:10,color:"rgba(245,200,66,0.5)",letterSpacing:2}}>RANK PROGRESS</span>
              <span style={{fontSize:10,color:r.color,letterSpacing:1}}>{ptsToNext} pts to {nextRank.label}</span>
            </div>
            <div style={{height:6,borderRadius:3,background:"rgba(255,255,255,0.08)",overflow:"hidden"}}>
              <div style={{
                height:"100%",borderRadius:3,
                background:`linear-gradient(90deg,${r.color},#F5C842)`,
                width:`${progress}%`,transition:"width 0.8s ease",
              }}/>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",marginTop:6}}>
              <span style={{fontSize:9,color:"rgba(245,200,66,0.3)"}}>{r.label}</span>
              <span style={{fontSize:9,color:"rgba(245,200,66,0.3)"}}>{nextRank.label}</span>
            </div>
          </div>
        )}
        {!nextRank && (
          <div style={{
            textAlign:"center",padding:"12px",marginBottom:20,
            background:"rgba(123,45,139,0.15)",border:"1px solid rgba(123,45,139,0.4)",
            borderRadius:12,color:"#c084fc",fontSize:12,letterSpacing:2,
          }}>
            👑 MAX RANK — CHAMPION
          </div>
        )}

        {/* Stats grid */}
        <div style={{
          background:"rgba(255,255,255,0.03)",border:"1px solid rgba(245,200,66,0.1)",
          borderRadius:12,overflow:"hidden",marginBottom:20,
        }}>
          <div style={{padding:"12px 18px",borderBottom:"1px solid rgba(245,200,66,0.08)"}}>
            <span style={{fontSize:10,color:"rgba(245,200,66,0.45)",letterSpacing:3}}>BATTLE RECORD</span>
          </div>
          {STAT_ROWS.map(({label,value,icon},i)=>(
            <div key={label} style={{
              display:"flex",alignItems:"center",justifyContent:"space-between",
              padding:"13px 18px",
              borderBottom: i < STAT_ROWS.length-1 ? "1px solid rgba(245,200,66,0.06)" : "none",
            }}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:16}}>{icon}</span>
                <span style={{fontSize:12,color:"rgba(245,200,66,0.65)",letterSpacing:1}}>{label}</span>
              </div>
              <span style={{fontSize:18,fontWeight:900,color:"#F5C842"}}>{value}</span>
            </div>
          ))}
        </div>

        {/* Account info */}
        <div style={{
          background:"rgba(255,255,255,0.03)",border:"1px solid rgba(245,200,66,0.1)",
          borderRadius:12,overflow:"hidden",marginBottom:28,
        }}>
          <div style={{padding:"12px 18px",borderBottom:"1px solid rgba(245,200,66,0.08)"}}>
            <span style={{fontSize:10,color:"rgba(245,200,66,0.45)",letterSpacing:3}}>ACCOUNT</span>
          </div>
          {[
            { label:"Email",    value: email || "—" },
            { label:"SMS",      value: profile?.sms_enabled ? "✅ Enabled" : "❌ Off" },
            { label:"Phone",    value: profile?.phone || "Not set" },
          ].map(({label,value},i)=>(
            <div key={label} style={{
              display:"flex",alignItems:"center",justifyContent:"space-between",
              padding:"13px 18px",
              borderBottom: i < 2 ? "1px solid rgba(245,200,66,0.06)" : "none",
            }}>
              <span style={{fontSize:12,color:"rgba(245,200,66,0.5)",letterSpacing:1}}>{label}</span>
              <span style={{fontSize:12,color:"rgba(245,200,66,0.85)",fontFamily:"sans-serif",letterSpacing:0.5}}>{value}</span>
            </div>
          ))}
        </div>

        {/* Close CTA */}
        <button onClick={onClose} style={{
          width:"100%",padding:"14px 0",borderRadius:12,
          background:"linear-gradient(135deg,rgba(212,146,26,0.2),rgba(245,200,66,0.08))",
          border:"1.5px solid rgba(245,200,66,0.35)",
          color:"#F5C842",fontFamily:"'Cinzel',serif",
          fontSize:13,fontWeight:700,letterSpacing:2,cursor:"pointer",
        }}>
          BACK TO BATTLE
        </button>

      </div>
    </div>
  );
}

// ── WHAM SLAM ──
function Slam({ active, pts, onDone }) {
  const [ph, setPh] = useState(-1);
  useEffect(() => {
    if (!active) { setPh(-1); return; }
    try { new Audio(WHAM_AUDIO).play().catch(()=>{}); } catch {}
    setPh(0);
    const t = [
      setTimeout(()=>setPh(1), 140),
      setTimeout(()=>setPh(2), 800),
      setTimeout(()=>setPh(3), 1400),
      setTimeout(()=>{ onDone && onDone(); }, 1750),
    ];
    return () => t.forEach(clearTimeout);
  }, [active]);
  if (!active || ph < 0) return null;
  return (
    <div style={{position:"fixed",inset:0,zIndex:9999,background:ph===0?"#fff":"#020617",transition:"background 0.12s"}}>
      {ph>=1 && <img src={WHAM_CHARS} alt="" style={{position:"absolute",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,opacity:ph<3?1:0,transition:"opacity .25s"}}/>}
      {ph>=2 && <img src={WHAM_TEXT_IMG} alt="" style={{position:"absolute",top:"18%",left:"50%",transform:`translateX(-50%) scale(${ph===2?1.08:1})`,width:"88%",maxWidth:400,opacity:ph<3?1:0,transition:"transform .3s cubic-bezier(.34,1.56,.64,1),opacity .4s"}}/>}
      <div style={{position:"absolute",bottom:32,left:0,right:0,textAlign:"center",fontFamily:"'Cinzel',serif",fontSize:20,fontWeight:900,color:C.goldLight,opacity:ph===2?1:0,transition:"opacity .3s .2s",letterSpacing:3}}>+{pts||5}</div>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════
// STREAK FLASH — 3 consecutive correct answers → +5 bonus
// Battle-style cinematic, 900ms total. Fires before WHAM SLAM.
// ══════════════════════════════════════════════════════════════
function StreakFlash({ onDone }) {
  const [ph, setPh] = useState(0);
  useEffect(() => {
    const t1 = setTimeout(()=>setPh(1), 120);
    const t2 = setTimeout(()=>setPh(2), 400);
    const t3 = setTimeout(()=>setPh(3), 650);
    const t4 = setTimeout(()=>{ onDone && onDone(); }, 900);
    return ()=>{ [t1,t2,t3,t4].forEach(clearTimeout); };
  }, []);
  const fading = ph === 3;
  return (
    <div style={{
      position:"fixed",inset:0,zIndex:9998,overflow:"hidden",
      background: ph===0 ? "rgba(245,200,66,0.92)" : "rgba(13,31,53,0.96)",
      opacity: fading ? 0 : 1,
      transition: fading ? "opacity 0.25s ease" : ph===0 ? "none" : "background 0.18s ease",
      pointerEvents:"none",
    }}>
      {/* Left character — flipped */}
      <div style={{
        position:"absolute",bottom:0,
        left: ph>=1 ? "5%" : "-60%",
        transition: ph===1 ? "left 0.28s cubic-bezier(0.22,1,0.36,1)" : "none",
        transform:"scaleX(-1)",
        opacity: fading ? 0 : 1,
        zIndex:2,
      }}>
        <img src={WHAM_CHARS} alt="" style={{width:"55vw",maxWidth:300,minWidth:160,display:"block",objectFit:"contain",objectPosition:"bottom"}}/>
      </div>
      {/* Right character */}
      <div style={{
        position:"absolute",bottom:0,
        right: ph>=1 ? "5%" : "-60%",
        transition: ph===1 ? "right 0.28s cubic-bezier(0.22,1,0.36,1)" : "none",
        opacity: fading ? 0 : 1,
        zIndex:2,
      }}>
        <img src={WHAM_CHARS} alt="" style={{width:"55vw",maxWidth:300,minWidth:160,display:"block",objectFit:"contain",objectPosition:"bottom"}}/>
      </div>
      {/* Spark burst */}
      {ph>=2 && (
        <div style={{position:"absolute",top:"44%",left:"50%",transform:"translate(-50%,-50%)",zIndex:4}}>
          {[0,45,90,135,180,225,270,315].map(deg=>(
            <div key={deg} style={{
              position:"absolute",top:"50%",left:"50%",width:40,height:2,
              background:"linear-gradient(90deg,#F5C842,transparent)",
              transformOrigin:"left center",transform:`rotate(${deg}deg)`,
              borderRadius:2,opacity: fading ? 0 : 0.85,
              transition:"opacity 0.2s",
            }}/>
          ))}
        </div>
      )}
      {/* +5 STREAK text */}
      <div style={{
        position:"absolute",top:"36%",left:"50%",
        transform:`translate(-50%,-50%) scale(${ph<2?0:fading?0.7:1.0})`,
        opacity: ph<2 ? 0 : fading ? 0 : 1,
        transition: ph===2
          ? "transform 0.28s cubic-bezier(0.34,1.56,0.64,1),opacity 0.12s"
          : "transform 0.2s ease,opacity 0.25s",
        textAlign:"center",whiteSpace:"nowrap",zIndex:5,
      }}>
        <div style={{
          fontFamily:"'Cinzel',serif",
          fontSize:"clamp(42px,13vw,72px)",
          fontWeight:900,letterSpacing:4,
          background:"linear-gradient(180deg,#FFFFFF 0%,#F5C842 40%,#D4921A 100%)",
          WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
          filter:"drop-shadow(0 0 18px rgba(245,200,66,0.9)) drop-shadow(0 0 36px rgba(245,200,66,0.5))",
          lineHeight:1,
        }}>+5</div>
        <div style={{
          fontFamily:"'Cinzel',serif",fontSize:"clamp(11px,3.5vw,16px)",
          fontWeight:800,letterSpacing:6,color:"#F5C842",
          textShadow:"0 0 12px rgba(245,200,66,0.8)",
          marginTop:4,textTransform:"uppercase",
        }}>STREAK BONUS</div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// AUTH SCREEN
// ══════════════════════════════════════════════════════════════
function Auth({ onIn }) {
  const [mode,  setMode]  = useState("choice");
  const [email, setEmail] = useState("");
  const [pass,  setPass]  = useState("");
  const [name,  setName]  = useState("");
  const [phone,      setPhone]      = useState("");
  const [smsConsent, setSmsConsent] = useState(false); // Task 3: explicit checkbox consent
  const [err,        setErr]        = useState("");
  const [busy,       setBusy]       = useState(false);

  // ── Drag / rubber-band state ─────────────────────────────
  // EXPANDED = panel top at 28% → full form visible incl. SMS checkbox
  // PEEK     = panel top at 74% → handle + title visible, chevron ▲ to re-open
  const AUTH_SNAP_DOWN = 0.74;   // peek: only handle + title above fold
  const AUTH_SNAP_UP   = 0.24;   // expanded: full form + SMS checkbox visible
  const AUTH_LIMIT_TOP = 0.18;   // hard ceiling (don't go above title)
  const AUTH_LIMIT_BOT = 0.84;   // hard floor
  const AUTH_RUBBER    = 0.28;
  const [authSnap,     setAuthSnap]     = useState("up");   // start EXPANDED
  const [authRawTop,   setAuthRawTop]   = useState(AUTH_SNAP_UP);  // 28%
  const [authDragging, setAuthDragging] = useState(false);
  const [authBgScale,  setAuthBgScale]  = useState(1.0);
  const authDragRef    = useRef(null);
  const authScrollRef  = useRef(null);  // ref to inner scroll container
  const authWinHRef    = useRef(typeof window !== "undefined" ? window.innerHeight : 812);
  // LOCKED on mount — never re-read during keyboard open/close
  // This prevents panel height jumping as virtual keyboard changes viewport size
  const authWinH = authWinHRef.current;

  // Derived display top with rubber-band
  const authDisplayTop = (() => {
    if (authRawTop < AUTH_LIMIT_TOP) {
      return AUTH_LIMIT_TOP - (AUTH_LIMIT_TOP - authRawTop) * AUTH_RUBBER;
    }
    if (authRawTop > AUTH_LIMIT_BOT) {
      return AUTH_LIMIT_BOT + (authRawTop - AUTH_LIMIT_BOT) * AUTH_RUBBER;
    }
    return authRawTop;
  })();
  const authTopPx  = Math.round(authDisplayTop * authWinH);
  const authMaxH   = Math.round(0.78 * authWinH);  // 78% max — room for full create form + SMS consent
  const authPanelH = Math.min(authWinH - authTopPx - 16, authMaxH);

  // Margin squeeze — as panel approaches limits, side margins compress 16px → 4px
  const authMargin = (() => {
    const distTop = authDisplayTop - AUTH_LIMIT_TOP;   // 0 at ceiling
    const distBot = AUTH_LIMIT_BOT - authDisplayTop;   // 0 at floor
    const closest = Math.min(distTop, distBot);
    const t = Math.max(0, Math.min(1, closest / 0.10)); // 0→1 over 10% range
    return Math.round(4 + t * 12); // 4px at limit → 16px nominal
  })();

  function authApplyRubberBg(frac) {
    if (frac < AUTH_LIMIT_TOP) {
      const t = Math.min((AUTH_LIMIT_TOP - frac) / 0.10, 1);
      setAuthBgScale(1 + t * 0.045);
    } else if (frac > AUTH_LIMIT_BOT) {
      const t = Math.min((frac - AUTH_LIMIT_BOT) / 0.10, 1);
      setAuthBgScale(1 + t * 0.045);
    } else {
      setAuthBgScale(1.0);
    }
  }
  function authSnapToPos(frac) {
    const mid = (AUTH_SNAP_UP + AUTH_SNAP_DOWN) / 2;
    const target = frac < mid ? AUTH_SNAP_UP : AUTH_SNAP_DOWN;
    setAuthRawTop(target);
    setAuthSnap(target === AUTH_SNAP_UP ? "up" : "down");
    setAuthBgScale(1.0);
  }
  function onAuthTouchStart(e) {
    authDragRef.current = { startY: e.touches[0].clientY, startFrac: authRawTop };
    setAuthDragging(true);
  }
  function onAuthTouchMove(e) {
    if (!authDragRef.current) return;
    const dy   = e.touches[0].clientY - authDragRef.current.startY;
    const frac = authDragRef.current.startFrac + dy / authWinH;
    setAuthRawTop(frac);
    authApplyRubberBg(frac);
  }
  function onAuthTouchEnd() {
    setAuthDragging(false);
    authSnapToPos(authRawTop);
    authDragRef.current = null;
  }
  function onAuthMouseDown(e) {
    authDragRef.current = { startY: e.clientY, startFrac: authRawTop };
    setAuthDragging(true);
    e.preventDefault();
  }
  useEffect(() => {
    if (!authDragging) return;
    function onMM(e) {
      if (!authDragRef.current) return;
      const dy   = e.clientY - authDragRef.current.startY;
      const frac = authDragRef.current.startFrac + dy / authWinH;
      setAuthRawTop(frac);
      authApplyRubberBg(frac);
    }
    function onMU() {
      setAuthDragging(false);
      authSnapToPos(authRawTop);
      authDragRef.current = null;
    }
    window.addEventListener("mousemove", onMM);
    window.addEventListener("mouseup",   onMU);
    return () => { window.removeEventListener("mousemove", onMM); window.removeEventListener("mouseup", onMU); };
  }, [authDragging, authRawTop]);

  // Pull-scroll disabled — keyboard/autofill events caused erratic panel jumps
  // Panel position is controlled only by drag gesture and chevron tap
  function onAuthContentScroll(_e) { /* intentionally empty */ }

  function toggleAuthSnap() {
    const target = authSnap === "down" ? AUTH_SNAP_UP : AUTH_SNAP_DOWN;
    setAuthRawTop(target);
    setAuthSnap(authSnap === "down" ? "up" : "down");
    setAuthBgScale(1.0);
  }
  const authTransition = authDragging ? "none" : "top 0.36s cubic-bezier(.34,1.56,.64,1), height 0.36s cubic-bezier(.34,1.56,.64,1)";

  // NOTE: session check is handled at Challenge() root level — do NOT re-check here
  // This prevents the double-onIn loop on every mount

  async function loadAndEnter(u, extraFields = {}) {
    // Fetch ALL profiles then filter by email in JS (B44 SDK does not support server-side field filtering)
    let realProfile = null;
    try {
      const all = await B44.list("PlayerProfile", {});
      const mine = (all || []).filter(p => p.email === u.email)
        .sort((a,b) => new Date(a.created_date) - new Date(b.created_date)); // oldest first = canonical
      if (mine.length > 0) {
        realProfile = mine[0];
        // Delete all duplicates silently
        mine.slice(1).forEach(p => B44.delete("PlayerProfile", p.id).catch(() => {}));
        // Apply extra fields if registration
        if (Object.keys(extraFields).length > 0) {
          await B44.update("PlayerProfile", realProfile.id, extraFields).catch(() => {});
          realProfile = { ...realProfile, ...extraFields };
        }
      } else {
        // No profile exists — create one now
        realProfile = await B44.create("PlayerProfile", {
          email: u.email,
          display_name: extraFields.display_name || u.displayName || u.email.split("@")[0],
          phone: extraFields.phone || "",
          sms_enabled: extraFields.sms_enabled || false,
          total_score: 0, games_played: 0, games_won: 0,
        });
      }
    } catch (e) {
      console.warn("[B44] Profile fetch failed, using local stub:", e.message);
    }
    // Fall back to local stub only if B44 is completely unreachable
    const profile = realProfile || {
      email: u.email,
      display_name: extraFields.display_name || u.displayName || u.email.split("@")[0],
      total_score: 0, games_played: 0, games_won: 0,
    };
    onIn(u, profile);
  }

  function reset() { setMode("choice"); setEmail(""); setPass(""); setName(""); setPhone(""); setErr(""); setBusy(false); }

  async function doCreate(e) {
    e.preventDefault();
    if (!name.trim())    return setErr("Display name is required.");
    if (!email.trim())   return setErr("Email is required.");
    if (pass.length < 6) return setErr("Password must be at least 6 characters.");
    setErr(""); setBusy(true);
    try {
      // Create local auth account
      const user = LocalAuth.create(email.trim(), pass, name.trim());
      // Route through loadAndEnter — this fetches/creates the B44 profile synchronously
      // so the user enters the lobby with a real profile.id, never a stub
      await loadAndEnter(user, {
        display_name: name.trim(),
        phone: phone.trim() || "",
        sms_enabled: !!(phone.trim() && smsConsent),
      });
    } catch (e2) {
      setErr(parseError(e2));
      setBusy(false);
    }
  }

  async function doSignIn(e) {
    e.preventDefault();
    if (!email.trim()) return setErr("Email is required.");
    if (!pass.trim())  return setErr("Password is required.");
    setErr(""); setBusy(true);
    try {
      const user = LocalAuth.signIn(email.trim(), pass);
      await loadAndEnter(user);
    } catch (e2) { setErr(parseError(e2)); setBusy(false); }
  }

  return (
    <div className="c-screen">
      {/* ── Scalable scene (rubber-band squeeze effect) ── */}
      <div style={{
        position:"fixed",inset:0,zIndex:0,
        transform:`scale(${authBgScale})`,
        transformOrigin:"center center",
        transition: authDragging ? "none" : "transform 0.36s cubic-bezier(.34,1.56,.64,1)",
      }}>
        <Bg char={CHAR_MP}/>
      </div>
      {/* Gold rim */}
      <div style={{position:"fixed",top:0,left:0,right:0,height:3,zIndex:2,background:"linear-gradient(90deg,transparent,#F5C842,transparent)",pointerEvents:"none"}}/>
      {/* Vignette */}
      <div style={{position:"fixed",inset:0,zIndex:1,background:"linear-gradient(180deg,rgba(0,0,0,0.32) 0%,rgba(0,0,0,0) 28%)",pointerEvents:"none"}}/>
      <Hdr/>

      {/* Screen title */}
      <div style={{position:"fixed",top:52,left:0,right:0,zIndex:3,textAlign:"center",pointerEvents:"none"}}>
        <div style={{fontSize:20,fontWeight:900,color:"#F5C842",letterSpacing:4,textTransform:"uppercase",textShadow:"0 2px 18px rgba(0,0,0,0.7),0 0 24px rgba(212,146,26,0.5)"}}>
          Verse Challenge
        </div>
        <div style={{width:60,height:2,margin:"7px auto 0",background:"linear-gradient(90deg,transparent,#F5C842,transparent)"}}/>
      </div>

      {/* ── Floating draggable panel ── */}
      <div style={{
        position:"fixed",
        left:authMargin, right:authMargin,
        top: authTopPx,
        height: authPanelH,
        zIndex:10,
        borderRadius:18,
        overflow:"hidden",
        boxShadow:"0 8px 40px rgba(0,0,0,0.55), 0 0 0 1px rgba(245,200,66,0.18)",
        display:"flex",
        flexDirection:"column",
        transition: authTransition,
      }}>

        {/* ── Handle bar + chevron ── */}
        <div
          onTouchStart={onAuthTouchStart}
          onTouchMove={onAuthTouchMove}
          onTouchEnd={onAuthTouchEnd}
          onMouseDown={onAuthMouseDown}
          style={{
            flexShrink:0,
            display:"flex",alignItems:"center",justifyContent:"center",
            position:"relative",
            paddingTop:10,paddingBottom:8,
            background:"rgba(13,31,53,0.72)",
            borderBottom:"1px solid rgba(245,200,66,0.18)",
            cursor:"grab",
            userSelect:"none",
            touchAction:"none",
          }}
        >
          {/* Gold pill handle */}
          <div style={{width:40,height:4,borderRadius:2,background:"rgba(245,200,66,0.50)"}}/>
          {/* Chevron expand/collapse */}
          <button
            type="button"
            onClick={e=>{ e.stopPropagation(); toggleAuthSnap(); }}
            onMouseDown={e=>e.stopPropagation()}
            onTouchStart={e=>e.stopPropagation()}
            style={{
              position:"absolute",right:12,top:"50%",
              transform:"translateY(-50%)",
              background:"rgba(212,146,26,0.20)",
              border:"1px solid rgba(245,200,66,0.35)",
              borderRadius:8,
              color:"#F5C842",
              fontSize:16,
              width:32,height:26,
              display:"flex",alignItems:"center",justifyContent:"center",
              cursor:"pointer",
              transition:"background 0.15s",
            }}
            title={authSnap==="down" ? "Expand" : "Collapse"}
          >
            {authSnap==="down" ? "▲" : "▼"}
          </button>
        </div>

        {/* ── Scrollable content ── */}
        <div
          ref={authScrollRef}
          onScroll={onAuthContentScroll}
          style={{
          flex:1,
          overflowY:"auto",
          background:"rgba(13,31,53,0.60)",
          backdropFilter:"blur(12px)",
          WebkitBackdropFilter:"blur(12px)",
          WebkitOverflowScrolling:"touch",
        }}>
          <div style={{maxWidth:440,margin:"0 auto",padding:"20px 16px 12px"}}>

        {mode === "choice" && (<>
          <div style={{textAlign:"center",marginBottom:22}}>
            <div style={{fontSize:36,marginBottom:8}}>📖</div>
            <p className="c-sub" style={{margin:0}}>Know the Word · Win the Battle</p>
          </div>
          <button className="c-btn-a" onClick={()=>{ setMode("create"); setErr(""); }}>🕊️ Create Free Account</button>
          <button className="c-btn-b" onClick={()=>{ setMode("signin"); setErr(""); }}>🔐 Sign In</button>
          <div className="c-div"><div className="c-div-line"/><div className="c-div-txt">OR</div><div className="c-div-line"/></div>
          <button className="c-btn-c" onClick={()=>window.location.href="/"}>⚔️ Play Solo as Guest</button>
        </>)}

        {mode === "create" && (<>
          <div style={{textAlign:"center",marginBottom:18}}>
            <div style={{fontSize:32,marginBottom:6}}>🕊️</div>
            <h1 className="c-h1">Create Account</h1>
            <p className="c-sub">Free · SMS alerts optional</p>
          </div>
          <form onSubmit={doCreate} autoComplete="on">
            <label className="c-lbl">Warrior Name</label>
            <input className="c-inp" type="text" autoComplete="name" autoCapitalize="off" autoCorrect="off" spellCheck="false" placeholder="Your display name"
              value={name} onChange={e=>{setName(e.target.value);setErr("");}} disabled={busy}/>
            <label className="c-lbl">Email</label>
            <input className="c-inp" type="email" autoComplete="email" autoCapitalize="none" autoCorrect="off" spellCheck="false" placeholder="you@example.com"
              value={email} onChange={e=>{setEmail(e.target.value);setErr("");}} disabled={busy}/>
            <label className="c-lbl">Password</label>
            <input className="c-inp" type="password" autoComplete="new-password" autoCapitalize="none" autoCorrect="off" spellCheck="false" placeholder="6+ characters"
              value={pass} onChange={e=>{setPass(e.target.value);setErr("");}} disabled={busy}/>
            <label className="c-lbl">Phone (optional · for challenge alerts)</label>
            <input className="c-inp" type="tel" autoComplete="tel" autoCapitalize="none" autoCorrect="off" spellCheck="false" placeholder="+1 555 000 0000"
              value={phone}
              onChange={e=>{
                setPhone(e.target.value);
                setErr("");
                // Scroll consent checkbox into view after a tick
                if (e.target.value.trim()) {
                  setTimeout(()=>{
                    const el = authScrollRef.current;
                    if (el) el.scrollTo({ top: el.scrollHeight, behavior:"smooth" });
                  }, 80);
                }
              }}
              disabled={busy}/>
            {phone.trim() && (
              <div style={{marginTop:6,marginBottom:4}}>
                <label style={{
                  display:"flex",alignItems:"flex-start",gap:10,cursor:"pointer",
                  padding:"10px 12px",borderRadius:8,
                  background: smsConsent ? "rgba(212,146,26,0.10)" : "rgba(212,146,26,0.04)",
                  border:`1px solid ${smsConsent ? "rgba(212,146,26,0.4)" : "rgba(212,146,26,0.15)"}`,
                  transition:"all 0.2s",
                }}>
                  <input type="checkbox" checked={smsConsent} onChange={e=>setSmsConsent(e.target.checked)}
                    disabled={busy} style={{marginTop:2,flexShrink:0,accentColor:"#D4921A",width:16,height:16,cursor:"pointer"}}/>
                  <span style={{fontSize:10,color:"rgba(245,200,66,0.75)",lineHeight:1.7,letterSpacing:0.3}}>
                    By checking this box, I agree to receive automated SMS game alert messages from{" "}
                    <strong style={{color:"rgba(245,200,66,0.9)"}}>WhamBible</strong> at the number above.
                    Message frequency varies. Msg &amp; data rates may apply.
                    Reply <strong style={{color:"#F5C842"}}>STOP</strong> to unsubscribe.
                    Reply <strong style={{color:"#F5C842"}}>HELP</strong> for support.
                    Consent is not a condition of purchase or use.
                  </span>
                </label>
              </div>
            )}
            {err ? <div className="c-err">⚠️ {err}</div> : <div style={{height:18}}/>}
            <button className="c-btn-a" type="submit" disabled={busy}>{busy?"Creating…":"🕊️ Create Account"}</button>
          </form>
          <a className="c-back" onClick={reset}>← Back</a>
        </>)}

        {mode === "signin" && (<>
          <div style={{textAlign:"center",marginBottom:18}}>
            <div style={{fontSize:32,marginBottom:6}}>🔐</div>
            <h1 className="c-h1">Sign In</h1>
            <p className="c-sub">Welcome back, warrior</p>
          </div>
          <form onSubmit={doSignIn} autoComplete="on">
            <label className="c-lbl">Email</label>
            <input className="c-inp" type="email" autoComplete="email" autoCapitalize="none" autoCorrect="off" spellCheck="false" placeholder="you@example.com"
              value={email} onChange={e=>{setEmail(e.target.value);setErr("");}} disabled={busy}/>
            <label className="c-lbl">Password</label>
            <input className="c-inp" type="password" autoComplete="current-password" autoCapitalize="none" autoCorrect="off" spellCheck="false" placeholder="••••••••"
              value={pass} onChange={e=>{setPass(e.target.value);setErr("");}} disabled={busy}/>
            {err ? <div className="c-err">⚠️ {err}</div> : <div style={{height:18}}/>}
            <button className="c-btn-a" type="submit" disabled={busy}>{busy?"Signing In…":"🔐 Enter the Arena"}</button>
          </form>
          <a className="c-back" onClick={reset}>← Back</a>
        </>)}

          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// LOBBY — start new game OR see active games
// ══════════════════════════════════════════════════════════════
const LOBBY_SLOTS   = 10;   // fixed visible slots in each panel
const LOBBY_LS_KEY  = "wb_overflow_games"; // localStorage key for >10 active games

function Lobby({ user, profile, onChallenge, onResumeGame, onOut, onSmsToggle }) {
  const [tab,        setTab]        = useState("new");
  const [allPlayers, setAllPlayers] = useState([]);
  const [search,     setSearch]     = useState("");
  const [games,      setGames]      = useState([]);      // visible 10
  const [loading,    setLoading]    = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [panelSnap,  setPanelSnap]  = useState("up");    // "up" | "down"
  const [panelRaw,   setPanelRaw]   = useState(0.46);    // fraction from top
  const [panelDrag,  setPanelDrag]  = useState(false);
  const [panelBgSc,  setPanelBgSc]  = useState(1.0);
  const panelDragRef  = useRef(null);
  const panelScrollRef = useRef(null);
  const panelWinH     = useRef(typeof window !== "undefined" ? window.innerHeight : 812).current;
  const loadedRef     = useRef({ new: false, active: false });

  // ── Panel constants (per screen handling standards) ──
  const SNAP_UP   = 0.46;   // expanded  — character mid-visible, search + slots show
  const SNAP_DOWN = 0.80;   // peeked    — tabs row + pill only
  const LIM_TOP   = 0.32;   // hard ceiling
  const LIM_BOT   = 0.86;   // hard floor
  const RUBBER    = 0.28;

  // Derived panel position
  const panelDisplay = (() => {
    if (panelRaw < LIM_TOP) return LIM_TOP - (LIM_TOP - panelRaw) * RUBBER;
    if (panelRaw > LIM_BOT) return LIM_BOT + (panelRaw - LIM_BOT) * RUBBER;
    return panelRaw;
  })();
  const panelTopPx  = Math.round(panelDisplay * panelWinH);
  const panelMaxH   = Math.round(0.65 * panelWinH);
  const panelH      = Math.min(panelWinH - panelTopPx - 16, panelMaxH);

  // Margin squeeze
  const panelMargin = (() => {
    const dt = panelDisplay - LIM_TOP;
    const db = LIM_BOT - panelDisplay;
    const t  = Math.max(0, Math.min(1, Math.min(dt, db) / 0.10));
    return Math.round(4 + t * 12);
  })();

  // Bg scale rubber-band
  function applyRubberBg(frac) {
    if (frac < LIM_TOP) {
      const t = Math.min((LIM_TOP - frac) / 0.10, 1);
      setPanelBgSc(1 + t * 0.04);
    } else if (frac > LIM_BOT) {
      const t = Math.min((frac - LIM_BOT) / 0.10, 1);
      setPanelBgSc(1 + t * 0.04);
    } else { setPanelBgSc(1.0); }
  }

  function snapToPos(frac) {
    const mid = (SNAP_UP + SNAP_DOWN) / 2;
    const target = frac < mid ? SNAP_UP : SNAP_DOWN;
    setPanelRaw(target);
    setPanelSnap(target === SNAP_UP ? "up" : "down");
    setPanelBgSc(1.0);
  }

  function toggleSnap() {
    const target = panelSnap === "down" ? SNAP_UP : SNAP_DOWN;
    setPanelRaw(target);
    setPanelSnap(panelSnap === "down" ? "up" : "down");
    setPanelBgSc(1.0);
  }

  function onTouchStart(e) {
    panelDragRef.current = { startY: e.touches[0].clientY, startFrac: panelRaw };
    setPanelDrag(true);
  }
  function onTouchMove(e) {
    if (!panelDragRef.current) return;
    const dy   = e.touches[0].clientY - panelDragRef.current.startY;
    const frac = panelDragRef.current.startFrac + dy / panelWinH;
    setPanelRaw(frac);
    applyRubberBg(frac);
  }
  function onTouchEnd() { setPanelDrag(false); snapToPos(panelRaw); panelDragRef.current = null; }
  function onMouseDown(e) {
    panelDragRef.current = { startY: e.clientY, startFrac: panelRaw };
    setPanelDrag(true); e.preventDefault();
  }
  useEffect(() => {
    if (!panelDrag) return;
    function onMM(e) {
      if (!panelDragRef.current) return;
      const dy = e.clientY - panelDragRef.current.startY;
      const frac = panelDragRef.current.startFrac + dy / panelWinH;
      setPanelRaw(frac); applyRubberBg(frac);
    }
    function onMU() { setPanelDrag(false); snapToPos(panelRaw); panelDragRef.current = null; }
    window.addEventListener("mousemove", onMM);
    window.addEventListener("mouseup",   onMU);
    return () => { window.removeEventListener("mousemove", onMM); window.removeEventListener("mouseup", onMU); };
  }, [panelDrag, panelRaw]);

  const panelTransition = panelDrag ? "none" : "top 0.36s cubic-bezier(.34,1.56,.64,1), height 0.36s cubic-bezier(.34,1.56,.64,1)";

  const rank   = rankBadge(profile?.total_score || 0);
  const myName = profile?.display_name || user?.email?.split("@")[0];

  // Reset snap when tab changes
  useEffect(() => {
    setPanelRaw(SNAP_UP); setPanelSnap("up");
    if (tab === "new") { if (!loadedRef.current.new) loadPlayers(); }
    else { loadedRef.current.active = false; loadGames(); }
  }, [tab]);

  // search filter — client-side filter on cached players
  const filteredPlayers = !search.trim() ? allPlayers
    : allPlayers.filter(p =>
        (p.display_name||"").toLowerCase().includes(search.toLowerCase()) ||
        (p.email||"").toLowerCase().includes(search.toLowerCase())
      );

  // live B44 search when typing (debounced 400ms)
  const [liveResults, setLiveResults] = useState([]);
  useEffect(() => {
    const q = search.trim();
    if (q.length < 2) { setLiveResults([]); return; }
    const tid = setTimeout(async () => {
      try {
        setSearchLoading(true);
        const raw = await B44.list("PlayerProfile");
        const all = Array.isArray(raw) ? raw : (raw?.records || []);
        const lq  = q.toLowerCase();
        const myEmail = user?.email || profile?.email || "";
        const myId    = profile?.id || "";
        const res = all.filter(p =>
          p.email !== myEmail && (myId ? p.id !== myId : true) &&
          ((p.display_name||"").toLowerCase().includes(lq) ||
           (p.email||"").toLowerCase().includes(lq))
        );
        setLiveResults(res);
      } catch(e) { /* silent */ }
      finally { setSearchLoading(false); }
    }, 400);
    return () => clearTimeout(tid);
  }, [search]);

  // merge: if search active use live results, else cached
  const displayPlayers = search.trim().length >= 2
    ? liveResults
    : filteredPlayers;

  // Build 10 fixed slots for players
  const playerSlots = Array.from({ length: LOBBY_SLOTS }, (_, i) => displayPlayers[i] || null);

  // Build 10 fixed slots for games; overflow → localStorage
  function buildGameSlots(allGames) {
    const visible  = allGames.slice(0, LOBBY_SLOTS);
    const overflow = allGames.slice(LOBBY_SLOTS);
    if (overflow.length > 0) {
      try { localStorage.setItem(LOBBY_LS_KEY, JSON.stringify(overflow)); }
      catch(e) {}
    } else {
      try { localStorage.removeItem(LOBBY_LS_KEY); } catch(e) {}
    }
    return visible;
  }

  // When a game slot frees up (battle/decline), pull from overflow
  function pullFromOverflow(currentGames) {
    try {
      const raw = localStorage.getItem(LOBBY_LS_KEY);
      if (!raw) return currentGames;
      const overflow = JSON.parse(raw);
      if (!overflow.length) return currentGames;
      const next = overflow.shift();
      localStorage.setItem(LOBBY_LS_KEY, JSON.stringify(overflow));
      return [...currentGames, next];
    } catch(e) { return currentGames; }
  }

  async function loadPlayers() {
    setLoading(true);
    try {
      const raw    = await B44.list("PlayerProfile");
      const all    = Array.isArray(raw) ? raw : (raw?.records || []);
      const myEmail = user?.email || profile?.email || "";
      const myId    = profile?.id || "";
      const others = all.filter(p => p.email !== myEmail && (myId ? p.id !== myId : true));
      setAllPlayers(others);
      loadedRef.current.new = true;
    } catch(e) { console.warn("[Lobby] loadPlayers:", e.message); }
    setLoading(false);
  }

  async function loadGames() {
    if (!profile?.id) return;
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([
        B44.list("GameSession", {}).then(all => (Array.isArray(all)?all:[]).filter(s=>s.challenger_id===profile.id)),
        B44.list("GameSession", {}).then(all => (Array.isArray(all)?all:[]).filter(s=>s.answerer_id===profile.id)),
      ]);
      const all = [...(Array.isArray(r1)?r1:[]), ...(Array.isArray(r2)?r2:[])]
        .filter(g => g.status !== "complete" && g.status !== "cancelled")
        .sort((a,b) => new Date(b.updated_date||0) - new Date(a.updated_date||0));
      setGames(buildGameSlots(all));
      loadedRef.current.active = true;
    } catch(e) { console.warn("[Lobby] loadGames:", e.message); }
    setLoading(false);
  }

  function refresh() {
    if (tab === "new") { loadedRef.current.new = false; loadPlayers(); }
    else               { loadedRef.current.active = false; loadGames(); }
  }

  function challenge(opponent) {
    // Store opponent locally — SelectLevel → VersePick will create the session
    onChallenge(null, "challenger", opponent);
  }

  async function declineGame(g) {
    try {
      await B44.update("GameSession", g.id, { status: "cancelled" });
      const updated = games.filter(x => x.id !== g.id);
      setGames(pullFromOverflow(updated));
    } catch(e) { alert("Could not decline: " + e.message); }
  }

  function removePlayer(p) {
    setAllPlayers(prev => prev.filter(x => x.id !== p.id));
  }

  // ── Slot row styles ──
  const sRow = {
    display:"flex", alignItems:"center", gap:10,
    minHeight:54, padding:"8px 12px",
    borderRadius:11,
    border:"1px dashed rgba(245,200,66,0.10)",
    background:"rgba(13,31,53,0.16)",
    marginBottom:6,
    boxSizing:"border-box",
  };
  const sRowFilled = {
    display:"flex", alignItems:"center", gap:10,
    minHeight:54, padding:"8px 12px",
    borderRadius:11,
    border:"1px solid rgba(245,200,66,0.28)",
    background:"rgba(20,46,78,0.72)",
    marginBottom:6,
    boxSizing:"border-box",
    transition:"background 0.15s",
  };
  const btnBattle = {
    flexShrink:0,
    padding:"8px 14px",
    borderRadius:10,
    border:"1.5px solid rgba(245,200,66,0.55)",
    background:"linear-gradient(135deg,rgba(212,146,26,0.30),rgba(30,122,140,0.18))",
    color:"#F5C842",
    fontFamily:"'Cinzel',serif",
    fontSize:11,
    fontWeight:700,
    cursor:"pointer",
    letterSpacing:0.6,
    minWidth:72,
    textAlign:"center",
  };
  const btnDecline = {
    flexShrink:0,
    padding:"8px 12px",
    borderRadius:10,
    border:"1px solid rgba(192,90,42,0.45)",
    background:"rgba(192,90,42,0.14)",
    color:"rgba(245,160,110,0.90)",
    fontFamily:"'Cinzel',serif",
    fontSize:11,
    fontWeight:700,
    cursor:"pointer",
    minWidth:44,
    textAlign:"center",
  };

  return (
    <div className="c-screen">
      <Bg char={CHAR_KNIGHT} bgScale={panelBgSc} charPos="center 22%" charOpacity={0.85}/>
      <Hdr user={user} profile={profile} onOut={onOut} onSmsToggle={onSmsToggle} onChallenge={challenge}/>

      {/* ── Profile card — fixed below Hdr ── */}
      <div style={{
        position:"fixed", top:56, left:14, right:14,
        zIndex:6,
        background:"rgba(13,31,53,0.92)",
        borderRadius:14,
        border:"1px solid rgba(245,200,66,0.18)",
        padding:"10px 14px",
        display:"flex", alignItems:"center", gap:12,
        backdropFilter:"blur(10px)",
      }}>
        {/* Avatar */}
        <div style={{
          width:38,height:38,borderRadius:"50%",flexShrink:0,
          background:`linear-gradient(135deg,${C.teal},${C.gold})`,
          display:"flex",alignItems:"center",justifyContent:"center",
          fontSize:17,fontWeight:900,color:"#fff",
        }}>
          {(myName||"W")[0].toUpperCase()}
        </div>
        {/* Name + rank */}
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:13,fontWeight:700,color:C.offWhite,fontFamily:"'Cinzel',serif",letterSpacing:0.8,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{myName}</div>
          <div style={{fontSize:9,color:rank.color,letterSpacing:1.5,marginTop:1}}>{rank.label} · {profile?.total_score||0} pts</div>
        </div>
        {/* Stats */}
        <div style={{display:"flex",gap:18,flexShrink:0}}>
          {[["Games",profile?.games_played||0],["Wins",profile?.games_won||0]].map(([l,v])=>(
            <div key={l} style={{textAlign:"center"}}>
              <div style={{fontSize:15,fontWeight:900,color:C.goldLight,lineHeight:1}}>{v}</div>
              <div style={{fontSize:8,color:C.goldDim,letterSpacing:1.5,marginTop:2}}>{l.toUpperCase()}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Floating panel — snaps below profile, shows character behind ── */}
      <div style={{
        position:"fixed",
        left: panelMargin, right: panelMargin,
        top: panelTopPx,
        height: panelH,
        zIndex:10,
        borderRadius:"18px 18px 18px 18px",
        overflow:"hidden",
        boxShadow:"0 -2px 24px rgba(0,0,0,0.45), 0 8px 40px rgba(0,0,0,0.60), 0 0 0 1px rgba(245,200,66,0.22)",
        display:"flex", flexDirection:"column",
        transition: panelTransition,
        background:"transparent",
      }}>

        {/* ── Handle bar: drag pill + tabs + chevron all in one row ── */}
        <div
          onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
          onMouseDown={onMouseDown}
          style={{
            flexShrink:0,
            background:"rgba(10,22,42,0.97)",
            borderTop:"2px solid rgba(245,200,66,0.55)",
            borderBottom:"1px solid rgba(245,200,66,0.15)",
            cursor:"grab", userSelect:"none", touchAction:"none",
          }}>

          {/* Drag pill row */}
          <div style={{display:"flex",justifyContent:"center",paddingTop:7,paddingBottom:3}}>
            <div style={{width:38,height:4,borderRadius:2,background:"rgba(245,200,66,0.50)"}}/>
          </div>

          {/* Tab row */}
          <div style={{display:"flex",gap:6,padding:"2px 10px 9px",alignItems:"center"}}>
            {/* ⚔️ Challenge tab */}
            <button type="button"
              onMouseDown={e=>e.stopPropagation()} onTouchStart={e=>e.stopPropagation()}
              onClick={()=>setTab("new")}
              style={{
                flex:1, padding:"9px 0",
                borderRadius:10,
                border:`1.5px solid ${tab==="new"?"rgba(245,200,66,0.55)":"rgba(245,200,66,0.14)"}`,
                background:tab==="new"
                  ?"linear-gradient(135deg,rgba(212,146,26,0.28),rgba(30,122,140,0.18))"
                  :"rgba(13,31,53,0.60)",
                color:tab==="new"?"#F5C842":"rgba(245,200,66,0.42)",
                fontFamily:"'Cinzel',serif",fontSize:11,fontWeight:700,
                letterSpacing:0.8,cursor:"pointer",
                transition:"all 0.18s",
              }}>
              ⚔️ Challenge
            </button>
            {/* 📬 My Battles tab */}
            <button type="button"
              onMouseDown={e=>e.stopPropagation()} onTouchStart={e=>e.stopPropagation()}
              onClick={()=>setTab("active")}
              style={{
                flex:1, padding:"9px 0",
                borderRadius:10,
                border:`1.5px solid ${tab==="active"?"rgba(245,200,66,0.55)":"rgba(245,200,66,0.14)"}`,
                background:tab==="active"
                  ?"linear-gradient(135deg,rgba(212,146,26,0.28),rgba(30,122,140,0.18))"
                  :"rgba(13,31,53,0.60)",
                color:tab==="active"?"#F5C842":"rgba(245,200,66,0.42)",
                fontFamily:"'Cinzel',serif",fontSize:11,fontWeight:700,
                letterSpacing:0.8,cursor:"pointer",
                transition:"all 0.18s",
              }}>
              📬 My Battles
            </button>
            {/* 📩 Challenges tab */}
            <button type="button"
              onMouseDown={e=>e.stopPropagation()} onTouchStart={e=>e.stopPropagation()}
              onClick={()=>setTab("challenges")}
              style={{
                flex:1, padding:"9px 0",
                borderRadius:10,
                border:`1.5px solid ${tab==="challenges"?"rgba(245,200,66,0.55)":"rgba(245,200,66,0.14)"}`,
                background:tab==="challenges"
                  ?"linear-gradient(135deg,rgba(212,146,26,0.28),rgba(30,122,140,0.18))"
                  :"rgba(13,31,53,0.60)",
                color:tab==="challenges"?"#F5C842":"rgba(245,200,66,0.42)",
                fontFamily:"'Cinzel',serif",fontSize:11,fontWeight:700,
                letterSpacing:0.8,cursor:"pointer",
                transition:"all 0.18s",
              }}>
              📩 Challenges
            </button>
            {/* Refresh */}
            <button type="button"
              onMouseDown={e=>e.stopPropagation()} onTouchStart={e=>e.stopPropagation()}
              onClick={refresh} disabled={loading}
              style={{
                flexShrink:0,width:36,height:36,borderRadius:10,
                border:"1.5px solid rgba(245,200,66,0.20)",
                background:"rgba(13,31,53,0.70)",
                color:loading?"rgba(245,200,66,0.22)":"rgba(245,200,66,0.65)",
                fontSize:16,cursor:loading?"default":"pointer",
                display:"flex",alignItems:"center",justifyContent:"center",
              }}>
              {loading?"…":"↺"}
            </button>
            {/* Chevron */}
            <button type="button"
              onMouseDown={e=>e.stopPropagation()} onTouchStart={e=>e.stopPropagation()}
              onClick={e=>{ e.stopPropagation(); toggleSnap(); }}
              style={{
                flexShrink:0,width:36,height:36,borderRadius:10,
                border:"1px solid rgba(245,200,66,0.35)",
                background:"rgba(212,146,26,0.18)",
                color:"#F5C842",fontSize:14,cursor:"pointer",
                display:"flex",alignItems:"center",justifyContent:"center",
              }}>
              {panelSnap==="down"?"▲":"▼"}
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div ref={panelScrollRef} style={{
          flex:1, overflowY:"auto",
          background:"rgba(10,22,42,0.88)",
          backdropFilter:"blur(16px)", WebkitBackdropFilter:"blur(16px)",
          WebkitOverflowScrolling:"touch",
          padding:"10px 12px 20px",
        }}>

          {loading && <div style={{textAlign:"center",padding:24}}><div className="c-spin"/></div>}

          {/* ══ CHOOSE YOUR OPPONENT ══ */}
          {!loading && tab === "new" && (<>
            {/* Search bar */}
            <div style={{position:"relative",marginBottom:10}}>
              <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",fontSize:13,opacity:0.45}}>🔍</span>
              <input type="text" autoCapitalize="none" autoCorrect="off" spellCheck="false" inputMode="search" value={search}
                onChange={e=>setSearch(e.target.value.toLowerCase())}
                placeholder="Search warriors by name…"
                style={{
                  width:"100%", boxSizing:"border-box",
                  padding:"9px 30px 9px 30px",
                  borderRadius:9, border:"1.5px solid rgba(245,200,66,0.22)",
                  background:"rgba(13,31,53,0.75)", color:C.offWhite,
                  fontFamily:"'Cinzel',serif", fontSize:11, outline:"none",
                }}/>
              {searchLoading && (
                <span style={{position:"absolute",right:search.length>0?32:10,top:"50%",transform:"translateY(-50%)",fontSize:10,color:C.goldLight,opacity:0.7}}>⏳</span>
              )}
              {search.length > 0 && (
                <span onClick={()=>setSearch("")}
                  style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",
                    fontSize:14,cursor:"pointer",opacity:0.5,color:C.goldLight}}>✕</span>
              )}
            </div>

            {/* 10 fixed slots */}
            {playerSlots.map((p, i) => p ? (
              <div key={p.id} style={sRowFilled}>
                <div style={{width:30,height:30,borderRadius:"50%",background:`linear-gradient(135deg,${C.teal},${C.gold})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:"#fff",flexShrink:0}}>
                  {(p.display_name||"W")[0].toUpperCase()}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:700,color:C.offWhite,fontFamily:"'Cinzel',serif",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.display_name}</div>
                  <div style={{fontSize:9,color:C.goldDim,letterSpacing:1}}>{rankBadge(p.total_score||0).label} · {p.total_score||0} pts</div>
                </div>
                <button type="button" style={btnBattle} onClick={()=>challenge(p)}>⚔️ Battle</button>
                <button type="button" style={btnDecline} onClick={()=>removePlayer(p)}>✕</button>
              </div>
            ) : (
              <div key={`empty-${i}`} style={sRow}>
                <div style={{width:30,height:30,borderRadius:"50%",border:"1px dashed rgba(245,200,66,0.15)",flexShrink:0}}/>
                <div style={{fontSize:11,color:"rgba(245,200,66,0.18)",fontFamily:"'Cinzel',serif",letterSpacing:1,fontStyle:"italic"}}>
                  {i === 0 && allPlayers.length === 0 ? "No warriors yet — invite friends!" : "—"}
                </div>
              </div>
            ))}
          </>)}

          {/* ══ ACTIVE BATTLES ══ */}
          {!loading && tab === "active" && (<>
            {games.length === 0 && (
              <div style={{textAlign:"center",padding:"20px 0",color:"rgba(245,200,66,0.35)",fontSize:11,fontFamily:"'Cinzel',serif",letterSpacing:1}}>No active battles.<br/>Challenge a warrior!</div>
            )}

            {/* 10 fixed slots */}
            {Array.from({ length: LOBBY_SLOTS }, (_, i) => {
              const g = games[i] || null;
              if (!g) return (
                <div key={`eg-${i}`} style={sRow}>
                  <div style={{width:30,height:30,borderRadius:"50%",border:"1px dashed rgba(245,200,66,0.15)",flexShrink:0}}/>
                  <div style={{fontSize:11,color:"rgba(245,200,66,0.18)",fontFamily:"'Cinzel',serif",letterSpacing:1,fontStyle:"italic"}}>—</div>
                </div>
              );
              const isChallenger = g.challenger_id === (profile?.id || user.email);
              const oppName  = isChallenger ? g.answerer_name : g.challenger_name;
              const myScore  = isChallenger ? (g.challenger_score||0) : (g.answerer_score||0);
              const oppScore = isChallenger ? (g.answerer_score||0)   : (g.challenger_score||0);
              const isMyTurn = g.current_turn === (profile?.id || user.email);
              return (
                <div key={g.id} style={sRowFilled}>
                  <div style={{width:30,height:30,borderRadius:"50%",background:`linear-gradient(135deg,${C.cobalt},${C.teal})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:"#fff",flexShrink:0}}>
                    {(oppName||"?")[0].toUpperCase()}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:700,color:isMyTurn?C.goldLight:C.offWhite,fontFamily:"'Cinzel',serif",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                      vs {oppName}
                    </div>
                    <div style={{fontSize:9,color:C.goldDim,letterSpacing:1}}>
                      Rnd {(g.round||0)+1}/{TOTAL_ROUNDS} · {myScore}–{oppScore} {isMyTurn ? "· YOUR TURN ▶" : ""}
                    </div>
                  </div>
                  <button type="button" style={btnBattle}
                    onClick={()=>onResumeGame(g, isChallenger?"challenger":"answerer")}>
                    ⚔️ Battle
                  </button>
                  <button type="button" style={btnDecline}
                    onClick={()=>declineGame(g)}>
                    ✗
                  </button>
                </div>
              );
            })}
          </>)}

          
          {/* ══ CHALLENGES TAB — pending sessions for answerer ══ */}
          {!loading && tab === "challenges" && (<>
            {Array.from({ length: LOBBY_SLOTS }, (_, i) => {
              // Filter pending sessions where I'm the answerer
              const pendingGames = games.filter(g => {
                const myId2 = profile?.id || user?.email;
                return g.answerer_id === myId2 && g.status === "pending";
              });
              const g = pendingGames[i] || null;
              if (!g) return (
                <div key={`ec-${i}`} style={sRow}>
                  <div style={{width:30,height:30,borderRadius:"50%",border:"1px dashed rgba(245,200,66,0.15)",flexShrink:0}}/>
                  <div style={{fontSize:11,color:"rgba(245,200,66,0.18)",fontFamily:"'Cinzel',serif",letterSpacing:1,fontStyle:"italic"}}>—</div>
                </div>
              );
              const lv = LEVELS.find(l => l.pts === (g.pending_pts||5)) || LEVELS[0];
              return (
                <div key={g.id} style={sRowFilled}>
                  <div style={{width:30,height:30,borderRadius:"50%",background:`linear-gradient(135deg,${C.cobalt},${C.teal})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:"#fff",flexShrink:0}}>
                    {(g.challenger_name||"?")[0].toUpperCase()}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:700,color:C.goldLight,fontFamily:"'Cinzel',serif",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                      {g.challenger_name}
                    </div>
                    <div style={{fontSize:9,color:C.goldDim,letterSpacing:1,display:"flex",alignItems:"center",gap:5,marginTop:1}}>
                      <span style={{color:lv.color}}>{lv.icon} {lv.name}</span>
                      <span>· Challenge</span>
                    </div>
                  </div>
                  <button type="button" style={btnBattle}
                    onClick={async ()=>{
                      try {
                        const updated = await B44.update("GameSession", g.id, {
                          status: "waiting_for_answer",
                          current_turn: g.answerer_id,
                        });
                        onResumeGame(updated, "answerer");
                      } catch(e){ alert("Could not accept: " + e.message); }
                    }}>
                    ⚔️ Battle
                  </button>
                  <button type="button" style={btnDecline}
                    onClick={async ()=>{
                      try {
                        await B44.update("GameSession", g.id, { status: "cancelled" });
                        setGames(prev => prev.filter(x => x.id !== g.id));
                      } catch(e){ alert("Could not decline: " + e.message); }
                    }}>
                    ✗
                  </button>
                </div>
              );
            })}
          </>)}

{/* Back button */}
          <div style={{marginTop:12}}>
            <button type="button" onClick={()=>window.location.href="/"}
              style={{
                width:"100%", padding:"13px 0",
                borderRadius:12,
                border:"1.5px solid rgba(245,200,66,0.40)",
                background:"linear-gradient(135deg,rgba(13,31,53,0.85),rgba(26,58,92,0.85))",
                color:"rgba(245,200,66,0.80)",
                fontFamily:"'Cinzel',serif", fontSize:12, fontWeight:700,
                letterSpacing:1.5, cursor:"pointer",
                backdropFilter:"blur(8px)",
              }}>
              ← Back to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════
// WAITING SCREEN — cinematic underlay + scroll panel
// ══════════════════════════════════════════════════════════════
function Waiting({ user, profile, game, role, onUpdate, onOut, onSmsToggle }) {
  const [g, setG]       = useState(game);
  const [dots, setDots] = useState(".");
  const pollRef = useRef(null);

  const oppName  = role === "challenger" ? g?.answerer_name  : g?.challenger_name;
  const myScore  = role === "challenger" ? g?.challenger_score||0 : g?.answerer_score||0;
  const oppScore = role === "challenger" ? g?.answerer_score||0   : g?.challenger_score||0;

  useEffect(() => {
    let mounted = true;

    // ── Dots — skip tick when tab is hidden ──
    const dotTimer = setInterval(() => {
      if (!document.hidden) setDots(d => d.length >= 3 ? "." : d + ".");
    }, 600);

    // ── Shared poll function ──
    async function doPoll() {
      if (!mounted || document.hidden) return;
      try {
        const updated = await B44.get("GameSession", game.id);
        if (!mounted) return;
        setG(updated);
        // Always call onUpdate — parent handles routing logic
        onUpdate(updated);
      } catch {}
    }

    // ── Check immediately on mount in case status already changed ──
    doPoll();

    // ── Fast poll for first 10s after mount, then settle to steady ──
    pollRef.current = setInterval(doPoll, POLL_FAST_MS);

    const settleTimer = setTimeout(() => {
      if (!mounted) return;
      clearInterval(pollRef.current);
      pollRef.current = setInterval(doPoll, POLL_MS);
    }, 10000);

    // ── Visibility: pause when tab hidden, immediate poll + resume on return ──
    function onVisibilityChange() {
      if (document.hidden) {
        clearInterval(pollRef.current);
      } else {
        doPoll();                          // instant catch-up on return
        clearInterval(pollRef.current);
        pollRef.current = setInterval(doPoll, POLL_MS);
      }
    }
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      mounted = false;
      clearInterval(dotTimer);
      clearInterval(pollRef.current);
      clearTimeout(settleTimer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return (
    <div className="c-screen">
      <Bg char={CHAR_WAITING} charPos="center 16%" charOpacity={0.78}/>

      <Hdr user={user} profile={profile} onOut={onOut} onSmsToggle={onSmsToggle}/>

      {/* ── Hero space — character breathes here ── */}
      <div style={{height:"44vh",minHeight:220}}/>

      {/* ── Scroll panel ── */}
      <div style={{
        position:"relative",zIndex:10,
        margin:"0 0 0 0",
        borderRadius:"22px 22px 0 0",
        background:"rgba(13,31,53,0.94)",
        borderTop:`2px solid rgba(245,200,66,0.22)`,
        boxShadow:"0 -8px 40px rgba(0,0,0,0.55)",
        minHeight:"56vh",
        overflowY:"auto",
        WebkitOverflowScrolling:"touch",
      }}>
        {/* Scroll curl */}
        <div style={{width:40,height:4,borderRadius:4,background:"rgba(245,200,66,0.25)",margin:"12px auto 20px"}}/>

        <div style={{padding:"0 20px 40px"}}>

          {/* Status header */}
          <div style={{textAlign:"center",marginBottom:22}}>
            <div style={{fontSize:36,marginBottom:10,animation:"pulse 2s ease-in-out infinite"}}>⏳</div>
            <h1 className="c-h1" style={{fontSize:20,marginBottom:6}}>Awaiting{dots}</h1>
            <p className="c-sub" style={{marginBottom:0}}>
              {oppName} is answering your challenge
            </p>
          </div>

          {/* Round progress pips */}
          <div className="c-pips" style={{justifyContent:"center",marginBottom:20}}>
            {Array.from({length:TOTAL_ROUNDS}).map((_,i) => {
              const p = g?.progress?.[i];
              let cls = "c-pip";
              if (p)              cls += p.correct ? " win" : " loss";
              else if (i === (g?.round||0)) cls += " now";
              return <div key={i} className={cls}/>;
            })}
          </div>

          {/* Score board */}
          <div style={{
            display:"flex",justifyContent:"space-around",
            background:"rgba(245,200,66,0.05)",
            border:"1px solid rgba(245,200,66,0.12)",
            borderRadius:14,padding:"16px 20px",marginBottom:20,
          }}>
            <div className="c-score-box">
              <div className="c-score-val" style={{color:C.goldLight}}>{myScore}</div>
              <div className="c-score-lbl">You</div>
            </div>
            <div style={{alignSelf:"center",textAlign:"center"}}>
              <div style={{fontSize:10,color:C.goldDim,letterSpacing:2}}>ROUND</div>
              <div style={{fontSize:18,fontFamily:"'Cinzel',serif",fontWeight:800,color:C.gold}}>{(g?.round||0)+1}<span style={{fontSize:11,color:C.goldDim}}>/{TOTAL_ROUNDS}</span></div>
            </div>
            <div className="c-score-box">
              <div className="c-score-val">{oppScore}</div>
              <div className="c-score-lbl">{oppName}</div>
            </div>
          </div>

          {/* Verse hint — show what was challenged */}
          {g?.pending_verse && (
            <div style={{
              background:"rgba(30,122,140,0.10)",
              border:"1px solid rgba(30,122,140,0.22)",
              borderRadius:12,padding:"14px 16px",marginBottom:20,
            }}>
              <div style={{fontSize:10,color:C.tealLight,letterSpacing:2,marginBottom:8,textAlign:"center"}}>
                VERSE CHALLENGED
              </div>
              <div style={{fontSize:13,fontStyle:"italic",color:"rgba(244,240,232,0.8)",lineHeight:1.6,textAlign:"center"}}>
                "{g.pending_verse?.text || ""}"
              </div>
            </div>
          )}

          {/* Nav */}
          <button className="c-btn-c" onClick={()=>window.location.href="/challenge"} style={{marginBottom:0}}>
            ← Back to Arena
          </button>

        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MP SCROLL WHEEL — ported from Recovery.jsx, scoped to MP
// ══════════════════════════════════════════════════════════════
function MPScrollWheel({ items, startIndex, label, flex, maxWidth, onChange }) {
  const outerRef = useRef(null);
  const innerRef = useRef(null);
  const s = useRef({
    offset:0, dragging:false, startY:0, startOffset:0,
    lastY:0, lastT:0, velocity:0, rafId:null, currentIdx:startIndex,
  });

  const normalize = useCallback((o) => {
    const len = items.length;
    const min = len * MP_ITEM_H;
    const max = len * MP_ITEM_H * 3;
    while (o < min) o += len * MP_ITEM_H;
    while (o > max) o -= len * MP_ITEM_H;
    return o;
  }, [items]);

  const offsetToIdx = useCallback((o) => {
    const len = items.length;
    const row = Math.round((o + MP_CENTER * MP_ITEM_H) / MP_ITEM_H);
    return ((row % len) + len) % len;
  }, [items]);

  const applyHL = useCallback((idx) => {
    const inner = innerRef.current; if (!inner) return;
    const len = items.length;
    inner.querySelectorAll(".mpw-item").forEach((el, i) => {
      const rel  = ((i % len) + len) % len;
      const dist = Math.min(Math.abs(rel-idx), Math.abs(rel-idx+len), Math.abs(rel-idx-len));
      el.className = "mpw-item" + (rel===idx?" msel":dist===1?" mnr1":dist===2?" mnr2":"");
    });
  }, [items]);

  const setOff = useCallback((o, anim) => {
    const inner = innerRef.current; if (!inner) return;
    inner.style.transition = anim ? "transform 0.18s cubic-bezier(.22,.68,0,1.2)" : "none";
    inner.style.transform  = `translateY(-${o}px)`;
    s.current.offset = o;
    const idx = offsetToIdx(o);
    s.current.currentIdx = idx;
    applyHL(idx);
    onChange?.(idx);
  }, [offsetToIdx, applyHL, onChange]);

  const snap = useCallback((o) => {
    const ctr = o + MP_CENTER * MP_ITEM_H;
    const sn  = normalize(Math.round(ctr / MP_ITEM_H) * MP_ITEM_H - MP_CENTER * MP_ITEM_H);
    setOff(sn, true);
  }, [normalize, setOff]);

  useEffect(() => {
    const inner = innerRef.current; if (!inner) return;
    inner.innerHTML = "";
    Array(MP_COPIES).fill(items).flat().forEach(item => {
      const el = document.createElement("div");
      el.className   = "mpw-item";
      el.textContent = String(item);
      inner.appendChild(el);
    });
    const init = normalize((items.length * 2 + startIndex) * MP_ITEM_H - MP_CENTER * MP_ITEM_H);
    setOff(init, false);
  }, [items, startIndex]);

  const onStart = useCallback((y) => {
    cancelAnimationFrame(s.current.rafId);
    Object.assign(s.current, {dragging:true,startY:y,lastY:y,lastT:performance.now(),velocity:0,startOffset:s.current.offset});
    if (innerRef.current) innerRef.current.style.transition = "none";
  }, []);

  const onMove = useCallback((y) => {
    if (!s.current.dragging) return;
    const now = performance.now();
    const dt  = now - s.current.lastT || 16;
    s.current.velocity = (s.current.lastY - y) / dt;
    s.current.lastY = y; s.current.lastT = now;
    setOff(normalize(s.current.startOffset + (s.current.startY - y)), false);
  }, [normalize, setOff]);

  const onEnd = useCallback(() => {
    if (!s.current.dragging) return;
    s.current.dragging = false;
    let vel = s.current.velocity * 1000;
    let off = s.current.offset;
    const coast = () => {
      if (Math.abs(vel) < 0.5) { snap(off); return; }
      vel *= 0.94; off += vel / 60;
      setOff(normalize(off), false);
      s.current.rafId = requestAnimationFrame(coast);
    };
    Math.abs(vel) > 80 ? coast() : snap(off);
  }, [snap, normalize, setOff]);

  useEffect(() => {
    const outer = outerRef.current; if (!outer) return;
    const tS  = (e) => onStart(e.touches[0].clientY);
    const tM  = (e) => { e.preventDefault(); onMove(e.touches[0].clientY); };
    const tE  = () => onEnd();
    const mD  = (e) => { onStart(e.clientY); e.preventDefault(); };
    const mM  = (e) => { if (s.current.dragging) onMove(e.clientY); };
    const mL  = () => { if (s.current.dragging) onEnd(); };
    const mU  = () => { if (s.current.dragging) onEnd(); };
    outer.addEventListener("touchstart", tS, {passive:true});
    outer.addEventListener("touchmove",  tM, {passive:false});
    outer.addEventListener("touchend",   tE, {passive:true});
    outer.addEventListener("mousedown",  mD);
    outer.addEventListener("mousemove",  mM);
    outer.addEventListener("mouseleave", mL);
    document.addEventListener("mouseup", mU);
    return () => {
      outer.removeEventListener("touchstart",tS);
      outer.removeEventListener("touchmove",tM);
      outer.removeEventListener("touchend",tE);
      outer.removeEventListener("mousedown",mD);
      outer.removeEventListener("mousemove",mM);
      outer.removeEventListener("mouseleave",mL);
      document.removeEventListener("mouseup",mU);
    };
  }, [onStart, onMove, onEnd]);

  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5,flex,maxWidth}}>
      <div style={{
        fontFamily:"'Cinzel',serif",fontSize:8,letterSpacing:3,
        color:"rgba(201,162,39,0.45)",textTransform:"uppercase",
      }}>{label}</div>
      <div ref={outerRef} style={{
        position:"relative",width:"100%",height:MP_ITEM_H*MP_VISIBLE,
        borderRadius:14,overflow:"hidden",cursor:"grab",userSelect:"none",touchAction:"none",
        background:"linear-gradient(180deg,rgba(10,5,0,0.97) 0%,rgba(28,16,2,0.98) 50%,rgba(10,5,0,0.97) 100%)",
        border:"1.5px solid rgba(201,162,39,0.35)",
        boxShadow:"inset 0 0 20px rgba(0,0,0,0.65), 0 2px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(201,162,39,0.12)",
      }}>
        {/* Scroll-texture top cap */}
        <div style={{position:"absolute",top:0,left:0,right:0,height:6,zIndex:5,
          background:"linear-gradient(180deg,rgba(201,162,39,0.18) 0%,transparent 100%)",
          borderBottom:"1px solid rgba(201,162,39,0.12)"}}/>
        {/* Scroll-texture bottom cap */}
        <div style={{position:"absolute",bottom:0,left:0,right:0,height:6,zIndex:5,
          background:"linear-gradient(0deg,rgba(201,162,39,0.18) 0%,transparent 100%)",
          borderTop:"1px solid rgba(201,162,39,0.12)"}}/>
        {/* Selection band */}
        <div style={{
          position:"absolute",top:MP_CENTER*MP_ITEM_H,height:MP_ITEM_H,left:0,right:0,zIndex:4,
          background:"rgba(201,162,39,0.09)",
          borderTop:"1.5px solid rgba(201,162,39,0.55)",
          borderBottom:"1.5px solid rgba(201,162,39,0.55)",
          boxShadow:"0 0 12px rgba(201,162,39,0.15) inset",
          pointerEvents:"none",
        }}/>
        {/* Left rope detail */}
        <div style={{position:"absolute",left:0,top:0,bottom:0,width:5,zIndex:5,
          background:"linear-gradient(180deg,rgba(139,90,20,0.6) 0%,rgba(201,162,39,0.35) 50%,rgba(139,90,20,0.6) 100%)",
          pointerEvents:"none"}}/>
        {/* Right rope detail */}
        <div style={{position:"absolute",right:0,top:0,bottom:0,width:5,zIndex:5,
          background:"linear-gradient(180deg,rgba(139,90,20,0.6) 0%,rgba(201,162,39,0.35) 50%,rgba(139,90,20,0.6) 100%)",
          pointerEvents:"none"}}/>
        {/* Fade top */}
        <div style={{position:"absolute",top:0,left:0,right:0,height:65,zIndex:3,
          background:"linear-gradient(180deg,rgba(10,5,0,0.95) 0%,transparent 100%)",pointerEvents:"none"}}/>
        {/* Fade bottom */}
        <div style={{position:"absolute",bottom:0,left:0,right:0,height:65,zIndex:3,
          background:"linear-gradient(0deg,rgba(10,5,0,0.95) 0%,transparent 100%)",pointerEvents:"none"}}/>
        {/* Scrollable items */}
        <div ref={innerRef} style={{
          display:"flex",flexDirection:"column",willChange:"transform",
          position:"absolute",left:5,right:5,top:0,
        }}/>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MP RECOVERY SCREEN — inline, 10s timer, 5pt fixed reward
// Fires only on wrong answer by the Answerer
// ══════════════════════════════════════════════════════════════
const MP_RECOVERY_SEC = 10;
const MP_RECOVERY_PTS = 5;

function MPRecovery({ verse, lv, onDone }) {
  const [tLeft,      setTLeft]      = useState(MP_RECOVERY_SEC);
  const [submitted,  setSubmitted]  = useState(false);
  const [slam,       setSlam]       = useState(false);
  const [result,     setResult]     = useState(null); // "correct"|"wrong"
  const doneRef  = useRef(false);
  const timerRef = useRef(null);

  const bookIdxRef    = useRef(0);
  const chapterIdxRef = useRef(0);
  const verseIdxRef   = useRef(0);

  // Timer — counts down 10s
  useEffect(() => {
    let t = MP_RECOVERY_SEC;
    timerRef.current = setInterval(() => {
      t -= 0.1;
      setTLeft(parseFloat(t.toFixed(1)));
      if (t <= 0) { clearInterval(timerRef.current); handleSubmit(); }
    }, 100);
    return () => clearInterval(timerRef.current);
  }, []);

  function startIdx(arr, correct, offset) {
    const idx = arr.findIndex ? arr.findIndex(v => String(v) === String(correct)) : -1;
    const len = arr.length;
    return ((idx - offset) % len + len) % len;
  }

  const bookStart    = startIdx(ALL_BOOKS,   verse.book,    8);
  const chapterStart = startIdx(MP_CHAPTERS, verse.chapter, 4);
  const verseStart   = startIdx(MP_VERSES_N, verse.verse,   4);

  function handleSubmit() {
    if (doneRef.current) return;
    doneRef.current = true;
    clearInterval(timerRef.current);
    setSubmitted(true);

    const selBook    = ALL_BOOKS[bookIdxRef.current];
    const selChapter = MP_CHAPTERS[chapterIdxRef.current];
    const selVerse   = MP_VERSES_N[verseIdxRef.current];
    const correct    = selBook === verse.book && selChapter === verse.chapter && selVerse === verse.verse;

    setResult(correct ? "correct" : "wrong");

    if (correct) {
      try { new Audio(WHAM_AUDIO).play().catch(()=>{}); } catch {}
      setSlam(true);
      setTimeout(() => { setSlam(false); onDone(true); }, 1750);
    } else {
      setTimeout(() => onDone(false), 1200);
    }
  }

  const timerPct  = tLeft / MP_RECOVERY_SEC;
  const circ      = 163.4;
  const dashOff   = circ * (1 - timerPct);
  const timerColor = tLeft <= 3 ? C.red : tLeft <= 6 ? C.gold : C.tealLight;

  return (
    <div style={{position:"fixed",inset:0,zIndex:500,overflowY:"auto",WebkitOverflowScrolling:"touch"}}>
      {/* CSS for wheel items */}
      <style>{`
        .mpw-item{height:${MP_ITEM_H}px;display:flex;align-items:center;justify-content:center;
          font-family:'Cinzel',serif;font-size:12px;color:rgba(201,162,39,0.22);
          padding:0 4px;text-align:center;line-height:1.15;white-space:nowrap;
          overflow:hidden;text-overflow:ellipsis;flex-shrink:0;pointer-events:none;
          transition:color 0.12s,font-size 0.12s;}
        .mpw-item.mnr2{color:rgba(201,162,39,0.30);font-size:11.5px;}
        .mpw-item.mnr1{color:rgba(201,162,39,0.58);font-size:13px;}
        .mpw-item.msel{color:#f0e4c0;font-size:15px;font-weight:700;
          text-shadow:0 0 14px rgba(201,162,39,0.75);}
      `}</style>

      {/* ── 4-layer cinematic underlay ── */}
      <div style={{position:"fixed",inset:0,zIndex:0,
        backgroundImage:`url(${LANDSCAPE_BG})`,backgroundSize:"cover",backgroundPosition:"center top",
        opacity:0.45}}/>
      <div style={{position:"fixed",inset:0,zIndex:1,
        backgroundImage:`url(${CHAR_RECOVERY_MP})`,backgroundSize:"contain",
        backgroundPosition:"center 5%",backgroundRepeat:"no-repeat",opacity:0.88,
        WebkitMaskImage:"linear-gradient(to bottom,rgba(0,0,0,0) 0%,rgba(0,0,0,0.7) 8%,rgba(0,0,0,1) 20%,rgba(0,0,0,1) 50%,rgba(0,0,0,0.2) 68%,rgba(0,0,0,0) 82%)",
        maskImage:"linear-gradient(to bottom,rgba(0,0,0,0) 0%,rgba(0,0,0,0.7) 8%,rgba(0,0,0,1) 20%,rgba(0,0,0,1) 50%,rgba(0,0,0,0.2) 68%,rgba(0,0,0,0) 82%)",
      }}/>
      <div style={{position:"fixed",inset:0,zIndex:2,
        background:"linear-gradient(to bottom,rgba(10,5,0,0.15) 0%,rgba(10,5,0,0.38) 45%,rgba(10,5,0,0.82) 70%,rgba(10,5,0,0.97) 85%,rgba(10,5,0,1) 100%)"}}/>
      <div style={{position:"fixed",inset:0,zIndex:3,
        background:"radial-gradient(ellipse at 50% -5%,rgba(212,146,26,0.2) 0%,transparent 55%)",pointerEvents:"none"}}/>

      {/* WHAM SLAM overlay */}
      <Slam active={slam} pts={MP_RECOVERY_PTS} onDone={()=>{}}/>

      {/* ── Content panel ── */}
      <div style={{position:"relative",zIndex:10,maxWidth:480,margin:"0 auto",padding:"0 16px 50px",
        display:"flex",flexDirection:"column",alignItems:"center"}}>

        {/* Hero spacer — smaller so wheels land in thumb zone */}
        <div style={{height:"22vh",minHeight:100}}/>

        {/* Panel */}
        <div style={{width:"100%",
          background:"linear-gradient(180deg,rgba(10,5,0,0) 0%,rgba(10,5,0,0.85) 8%,rgba(10,5,0,0.97) 18%,rgba(10,5,0,0.97) 100%)",
          borderRadius:"20px 20px 0 0",padding:"18px 18px 0",marginTop:"-28px",
        }}>
          {/* Scroll curl */}
          <div style={{width:"70%",height:4,margin:"0 auto 12px",borderRadius:2,
            background:"linear-gradient(90deg,transparent,rgba(212,146,26,0.7),rgba(58,189,212,0.5),rgba(212,146,26,0.7),transparent)"}}/>

          {/* Badge */}
          <div style={{
            fontFamily:"'Cinzel',serif",fontSize:10,letterSpacing:2,
            color:"rgba(212,146,26,0.85)",background:"rgba(212,146,26,0.1)",
            border:"1px solid rgba(212,146,26,0.3)",borderRadius:20,padding:"5px 14px",
            textTransform:"uppercase",marginBottom:12,textAlign:"center",display:"inline-block",
            width:"100%",boxSizing:"border-box",
          }}>
            📜 Scroll Recovery · {lv?.icon} {lv?.name} · Recover +{MP_RECOVERY_PTS}
          </div>

          {/* Verse — pinned directly above the wheels */}
          <div style={{
            width:"100%",background:"rgba(201,162,39,0.08)",
            border:"1px solid rgba(201,162,39,0.28)",borderRadius:12,
            padding:"12px 16px",marginBottom:10,
          }}>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:9,letterSpacing:2,
              color:"rgba(201,162,26,0.55)",textTransform:"uppercase",marginBottom:6}}>
              The Verse You Missed
            </div>
            <div style={{fontSize:14,lineHeight:1.65,color:"rgba(240,228,192,0.92)",fontStyle:"italic"}}>
              "{verse.text}"
            </div>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:10,letterSpacing:1,
              color:"rgba(58,189,212,0.6)",marginTop:6,textAlign:"right"}}>
              — {verse.book} {verse.chapter}:{verse.verse}
            </div>
          </div>

          {/* Instruction — tight, right above the wheels */}
          <div style={{fontFamily:"'Cinzel',serif",fontSize:10,letterSpacing:1,
            color:"rgba(201,162,39,0.5)",textAlign:"center",textTransform:"uppercase",
            lineHeight:1.7,marginBottom:10}}>
            Spin to the correct Book · Chapter · Verse
          </div>

          {/* Timer + wheels row */}
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14,width:"100%"}}>
            {/* Timer ring */}
            <div style={{position:"relative",width:60,height:60,flexShrink:0}}>
              <svg width="60" height="60" style={{transform:"rotate(-90deg)"}}>
                <circle cx="30" cy="30" r="26" fill="none" stroke="rgba(212,146,26,0.1)" strokeWidth="4"/>
                <circle cx="30" cy="30" r="26" fill="none"
                  stroke={timerColor} strokeWidth="4" strokeLinecap="round"
                  strokeDasharray={circ} strokeDashoffset={dashOff}
                  style={{transition:"stroke-dashoffset 0.1s linear,stroke 0.3s"}}/>
              </svg>
              <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",
                fontFamily:"'Cinzel',serif",fontSize:18,fontWeight:700,color:timerColor,transition:"color 0.3s"}}>
                {Math.ceil(tLeft)}
              </div>
            </div>

            {/* Scroll wheels */}
            <div style={{display:"flex",gap:7,flex:1,alignItems:"flex-start"}}>
              <MPScrollWheel items={ALL_BOOKS}   startIndex={bookStart}    label="Book"    flex={2.4} maxWidth={175}
                onChange={i => bookIdxRef.current = i}/>
              <MPScrollWheel items={MP_CHAPTERS} startIndex={chapterStart} label="Chapter" flex={1}   maxWidth={80}
                onChange={i => chapterIdxRef.current = i}/>
              <MPScrollWheel items={MP_VERSES_N} startIndex={verseStart}   label="Verse"   flex={1}   maxWidth={80}
                onChange={i => verseIdxRef.current = i}/>
            </div>
          </div>

          {/* Result banner */}
          {result && (
            <div style={{
              width:"100%",borderRadius:12,padding:"16px 20px",textAlign:"center",marginBottom:14,
              fontFamily:"'Cinzel',serif",
              background: result==="correct" ? "rgba(26,122,74,0.18)" : "rgba(192,58,43,0.14)",
              border: `1.5px solid ${result==="correct" ? "rgba(26,122,74,0.5)" : "rgba(192,58,43,0.4)"}`,
            }}>
              <div style={{fontSize:28,marginBottom:6}}>{result==="correct"?"✅":"❌"}</div>
              <div style={{fontSize:15,fontWeight:800,letterSpacing:2,marginBottom:4,
                color:result==="correct"?"#4ade80":"#f87171"}}>
                {result==="correct" ? `RECOVERED! +${MP_RECOVERY_PTS}` : "MISSED IT"}
              </div>
              <div style={{fontSize:11,letterSpacing:1,color:"rgba(240,228,192,0.55)"}}>
                {result==="correct" ? "The Word was in you." : "Study and return stronger."}
              </div>
            </div>
          )}

          {/* Submit button — hidden after submit */}
          {!submitted && (
            <button
              onClick={handleSubmit}
              style={{
                width:"100%",padding:15,border:"none",borderRadius:12,
                fontFamily:"'Cinzel',serif",fontSize:15,fontWeight:800,
                letterSpacing:2,textTransform:"uppercase",cursor:"pointer",
                background:`linear-gradient(135deg,${C.gold},#a07720)`,
                color:"#0f172a",boxShadow:"0 4px 20px rgba(212,146,26,0.4)",
                marginBottom:14,
              }}>
              Lock In Answer ⚔️
            </button>
          )}

        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ANSWER SCREEN — Answerer only. Wrong answer triggers MPRecovery.
// ══════════════════════════════════════════════════════════════
function Answer({ user, game, role, onDone, onOut, onSmsToggle }) {
  const [opts,     setOpts]     = useState([]);
  const [sel,      setSel]      = useState(null);
  const [tLeft,    setTLeft]    = useState(TIME_LIMIT);
  const [locked,   setLocked]   = useState(false);
  const [slam,        setSlam]        = useState(false);
  const [recovery,    setRecovery]    = useState(false);
  const [streakCount, setStreakCount] = useState(0);
  const [streakFlash, setStreakFlash] = useState(false);
  const doneRef = useRef(false);
  const streakRef = useRef(0);
  const streakBonusPendingRef = useRef(false);
  const tmrRef  = useRef(null);

  const v    = game?.pending_verse   || VERSES[0];
  const pts  = game?.pending_pts     || 5;
  const lv   = LEVELS.find(l=>l.pts===pts) || LEVELS[0];
  const myScore  = role === "challenger" ? game?.challenger_score||0 : game?.answerer_score||0;
  const oppScore = role === "challenger" ? game?.answerer_score||0   : game?.challenger_score||0;
  const oppName  = role === "challenger" ? game?.answerer_name       : game?.challenger_name;

  useEffect(() => {
    if (game?.pending_options?.length === 4) {
      setOpts(game.pending_options);
    } else {
      setOpts(buildOptions(v));
    }
    doneRef.current = false;
    setSel(null); setLocked(false); setTLeft(TIME_LIMIT); setSlam(false); setRecovery(false);
  }, [game?.id]);

  useEffect(() => {
    tmrRef.current = setInterval(() => setTLeft(t => {
      if (t <= 1) { clearInterval(tmrRef.current); if (!doneRef.current) submit(null); return 0; }
      return t - 1;
    }), 1000);
    return () => clearInterval(tmrRef.current);
  }, []);

  async function submit(opt) {
    if (doneRef.current) return;
    doneRef.current = true;
    clearInterval(tmrRef.current);
    setSel(opt); setLocked(true);
    const correct = !!opt?.isCorrect;
    if (correct) {
      const newStreak = streakRef.current + 1;
      streakRef.current = newStreak;
      setStreakCount(newStreak);
      if (newStreak >= 3 && newStreak % 3 === 0) {
        // Streak bonus — +5 fixed, flash fires before WHAM SLAM
        streakBonusPendingRef.current = true;
        setStreakFlash(true);
      } else {
        setSlam(true);
      }
    } else {
      streakRef.current = 0;
      setStreakCount(0);
      setRecovery(true);
    }
  }

  // Called after MPRecovery resolves (correct recovery = 5pts, wrong = 0pts)
  function onRecoveryDone(recovered) {
    setRecovery(false);
    commitResult(recovered, recovered ? MP_RECOVERY_PTS : 0);
    // onDone fires immediately inside commitResult — no spinner needed
  }

  function handleStreakFlashDone() {
    setStreakFlash(false);
    setSlam(true); // Fire WHAM SLAM after streak flash
  }

  async function commitResult(correct, earnedPts) {
    const newRound = (game.round || 0) + 1;
    const isGameOver = newRound >= TOTAL_ROUNDS;

    // Build optimistic update locally
    const myNewScore = myScore + earnedPts;
    const updateData = {
      round:            newRound,
      last_correct:     correct,
      last_pts_awarded: earnedPts,
      progress:         [...(game.progress||[]), { round: game.round, correct, pts: earnedPts }],
    };
    if (role === "challenger") {
      updateData.challenger_score = myNewScore;
    } else {
      updateData.answerer_score = myNewScore;
    }
    if (isGameOver) {
      const challengerFinal = role === "challenger" ? myNewScore : (game.challenger_score||0);
      const answererFinal   = role === "answerer"   ? myNewScore : (game.answerer_score||0);
      updateData.status      = "complete";
      updateData.winner_id   = challengerFinal >= answererFinal ? game.challenger_id : game.answerer_id;
      updateData.winner_name = challengerFinal >= answererFinal ? game.challenger_name : game.answerer_name;
    } else {
      // Next it's the CHALLENGER's turn to pick a level — no SMS here.
      // SMS fires in VersePick when the verse is actually submitted.
      const nextPicker = role === "challenger" ? game.answerer_id : game.challenger_id;
      updateData.status       = "pick_level";
      updateData.current_turn = nextPicker;
    }

    // ── Navigate immediately with optimistic data — don't make user wait for DB ──
    const optimisticGame = { ...game, ...updateData };
    onDone({ correct, pts: earnedPts, game: optimisticGame });

    // ── Save to DB in background ──
    B44.update("GameSession", game.id, updateData).catch(e => {
      console.error("commitResult background save failed:", e);
    });
  }

  const pct = tLeft / TIME_LIMIT * 100;
  const tc  = tLeft > 10 ? C.teal : tLeft > 5 ? C.gold : C.red;

  return (
    <div className="c-screen">
      <Bg char={CHAR_MP} charPos="center 8%" charOpacity={0.55}/>
      <Hdr user={user} onOut={onOut} onSmsToggle={onSmsToggle}/>
      {streakFlash && <StreakFlash onDone={handleStreakFlashDone}/>}
      <Slam active={slam} pts={pts} onDone={()=>{
        const bonus = streakBonusPendingRef.current ? 5 : 0;
        streakBonusPendingRef.current = false;
        commitResult(true, pts + bonus);
      }}/>
      {/* MPRecovery overlay — mounts over everything when wrong answer tapped */}
      {recovery && (
        <MPRecovery verse={v} lv={lv} onDone={onRecoveryDone}/>
      )}

      <div className="c-scroll" style={{background:"linear-gradient(to bottom,transparent 0%,rgba(8,16,32,0.72) 18%,rgba(8,16,32,0.82) 100%)"}}><div className="c-pad">
        <div className="c-score-row">
          <div className="c-score-box"><div className="c-score-val">{myScore}</div><div className="c-score-lbl">You</div></div>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:10,color:C.goldDim,letterSpacing:2}}>Round {(game?.round||0)+1}/{TOTAL_ROUNDS}</div>
            {streakCount >= 2 && (
              <div style={{fontSize:9,letterSpacing:2,color:"#F5C842",fontFamily:"'Cinzel',serif",marginTop:2}}>
                🔥 {streakCount} STREAK{streakCount>=3?" +5!":""}
              </div>
            )}
          </div>
          <div className="c-score-box"><div className="c-score-val">{oppScore}</div><div className="c-score-lbl">{oppName}</div></div>
        </div>
        <div className="c-tbar"><div className="c-tfill" style={{width:`${pct}%`,background:tc}}/></div>
        <div className="c-pips">
          {Array.from({length:TOTAL_ROUNDS}).map((_,i) => {
            const p = game?.progress?.[i];
            let cls = "c-pip";
            if (p)              cls += p.correct ? " win" : " loss";
            else if (i === (game?.round||0)) cls += " now";
            return <div key={i} className={cls}/>;
          })}
        </div>
        <div className="c-vcard">
          <div style={{fontSize:10,color:lv.color,letterSpacing:2,marginBottom:8}}>{lv.icon} {lv.name} · {pts} pts</div>
          <div className="c-vtxt">"{v.text}"</div>
          <div className="c-vq">Where is this verse found?</div>
        </div>
        <div className="c-opts">
          {opts.map((opt,i) => {
            let cls = "c-opt";
            if (locked && opt === sel)                       cls += opt.isCorrect ? " correct" : " wrong";
            if (locked && opt.isCorrect && sel && !sel.isCorrect) cls += " correct";
            return (
              <div key={i} className={cls} onClick={()=>!locked && submit(opt)}>
                <div className="c-opt-ltr">{LETTERS[i]}</div>
                <div className="c-opt-txt">{opt.book} {opt.chapter}:{opt.verse}</div>
              </div>
            );
          })}
        </div>
        <div style={{textAlign:"center",fontSize:11,color:C.goldDim,letterSpacing:1}}>{tLeft}s remaining</div>
      </div></div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ROUND RESULT — verse reveal + read lock + nav
// ══════════════════════════════════════════════════════════════
const RESULT_LOCK_MS = 3000; // player must read for 3s before Continue unlocks

function RoundResult({ user, profile, game, role, correct, pts, onNext, onOut, onSmsToggle }) {
  const [revealed,  setRevealed]  = useState(false);
  const [readLock,  setReadLock]  = useState(true);   // locked until 3s elapsed
  const [countdown, setCountdown] = useState(3);      // visual 3→2→1

  const myScore  = role === "challenger" ? game?.challenger_score||0 : game?.answerer_score||0;
  const oppScore = role === "challenger" ? game?.answerer_score||0   : game?.challenger_score||0;
  const oppName  = role === "challenger" ? game?.answerer_name       : game?.challenger_name;

  const verse = game?.pending_verse;
  const [txVerseRR, setTxVerseRR] = useState(verse?.text || "");
  useEffect(() => {
    const base = verse?.text || "";
    setTxVerseRR(base);
    const lang = getActiveLang();
    if (lang !== "en" && verse?.book) {
      const ch = verse.chapter || verse.ch;
      const vs = verse.verse || verse.vs;
      fetchVerse(verse.book, ch, vs, lang, base).then(r => setTxVerseRR(r.text));
    }
  }, []);
  const lv    = LEVELS.find(l => l.pts === (game?.pending_pts || pts)) || LEVELS[0];
  const ref   = verse ? `${verse.book} ${verse.chapter||verse.ch}:${verse.verse||verse.vs}` : null;

  const isGameOver = game?.status === "complete";

  // Verse fade-in
  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 380);
    return () => clearTimeout(t);
  }, []);

  // Read lock — 3s countdown then unlock Continue
  useEffect(() => {
    const tick = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(tick);
          setReadLock(false);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  return (
    <div className="c-screen">
      <Bg char={correct ? CHAR_MP : CHAR_KNIGHT}/>
      <Hdr user={user} profile={profile} onOut={onOut} onSmsToggle={onSmsToggle}/>
      <div className="c-scroll"><div className="c-pad" style={{paddingTop:80}}>

        {/* Result badge */}
        <div className="c-card" style={{textAlign:"center",marginBottom:12}}>
          <div className="c-curl"/>
          <div style={{
            fontSize:52,marginBottom:8,
            filter:correct?"drop-shadow(0 0 18px #F5C84288)":"none",
            transition:"filter 0.4s",
          }}>
            {correct ? "✅" : "❌"}
          </div>
          <h1 className="c-h1" style={{fontSize:20,marginBottom:4}}>
            {correct ? `+${pts} Points!` : "Miss"}
          </h1>
          <p className="c-sub" style={{marginBottom:0}}>
            {correct ? "The Word is in you." : "Study and return stronger."}
          </p>
        </div>

        {/* Verse reveal — THE LEARNING MOMENT */}
        {verse && (
          <div style={{
            opacity: revealed ? 1 : 0,
            transform: revealed ? "translateY(0)" : "translateY(14px)",
            transition: "opacity 0.55s ease, transform 0.55s ease",
          }}>
            <div className="c-card" style={{marginBottom:12}}>
              <div className="c-curl"/>
              <div style={{fontSize:10,color:lv.color,letterSpacing:2,marginBottom:10,textAlign:"center"}}>
                {lv.icon} {lv.name} · {pts} pts
              </div>
              <div style={{
                fontSize:15,fontStyle:"italic",color:C.offWhite,lineHeight:1.7,
                textAlign:"center",marginBottom:14,padding:"0 4px",
              }}>
                "{txVerseRR}"
              </div>
              <div style={{
                textAlign:"center",padding:"10px 16px",
                background:`${lv.color}22`,border:`1px solid ${lv.color}55`,
                borderRadius:10,
              }}>
                <div style={{fontSize:11,color:C.goldDim,letterSpacing:1.5,marginBottom:3}}>FOUND IN</div>
                <div style={{fontSize:17,fontFamily:"'Cinzel',serif",fontWeight:800,color:C.goldLight,letterSpacing:1}}>
                  {ref}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Score board */}
        <div className="c-card" style={{marginBottom:16}}>
          <div className="c-curl"/>
          <div style={{display:"flex",justifyContent:"space-around",padding:"4px 0"}}>
            <div className="c-score-box">
              <div className="c-score-val" style={{color:C.goldLight}}>{myScore}</div>
              <div className="c-score-lbl">You</div>
            </div>
            <div style={{alignSelf:"center",fontSize:10,color:C.goldDim,letterSpacing:2,textAlign:"center"}}>
              R{(game?.round||0)}/{TOTAL_ROUNDS}
            </div>
            <div className="c-score-box">
              <div className="c-score-val">{oppScore}</div>
              <div className="c-score-lbl">{oppName}</div>
            </div>
          </div>
        </div>

        {/* ── ACTION BUTTONS ── */}

        {/* Primary: Continue / Final Results — locked during read window */}
        <button
          className="c-btn-a"
          onClick={readLock ? undefined : onNext}
          style={{
            marginBottom:10,
            opacity: readLock ? 0.45 : 1,
            cursor:  readLock ? "not-allowed" : "pointer",
            transition:"opacity 0.4s",
            position:"relative",overflow:"hidden",
          }}
        >
          {readLock
            ? `Read the verse… (${countdown})`
            : isGameOver ? "⚔️ See Final Results" : "Continue ▶"}
          {/* Progress bar that drains while locked */}
          {readLock && (
            <div style={{
              position:"absolute",bottom:0,left:0,
              height:3,
              background:`${C.teal}`,
              animation:`rr-lock-drain ${RESULT_LOCK_MS}ms linear forwards`,
              borderRadius:"0 0 12px 12px",
            }}/>
          )}
        </button>

        {/* Secondary: Back to Challenge lobby */}
        <button
          className="c-btn-b"
          onClick={()=>window.location.href="/challenge"}
          style={{marginBottom:10}}
        >
          ← Back to Arena
        </button>

        {/* Tertiary: Play Solo */}
        <button
          className="c-btn-c"
          onClick={()=>window.location.href="/"}
          style={{marginBottom:4}}
        >
          🗡️ Play Solo
        </button>

        <div style={{height:24}}/>
      </div></div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// GAME OVER — cinematic underlay + full results scroll panel
// ══════════════════════════════════════════════════════════════
function GameOver({ user, profile, game, role, onHome, onOut, onSmsToggle }) {
  const [statsUpdated, setStatsUpdated] = useState(false);

  const myScore   = role === "challenger" ? game?.challenger_score||0 : game?.answerer_score||0;
  const oppScore  = role === "challenger" ? game?.answerer_score||0   : game?.challenger_score||0;
  const oppName   = role === "challenger" ? game?.answerer_name       : game?.challenger_name;
  const myName    = role === "challenger" ? game?.challenger_name     : game?.answerer_name;
  const won       = myScore > oppScore;
  const tied      = myScore === oppScore;

  // Compute rank delta
  const oldScore    = (profile?.total_score || 0);
  const newScore    = oldScore + myScore;
  const oldRank     = rankBadge(oldScore);
  const newRank     = rankBadge(newScore);
  const rankChanged = oldRank.label !== newRank.label;

  // Round-by-round breakdown from progress array
  const progress = game?.progress || [];

  // Update profile stats once on mount
  useEffect(() => {
    async function updateStats() {
      try {
        const profiles = await B44.list("PlayerProfile", { email: user.email });
        const p = profiles[0];
        if (p) {
          await B44.update("PlayerProfile", p.id, {
            total_score:  (p.total_score  || 0) + myScore,
            games_played: (p.games_played || 0) + 1,
            games_won:    (p.games_won    || 0) + (won ? 1 : 0),
          });
          setStatsUpdated(true);
        }
      } catch (e) {
        console.error("GameOver stats update:", e);
        setStatsUpdated(true); // don't block UI on error
      }
    }
    updateStats();
  }, []);

  const headline = tied  ? "⚔️ Draw — Equally Matched!"
                 : won   ? "🏆 Victory!"
                         : "📜 Battle Over";
  const subline  = tied  ? "Honor in equal knowledge of the Word."
                 : won   ? "You conquered the Word!"
                         : "Keep studying, warrior. The Word awaits.";

  return (
    <div className="c-screen">
      {/* ── 4-layer cinematic underlay ── */}
      <div style={{position:"fixed",inset:0,zIndex:0,
        backgroundImage:`url(${LANDSCAPE_VIVID})`,
        backgroundSize:"cover",backgroundPosition:"center top",
        opacity: won ? 0.65 : 0.42,
        filter: won ? "none" : "grayscale(35%)",
      }}/>
      <div style={{position:"fixed",inset:0,zIndex:1,
        backgroundImage:`url(${CHAR_GAMEOVER})`,
        backgroundSize:"contain",backgroundPosition:"center 14%",
        backgroundRepeat:"no-repeat",
        opacity: won ? 0.32 : 0.20,
      }}/>
      <div style={{position:"fixed",inset:0,zIndex:2,
        background: won
          ? `linear-gradient(180deg,${C.cobaltDark}bb 0%,${C.cobaltDark}33 35%,rgba(232,213,160,0.78) 100%)`
          : `linear-gradient(180deg,${C.cobaltDark}dd 0%,${C.cobaltDark}55 38%,rgba(200,190,175,0.80) 100%)`,
      }}/>
      {/* Victory rim-light — gold for win, teal for loss/draw */}
      <div style={{position:"fixed",top:0,left:0,right:0,height:3,zIndex:3,
        background: won
          ? `linear-gradient(90deg,transparent,${C.goldLight},transparent)`
          : `linear-gradient(90deg,transparent,${C.tealLight},transparent)`,
      }}/>

      <Hdr user={user} profile={profile} onOut={onOut} onSmsToggle={onSmsToggle}/>

      {/* ── Hero space ── */}
      <div style={{height:"42vh",minHeight:210}}/>

      {/* ── Scroll panel ── */}
      <div style={{
        position:"relative",zIndex:10,
        borderRadius:"22px 22px 0 0",
        background:"rgba(13,31,53,0.95)",
        borderTop:`2px solid ${won ? "rgba(245,200,66,0.32)" : "rgba(58,189,212,0.22)"}`,
        boxShadow:"0 -8px 40px rgba(0,0,0,0.6)",
        minHeight:"58vh",
        overflowY:"auto",
        WebkitOverflowScrolling:"touch",
      }}>
        {/* Scroll curl */}
        <div style={{width:40,height:4,borderRadius:4,background:"rgba(245,200,66,0.25)",margin:"12px auto 20px"}}/>

        <div style={{padding:"0 20px 48px"}}>

          {/* Headline */}
          <div style={{textAlign:"center",marginBottom:20}}>
            <h1 className="c-h1" style={{
              fontSize:24,marginBottom:6,
              color: won ? C.goldLight : C.offWhite,
            }}>
              {headline}
            </h1>
            <p className="c-sub" style={{marginBottom:0}}>{subline}</p>
          </div>

          {/* Final score card */}
          <div style={{
            display:"flex",justifyContent:"space-around",alignItems:"center",
            background: won ? "rgba(245,200,66,0.07)" : "rgba(30,122,140,0.07)",
            border:`1px solid ${won ? "rgba(245,200,66,0.2)" : "rgba(58,189,212,0.15)"}`,
            borderRadius:14,padding:"18px 20px",marginBottom:16,
          }}>
            <div className="c-score-box">
              <div className="c-score-val" style={{fontSize:34,color:won?C.goldLight:C.offWhite}}>{myScore}</div>
              <div className="c-score-lbl" style={{color:"rgba(244,240,232,0.7)"}}>You</div>
              <div style={{fontSize:10,color:"rgba(245,200,66,0.5)",letterSpacing:1,marginTop:4}}>{myName}</div>
            </div>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:11,color:C.goldDim,letterSpacing:2,marginBottom:4}}>FINAL</div>
              <div style={{fontSize:28,lineHeight:1}}>{won?"🏆":tied?"🤝":"📜"}</div>
            </div>
            <div className="c-score-box">
              <div className="c-score-val" style={{fontSize:34}}>{oppScore}</div>
              <div className="c-score-lbl" style={{color:"rgba(244,240,232,0.7)"}}>Opp</div>
              <div style={{fontSize:10,color:"rgba(245,200,66,0.5)",letterSpacing:1,marginTop:4}}>{oppName}</div>
            </div>
          </div>

          {/* Rank update */}
          <div style={{
            background:"rgba(245,200,66,0.05)",
            border:`1px solid rgba(245,200,66,0.12)`,
            borderRadius:12,padding:"14px 16px",marginBottom:16,
            textAlign:"center",
          }}>
            <div style={{fontSize:10,color:C.goldDim,letterSpacing:2,marginBottom:10}}>YOUR RANK</div>
            {rankChanged ? (
              <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:12}}>
                <div>
                  <div style={{fontSize:13,color:oldRank.color,fontFamily:"'Cinzel',serif",fontWeight:700}}>{oldRank.icon} {oldRank.label}</div>
                  <div style={{fontSize:9,color:C.goldDim,letterSpacing:1,marginTop:2}}>BEFORE</div>
                </div>
                <div style={{fontSize:20,color:C.goldLight}}>→</div>
                <div>
                  <div style={{
                    fontSize:15,color:newRank.color,fontFamily:"'Cinzel',serif",fontWeight:800,
                    textShadow:`0 0 12px ${newRank.color}88`,
                  }}>{newRank.icon} {newRank.label}</div>
                  <div style={{fontSize:9,color:C.goldDim,letterSpacing:1,marginTop:2}}>RANKED UP 🔥</div>
                </div>
              </div>
            ) : (
              <div>
                <div style={{fontSize:16,color:newRank.color,fontFamily:"'Cinzel',serif",fontWeight:800}}>{newRank.icon} {newRank.label}</div>
                <div style={{fontSize:10,color:C.goldDim,letterSpacing:1,marginTop:4}}>+{myScore} pts this game · {newScore} total</div>
              </div>
            )}
          </div>

          {/* Round-by-round breakdown */}
          {progress.length > 0 && (
            <div style={{
              background:"rgba(13,31,53,0.6)",
              border:"1px solid rgba(245,200,66,0.08)",
              borderRadius:12,padding:"14px 16px",marginBottom:20,
            }}>
              <div style={{fontSize:10,color:C.goldDim,letterSpacing:2,marginBottom:12,textAlign:"center"}}>ROUND BREAKDOWN</div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {progress.map((p, i) => (
                  <div key={i} style={{
                    display:"flex",alignItems:"center",gap:12,
                    padding:"8px 10px",borderRadius:8,
                    background: p.correct ? "rgba(30,122,140,0.12)" : "rgba(192,90,42,0.10)",
                    border:`1px solid ${p.correct ? "rgba(30,122,140,0.2)" : "rgba(192,90,42,0.15)"}`,
                  }}>
                    <div style={{fontSize:14,width:24,textAlign:"center"}}>{p.correct?"✅":"❌"}</div>
                    <div style={{flex:1,fontSize:11,color:"rgba(244,240,232,0.7)",letterSpacing:0.5}}>Round {i+1}</div>
                    <div style={{fontSize:13,fontFamily:"'Cinzel',serif",fontWeight:700,color:p.correct?C.tealLight:"rgba(244,240,232,0.35)"}}>
                      {p.correct ? `+${p.pts}` : "0"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stats updating indicator */}
          {!statsUpdated && (
            <div style={{textAlign:"center",fontSize:10,color:C.goldDim,letterSpacing:1.5,marginBottom:16}}>
              Saving results…
            </div>
          )}

          {/* CTA buttons */}
          <button className="c-btn-a" onClick={onHome} style={{marginBottom:10}}>
            ⚔️ Back to Arena
          </button>
          <button className="c-btn-c" onClick={()=>window.location.href="/"} style={{marginBottom:4}}>
            🗡️ Play Solo
          </button>

        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════
// SelectLevel — Challenger picks the difficulty level
// Props: user, profile, game, role, onPick(lv, verse, options), onOut, onSmsToggle
// ══════════════════════════════════════════════════════════════════
function SelectLevel({ user, profile, game, role, pendingOpponent, onPick, onOut, onSmsToggle }) {
  const [loading, setLoading] = useState(false);
  // oppName: for new challenge = pendingOpponent.display_name; for round 2+ = game field
  const oppName = pendingOpponent?.display_name || (role === "challenger" ? game?.answerer_name : game?.challenger_name);

  // Guard: if an existing game is NOT in pick_level state or it's not our turn, don't allow re-entry
  const myId = profile?.id;
  if (game && game.status && game.status !== "pick_level") {
    // Silently redirect — wrong screen for this game state
    setTimeout(() => onOut && onOut("active"), 0);
    return null;
  }
  if (game && game.status === "pick_level" && myId && game.current_turn !== myId) {
    // Not our turn to pick
    setTimeout(() => onOut && onOut("waiting"), 0);
    return null;
  }

  function pickLevel(lv) {
    // Just bubble up the level — VersePick will finalize creation/update
    onPick(lv);
  }

  return (
    <div className="c-screen">
      <Bg char={CHAR_KNIGHT} charPos="center 14%" charOpacity={0.80}/>

      <Hdr user={user} profile={profile} onOut={onOut} onSmsToggle={onSmsToggle}/>

      {/* Hero space */}
      <div style={{height:"38vh",minHeight:200}}/>

      {/* ── Scroll panel ── */}
      <div style={{
        position:"relative",zIndex:10,
        borderRadius:"22px 22px 0 0",
        background:"rgba(13,31,53,0.94)",
        borderTop:`2px solid rgba(245,200,66,0.22)`,
        boxShadow:"0 -8px 40px rgba(0,0,0,0.55)",
        padding:"24px 18px 48px",
        minHeight:"56vh",
      }}>
        {/* Handle pill */}
        <div style={{width:42,height:5,borderRadius:3,background:"rgba(245,200,66,0.28)",margin:"0 auto 20px"}}/>

        <div style={{textAlign:"center",marginBottom:22}}>
          <div style={{fontFamily:"'Cinzel',serif",fontSize:11,letterSpacing:3,color:C.gold,textTransform:"uppercase",opacity:0.7,marginBottom:6}}>
            Choose Your Weapon
          </div>
          <div style={{fontFamily:"'Cinzel',serif",fontSize:19,color:C.offWhite,fontWeight:700}}>
            Select Difficulty
          </div>
          {oppName && (
            <div style={{fontSize:13,color:"rgba(244,240,232,0.55)",marginTop:6}}>
              ⚔️ Challenging <span style={{color:C.goldLight,fontWeight:600}}>{oppName}</span>
            </div>
          )}
        </div>

        {/* Level cards — vertical stack, Squire top → Champion bottom */}
        <div style={{display:"flex",flexDirection:"column",gap:12,maxWidth:420,margin:"0 auto"}}>
          {LEVELS.map(lv => (
            <button
              key={lv.name}
              type="button"
              disabled={loading}
              onClick={() => pickLevel(lv)}
              style={{
                display:"flex",alignItems:"center",gap:14,
                padding:"14px 18px",
                borderRadius:12,
                background:`linear-gradient(135deg,${lv.color}22 0%,rgba(13,31,53,0.85) 100%)`,
                border:`1.5px solid ${lv.color}55`,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.55 : 1,
                transition:"transform 0.12s,box-shadow 0.12s",
                boxShadow:`0 2px 18px ${lv.color}18`,
                textAlign:"left",
                width:"100%",
              }}
              onTouchStart={e => { e.currentTarget.style.transform="scale(0.97)"; e.currentTarget.style.boxShadow=`0 0 22px ${lv.color}44`; }}
              onTouchEnd={e   => { e.currentTarget.style.transform="scale(1)"; e.currentTarget.style.boxShadow=`0 2px 18px ${lv.color}18`; }}
            >
              {/* Icon */}
              <div style={{fontSize:28,lineHeight:1,minWidth:36,textAlign:"center"}}>
                {lv.icon}
              </div>
              {/* Text */}
              <div style={{flex:1}}>
                <div style={{fontFamily:"'Cinzel',serif",fontSize:15,fontWeight:700,color:C.offWhite}}>
                  {lv.name}
                </div>
                <div style={{fontSize:12,color:"rgba(244,240,232,0.55)",marginTop:2}}>
                  {lv.sub}
                </div>
              </div>
              {/* Points badge */}
              <div style={{
                fontFamily:"'Cinzel',serif",fontSize:13,fontWeight:700,
                color:lv.color,
                background:`${lv.color}18`,
                border:`1px solid ${lv.color}44`,
                borderRadius:8,padding:"4px 10px",whiteSpace:"nowrap",
              }}>
                +{lv.pts} pts
              </div>
            </button>
          ))}
        </div>

        {loading && (
          <div style={{textAlign:"center",marginTop:20,fontFamily:"'Cinzel',serif",fontSize:13,color:C.gold,opacity:0.7,letterSpacing:2}}>
            Setting battle…
          </div>
        )}
      </div>
    </div>
  );
}


// ROOT CONTROLLER
// ══════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════
// BATTLE SENT SCREEN — confirmation after challenge is created
// ══════════════════════════════════════════════════════════════
function BattleSent({ user, profile, opponentName, game, onProceed, onLobby, onOut, onSmsToggle }) {
  const [glow, setGlow] = useState(false);
  useEffect(() => { const t = setTimeout(() => setGlow(true), 120); return () => clearTimeout(t); }, []);

  return (
    <div className="c-screen">
      <Bg char={CHAR_MP}/>
      <Hdr user={user} profile={profile} onOut={onOut} onSmsToggle={onSmsToggle}/>
      <div className="c-scroll"><div className="c-pad" style={{paddingTop:100,textAlign:"center"}}>

        {/* Flash icon */}
        <div style={{
          fontSize:64, marginBottom:16,
          filter: glow ? "drop-shadow(0 0 28px #F5C84299) drop-shadow(0 0 56px #D4921A66)" : "none",
          transition:"filter 0.55s ease",
        }}>⚔️</div>

        {/* Headline */}
        <h1 className="c-h1" style={{fontSize:22, marginBottom:8, color:C.goldLight}}>
          Battle Sent!
        </h1>
        <p className="c-sub" style={{marginBottom:4}}>
          You challenged
        </p>
        <p style={{
          fontFamily:"'Cinzel',serif", fontWeight:900, fontSize:18,
          color:C.offWhite, letterSpacing:1, marginBottom:20,
        }}>
          {opponentName}
        </p>

        {/* Info card */}
        <div className="c-card" style={{textAlign:"left", marginBottom:24}}>
          <div className="c-curl"/>
          <div style={{fontSize:12, color:C.goldDim, lineHeight:1.8}}>
            {[
              "📲  Your opponent has been notified by text.",
              "📖  5 rounds · The Word is your weapon.",
              "⚔️  Enter Active Battles to track your game.",
            ].map((line, i) => (
              <div key={i} style={{
                padding:"6px 0",
                borderBottom: i < 2 ? "1px solid rgba(245,200,66,0.07)" : "none",
                fontFamily:"'Cinzel',serif", fontSize:11, letterSpacing:0.5,
              }}>{line}</div>
            ))}
          </div>
        </div>

        {/* Buttons */}
        <button type="button"
          onClick={onProceed}
          style={{
            width:"100%", padding:"15px 0", marginBottom:10,
            borderRadius:12,
            background:"linear-gradient(135deg,rgba(212,146,26,0.38),rgba(30,122,140,0.28))",
            border:"1.5px solid rgba(245,200,66,0.55)",
            color:C.goldLight,
            fontFamily:"'Cinzel',serif", fontSize:13, fontWeight:700,
            letterSpacing:1.2, cursor:"pointer",
          }}>
          ⚔️ View Active Battles
        </button>

        <button type="button"
          onClick={onLobby}
          style={{
            width:"100%", padding:"13px 0",
            borderRadius:12,
            background:"rgba(13,31,53,0.70)",
            border:"1.5px solid rgba(245,200,66,0.22)",
            color:"rgba(245,200,66,0.60)",
            fontFamily:"'Cinzel',serif", fontSize:11, fontWeight:700,
            letterSpacing:1.2, cursor:"pointer",
          }}>
          ← Back to Lobby
        </button>

      </div></div>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════
// VERSE PICK SCREEN — challenger selects 1 of 10 random verses
// Character: CHAR_KNIGHT (battle-ready stance)
// Standard: Bg component, c-screen/c-scroll/c-pad, Hdr, c-card
// CRITICAL: verse tap = GameSession.create() + SMS fires
// ══════════════════════════════════════════════════════════════
function VersePick({ user, profile, game: existingGame, pendingOpponent, pendingLevel, onDone, onOut, onSmsToggle }) {
  const [verses,  setVerses]  = useState([]);
  const [loading, setLoading] = useState(false);
  const [chosen,  setChosen]  = useState(null);

  const myName = profile?.display_name || user?.email?.split("@")[0] || "Warrior";

  // Build 10 random non-duplicate verses on mount
  useEffect(() => {
    const pool = [...VERSES];
    const picked = [];
    const used = new Set();
    // shuffle pool then take first 10 unique
    const shuffled = pool.sort(() => Math.random() - 0.5);
    for (const v of shuffled) {
      const key = `${v.book}${v.chapter}${v.verse}`;
      if (!used.has(key)) { used.add(key); picked.push(v); }
      if (picked.length >= 10) break;
    }
    setVerses(picked);
  }, []);

  async function commitVerse(verse) {
    if (loading || chosen) return;
    setChosen(verse);
    setLoading(true);
    const options = buildOptions(verse);

    // Ensure we have a real profile ID
    let myId = profile?.id;
    if (!myId) {
      try {
        const all = await B44.list("PlayerProfile", {});
        const found = (Array.isArray(all)?all:[]).find(p => p.email === user?.email);
        myId = found?.id || null;
      } catch(_) {}
    }
    if (!myId) { alert("Profile not ready — please sign out and back in."); setChosen(null); setLoading(false); return; }

    try {
      let resultGame;

      if (existingGame) {
        // ── Round 2+ : update the existing session with new verse/level ──
        const oppId = existingGame.challenger_id === myId ? existingGame.answerer_id : existingGame.challenger_id;
        await B44.update("GameSession", existingGame.id, {
          status:          "waiting_for_answer",
          current_turn:    oppId,              // answerer's turn to answer
          pending_pts:     pendingLevel.pts,
          pending_icon:    pendingLevel.icon,
          pending_name:    pendingLevel.name,
          pending_verse:   verse,
          pending_options: options,
        });
        resultGame = await B44.get("GameSession", existingGame.id).catch(() => ({
          ...existingGame,
          status: "waiting_for_answer",
          current_turn: oppId,
          pending_pts: pendingLevel.pts,
          pending_icon: pendingLevel.icon,
          pending_name: pendingLevel.name,
          pending_verse: verse,
          pending_options: options,
        }));
        // SMS opponent it's their turn to answer
        const allProfiles = await B44.list("PlayerProfile", {}).catch(() => []);
        const oppProfile  = allProfiles.find(p => p.id === oppId) || null;
        if (oppProfile?.phone && oppProfile?.sms_enabled) {
          await sendSMS(oppProfile.phone, `⚔️ ${myName} picked a new verse! Your turn to answer.`, existingGame.id);
        }
        onDone(resultGame, oppProfile?.display_name || "Opponent");
      } else {
        // ── Round 1 : create a brand new session ──
        const oppId = pendingOpponent?.id;
        if (!oppId) { alert("Opponent profile not found."); setChosen(null); setLoading(false); return; }
        resultGame = await B44.create("GameSession", {
          challenger_id:    myId,
          challenger_name:  myName,
          answerer_id:      oppId,
          answerer_name:    pendingOpponent.display_name,
          status:           "pending",
          current_turn:     myId,
          round:            0,
          challenger_score: 0,
          answerer_score:   0,
          pending_pts:      pendingLevel.pts,
          pending_icon:     pendingLevel.icon,
          pending_name:     pendingLevel.name,
          pending_verse:    verse,
          pending_options:  options,
          progress:         [],
        });
        if (pendingOpponent.phone && pendingOpponent.sms_enabled) {
          await sendSMS(
            pendingOpponent.phone,
            `⚔️ ${myName} challenged you to a WhamBible verse battle! Open the app to accept.`,
            resultGame.id
          );
        }
        onDone(resultGame, pendingOpponent.display_name);
      }
    } catch(e) {
      setChosen(null);
      setLoading(false);
      alert("Could not send challenge: " + e.message);
    }
  }

  const lv = pendingLevel || LEVELS[0];

  return (
    <div className="c-screen">
      <Bg char={CHAR_KNIGHT} charPos="center 12%" charOpacity={0.82}/>
      <Hdr user={user} profile={profile} onOut={onOut} onSmsToggle={onSmsToggle}/>

      <div className="c-scroll"><div className="c-pad" style={{paddingTop:88}}>

        {/* Header */}
        <div style={{textAlign:"center",marginBottom:16}}>
          <div style={{
            display:"inline-flex",alignItems:"center",gap:6,
            padding:"5px 14px",borderRadius:20,
            background:"rgba(13,31,53,0.75)",
            border:`1.5px solid ${lv.color}55`,
            marginBottom:10,
          }}>
            <span style={{fontSize:15}}>{lv.icon}</span>
            <span style={{fontFamily:"'Cinzel',serif",fontSize:10,fontWeight:700,color:lv.color,letterSpacing:1.5}}>
              {lv.name.toUpperCase()}
            </span>
          </div>
          <h1 className="c-h1" style={{fontSize:19,marginBottom:4}}>Pick Your Verse</h1>
          <p className="c-sub" style={{fontSize:11}}>
            Choose the verse to send to{" "}
            <span style={{color:"#F5C842",fontWeight:700}}>{pendingOpponent?.display_name}</span>
          </p>
        </div>

        {/* Verse cards — 10 slots */}
        {verses.map((v, i) => {
          const isChosen = chosen && chosen.book === v.book && chosen.chapter === v.chapter && chosen.verse === v.verse;
          return (
            <button
              key={i}
              type="button"
              disabled={loading}
              onClick={() => commitVerse(v)}
              style={{
                width:"100%",
                textAlign:"left",
                marginBottom:8,
                padding:"11px 14px",
                borderRadius:12,
                background: isChosen
                  ? "linear-gradient(135deg,rgba(212,146,26,0.45),rgba(30,122,140,0.35))"
                  : "rgba(13,31,53,0.80)",
                border: isChosen
                  ? "1.5px solid rgba(245,200,66,0.75)"
                  : "1.5px solid rgba(245,200,66,0.18)",
                cursor: loading ? "default" : "pointer",
                transition:"border 0.18s,background 0.18s",
                opacity: loading && !isChosen ? 0.45 : 1,
              }}
            >
              {/* Book / Ch:Vs ref */}
              <div style={{
                fontFamily:"'Cinzel',serif",fontSize:10,fontWeight:700,
                color: isChosen ? "#F5C842" : "rgba(245,200,66,0.55)",
                letterSpacing:1.2,marginBottom:4,
              }}>
                {v.book} {v.chapter}:{v.verse}
              </div>
              {/* Verse preview — first 80 chars */}
              <div style={{
                fontSize:11,color:"rgba(244,240,232,0.80)",lineHeight:1.55,
                fontStyle:"italic",
              }}>
                "{v.text.length > 82 ? v.text.slice(0,82) + "…" : v.text}"
              </div>
              {isChosen && loading && (
                <div style={{marginTop:6,fontSize:10,color:"#F5C842",fontFamily:"'Cinzel',serif",letterSpacing:1}}>
                  ⚔️ Sending challenge…
                </div>
              )}
            </button>
          );
        })}

        {/* Back */}
        <button type="button" onClick={()=>onOut("level")}
          style={{
            width:"100%",padding:"12px 0",marginTop:4,borderRadius:12,
            background:"rgba(13,31,53,0.70)",
            border:"1.5px solid rgba(245,200,66,0.20)",
            color:"rgba(245,200,66,0.55)",
            fontFamily:"'Cinzel',serif",fontSize:11,fontWeight:700,
            letterSpacing:1.2,cursor:"pointer",
          }}>
          ← Change Level
        </button>

      </div></div>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════
// CHALLENGES SCREEN — answerer inbox
// Shows all pending sessions where answerer_id === me
// Character: CHAR_WAITING (watchful, expectant)
// Standard: Bg component, c-screen/c-scroll/c-pad, Hdr, c-card
// ══════════════════════════════════════════════════════════════
function Challenges({ user, profile, onAccept, onDecline, onOut, onSmsToggle }) {
  const [challenges, setChallenges] = useState([]);
  const [loading,    setLoading]    = useState(true);

  const myId = profile?.id;

  useEffect(() => {
    if (myId) loadChallenges();
  }, []);

  async function loadChallenges() {
    setLoading(true);
    try {
      const all = await B44.list("GameSession", {});
      const arr = (Array.isArray(all) ? all : []).filter(s => s.answerer_id === myId && s.status === "pending");
      setChallenges(arr.sort((a,b) => new Date(b.updated_date||0) - new Date(a.updated_date||0)));
    } catch(e) {
      console.warn("[Challenges] load:", e.message);
      setChallenges([]);
    }
    setLoading(false);
  }

  async function acceptChallenge(g) {
    try {
      // Activate session — challenger picks first level, so it stays current_turn = challenger
      const updated = await B44.update("GameSession", g.id, {
        status: "waiting_for_answer",
        current_turn: g.answerer_id,   // answerer answers the pre-set verse
      });
      // Remove from local list immediately (non-blocking UX)
      setChallenges(p => p.filter(c => c.id !== g.id));
      onAccept(updated);
    } catch(e) {
      alert("Could not accept challenge: " + e.message);
    }
  }

  async function declineChallenge(g) {
    try {
      await B44.update("GameSession", g.id, { status: "cancelled" });
      setChallenges(p => p.filter(c => c.id !== g.id));
      if (onDecline) onDecline(g);
    } catch(e) {
      alert("Could not decline: " + e.message);
    }
  }

  return (
    <div className="c-screen">
      <Bg char={CHAR_WAITING} charPos="center 14%" charOpacity={0.78}/>
      <Hdr user={user} profile={profile} onOut={onOut} onSmsToggle={onSmsToggle}/>

      <div className="c-scroll"><div className="c-pad" style={{paddingTop:88}}>

        {/* Header */}
        <div style={{textAlign:"center",marginBottom:20}}>
          <h1 className="c-h1" style={{fontSize:20,marginBottom:4}}>⚔️ Challenges</h1>
          <p className="c-sub" style={{fontSize:11}}>
            Warriors who have issued a call to battle
          </p>
        </div>

        {loading && (
          <div style={{textAlign:"center",padding:"24px 0",color:"rgba(245,200,66,0.50)",fontFamily:"'Cinzel',serif",fontSize:11,letterSpacing:1}}>
            Loading…
          </div>
        )}

        {!loading && challenges.length === 0 && (
          <div className="c-card" style={{textAlign:"center",padding:"28px 16px"}}>
            <div className="c-curl"/>
            <div style={{fontSize:28,marginBottom:8}}>🛡️</div>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:12,color:"rgba(245,200,66,0.60)",letterSpacing:1}}>
              No pending challenges
            </div>
            <div style={{fontSize:10,color:"rgba(244,240,232,0.40)",marginTop:6,fontStyle:"italic"}}>
              When a warrior challenges you, it appears here.
            </div>
          </div>
        )}

        {/* Challenge cards */}
        {challenges.map(g => {
          const lv = LEVELS.find(l => l.pts === (g.pending_pts||5)) || LEVELS[0];
          const rb = rankBadge(0); // challenger's rank — use total_score if stored later
          return (
            <div key={g.id} className="c-card" style={{marginBottom:10,padding:"14px 14px 12px"}}>
              <div className="c-curl"/>

              {/* Challenger name + level badge */}
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                <div style={{
                  width:38,height:38,borderRadius:"50%",flexShrink:0,
                  background:`linear-gradient(135deg,${C.cobalt},${C.teal})`,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:16,fontWeight:700,color:"#fff",
                }}>
                  {(g.challenger_name||"?")[0].toUpperCase()}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontFamily:"'Cinzel',serif",fontSize:13,fontWeight:700,color:C.offWhite,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                    {g.challenger_name}
                  </div>
                  <div style={{fontSize:9,color:C.goldDim,letterSpacing:1,marginTop:1}}>
                    issued a challenge
                  </div>
                </div>
                {/* Difficulty badge */}
                <div style={{
                  padding:"3px 9px",borderRadius:8,flexShrink:0,
                  background:`${lv.color}22`,
                  border:`1px solid ${lv.color}66`,
                }}>
                  <span style={{fontSize:12}}>{lv.icon}</span>
                  <span style={{
                    fontFamily:"'Cinzel',serif",fontSize:9,fontWeight:700,
                    color:lv.color,letterSpacing:1,marginLeft:4,
                  }}>{lv.name}</span>
                </div>
              </div>

              {/* Verse preview */}
              {g.pending_verse && (
                <div style={{
                  padding:"8px 10px",borderRadius:8,marginBottom:10,
                  background:"rgba(13,31,53,0.60)",
                  border:"1px solid rgba(245,200,66,0.10)",
                }}>
                  <div style={{fontFamily:"'Cinzel',serif",fontSize:9,color:"rgba(245,200,66,0.45)",letterSpacing:1,marginBottom:3}}>
                    {g.pending_verse.book} {g.pending_verse.chapter}:{g.pending_verse.verse}
                  </div>
                  <div style={{fontSize:10,color:"rgba(244,240,232,0.65)",fontStyle:"italic",lineHeight:1.5}}>
                    "{(g.pending_verse.text||"").slice(0,90)}{(g.pending_verse.text||"").length>90?"…":""}"
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div style={{display:"flex",gap:8}}>
                <button type="button"
                  onClick={() => acceptChallenge(g)}
                  style={{
                    flex:1,padding:"11px 0",borderRadius:12,
                    background:"linear-gradient(135deg,rgba(212,146,26,0.40),rgba(30,122,140,0.30))",
                    border:"1.5px solid rgba(245,200,66,0.55)",
                    color:"#F5C842",
                    fontFamily:"'Cinzel',serif",fontSize:11,fontWeight:700,
                    letterSpacing:1,cursor:"pointer",
                  }}>
                  ⚔️ Battle
                </button>
                <button type="button"
                  onClick={() => declineChallenge(g)}
                  style={{
                    width:72,padding:"11px 0",borderRadius:12,
                    background:"rgba(13,31,53,0.70)",
                    border:"1.5px solid rgba(192,90,42,0.50)",
                    color:"rgba(192,90,42,0.85)",
                    fontFamily:"'Cinzel',serif",fontSize:11,fontWeight:700,
                    letterSpacing:1,cursor:"pointer",
                  }}>
                  ✗
                </button>
              </div>
            </div>
          );
        })}

        {/* Refresh + Back */}
        <div style={{display:"flex",gap:8,marginTop:12}}>
          <button type="button" onClick={loadChallenges}
            style={{
              flex:1,padding:"12px 0",borderRadius:12,
              background:"rgba(26,58,92,0.70)",
              border:"1.5px solid rgba(245,200,66,0.25)",
              color:"rgba(245,200,66,0.65)",
              fontFamily:"'Cinzel',serif",fontSize:10,fontWeight:700,
              letterSpacing:1.2,cursor:"pointer",
            }}>
            ↺ Refresh
          </button>
          <button type="button" onClick={() => onOut("lobby")}
            style={{
              flex:1,padding:"12px 0",borderRadius:12,
              background:"rgba(13,31,53,0.70)",
              border:"1.5px solid rgba(245,200,66,0.18)",
              color:"rgba(245,200,66,0.45)",
              fontFamily:"'Cinzel',serif",fontSize:10,fontWeight:700,
              letterSpacing:1.2,cursor:"pointer",
            }}>
            ← Lobby
          </button>
        </div>

      </div></div>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════
// ACTIVE BATTLES SCREEN — hub between turns
// Shows all ongoing sessions for this player
// Character: CHAR_MP (battle ready — both players engaged)
// Standard: Bg component, c-screen/c-scroll/c-pad, Hdr, c-card
// After each turn: both players land here
// ══════════════════════════════════════════════════════════════
function ActiveBattles({ user, profile, onEnter, onOut, onSmsToggle }) {
  const [games,   setGames]   = useState([]);
  const [loading, setLoading] = useState(true);

  const myId = profile?.id || user?.email;

  useEffect(() => {
    loadGames();
  }, []);

  async function loadGames() {
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([
        B44.list("GameSession", {}).then(all => (Array.isArray(all)?all:[]).filter(s=>s.challenger_id===myId)),
        B44.list("GameSession", {}).then(all => (Array.isArray(all)?all:[]).filter(s=>s.answerer_id===myId)),
      ]);
      const all = [...(Array.isArray(r1)?r1:[]), ...(Array.isArray(r2)?r2:[])]
        .filter(g => g.status !== "cancelled" && g.status !== "pending" && g.status !== "complete")
        .sort((a,b) => new Date(b.updated_date||0) - new Date(a.updated_date||0));
      setGames(all);
    } catch(e) {
      console.warn("[ActiveBattles] load:", e.message);
    }
    setLoading(false);
  }

  return (
    <div className="c-screen">
      <Bg char={CHAR_MP} charPos="center 12%" charOpacity={0.80}/>
      <Hdr user={user} profile={profile} onOut={onOut} onSmsToggle={onSmsToggle}/>

      <div className="c-scroll"><div className="c-pad" style={{paddingTop:88}}>

        <div style={{textAlign:"center",marginBottom:20}}>
          <h1 className="c-h1" style={{fontSize:20,marginBottom:4}}>Active Battles</h1>
          <p className="c-sub" style={{fontSize:11}}>Your ongoing verse battles</p>
        </div>

        {loading && (
          <div style={{textAlign:"center",padding:"24px 0",color:"rgba(245,200,66,0.50)",fontFamily:"'Cinzel',serif",fontSize:11,letterSpacing:1}}>
            Loading…
          </div>
        )}

        {!loading && games.length === 0 && (
          <div className="c-card" style={{textAlign:"center",padding:"28px 16px"}}>
            <div className="c-curl"/>
            <div style={{fontSize:28,marginBottom:8}}>⚔️</div>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:12,color:"rgba(245,200,66,0.60)",letterSpacing:1}}>
              No active battles
            </div>
            <div style={{fontSize:10,color:"rgba(244,240,232,0.40)",marginTop:6,fontStyle:"italic"}}>
              Challenge a warrior from the Lobby to begin.
            </div>
          </div>
        )}

        {games.map(g => {
          const isChallenger = g.challenger_id === myId;
          const oppName  = isChallenger ? g.answerer_name : g.challenger_name;
          const myScore  = isChallenger ? (g.challenger_score||0) : (g.answerer_score||0);
          const oppScore = isChallenger ? (g.answerer_score||0)   : (g.challenger_score||0);
          const isMyTurn = g.current_turn === myId;
          const lv = LEVELS.find(l => l.pts === (g.pending_pts||5)) || LEVELS[0];
          const isComplete = g.status === "complete";

          return (
            <button key={g.id} type="button"
              onClick={() => onEnter(g, isChallenger ? "challenger" : "answerer")}
              style={{
                width:"100%",marginBottom:8,
                padding:"12px 14px",borderRadius:12,
                background: isMyTurn
                  ? "linear-gradient(135deg,rgba(212,146,26,0.28),rgba(26,58,92,0.85))"
                  : "rgba(13,31,53,0.80)",
                border: isMyTurn
                  ? "1.5px solid rgba(245,200,66,0.55)"
                  : "1.5px solid rgba(245,200,66,0.18)",
                cursor:"pointer",
                textAlign:"left",
                transition:"border 0.18s,background 0.18s",
              }}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                {/* Opponent avatar */}
                <div style={{
                  width:36,height:36,borderRadius:"50%",flexShrink:0,
                  background:`linear-gradient(135deg,${C.cobalt},${C.teal})`,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:14,fontWeight:700,color:"#fff",
                }}>
                  {(oppName||"?")[0].toUpperCase()}
                </div>
                {/* Battle info */}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{
                    fontFamily:"'Cinzel',serif",fontSize:12,fontWeight:700,
                    color: isMyTurn ? C.goldLight : C.offWhite,
                    overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",
                    marginBottom:2,
                  }}>
                    vs {oppName}
                  </div>
                  <div style={{fontSize:9,color:C.goldDim,letterSpacing:0.8}}>
                    Rnd {Math.min((g.round||0)+1,5)}/{TOTAL_ROUNDS} · {myScore}–{oppScore}
                    {isComplete ? " · COMPLETE" : isMyTurn ? " · YOUR TURN ▶" : " · WAITING"}
                  </div>
                </div>
                {/* Level badge */}
                <div style={{
                  padding:"3px 8px",borderRadius:8,flexShrink:0,
                  background:`${lv.color}22`,border:`1px solid ${lv.color}55`,
                }}>
                  <span style={{fontSize:11}}>{lv.icon}</span>
                </div>
              </div>
            </button>
          );
        })}

        {/* Lobby CTA */}
        <div style={{marginTop:14,display:"flex",gap:8}}>
          <button type="button" onClick={loadGames}
            style={{
              flex:1,padding:"12px 0",borderRadius:12,
              background:"rgba(26,58,92,0.70)",
              border:"1.5px solid rgba(245,200,66,0.25)",
              color:"rgba(245,200,66,0.65)",
              fontFamily:"'Cinzel',serif",fontSize:10,fontWeight:700,
              letterSpacing:1.2,cursor:"pointer",
            }}>
            ↺ Refresh
          </button>
          <button type="button" onClick={() => onOut("lobby")}
            style={{
              flex:1,padding:"12px 0",borderRadius:12,
              background:"rgba(13,31,53,0.70)",
              border:"1.5px solid rgba(245,200,66,0.20)",
              color:"rgba(245,200,66,0.50)",
              fontFamily:"'Cinzel',serif",fontSize:10,fontWeight:700,
              letterSpacing:1.2,cursor:"pointer",
            }}>
            ⚔️ Lobby
          </button>
        </div>

      </div></div>
    </div>
  );
}

export default function Challenge() {
  // Check for existing session immediately — skip auth screen if already logged in
  // Read from localStorage directly — this survives React re-mounts and page switches
  const _existingUser = LocalAuth.currentUser();
  const _cachedProfile = (() => {
    try { return JSON.parse(sessionStorage.getItem("wb_profile_cache") || "null"); } catch { return null; }
  })();
  const _initProfile = _existingUser
    ? (_cachedProfile || { email: _existingUser.email, display_name: _existingUser.displayName || _existingUser.email.split("@")[0], total_score:0, games_played:0, games_won:0 })
    : null;

  const [user,    setUser]    = useState(_existingUser);
  const [profile, setProfile] = useState(_initProfile);
  const [screen,  setScreen]  = useState(_existingUser ? "lobby" : "auth");
  const [game,    setGame]    = useState(null);
  const [role,    setRole]    = useState(null);   // "challenger" | "answerer"
  const [lastResult, setLastResult] = useState(null);
  const [sentOpponent,   setSentOpponent]   = useState(null);  // display name of opponent just challenged
  const [pendingOpponent, setPendingOpponent] = useState(null); // full PlayerProfile of opponent (before session created)
  const [pendingLevel,    setPendingLevel]    = useState(null); // selected level (before session created)

  // Background B44 profile sync for returning users
  useEffect(() => {
    if (!_existingUser) return;
    B44.list("PlayerProfile", { email: _existingUser.email })
      .then(profiles => {
        if (profiles[0]) setProfile(p => ({ ...p, ...profiles[0] }));
      })
      .catch(() => {}); // silent — local profile is fine
  }, []);

  // ── Task 3: SMS toggle handler ──
  // Updates local profile state immediately; syncs to B44 in background
  function handleSmsToggle(newVal) {
    setProfile(p => ({ ...p, sms_enabled: newVal }));
    // Persist to localStorage profile cache
    try {
      const cached = JSON.parse(sessionStorage.getItem("wb_profile_cache") || "{}");
      sessionStorage.setItem("wb_profile_cache", JSON.stringify({ ...cached, sms_enabled: newVal }));
    } catch(e) {}
    // Update LocalAuth profile
    try {
      const lp = LocalAuth.currentUser();
      if (lp) {
        localStorage.setItem(`wb_profile_${lp.uid}`, JSON.stringify({
          ...(JSON.parse(localStorage.getItem(`wb_profile_${lp.uid}`) || "{}")),
          sms_enabled: newVal
        }));
      }
    } catch(e) {}
    // Background sync to B44 entity
    if (profile?.id) {
      B44.update("PlayerProfile", profile.id, { sms_enabled: newVal }).catch(() => {});
    }
  }

  useEffect(() => {
    const el = document.getElementById("wb-ch-s");
    if (!el) {
      const s = document.createElement("style");
      s.id = "wb-ch-s";
      s.textContent = S;
      document.head.appendChild(s);
    }
  }, []);

  // URL-based deep link: /challenge?game=<id>
  useEffect(() => {
    if (!user) return;
    const params = new URLSearchParams(window.location.search);
    const gid    = params.get("game");
    if (gid) resumeGameById(gid);
  }, [user]);

  async function resumeGameById(gid) {
    try {
      const g = await B44.get("GameSession", gid);
      const isChallenger = g.challenger_id === (profile?.id || user?.email);
      setGame(g);
      setRole(isChallenger ? "challenger" : "answerer");
      routeGame(g, isChallenger ? "challenger" : "answerer");
    } catch {}
  }

  function routeGame(g, r) {
    if (!g) return setScreen("lobby");
    if (g.status === "complete")             return setScreen("gameover");
    if (g.status === "cancelled")            return setScreen("active");
    const myId = profile?.id || user?.email;
    const isMyTurn = g.current_turn === myId;
    // Only go to level select if status is explicitly pick_level AND it is this player's turn
    if (g.status === "pick_level"          && isMyTurn) return setScreen("level");
    // Only go to answer screen if status is waiting_for_answer AND it is this player's turn
    if (g.status === "waiting_for_answer"  && isMyTurn) return setScreen("answer");
    // Pending = challenger just created, answerer hasn't accepted — go to waiting
    if (g.status === "pending" && r === "challenger") return setScreen("waiting");
    return setScreen("waiting");
  }

  function onIn(u, p) {
    // Cache profile so re-mounts don't lose it
    try { sessionStorage.setItem("wb_profile_cache", JSON.stringify(p)); } catch {}
    setUser(u); setProfile(p); setScreen("lobby");
  }

  function onOut(dest) {
    // If dest is a screen name, navigate there (back-nav from child screens)
    if (dest && typeof dest === "string" && !["signout","logout"].includes(dest)) {
      setScreen(dest);
      return;
    }
    LocalAuth.signOut();
    try { sessionStorage.removeItem("wb_profile_cache"); } catch {}
    setUser(null); setProfile(null); setGame(null); setRole(null); setScreen("auth");
  }

  function onChallenge(g, r, opponentOrName) {
    setRole(r);
    if (g === null && opponentOrName && typeof opponentOrName === "object") {
      // New challenge flow: no session yet — store opponent, go to SelectLevel first
      setPendingOpponent(opponentOrName);
      setSentOpponent(opponentOrName.display_name);
      setGame(null);
      setScreen("level");
    } else if (g) {
      // Resuming or continuing existing session
      setGame(g);
      if (typeof opponentOrName === "string") setSentOpponent(opponentOrName);
      routeGame(g, r);
    }
  }

  // Called when user picks a player from PlayerListOverlay (via Hdr menu)
  function onChallengePlayer(opponent) {
    if (!profile) return;
    // Store opponent — SelectLevel → VersePick will create the session
    onChallenge(null, "challenger", opponent);
  }

  function onResumeGame(g, r) {
    setGame(g); setRole(r);
    routeGame(g, r);
  }

  function onLevelPicked(lv) {
    setPendingLevel(lv);
    setScreen("verse_pick");
  }

  function onWaitingUpdate(updated) {
    setGame(updated);
    const myId = profile?.id || user?.email;
    if (updated.status === "complete") { setScreen("gameover"); return; }
    if (updated.current_turn === myId) {
      if (updated.status === "pick_level")         setScreen("level");
      if (updated.status === "waiting_for_answer") setScreen("answer");
    }
  }

  function onAnswered({ correct, pts, game: updated }) {
    setGame(updated);
    setLastResult({ correct, pts });
    setScreen("result");
  }

  async function onResultNext() {
    if (!game) return setScreen("lobby");
    // Re-fetch fresh game state — React state may be stale
    let fresh = game;
    try { fresh = await B44.get("GameSession", game.id); } catch {}
    if (!fresh || fresh.status === "complete") return setScreen("gameover");
    const myId = profile?.id || user?.email;
    const isMyTurn = fresh.current_turn === myId;
    if (isMyTurn && fresh.status === "pick_level") return setScreen("level");
    if (isMyTurn && fresh.status === "waiting_for_answer") return setScreen("answer");
    // Not my turn — go to active battles hub
    setGame(fresh);
    setScreen("active");
  }

  return (
    <>
      {screen==="auth"       && <Auth onIn={onIn}/>}
      {screen==="lobby"      && <Lobby user={user} profile={profile} onChallenge={onChallenge} onResumeGame={onResumeGame} onOut={onOut} onSmsToggle={handleSmsToggle}/>}
      {screen==="level"      && <SelectLevel user={user} profile={profile} game={game} role={role} pendingOpponent={pendingOpponent} onPick={onLevelPicked} onOut={onOut} onSmsToggle={handleSmsToggle}/>}
      {screen==="verse_pick" && <VersePick user={user} profile={profile} game={game} pendingOpponent={pendingOpponent} pendingLevel={pendingLevel} onDone={(g, oppName)=>{ setGame(g); setSentOpponent(oppName); setScreen("active"); }} onOut={(dest)=>setScreen(dest||"level")} onSmsToggle={handleSmsToggle}/>}
      {screen==="sent"       && <BattleSent user={user} profile={profile} opponentName={sentOpponent} game={game} onProceed={()=>setScreen("active")} onLobby={()=>setScreen("lobby")} onOut={onOut} onSmsToggle={handleSmsToggle}/>}
      {screen==="challenges" && <Challenges user={user} profile={profile} onAccept={(g)=>{ setGame(g); setRole("answerer"); routeGame(g,"answerer"); }} onDecline={()=>{}} onOut={(dest)=>setScreen(dest||"lobby")} onSmsToggle={handleSmsToggle}/>}
      {screen==="active"     && <ActiveBattles user={user} profile={profile} onEnter={(g,r)=>{ setGame(g); setRole(r); routeGame(g,r); }} onOut={(dest)=>setScreen(dest||"lobby")} onSmsToggle={handleSmsToggle}/>}
      {screen==="waiting"    && <Waiting user={user} profile={profile} game={game} role={role} onUpdate={onWaitingUpdate} onOut={onOut} onSmsToggle={handleSmsToggle}/>}
      {screen==="answer"     && <Answer user={user} game={game} role={role} onDone={onAnswered} onOut={onOut} onSmsToggle={handleSmsToggle}/>}
      {screen==="result"     && <RoundResult user={user} profile={profile} game={game} role={role} correct={lastResult?.correct} pts={lastResult?.pts} onNext={onResultNext} onOut={onOut} onSmsToggle={handleSmsToggle}/>}
      {screen==="gameover"   && <GameOver user={user} profile={profile} game={game} role={role} onHome={()=>setScreen("active")} onOut={onOut} onSmsToggle={handleSmsToggle}/>}
    </>
  );
}
