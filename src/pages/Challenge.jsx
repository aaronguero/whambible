import { useState, useEffect, useRef } from "react";

// ══════════════════════════════════════════════════════════════
// WhamBible — Challenge.jsx v9.0  (Netlify-compatible)
// ZERO @/api/* imports. ZERO Firebase. ZERO Base44 SDK.
// Auth  → localStorage session (email/password stored locally)
// Profile → localStorage (total_score, games_played, games_won)
// This file is 100% self-contained — builds clean on Netlify.
// ══════════════════════════════════════════════════════════════

const LANDSCAPE_BG  = "https://media.base44.com/images/public/69df9a909b33058a5ce47831/33b065c94_generated_image.png";
const CHAR_MP       = "https://media.base44.com/images/public/69df9a909b33058a5ce47831/10c016255_generated_image.png";
const CHAR_KNIGHT   = "https://media.base44.com/images/public/69df9a909b33058a5ce47831/9b51fedfd_generated_image.png";
const CHAR_VICTORY  = "https://media.base44.com/images/public/69df9a909b33058a5ce47831/c5aa4771c_generated_image.png";
const WHAM_CHARS    = "https://media.base44.com/images/public/69df9a909b33058a5ce47831/85be9d10e_generated_image.png";
const WHAM_TEXT_IMG = "https://media.base44.com/images/public/69df9a909b33058a5ce47831/5e80bbcf2_generated_image.png";
const WHAM_AUDIO    = "https://media.base44.com/videos/public/69c40c6701d9dfdb1df69d2b/5d143ab80_51a54c36d_wham-slam-voice1.webm";

const C = {
  cobaltDark: "#0D1F35",
  teal:       "#1E7A8C",
  gold:       "#D4921A",
  goldLight:  "#F5C842",
  offWhite:   "#F4F0E8",
  red:        "#C0392B",
  goldDim:    "rgba(201,162,39,0.4)",
};

const TOTAL_ROUNDS = 10;
const TIME_LIMIT   = 20;
const LETTERS      = ["A","B","C","D"];
const PROFILE_KEY  = "wb_player_profile";
const SESSION_KEY  = "wb_session";

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
  { pts:5,  name:"Squire",   icon:"🗡️", sub:"Easiest · Common verses",   color:"#1E7A8C", featured:false },
  { pts:10, name:"Warrior",  icon:"⚔️", sub:"Moderate · Popular verses", color:"#D4921A", featured:true  },
  { pts:15, name:"Knight",   icon:"🛡️", sub:"Hard · Deeper verses",      color:"#C05A2A", featured:false },
  { pts:20, name:"Champion", icon:"👑", sub:"Hardest · Rare verses",      color:"#7B2D8B", featured:false },
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
  if (score >= 700) return { icon:"👑", label:"Champion", color:"#7B2D8B" };
  if (score >= 300) return { icon:"🛡️", label:"Knight",   color:"#C05A2A" };
  if (score >= 100) return { icon:"⚔️", label:"Warrior",  color:"#D4921A" };
  if (score >= 1)   return { icon:"🗡️", label:"Squire",   color:"#1E7A8C" };
  return                   { icon:"📜", label:"Scribe",   color:"#64748b" };
}

function parseError(e) {
  const msg = e?.message || String(e || "");
  if (/password/i.test(msg))    return "Incorrect email or password.";
  if (/not found|no user/i.test(msg)) return "No account found. Try creating one.";
  if (/already exist/i.test(msg)) return "Account already exists. Sign in instead.";
  if (/email/i.test(msg))       return "Please enter a valid email address.";
  if (/network|fetch/i.test(msg)) return "Network error. Check your connection.";
  return msg || "Something went wrong. Please try again.";
}

// ── Local Auth (self-contained, no SDK) ──
const LocalAuth = {
  _key: "wb_accounts",

  _accounts() {
    try { return JSON.parse(localStorage.getItem(this._key) || "{}"); } catch { return {}; }
  },

  _save(accounts) {
    localStorage.setItem(this._key, JSON.stringify(accounts));
  },

  create(email, password, displayName) {
    const accounts = this._accounts();
    const key = email.toLowerCase().trim();
    if (accounts[key]) throw new Error("Account already exists. Sign in instead.");
    const user = { email: key, displayName: displayName || key.split("@")[0], createdAt: Date.now() };
    accounts[key] = { ...user, password };
    this._save(accounts);
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    return user;
  },

  signIn(email, password) {
    const accounts = this._accounts();
    const key = email.toLowerCase().trim();
    const account = accounts[key];
    if (!account) throw new Error("No account found for this email.");
    if (account.password !== password) throw new Error("Incorrect password.");
    const user = { email: account.email, displayName: account.displayName };
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    return user;
  },

  currentUser() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch { return null; }
  },

  signOut() {
    localStorage.removeItem(SESSION_KEY);
  },
};

