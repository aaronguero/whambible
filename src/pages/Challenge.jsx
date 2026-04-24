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
//   10 rounds total. Async — each player acts on their own device/time.
//   Both players poll every 4s to see game state updates.
// ══════════════════════════════════════════════════════════════

// ── Asset URLs ──
const LANDSCAPE_BG  = "https://media.base44.com/images/public/69df9a909b33058a5ce47831/33b065c94_generated_image.png";
const LANDSCAPE_VIVID = "https://media.base44.com/images/public/69df9a909b33058a5ce47831/b9bcd9d15_generated_image.png";
const CHAR_MP       = "https://media.base44.com/images/public/69df9a909b33058a5ce47831/b23c98cb8_generated_image.png";
const CHAR_KNIGHT   = "https://media.base44.com/images/public/69df9a909b33058a5ce47831/9b51fedfd_generated_image.png";
const CHAR_VICTORY  = "https://media.base44.com/images/public/69df9a909b33058a5ce47831/c5aa4771c_generated_image.png";
const WHAM_CHARS    = "https://media.base44.com/images/public/69df9a909b33058a5ce47831/85be9d10e_generated_image.png";
const WHAM_TEXT_IMG = "https://media.base44.com/images/public/69df9a909b33058a5ce47831/5e80bbcf2_generated_image.png";
const WHAM_AUDIO    = "https://media.base44.com/videos/public/69c40c6701d9dfdb1df69d2b/5d143ab80_51a54c36d_wham-slam-voice1.webm";

// ── Base44 proxy helpers ──
// On preview (base44.app): call Base44 API directly (no proxy needed, token injected by platform)
// On production (whambible.com): route through Netlify function (token stays server-side)
const IS_PREVIEW = window.location.hostname.includes("base44.app");
const DB_URL     = "/.netlify/functions/db";
const B44_API    = "https://api.base44.com/api/apps/69df9a909b33058a5ce47831/entities";
// Service token — read-only, non-secret, same token in Netlify env
// Needed for direct API calls on the Base44 preview domain
const B44_TOKEN  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0OThlMDFmMi05NzhkLTQ1NzAtOTY5Mi1hZjY2ODc0ZWZhYzQiLCJjbGllbnRfaWQiOiI0OThlMDFmMi05NzhkLTQ1NzAtOTY5Mi1hZjY2ODc0ZWZhYzQiLCJhcHBfaWQiOiI2OWRmOWE5MDliMzMwNThhNWNlNDc4MzEiLCJhdWQiOiJiYXNlNDRfYXBpIiwic2NvcGUiOiJhcHAuYWNjZXNzIiwiZXhwIjoxNzc3MDAzOTYxLCJpYXQiOjE3NzcwMDAzNjF9.SDULfBA25WYrJJNdOM3oa3M5mf8vyMieFqXL54H5VPU";

const B44 = {
  async _call(payload) {
    if (IS_PREVIEW) {
      let url = `${B44_API}/${payload.entity}`;
      let opts = {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": B44_TOKEN,
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
const TOTAL_ROUNDS = 10;
const TIME_LIMIT   = 20;
const POLL_MS      = 4000;
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
  // Thresholds based on open difficulty — 10 rounds × 20pt max = 200pt/game
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
.c-scroll{position:absolute;inset:0;overflow-y:auto;-webkit-overflow-scrolling:touch;z-index:10;}
.c-pad{padding:80px 16px 56px;}
.c-hdr{position:fixed;top:0;left:0;right:0;z-index:20;display:flex;align-items:center;justify-content:space-between;padding:14px 18px 10px;background:linear-gradient(180deg,rgba(13,31,53,0.97) 0%,transparent 100%);}
.c-logo{font-size:20px;font-weight:900;color:#F5C842;letter-spacing:3px;}
.c-pill{display:flex;align-items:center;gap:7px;background:rgba(30,122,140,0.25);border:1px solid rgba(245,200,66,0.25);border-radius:20px;padding:5px 12px 5px 8px;cursor:pointer;}
.c-av{width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#1E7A8C,#D4921A);display:flex;align-items:center;justify-content:center;font-size:13px;color:#fff;font-weight:700;}
.c-un{font-size:11px;color:#F4F0E8;letter-spacing:1px;}
.c-card{background:rgba(10,20,38,0.88);border:1px solid rgba(245,200,66,0.18);border-radius:20px;padding:28px 20px 32px;backdrop-filter:blur(18px);margin-bottom:14px;position:relative;}
.c-curl{position:absolute;top:0;left:50%;transform:translateX(-50%);width:40px;height:4px;background:rgba(245,200,66,0.35);border-radius:0 0 6px 6px;}
.c-h1{font-size:22px;font-weight:900;color:#F5C842;margin:0 0 6px;letter-spacing:2px;text-align:center;}
.c-sub{font-size:12px;color:rgba(212,146,26,0.7);text-align:center;margin:0 0 22px;letter-spacing:1px;line-height:1.5;}
.c-badge{display:inline-flex;align-items:center;gap:6px;border-radius:20px;padding:6px 14px;font-size:11px;letter-spacing:1.5px;margin-bottom:16px;}
.c-btn-a{width:100%;padding:16px;background:linear-gradient(135deg,#1E7A8C,#D4921A);color:#F4F0E8;font-family:'Cinzel',serif;font-size:15px;font-weight:900;letter-spacing:2px;border:none;border-radius:12px;cursor:pointer;margin-bottom:12px;text-transform:uppercase;transition:opacity .15s,transform .1s;}
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
.c-opts{display:flex;flex-direction:column;gap:10px;margin-bottom:16px;}
.c-opt{padding:14px 16px;background:rgba(255,255,255,0.04);border:1px solid rgba(245,200,66,0.13);border-radius:12px;cursor:pointer;display:flex;align-items:center;gap:12px;transition:all .15s;}
.c-opt:hover{background:rgba(245,200,66,0.08);border-color:rgba(245,200,66,0.3);}
.c-opt-ltr{width:28px;height:28px;border-radius:50%;background:rgba(212,146,26,0.18);display:flex;align-items:center;justify-content:center;font-size:11px;color:#F5C842;font-weight:700;flex-shrink:0;}
.c-opt-txt{font-size:12px;color:#F4F0E8;line-height:1.4;}
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
function Bg({ char }) {
  return (
    <>
      <div style={{position:"fixed",inset:0,zIndex:0,backgroundImage:`url(${LANDSCAPE_BG})`,backgroundSize:"cover",backgroundPosition:"center top",opacity:0.5}}/>
      {char && <div style={{position:"fixed",inset:0,zIndex:1,backgroundImage:`url(${char})`,backgroundSize:"contain",backgroundPosition:"center bottom",backgroundRepeat:"no-repeat",opacity:0.16}}/>}
      <div style={{position:"fixed",inset:0,zIndex:2,background:`linear-gradient(180deg,${C.cobaltDark}dd 0%,${C.cobaltDark}66 45%,rgba(248,244,235,0.88) 100%)`}}/>
    </>
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
  const [snapPos,   setSnapPos]   = useState("down"); // "up" | "down"
  const [rawTop,    setRawTop]    = useState(SNAP_DOWN);
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
function ProfileOverlay({ user, profile, rank, onClose }) {
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
      B44.list("GameSession", { challenger_id: email }),
      B44.list("GameSession", { answerer_id:   email }),
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
            const myScore  = isChallenger ? (g.my_score||0) : (g.opp_score||0);
            const oppScore = isChallenger ? (g.opp_score||0) : (g.my_score||0);
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
    body:"Challenge any warrior to a 10-round Bible verse battle. Each round, one player picks the difficulty — the other must answer.",
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



function Hdr({ user, profile, onOut }) {
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
        <div className="c-logo">⚔️ WHAM</div>
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
      {activeTab==="profile"  && <ProfileOverlay   user={user} profile={profile} rank={rank} onClose={()=>setActiveTab(null)}/>}
      {activeTab==="leader"   && <LeaderboardOverlay profile={profile} onClose={()=>setActiveTab(null)}/>}
      {activeTab==="players"  && <PlayerListOverlay  user={user} profile={profile} onClose={()=>setActiveTab(null)} onChallenge={()=>{}}/>}
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
// AUTH SCREEN
// ══════════════════════════════════════════════════════════════
function Auth({ onIn }) {
  const [mode,  setMode]  = useState("choice");
  const [email, setEmail] = useState("");
  const [pass,  setPass]  = useState("");
  const [name,  setName]  = useState("");
  const [phone, setPhone] = useState("");
  const [err,   setErr]   = useState("");
  const [busy,  setBusy]  = useState(false);

  // NOTE: session check is handled at Challenge() root level — do NOT re-check here
  // This prevents the double-onIn loop on every mount

  async function loadAndEnter(u) {
    // Try to get real B44 profile with real id BEFORE entering lobby
    let realProfile = null;
    try {
      let profiles = await B44.list("PlayerProfile", { email: u.email });
      if (profiles[0]) {
        realProfile = profiles[0];
      } else {
        // Create profile in B44 — get back real id
        realProfile = await B44.create("PlayerProfile", {
          email: u.email,
          display_name: u.displayName || u.email.split("@")[0],
          total_score: 0, games_played: 0, games_won: 0,
        });
      }
    } catch (e) {
      console.warn("[B44] Profile fetch failed, using local stub:", e.message);
    }
    // Fall back to local stub only if B44 is completely unreachable
    const profile = realProfile || {
      email: u.email,
      display_name: u.displayName || u.email.split("@")[0],
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
      // Local account creation — this is the source of truth
      const user = LocalAuth.create(email.trim(), pass, name.trim());
      const localProfile = {
        email: user.email, display_name: name.trim(),
        phone: phone.trim() || "", sms_enabled: !!phone.trim(),
        total_score: 0, games_played: 0, games_won: 0,
      };
      // Let user in immediately
      onIn(user, localProfile);
      // Sync to B44 in background — 403 or failure won't block the user
      B44.create("PlayerProfile", localProfile).catch(e =>
        console.warn("[B44] Profile create failed (will retry later):", e.message)
      );
    } catch (e2) {
      // Only show error if LOCAL auth failed (e.g. account already exists)
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
      <Bg char={CHAR_MP}/>
      <Hdr/>
      <div className="c-scroll"><div className="c-pad">

        {mode === "choice" && (
          <div className="c-card">
            <div className="c-curl"/>
            <div style={{textAlign:"center",marginBottom:20}}>
              <div style={{fontSize:36,marginBottom:8}}>📖</div>
              <h1 className="c-h1">Verse Challenge</h1>
              <p className="c-sub">Know the Word · Win the Battle</p>
            </div>
            <button className="c-btn-a" onClick={()=>{ setMode("create"); setErr(""); }}>🕊️ Create Free Account</button>
            <button className="c-btn-b" onClick={()=>{ setMode("signin"); setErr(""); }}>🔐 Sign In</button>
            <div className="c-div"><div className="c-div-line"/><div className="c-div-txt">OR</div><div className="c-div-line"/></div>
            <button className="c-btn-c" onClick={()=>window.location.href="/"}>⚔️ Play Solo as Guest</button>
          </div>
        )}

        {mode === "create" && (
          <div className="c-card">
            <div className="c-curl"/>
            <div style={{textAlign:"center",marginBottom:20}}>
              <div style={{fontSize:32,marginBottom:6}}>🕊️</div>
              <h1 className="c-h1">Create Account</h1>
              <p className="c-sub">Free · SMS alerts optional</p>
            </div>
            <form onSubmit={doCreate} autoComplete="on">
              <label className="c-lbl">Warrior Name</label>
              <input className="c-inp" type="text" autoComplete="name" placeholder="Your display name"
                value={name} onChange={e=>{setName(e.target.value);setErr("");}} disabled={busy}/>
              <label className="c-lbl">Email</label>
              <input className="c-inp" type="email" autoComplete="email" placeholder="you@example.com"
                value={email} onChange={e=>{setEmail(e.target.value);setErr("");}} disabled={busy}/>
              <label className="c-lbl">Password</label>
              <input className="c-inp" type="password" autoComplete="new-password" placeholder="6+ characters"
                value={pass} onChange={e=>{setPass(e.target.value);setErr("");}} disabled={busy}/>
              <label className="c-lbl">Phone (optional · for challenge alerts)</label>
              <input className="c-inp" type="tel" autoComplete="tel" placeholder="+1 555 000 0000"
                value={phone} onChange={e=>{setPhone(e.target.value);setErr("");}} disabled={busy}/>
              {err ? <div className="c-err">⚠️ {err}</div> : <div style={{height:18}}/>}
              <button className="c-btn-a" type="submit" disabled={busy}>{busy?"Creating…":"🕊️ Create Account"}</button>
            </form>
            <a className="c-back" onClick={reset}>← Back</a>
          </div>
        )}

        {mode === "signin" && (
          <div className="c-card">
            <div className="c-curl"/>
            <div style={{textAlign:"center",marginBottom:20}}>
              <div style={{fontSize:32,marginBottom:6}}>🔐</div>
              <h1 className="c-h1">Sign In</h1>
              <p className="c-sub">Welcome back, warrior</p>
            </div>
            <form onSubmit={doSignIn} autoComplete="on">
              <label className="c-lbl">Email</label>
              <input className="c-inp" type="email" autoComplete="email" placeholder="you@example.com"
                value={email} onChange={e=>{setEmail(e.target.value);setErr("");}} disabled={busy}/>
              <label className="c-lbl">Password</label>
              <input className="c-inp" type="password" autoComplete="current-password" placeholder="••••••••"
                value={pass} onChange={e=>{setPass(e.target.value);setErr("");}} disabled={busy}/>
              {err ? <div className="c-err">⚠️ {err}</div> : <div style={{height:18}}/>}
              <button className="c-btn-a" type="submit" disabled={busy}>{busy?"Signing In…":"🔐 Enter the Arena"}</button>
            </form>
            <a className="c-back" onClick={reset}>← Back</a>
          </div>
        )}

      </div></div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// LOBBY — start new game OR see active games
// ══════════════════════════════════════════════════════════════
function Lobby({ user, profile, onChallenge, onResumeGame, onOut }) {
  const [tab,       setTab]       = useState("new");  // "new" | "active"
  const [players,   setPlayers]   = useState([]);
  const [games,     setGames]     = useState([]);
  const [loading,   setLoading]   = useState(false);
  const rank = rankBadge(profile?.total_score || 0);
  const myName = profile?.display_name || user?.displayName || user?.email?.split("@")[0];

  useEffect(() => { if (tab === "new") loadPlayers(); else loadGames(); }, [tab]);

  async function loadPlayers() {
    setLoading(true);
    try {
      const all = await B44.list("PlayerProfile");
      setPlayers(all.filter(p => p.email !== user.email));
    } catch {}
    setLoading(false);
  }

  async function loadGames() {
    setLoading(true);
    try {
      const [asChallenger, asAnswerer] = await Promise.all([
        B44.list("GameSession", { challenger_id: profile?.id }),
        B44.list("GameSession", { answerer_id:   profile?.id }),
      ]);
      const all = [...asChallenger, ...asAnswerer]
        .filter(g => g.status !== "complete" && g.status !== "cancelled")
        .sort((a,b) => new Date(b.updated_date||0) - new Date(a.updated_date||0));
      setGames(all);
    } catch {}
    setLoading(false);
  }

  async function challenge(opponent) {
    // Create new game session
    const verse   = rndVerse();
    const options = buildOptions(verse);
    try {
      const game = await B44.create("GameSession", {
        challenger_id:   profile?.id || user.email,
        challenger_name: myName,
        answerer_id:     opponent.id || opponent.email,
        answerer_name:   opponent.display_name,
        status:          "pick_level",
        current_turn:    profile?.id || user.email,
        round:           0,
        challenger_score: 0,
        answerer_score:   0,
        pending_verse:   verse,
        pending_options: options,
        progress:        [],
      });
      // SMS the opponent if they have a phone
      if (opponent.phone && opponent.sms_enabled) {
        await sendSMS(
          opponent.phone,
          `⚔️ ${myName} challenged you to a WhamBible verse battle! Your move.`,
          game.id
        );
      }
      onChallenge(game, "challenger");
    } catch (e) {
      alert("Could not create game: " + e.message);
    }
  }

  return (
    <div className="c-screen">
      <Bg char={CHAR_KNIGHT}/>
      <Hdr user={user} profile={profile} onOut={onOut}/>
      <div className="c-scroll"><div className="c-pad">

        {/* Profile card */}
        <div className="c-card" style={{textAlign:"center",marginBottom:14}}>
          <div className="c-curl"/>
          <div style={{fontSize:36,marginBottom:8}}>{rank.icon}</div>
          <h1 className="c-h1" style={{fontSize:18}}>{myName}</h1>
          <div style={{fontSize:11,color:rank.color,letterSpacing:2,marginBottom:14}}>{rank.label} · {profile?.total_score||0} pts</div>
          <div style={{display:"flex",justifyContent:"space-around",borderTop:"1px solid rgba(245,200,66,0.1)",paddingTop:14}}>
            {[["Games",profile?.games_played||0],["Wins",profile?.games_won||0]].map(([l,v])=>(
              <div key={l}>
                <div style={{fontSize:20,fontWeight:900,color:C.goldLight}}>{v}</div>
                <div style={{fontSize:9,color:C.goldDim,letterSpacing:2}}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div style={{display:"flex",gap:8,marginBottom:14}}>
          {[["new","⚔️ Challenge"],["active","📬 My Games"]].map(([t,l])=>(
            <button key={t} onClick={()=>setTab(t)}
              style={{flex:1,padding:"10px 0",borderRadius:10,border:`1.5px solid ${tab===t?"rgba(245,200,66,0.5)":"rgba(245,200,66,0.12)"}`,background:tab===t?"rgba(212,146,26,0.15)":"transparent",color:tab===t?"#F5C842":"rgba(245,200,66,0.45)",fontFamily:"'Cinzel',serif",fontSize:12,fontWeight:700,cursor:"pointer",letterSpacing:1}}>
              {l}
            </button>
          ))}
        </div>

        <div className="c-card">
          <div className="c-curl"/>
          {loading && <div style={{textAlign:"center",padding:24}}><div className="c-spin"/></div>}

          {/* New game — player list */}
          {!loading && tab === "new" && (
            <>
              <h2 style={{fontSize:13,color:C.goldLight,letterSpacing:2,margin:"0 0 14px",textAlign:"center"}}>CHOOSE YOUR OPPONENT</h2>
              {players.length === 0 && <div className="c-empty">No other players yet.<br/>Invite friends to join!</div>}
              {players.map(p => {
                const r = rankBadge(p.total_score || 0);
                return (
                  <div key={p.id} className="c-pl-row" onClick={()=>challenge(p)}>
                    <div className="c-pl-av">{(p.display_name||"W")[0].toUpperCase()}</div>
                    <div>
                      <div className="c-pl-name">{p.display_name}</div>
                      <div className="c-pl-rank">{r.icon} {r.label} · {p.total_score||0} pts</div>
                    </div>
                    <div style={{marginLeft:"auto",fontSize:20}}>⚔️</div>
                  </div>
                );
              })}
            </>
          )}

          {/* Active games */}
          {!loading && tab === "active" && (
            <>
              <h2 style={{fontSize:13,color:C.goldLight,letterSpacing:2,margin:"0 0 14px",textAlign:"center"}}>ACTIVE BATTLES</h2>
              {games.length === 0 && <div className="c-empty">No active games.<br/>Challenge someone!</div>}
              {games.map(g => {
                const isChallenger = g.challenger_id === (profile?.id || user.email);
                const oppName = isChallenger ? g.answerer_name : g.challenger_name;
                const myScore = isChallenger ? g.challenger_score : g.answerer_score;
                const oppScore = isChallenger ? g.answerer_score  : g.challenger_score;
                const isMyTurn = g.current_turn === (profile?.id || user.email);
                return (
                  <div key={g.id} className="c-pl-row" onClick={()=>onResumeGame(g, isChallenger?"challenger":"answerer")}>
                    <div style={{flex:1}}>
                      <div className="c-pl-name">vs {oppName}</div>
                      <div className="c-pl-rank">Round {(g.round||0)+1}/{TOTAL_ROUNDS} · {myScore||0}–{oppScore||0}</div>
                    </div>
                    <div style={{fontSize:11,fontWeight:700,color:isMyTurn?"#F5C842":"rgba(245,200,66,0.35)",letterSpacing:1}}>
                      {isMyTurn ? "YOUR TURN ▶" : "WAITING…"}
                    </div>
                  </div>
                );
              })}
            </>
          )}

          <div style={{height:8}}/>
          <button className="c-btn-c" onClick={()=>window.location.href="/"} style={{marginTop:8}}>← Back to Home</button>
        </div>

      </div></div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// SELECT LEVEL — challenger picks difficulty for this round
// ══════════════════════════════════════════════════════════════
// SELECT LEVEL — turn-guarded: only the current_turn player can pick
// ══════════════════════════════════════════════════════════════
function SelectLevel({ user, profile, game, role, onPick }) {
  const [picking,   setPicking]   = useState(false);  // lock while committing
  const [guardFail, setGuardFail] = useState(false);  // stale-turn detection
  const pickedRef = useRef(false);                     // race-condition guard

  const myId    = profile?.id || user?.email;
  const myName  = profile?.display_name || user?.email?.split("@")[0];
  const oppName = role === "challenger" ? game?.answerer_name : game?.challenger_name;
  const isMyTurn = game?.current_turn === myId;

  // Guard: verify turn on mount — catches race where both players land here
  useEffect(() => {
    if (!isMyTurn) setGuardFail(true);
  }, []);

  async function pick(lv) {
    // Double-guard: block if already picking, or not our turn
    if (pickedRef.current || picking || !isMyTurn) return;
    pickedRef.current = true;
    setPicking(true);
    try {
      // Re-fetch session to confirm current_turn hasn't changed under us
      const fresh = await B44.get("GameSession", game.id);
      if (fresh.current_turn !== myId || fresh.status !== "pick_level") {
        setGuardFail(true);
        setPicking(false);
        pickedRef.current = false;
        return;
      }
      const verse   = rndVerse();
      const options = buildOptions(verse);
      await B44.update("GameSession", game.id, {
        status:          "waiting_for_answer",
        current_turn:    role === "challenger" ? game.answerer_id : game.challenger_id,
        pending_pts:     lv.pts,
        pending_icon:    lv.icon,
        pending_name:    lv.name,
        pending_verse:   verse,
        pending_options: options,
      });
      // Notify opponent
      const oppId = role === "challenger" ? game.answerer_id : game.challenger_id;
      const oppProfile = await B44.list("PlayerProfile", { id: oppId }).then(r=>r[0]).catch(()=>null);
      if (oppProfile?.phone && oppProfile?.sms_enabled) {
        await sendSMS(oppProfile.phone, `📖 ${myName} sent you a ${lv.name} challenge! Answer the verse.`, game.id);
      }
      onPick(lv, verse, options);
    } catch (e) {
      alert("Error picking level: " + e.message);
      pickedRef.current = false;
      setPicking(false);
    }
  }

  // Not your turn — show waiting state instead of pick UI
  if (guardFail || !isMyTurn) {
    return (
      <div className="c-screen">
        <Bg char={CHAR_KNIGHT}/>
        <Hdr user={user} profile={profile}/>
        <div style={{position:"absolute",inset:0,zIndex:10,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 24px"}}>
          <div className="c-card" style={{textAlign:"center",width:"100%",maxWidth:400}}>
            <div className="c-curl"/>
            <div style={{fontSize:36,marginBottom:12}}>⏳</div>
            <h1 className="c-h1" style={{fontSize:17}}>Not Your Turn</h1>
            <p className="c-sub">Waiting for {oppName} to pick a level.</p>
            <button className="c-btn-c" style={{marginTop:20}} onClick={()=>window.location.href="/challenge"}>← Back to Lobby</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="c-screen">
      <Bg char={CHAR_KNIGHT}/>
      <Hdr user={user} profile={profile}/>
      <div className="c-scroll"><div className="c-pad">
        <div className="c-card">
          <div className="c-curl"/>
          <div style={{textAlign:"center",marginBottom:20}}>
            <div style={{fontSize:28,marginBottom:6}}>📜</div>
            <h1 className="c-h1">Choose Your Challenge</h1>
            <p className="c-sub">vs {oppName} · Round {(game?.round||0)+1}/{TOTAL_ROUNDS}</p>
            <p style={{fontSize:10,color:"rgba(245,200,66,0.45)",letterSpacing:1.5,margin:"6px 0 0"}}>ALL LEVELS OPEN · ANY RANK</p>
          </div>
          {LEVELS.map(lv=>(
            <div key={lv.pts} className="c-lv"
              style={{
                borderColor:"rgba(245,200,66,0.18)",
                background:"rgba(13,31,53,0.40)",
                opacity: picking ? 0.5 : 1,
                pointerEvents: picking ? "none" : "auto",
                transition:"all 0.18s",
              }}
              onMouseEnter={e=>{if(!picking){e.currentTarget.style.borderColor=lv.color;e.currentTarget.style.background=`${lv.color}22`;}}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(245,200,66,0.18)";e.currentTarget.style.background="rgba(13,31,53,0.40)";}}
              onClick={()=>pick(lv)}>
              <div className="c-lv-icon">{lv.icon}</div>
              <div>
                <div className="c-lv-name">{lv.name}</div>
                <div className="c-lv-sub">{lv.sub}</div>
              </div>
              <div className="c-lv-pts">{lv.pts}pt</div>
            </div>
          ))}
          {picking && <div style={{textAlign:"center",fontSize:12,color:C.goldDim,letterSpacing:1.5,marginTop:12}}>Sending challenge…</div>}
        </div>
      </div></div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// WAITING SCREEN — polling until opponent acts
// ══════════════════════════════════════════════════════════════
function Waiting({ user, game, role, onUpdate }) {
  const [g, setG]       = useState(game);
  const [dots, setDots] = useState(".");
  const pollRef = useRef(null);

  const oppName = role === "challenger" ? g?.answerer_name : g?.challenger_name;

  useEffect(() => {
    // Animate dots
    const dotTimer = setInterval(() => setDots(d => d.length >= 3 ? "." : d + "."), 600);

    // Poll game state
    pollRef.current = setInterval(async () => {
      try {
        const updated = await B44.get("GameSession", game.id);
        setG(updated);
        onUpdate(updated);
      } catch {}
    }, POLL_MS);

    return () => { clearInterval(dotTimer); clearInterval(pollRef.current); };
  }, []);

  const myScore  = role === "challenger" ? g?.challenger_score||0 : g?.answerer_score||0;
  const oppScore = role === "challenger" ? g?.answerer_score||0   : g?.challenger_score||0;

  return (
    <div className="c-screen">
      <Bg/>
      <Hdr user={user}/>
      <div style={{position:"absolute",inset:0,zIndex:10,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 16px"}}>
        <div className="c-card" style={{textAlign:"center",width:"100%",maxWidth:400}}>
          <div className="c-curl"/>
          <div className="c-wait">
            <div className="c-wait-icon">⏳</div>
            <h1 className="c-h1" style={{fontSize:18}}>Waiting{dots}</h1>
            <p className="c-sub">Waiting for {oppName} to answer</p>
          </div>
          <div style={{display:"flex",justifyContent:"space-around",borderTop:"1px solid rgba(245,200,66,0.1)",paddingTop:16,marginBottom:20}}>
            <div className="c-score-box"><div className="c-score-val">{myScore}</div><div className="c-score-lbl">You</div></div>
            <div style={{fontSize:10,color:C.goldDim,alignSelf:"center",letterSpacing:2}}>R{(g?.round||0)+1}/{TOTAL_ROUNDS}</div>
            <div className="c-score-box"><div className="c-score-val">{oppScore}</div><div className="c-score-lbl">{oppName}</div></div>
          </div>
          <button className="c-btn-c" onClick={()=>window.location.href="/challenge"}>← Back to Lobby</button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ANSWER SCREEN — opponent answers the verse
// ══════════════════════════════════════════════════════════════
function Answer({ user, game, role, onDone }) {
  const [opts,   setOpts]   = useState([]);
  const [sel,    setSel]    = useState(null);
  const [tLeft,  setTLeft]  = useState(TIME_LIMIT);
  const [locked, setLocked] = useState(false);
  const [slam,   setSlam]   = useState(false);
  const doneRef = useRef(false);
  const tmrRef  = useRef(null);

  const v    = game?.pending_verse   || VERSES[0];
  const pts  = game?.pending_pts     || 5;
  const lv   = LEVELS.find(l=>l.pts===pts) || LEVELS[0];
  const myScore  = role === "challenger" ? game?.challenger_score||0 : game?.answerer_score||0;
  const oppScore = role === "challenger" ? game?.answerer_score||0   : game?.challenger_score||0;
  const oppName  = role === "challenger" ? game?.answerer_name       : game?.challenger_name;

  useEffect(() => {
    // Use pre-built options from game session (same options challenger saw)
    if (game?.pending_options?.length === 4) {
      setOpts(game.pending_options);
    } else {
      setOpts(buildOptions(v));
    }
    doneRef.current = false;
    setSel(null); setLocked(false); setTLeft(TIME_LIMIT); setSlam(false);
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
    if (correct) setSlam(true);
    else await commitResult(correct, 0);
  }

  async function commitResult(correct, earnedPts) {
    const newRound = (game.round || 0) + 1;
    const isGameOver = newRound >= TOTAL_ROUNDS;

    // Update my score
    const myNewScore = myScore + earnedPts;
    const updateData = {
      round:        newRound,
      last_correct: correct,
      last_pts_awarded: earnedPts,
      progress:     [...(game.progress||[]), { round: game.round, correct, pts: earnedPts }],
    };

    if (role === "challenger") {
      updateData.challenger_score = myNewScore;
    } else {
      updateData.answerer_score = myNewScore;
    }

    if (isGameOver) {
      const challengerFinal = role === "challenger" ? myNewScore : (game.challenger_score||0);
      const answererFinal   = role === "answerer"   ? myNewScore : (game.answerer_score||0);
      updateData.status     = "complete";
      updateData.winner_id  = challengerFinal >= answererFinal ? game.challenger_id : game.answerer_id;
      updateData.winner_name = challengerFinal >= answererFinal ? game.challenger_name : game.answerer_name;
    } else {
      // Alternate who picks next level
      const nextPicker = role === "challenger" ? game.answerer_id : game.challenger_id;
      updateData.status       = "pick_level";
      updateData.current_turn = nextPicker;
    }

    try {
      const updated = await B44.update("GameSession", game.id, updateData);
      // SMS the OTHER player it's their turn
      if (!isGameOver) {
        const myName    = user?.displayName || user?.email?.split("@")[0];
        const oppId     = role === "challenger" ? game.answerer_id : game.challenger_id;
        const oppProfile = await B44.list("PlayerProfile", { id: oppId }).then(r=>r[0]).catch(()=>null);
        if (oppProfile?.phone && oppProfile?.sms_enabled) {
          await sendSMS(oppProfile.phone, `⚔️ ${myName} answered! Your turn to pick a verse.`, game.id);
        }
      }
      onDone({ correct, pts: earnedPts, game: updated });
    } catch (e) {
      console.error("commitResult error:", e);
      onDone({ correct, pts: earnedPts, game });
    }
  }

  const pct = tLeft / TIME_LIMIT * 100;
  const tc  = tLeft > 10 ? C.teal : tLeft > 5 ? C.gold : C.red;

  return (
    <div className="c-screen">
      <Bg/>
      <Hdr user={user}/>
      <Slam active={slam} pts={pts} onDone={()=>commitResult(true, pts)}/>
      <div className="c-scroll"><div className="c-pad">
        <div className="c-score-row">
          <div className="c-score-box"><div className="c-score-val">{myScore}</div><div className="c-score-lbl">You</div></div>
          <div style={{fontSize:10,color:C.goldDim,letterSpacing:2,textAlign:"center"}}>Round {(game?.round||0)+1}/{TOTAL_ROUNDS}</div>
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

function RoundResult({ user, profile, game, role, correct, pts, onNext, onOut }) {
  const [revealed,  setRevealed]  = useState(false);
  const [readLock,  setReadLock]  = useState(true);   // locked until 3s elapsed
  const [countdown, setCountdown] = useState(3);      // visual 3→2→1

  const myScore  = role === "challenger" ? game?.challenger_score||0 : game?.answerer_score||0;
  const oppScore = role === "challenger" ? game?.answerer_score||0   : game?.challenger_score||0;
  const oppName  = role === "challenger" ? game?.answerer_name       : game?.challenger_name;

  const verse = game?.pending_verse;
  const lv    = LEVELS.find(l => l.pts === (game?.pending_pts || pts)) || LEVELS[0];
  const ref   = verse ? `${verse.book} ${verse.ch}:${verse.vs}` : null;

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
      <Hdr user={user} profile={profile} onOut={onOut}/>
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
                "{verse.text}"
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
// GAME OVER
// ══════════════════════════════════════════════════════════════
function GameOver({ user, game, role, onHome }) {
  const myScore  = role === "challenger" ? game?.challenger_score||0 : game?.answerer_score||0;
  const oppScore = role === "challenger" ? game?.answerer_score||0   : game?.challenger_score||0;
  const won      = myScore >= oppScore;

  // Update profile stats
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
        }
      } catch {}
    }
    updateStats();
  }, []);

  return (
    <div className="c-screen">
      <Bg char={won ? CHAR_VICTORY : CHAR_KNIGHT}/>
      <div style={{position:"absolute",inset:0,zIndex:10,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 16px"}}>
        <div className="c-card" style={{textAlign:"center",width:"100%",maxWidth:400}}>
          <div className="c-curl"/>
          <div style={{fontSize:48,marginBottom:8}}>{won?"🏆":"⚔️"}</div>
          <h1 className="c-h1">{won?"Victory!":"Battle Over"}</h1>
          <p className="c-sub">{won?"You conquered the Word!":"Keep studying, warrior."}</p>
          <div style={{display:"flex",justifyContent:"space-around",margin:"20px 0 24px"}}>
            <div className="c-score-box"><div className="c-score-val" style={{color:won?C.goldLight:C.offWhite}}>{myScore}</div><div className="c-score-lbl">Your Score</div></div>
            <div className="c-score-box"><div className="c-score-val">{oppScore}</div><div className="c-score-lbl">Opponent</div></div>
          </div>
          <button className="c-btn-a" onClick={onHome}>⚔️ Back to Arena</button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ROOT CONTROLLER
// ══════════════════════════════════════════════════════════════
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

  // Background B44 profile sync for returning users
  useEffect(() => {
    if (!_existingUser) return;
    B44.list("PlayerProfile", { email: _existingUser.email })
      .then(profiles => {
        if (profiles[0]) setProfile(p => ({ ...p, ...profiles[0] }));
      })
      .catch(() => {}); // silent — local profile is fine
  }, []);

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
    const myId = profile?.id || user?.email;
    const isMyTurn = g.current_turn === myId;
    if (g.status === "pick_level"          && isMyTurn) return setScreen("level");
    if (g.status === "waiting_for_answer"  && isMyTurn) return setScreen("answer");
    return setScreen("waiting");
  }

  function onIn(u, p) {
    // Cache profile so re-mounts don't lose it
    try { sessionStorage.setItem("wb_profile_cache", JSON.stringify(p)); } catch {}
    setUser(u); setProfile(p); setScreen("lobby");
  }

  function onOut() {
    LocalAuth.signOut();
    try { sessionStorage.removeItem("wb_profile_cache"); } catch {}
    setUser(null); setProfile(null); setGame(null); setRole(null); setScreen("auth");
  }

  function onChallenge(g, r) {
    setGame(g); setRole(r);
    // Challenger just created — it's their turn to pick level
    setScreen("level");
  }

  function onResumeGame(g, r) {
    setGame(g); setRole(r);
    routeGame(g, r);
  }

  function onLevelPicked(lv, verse, options) {
    // After challenger picks level, go to waiting screen until opponent answers
    setGame(g => ({...g, pending_pts:lv.pts, pending_icon:lv.icon, pending_name:lv.name, pending_verse:verse, pending_options:options, status:"waiting_for_answer"}));
    setScreen("waiting");
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

  function onResultNext() {
    if (!game) return setScreen("lobby");
    if (game.status === "complete") return setScreen("gameover");
    // Now it's the other player's turn — go to waiting
    setScreen("waiting");
  }

  return (
    <>
      {screen==="auth"    && <Auth onIn={onIn}/>}
      {screen==="lobby"   && <Lobby user={user} profile={profile} onChallenge={onChallenge} onResumeGame={onResumeGame} onOut={onOut}/>}
      {screen==="level"   && <SelectLevel user={user} profile={profile} game={game} role={role} onPick={onLevelPicked}/>}
      {screen==="waiting" && <Waiting user={user} game={game} role={role} onUpdate={onWaitingUpdate}/>}
      {screen==="answer"  && <Answer user={user} game={game} role={role} onDone={onAnswered}/>}
      {screen==="result"  && <RoundResult user={user} profile={profile} game={game} role={role} correct={lastResult?.correct} pts={lastResult?.pts} onNext={onResultNext} onOut={onOut}/>}
      {screen==="gameover"&& <GameOver user={user} game={game} role={role} onHome={()=>setScreen("lobby")}/>}
    </>
  );
}