// ── Local Profile (localStorage) ──
const LocalProfile = {
  get(email) {
    try {
      const all = JSON.parse(localStorage.getItem(PROFILE_KEY) || "{}");
      return all[email] || { email, display_name: email.split("@")[0], total_score:0, games_played:0, games_won:0 };
    } catch {
      return { email, display_name: email.split("@")[0], total_score:0, games_played:0, games_won:0 };
    }
  },
  save(profile) {
    try {
      const all = JSON.parse(localStorage.getItem(PROFILE_KEY) || "{}");
      all[profile.email] = profile;
      localStorage.setItem(PROFILE_KEY, JSON.stringify(all));
    } catch {}
    return profile;
  },
  update(email, delta) {
    const p = this.get(email);
    return this.save({
      ...p,
      total_score:  (p.total_score  || 0) + (delta.score || 0),
      games_played: (p.games_played || 0) + 1,
      games_won:    (p.games_won    || 0) + (delta.won ? 1 : 0),
    });
  },
};

// ── Styles ──
const S = `
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&display=swap');
*,*::before,*::after{box-sizing:border-box;}
html,body,#root{height:100%;margin:0;padding:0;overflow:hidden;}
.c-screen{position:fixed;inset:0;font-family:'Cinzel',serif;}
.c-scroll{position:absolute;inset:0;overflow-y:auto;-webkit-overflow-scrolling:touch;z-index:10;}
.c-pad{padding:80px 16px 48px;}
.c-hdr{position:fixed;top:0;left:0;right:0;z-index:20;display:flex;align-items:center;justify-content:space-between;padding:14px 18px 10px;background:linear-gradient(180deg,rgba(13,31,53,0.97) 0%,transparent 100%);}
.c-logo{font-size:20px;font-weight:900;color:#F5C842;letter-spacing:3px;}
.c-pill{display:flex;align-items:center;gap:7px;background:rgba(30,122,140,0.25);border:1px solid rgba(245,200,66,0.25);border-radius:20px;padding:5px 12px 5px 8px;cursor:pointer;}
.c-av{width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#1E7A8C,#D4921A);display:flex;align-items:center;justify-content:center;font-size:13px;color:#fff;font-weight:700;}
.c-un{font-size:11px;color:#F4F0E8;letter-spacing:1px;}
.c-card{background:rgba(10,20,38,0.88);border:1px solid rgba(245,200,66,0.18);border-radius:20px;padding:28px 20px 32px;backdrop-filter:blur(18px);margin-bottom:14px;position:relative;}
.c-curl{position:absolute;top:0;left:50%;transform:translateX(-50%);width:40px;height:4px;background:rgba(245,200,66,0.35);border-radius:0 0 6px 6px;}
.c-h1{font-size:22px;font-weight:900;color:#F5C842;margin:0 0 6px;letter-spacing:2px;text-align:center;}
.c-sub{font-size:12px;color:rgba(212,146,26,0.7);text-align:center;margin:0 0 22px;letter-spacing:1px;line-height:1.5;}
.c-status{display:inline-flex;align-items:center;gap:6px;background:rgba(192,58,43,0.15);border:1px solid rgba(192,58,43,0.3);border-radius:20px;padding:6px 14px;font-size:11px;color:rgba(244,240,232,0.6);letter-spacing:1.5px;margin-bottom:22px;}
.c-dot{width:7px;height:7px;border-radius:50%;background:#e74c3c;animation:blink 1.4s ease-in-out infinite;}
@keyframes blink{0%,100%{opacity:1}50%{opacity:0.3}}
.c-btn-a{width:100%;padding:16px;background:linear-gradient(135deg,#1E7A8C,#D4921A);color:#F4F0E8;font-family:'Cinzel',serif;font-size:15px;font-weight:900;letter-spacing:2px;border:none;border-radius:12px;cursor:pointer;margin-bottom:12px;text-transform:uppercase;transition:opacity .15s,transform .1s;}
.c-btn-a:hover{opacity:.92}.c-btn-a:active{transform:scale(.98)}.c-btn-a:disabled{opacity:.5;cursor:not-allowed;}
.c-btn-b{width:100%;padding:15px;background:rgba(245,200,66,0.07);color:rgba(245,200,66,0.85);font-family:'Cinzel',serif;font-size:14px;font-weight:700;letter-spacing:2px;border:1.5px solid rgba(245,200,66,0.35);border-radius:12px;cursor:pointer;margin-bottom:20px;text-transform:uppercase;transition:background .15s,transform .1s;}
.c-btn-b:hover{background:rgba(245,200,66,0.14)}.c-btn-b:active{transform:scale(.98)}.c-btn-b:disabled{opacity:.5;cursor:not-allowed;}
.c-btn-c{width:100%;padding:15px;background:linear-gradient(135deg,rgba(26,58,92,0.9),rgba(13,31,53,0.95));color:#F4F0E8;font-family:'Cinzel',serif;font-size:14px;font-weight:700;letter-spacing:1.5px;border:1px solid rgba(30,122,140,0.4);border-radius:12px;cursor:pointer;margin-bottom:10px;display:flex;align-items:center;justify-content:center;gap:10px;transition:background .15s,transform .1s;}
.c-btn-c:hover{background:rgba(30,122,140,0.25)}.c-btn-c:active{transform:scale(.98)}.c-btn-c:disabled{opacity:.5;cursor:not-allowed;}
.c-div{display:flex;align-items:center;gap:10px;margin:4px 0 20px;}
.c-div-line{flex:1;height:1px;background:rgba(245,200,66,0.12);}
.c-div-txt{font-size:10px;color:rgba(245,200,66,0.35);letter-spacing:3px;}
.c-lbl{font-size:10px;color:rgba(212,146,26,0.7);letter-spacing:2px;margin-bottom:6px;display:block;text-transform:uppercase;}
.c-inp{width:100%;padding:13px 14px;background:rgba(255,255,255,0.05);border:1px solid rgba(245,200,66,0.2);border-radius:10px;color:#F4F0E8;font-family:'Cinzel',serif;font-size:13px;margin-bottom:14px;outline:none;transition:border-color .15s;}
.c-inp:focus{border-color:rgba(245,200,66,0.5);}
.c-err{color:#e74c3c;font-size:12px;text-align:center;margin:0 0 14px;letter-spacing:0.5px;line-height:1.6;min-height:18px;padding:0 8px;}
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
.c-pip.done{background:#1E7A8C;}.c-pip.now{background:#F5C842;}
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
`;

// ── Background layers ──
function Bg({ char }) {
  return (
    <>
      <div style={{position:"fixed",inset:0,zIndex:0,backgroundImage:`url(${LANDSCAPE_BG})`,backgroundSize:"cover",backgroundPosition:"center top",opacity:0.5}}/>
      {char && <div style={{position:"fixed",inset:0,zIndex:1,backgroundImage:`url(${char})`,backgroundSize:"contain",backgroundPosition:"center bottom",backgroundRepeat:"no-repeat",opacity:0.16}}/>}
      <div style={{position:"fixed",inset:0,zIndex:2,background:`linear-gradient(180deg,${C.cobaltDark}dd 0%,${C.cobaltDark}66 45%,rgba(248,244,235,0.88) 100%)`}}/>
    </>
  );
}

function Hdr({ user, onOut }) {
  const init = user ? (user.displayName || user.email || "W")[0].toUpperCase() : null;
  return (
    <div className="c-hdr">
      <div className="c-logo">⚔️ WHAM</div>
      {user && (
        <div className="c-pill" onClick={onOut}>
          <div className="c-av">{init}</div>
          <div className="c-un">{user.displayName || user.email?.split("@")[0]}</div>
        </div>
      )}
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
// AUTH — 100% local, no SDK, no Firebase
// Accounts stored in localStorage. Session stored in localStorage.
// ══════════════════════════════════════════════════════════════
function Auth({ onIn }) {
  const [mode,  setMode]  = useState("choice");
  const [email, setEmail] = useState("");
  const [pass,  setPass]  = useState("");
  const [name,  setName]  = useState("");
  const [err,   setErr]   = useState("");
  const [busy,  setBusy]  = useState(false);

  // Check for existing session on mount
  useEffect(() => {
    const existing = LocalAuth.currentUser();
    if (existing) {
      const profile = LocalProfile.get(existing.email);
      onIn(existing, profile);
    }
  }, []);

  function reset() { setMode("choice"); setEmail(""); setPass(""); setName(""); setErr(""); setBusy(false); }

  function doCreate(e) {
    e.preventDefault();
    if (!name.trim())    return setErr("Display name is required.");
    if (!email.trim())   return setErr("Email is required.");
    if (pass.length < 6) return setErr("Password must be at least 6 characters.");
    setErr(""); setBusy(true);
    try {
      const user = LocalAuth.create(email.trim(), pass, name.trim());
      const profile = LocalProfile.get(user.email);
      onIn(user, profile);
    } catch (e) { setErr(parseError(e)); setBusy(false); }
  }

  function doSignIn(e) {
    e.preventDefault();
    if (!email.trim()) return setErr("Email is required.");
    if (!pass.trim())  return setErr("Password is required.");
    setErr(""); setBusy(true);
    try {
      const user = LocalAuth.signIn(email.trim(), pass);
      const profile = LocalProfile.get(user.email);
      onIn(user, profile);
    } catch (e) { setErr(parseError(e)); setBusy(false); }
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
            <div style={{display:"flex",justifyContent:"center",marginBottom:20}}>
              <div className="c-status"><div className="c-dot"/>Not signed in</div>
            </div>
            <button className="c-btn-a" onClick={()=>{setMode("create");setErr("");}}>
              🕊️ Create Account — Free
            </button>
            <button className="c-btn-b" onClick={()=>{setMode("signin");setErr("");}}>
              🔐 Already have an account? Sign In
            </button>
            <div className="c-div"><div className="c-div-line"/><div className="c-div-txt">OR</div><div className="c-div-line"/></div>
            <button className="c-btn-c" onClick={()=>window.location.href="/"}>
              ⚔️ Single Player — Play as Guest
            </button>
          </div>
        )}

        {mode === "create" && (
          <div className="c-card">
            <div className="c-curl"/>
            <div style={{textAlign:"center",marginBottom:20}}>
              <div style={{fontSize:32,marginBottom:6}}>🕊️</div>
              <h1 className="c-h1">Create Account</h1>
              <p className="c-sub">Free · No payment required</p>
            </div>
            <form onSubmit={doCreate} autoComplete="on">
              <label className="c-lbl">Display Name</label>
              <input className="c-inp" type="text" autoComplete="name" placeholder="Your warrior name"
                value={name} onChange={e=>{setName(e.target.value);setErr("");}} disabled={busy}/>
              <label className="c-lbl">Email</label>
              <input className="c-inp" type="email" autoComplete="email" placeholder="you@example.com"
                value={email} onChange={e=>{setEmail(e.target.value);setErr("");}} disabled={busy}/>
              <label className="c-lbl">Password</label>
              <input className="c-inp" type="password" autoComplete="new-password" placeholder="6+ characters"
                value={pass} onChange={e=>{setPass(e.target.value);setErr("");}} disabled={busy}/>
              {err ? <div className="c-err">⚠️ {err}</div> : <div className="c-err"/>}
              <button className="c-btn-a" type="submit" disabled={busy}>
                {busy ? "Creating…" : "🕊️ Create Account — Free"}
              </button>
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
              {err ? <div className="c-err">⚠️ {err}</div> : <div className="c-err"/>}
              <button className="c-btn-a" type="submit" disabled={busy}>
                {busy ? "Signing In…" : "🔐 Enter the Arena"}
              </button>
            </form>
            <a className="c-back" onClick={reset}>← Back</a>
          </div>
        )}

      </div></div>
    </div>
  );
}

// ── LOBBY ──
function Lobby({ user, profile, onStart, onOut }) {
  const rank = rankBadge(profile?.total_score || 0);
  const name = profile?.display_name || user?.displayName || user?.email?.split("@")[0] || "Warrior";
  return (
    <div className="c-screen">
      <Bg char={CHAR_KNIGHT}/>
      <Hdr user={user} onOut={onOut}/>
      <div className="c-scroll"><div className="c-pad">
        <div className="c-card" style={{textAlign:"center",marginBottom:14}}>
          <div className="c-curl"/>
          <div style={{fontSize:36,marginBottom:8}}>{rank.icon}</div>
          <h1 className="c-h1" style={{fontSize:18}}>{name}</h1>
          <div style={{fontSize:11,color:rank.color,letterSpacing:2,marginBottom:14}}>{rank.label} · {profile?.total_score||0} pts</div>
          <div style={{display:"flex",justifyContent:"space-around",borderTop:"1px solid rgba(245,200,66,0.1)",paddingTop:14}}>
            {[["Games",profile?.games_played||0],["Wins",profile?.games_won||0]].map(([l,v])=>(
              <div key={l}>
                <div style={{fontSize:20,fontWeight:900,color:C.goldLight}}>{v}</div>
                <div style={{fontSize:9,color:C.goldDim,letterSpacing:2}}>{l.toUpperCase()}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="c-card">
          <div className="c-curl"/>
          <button className="c-btn-a" onClick={onStart}>⚔️ Start Challenge</button>
          <button className="c-btn-c" onClick={()=>window.location.href="/"} style={{marginTop:8}}>← Back to Home</button>
        </div>
      </div></div>
    </div>
  );
}

// ── SELECT LEVEL ──
function SelectLevel({ user, onPick, onBack }) {
  return (
    <div className="c-screen">
      <Bg char={CHAR_KNIGHT}/>
      <Hdr user={user}/>
      <div className="c-scroll"><div className="c-pad">
        <div className="c-card">
          <div className="c-curl"/>
          <div style={{textAlign:"center",marginBottom:20}}>
            <div style={{fontSize:28,marginBottom:6}}>📜</div>
            <h1 className="c-h1">Choose Level</h1>
            <p className="c-sub">Select your difficulty</p>
          </div>
          {LEVELS.map(lv=>(
            <div key={lv.pts} className="c-lv"
              style={{borderColor:lv.featured?lv.color:"rgba(245,200,66,0.12)",background:lv.featured?"rgba(30,122,140,0.18)":"rgba(13,31,53,0.4)"}}
              onClick={()=>onPick(lv)}>
              <div className="c-lv-icon">{lv.icon}</div>
              <div><div className="c-lv-name">{lv.name}</div><div className="c-lv-sub">{lv.sub}</div></div>
              <div className="c-lv-pts">{lv.pts}pt</div>
            </div>
          ))}
          <a className="c-back" onClick={onBack}>← Back</a>
        </div>
      </div></div>
    </div>
  );
}

// ── ANSWER ──
function Answer({ user, game, onDone }) {
  const [opts,   setOpts]   = useState([]);
  const [sel,    setSel]    = useState(null);
  const [tLeft,  setTLeft]  = useState(TIME_LIMIT);
  const [locked, setLocked] = useState(false);
  const [slam,   setSlam]   = useState(false);
  const doneRef = useRef(false);
  const tmr     = useRef(null);
  const v   = game?.verse || VERSES[0];
  const pts = game?.pts   || 5;
  const lv  = LEVELS.find(l=>l.pts===pts) || LEVELS[0];

  useEffect(()=>{
    setOpts(buildOptions(v)); doneRef.current=false;
    setSel(null); setLocked(false); setTLeft(TIME_LIMIT); setSlam(false);
  },[game?.round]);

  useEffect(()=>{
    tmr.current=setInterval(()=>setTLeft(t=>{
      if(t<=1){clearInterval(tmr.current);if(!doneRef.current)submit(null);return 0;}
      return t-1;
    }),1000);
    return()=>clearInterval(tmr.current);
  },[]);

  function submit(opt){
    if(doneRef.current)return;
    doneRef.current=true; clearInterval(tmr.current);
    setSel(opt); setLocked(true);
    if(opt?.isCorrect) setSlam(true);
    else onDone({correct:false,pts:0});
  }

  const pct=tLeft/TIME_LIMIT*100;
  const tc=tLeft>10?C.teal:tLeft>5?C.gold:C.red;

  return (
    <div className="c-screen">
      <Bg/>
      <Hdr user={user}/>
      <Slam active={slam} pts={pts} onDone={()=>onDone({correct:true,pts})}/>
      <div className="c-scroll"><div className="c-pad">
        <div className="c-score-row">
          <div className="c-score-box"><div className="c-score-val">{game?.myScore||0}</div><div className="c-score-lbl">You</div></div>
          <div style={{fontSize:10,color:C.goldDim,letterSpacing:2,textAlign:"center"}}>Round {(game?.round||0)+1}/{TOTAL_ROUNDS}</div>
          <div className="c-score-box"><div className="c-score-val">{game?.oppScore||0}</div><div className="c-score-lbl">Opp</div></div>
        </div>
        <div className="c-tbar"><div className="c-tfill" style={{width:`${pct}%`,background:tc}}/></div>
        <div className="c-pips">
          {Array.from({length:TOTAL_ROUNDS}).map((_,i)=>(
            <div key={i} className={`c-pip${i<(game?.round||0)?" done":i===(game?.round||0)?" now":""}`}/>
          ))}
        </div>
        <div className="c-vcard">
          <div className="c-vtxt">"{v.text}"</div>
          <div className="c-vq">Where is this verse found?</div>
          <div style={{fontSize:10,color:lv.color,letterSpacing:2,marginTop:6}}>{lv.icon} {lv.name} · {pts} pts</div>
        </div>
        <div className="c-opts">
          {opts.map((opt,i)=>{
            let cls="c-opt";
            if(locked&&opt===sel) cls+=opt.isCorrect?" correct":" wrong";
            if(locked&&opt.isCorrect&&sel&&!sel.isCorrect) cls+=" correct";
            return (
              <div key={i} className={cls} onClick={()=>!locked&&submit(opt)}>
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

// ── GAME OVER ──
function GameOver({ myScore, oppScore, onRematch, onHome }) {
  const won = myScore >= oppScore;
  return (
    <div className="c-screen">
      <Bg char={won?CHAR_VICTORY:CHAR_KNIGHT}/>
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
          <button className="c-btn-a" onClick={onRematch}>⚔️ Play Again</button>
          <button className="c-btn-c" onClick={onHome} style={{marginTop:8}}>← Back to Home</button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ROOT
// ══════════════════════════════════════════════════════════════
export default function Challenge() {
  const [user,    setUser]    = useState(null);
  const [profile, setProfile] = useState(null);
  const [screen,  setScreen]  = useState("auth");
  const [game,    setGame]    = useState(null);

  useEffect(()=>{
    const el = document.getElementById("wb-ch-s");
    if (!el) {
      const s = document.createElement("style");
      s.id = "wb-ch-s";
      s.textContent = S;
      document.head.appendChild(s);
    }
  },[]);

  function onIn(u, p) { setUser(u); setProfile(p); setScreen("lobby"); }

  function onOut() {
    LocalAuth.signOut();
    setUser(null); setProfile(null); setGame(null); setScreen("auth");
  }

  function startGame() {
    setGame({round:0, myScore:0, oppScore:0, verse:rndVerse(), pts:5});
    setScreen("level");
  }

  function onPick(lv) {
    setGame(g => ({...g, pts:lv.pts, verse:rndVerse()}));
    setScreen("answer");
  }

  function onDone({correct, pts}) {
    setGame(g => {
      const score = (g.myScore||0) + (correct ? pts : 0);
      const round = (g.round||0) + 1;
      if (round >= TOTAL_ROUNDS) {
        const updated = LocalProfile.update(user.email, {score, won: score > (g.oppScore||0)});
        setProfile(updated);
        setTimeout(() => setScreen("gameover"), 50);
        return {...g, myScore:score, round};
      }
      setTimeout(() => setScreen("level"), 50);
      return {...g, myScore:score, round, verse:rndVerse()};
    });
  }

  return (
    <>
      {screen==="auth"     && <Auth onIn={onIn}/>}
      {screen==="lobby"    && <Lobby user={user} profile={profile} onStart={startGame} onOut={onOut}/>}
      {screen==="level"    && <SelectLevel user={user} onPick={onPick} onBack={()=>setScreen("lobby")}/>}
      {screen==="answer"   && <Answer user={user} game={game} onDone={onDone}/>}
      {screen==="gameover" && <GameOver myScore={game?.myScore||0} oppScore={game?.oppScore||0} onRematch={startGame} onHome={()=>window.location.href="/"}/>}
    </>
  );
}
