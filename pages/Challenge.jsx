import { useState, useEffect, useRef, useCallback } from "react";

// ══════════════════════════════════════════════════════════════
// WhamBible — Challenge.jsx
// Full multiplayer engine: Firebase Auth + Firestore + FCM push
// Deep-link routing: ?game=GAMEID opens game directly
// ══════════════════════════════════════════════════════════════

// ── Firebase config (injected via env at build; reads window.__ENV in preview) ──
const FB_CONFIG = {
  apiKey:            "AIzaSyAb5sxWjKHYkKHiou8CnXYrMweaS6P8rIE",
  authDomain:        "wham-bible.firebaseapp.com",
  projectId:         "wham-bible",
  storageBucket:     "wham-bible.firebasestorage.app",
  messagingSenderId: "207184555743",
  appId:             "1:207184555743:web:0bd4b8350701d02f79836a",
};
const VAPID_KEY = "BKfAsLFqwK3E_eUGVRqbk27nO-PA5jONM6ekOop3Vp2U3vXH384dtK5WZnlWVtThnkdn37rvQQuxiHjTnYwEPDI";
// Push handled via Base44 backend function — works in preview AND on Netlify

// ── Assets ──
const LANDSCAPE_BG = "https://media.base44.com/images/public/69df9a909b33058a5ce47831/33b065c94_generated_image.png";
const CHAR_MP      = "https://media.base44.com/images/public/69df9a909b33058a5ce47831/10c016255_generated_image.png";
const CHAR_KNIGHT  = "https://media.base44.com/images/public/69df9a909b33058a5ce47831/9b51fedfd_generated_image.png";
const CHAR_VICTORY = "https://media.base44.com/images/public/69df9a909b33058a5ce47831/c5aa4771c_generated_image.png";
const WHAM_AUDIO   = "https://media.base44.com/videos/public/69c40c6701d9dfdb1df69d2b/5d143ab80_51a54c36d_wham-slam-voice1.webm";

const C = {
  cobalt:    "#1A3A5C",
  cobaltDark:"#0D1F35",
  teal:      "#1E7A8C",
  tealLight: "#3ABDD4",
  gold:      "#D4921A",
  goldLight: "#F5C842",
  offWhite:  "#F4F0E8",
  red:       "#C0392B",
  dark:      "#0D0A02",
  goldDim:   "rgba(201,162,39,0.4)",
};

const TOTAL_ROUNDS = 10;
const TIME_LIMIT   = 20;
const LETTERS = ["A","B","C","D"];

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

const SAMPLE_VERSES = [
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

function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5); }

function buildOptions(verse) {
  const correct = { book:verse.book, chapter:verse.chapter, verse:verse.verse, isCorrect:true };
  const used = new Set([verse.book]);
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
  return               { icon:"📜", label:"Scribe",   color:"#64748b" };
}

function suggestedLevel(score) {
  if (score >= 700) return 20;
  if (score >= 300) return 15;
  if (score >= 100) return 10;
  return 5;
}

// ══════════════════════════════════════════════════════════════
// Firebase singleton — lazy-loaded once, shared across re-renders
// ══════════════════════════════════════════════════════════════
let _fb = null;
async function getFirebase() {
  if (_fb) return _fb;
  const [
    { initializeApp, getApps },
    { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider,
      createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut },
    { getFirestore, doc, setDoc, getDoc, collection, addDoc, updateDoc,
      onSnapshot, serverTimestamp, query, where, orderBy, limit, getDocs },
  ] = await Promise.all([
    import("https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js"),
    import("https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js"),
    import("https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js"),
  ]);

  const app  = getApps().length ? getApps()[0] : initializeApp(FB_CONFIG);
  const auth = getAuth(app);
  const db   = getFirestore(app);

  let messaging = null, getToken = null, onMessage = null;
  try {
    const { isSupported } = await import("https://www.gstatic.com/firebasejs/10.11.0/firebase-messaging.js");
    const supported = await isSupported();
    if (supported) {
      const msgMod = await import("https://www.gstatic.com/firebasejs/10.11.0/firebase-messaging.js");
      getToken = msgMod.getToken;
      onMessage = msgMod.onMessage;
      try { messaging = msgMod.getMessaging(app); } catch(e) { console.warn("FCM init:", e); }
    } else {
      console.info("FCM: browser does not support messaging — push notifications disabled.");
    }
  } catch(e) { console.warn("FCM load:", e); }

  _fb = {
    auth, db, messaging,
    onAuthStateChanged, signInWithPopup, GoogleAuthProvider,
    createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut,
    doc, setDoc, getDoc, collection, addDoc, updateDoc,
    onSnapshot, serverTimestamp, query, where, orderBy, limit, getDocs,
    getToken, onMessage,
  };
  return _fb;
}

// ── FCM push helper — via Base44 backend function (same pattern as whamgame) ──
async function sendPush(token, title, body, gameId, fromName) {
  if (!token) return;
  try {
    // Dynamically import Base44 SDK client
    // Direct call to deployed Base44 backend function
    await fetch("https://designer-5ce47831.base44.app/functions/sendPushNotification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, title, body, gameId: gameId||"", fromName: fromName||"", type:"game_update" }),
    });
  } catch(e) { console.warn("push:", e); }
}

// ── WHAM SLAM ──
function WhamSlam({ active, refText, sub }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    if (!active) return;
    setPhase(0);
    const t1 = setTimeout(() => setPhase(1), 300);
    const t2 = setTimeout(() => setPhase(2), 1120);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [active]);
  if (!active) return null;
  const p = [
    { bg:"#fff",    sz:60, op:1, sc:1,    rOp:0, sOp:0 },
    { bg:"#020617", sz:96, op:1, sc:1.08, rOp:1, sOp:1 },
    { bg:"#020617", sz:96, op:0, sc:1,    rOp:0, sOp:0 },
  ][phase];
  return (
    <div style={{ position:"fixed",inset:0,zIndex:9999,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:p.bg,transition:"background 0.15s" }}>
      <div style={{ fontSize:p.sz,fontWeight:900,letterSpacing:6,background:"linear-gradient(135deg,#f472b6,#c084fc,#818cf8)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text",marginBottom:16,opacity:p.op,transform:`scale(${p.sc})`,transition:"font-size 0.2s cubic-bezier(0.34,1.56,0.64,1),opacity 0.3s,transform 0.2s",fontFamily:"'Cinzel',serif" }}>WHAM!</div>
      <div style={{ color:"#4ade80",fontSize:22,fontWeight:800,letterSpacing:2,textTransform:"uppercase",opacity:p.rOp,transition:"opacity 0.3s",fontFamily:"'Cinzel',serif" }}>✅ {refText}</div>
      <div style={{ color:"#475569",fontSize:13,marginTop:8,opacity:p.sOp,transition:"opacity 0.3s 0.1s",fontFamily:"'Cinzel',serif" }}>{sub}</div>
    </div>
  );
}

// ── Toast ──
function Toast({ msg }) {
  if (!msg) return null;
  return (
    <div style={{ position:"fixed",bottom:28,left:"50%",transform:"translateX(-50%)",zIndex:8888,background:"rgba(15,23,42,0.95)",color:C.gold,border:`1px solid ${C.gold}`,borderRadius:30,padding:"10px 22px",fontSize:13,fontFamily:"'Cinzel',serif",fontWeight:600,letterSpacing:0.5,whiteSpace:"nowrap",boxShadow:"0 4px 20px rgba(0,0,0,0.5)",pointerEvents:"none" }}>
      {msg}
    </div>
  );
}

// ── Shared backgrounds ──
function BgLayers({ charUrl }) {
  return (
    <>
      <div className="ch-bg-land" />
      <div className="ch-bg-char" style={{ backgroundImage:`url('${charUrl}')` }} />
      <div className="ch-bg-rim" />
    </>
  );
}

// ── VS Strip ──
function VsStrip({ p1Name, p2Name, p1Score, p2Score, round }) {
  return (
    <div className="ch-vs-strip">
      <div className="ch-vs-player left">
        <span className="ch-vs-name">{p1Name}</span>
        <span className="ch-vs-score">{p1Score}</span>
        <span className="ch-vs-label">pts</span>
      </div>
      <div className="ch-vs-mid">
        <div className="ch-vs-vs">VS</div>
        <div className="ch-vs-round">{round}</div>
      </div>
      <div className="ch-vs-player right">
        <span className="ch-vs-name">{p2Name}</span>
        <span className="ch-vs-score">{p2Score}</span>
        <span className="ch-vs-label">pts</span>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// SCREEN: Auth Gate (not signed in)
// ══════════════════════════════════════════════
function ScreenAuthGate({ onSignIn, onGuest }) {
  const [mode,  setMode]  = useState("choose"); // choose | email
  const [email, setEmail] = useState("");
  const [pass,  setPass]  = useState("");
  const [err,   setErr]   = useState("");
  const [busy,  setBusy]  = useState(false);

  async function handleGoogle() {
    setBusy(true); setErr("");
    try {
      const fb = await getFirebase();
      await signInWithPopup(fb.auth, new fb.GoogleAuthProvider());
    } catch(e) { setErr(e.message); } finally { setBusy(false); }
  }

  async function handleEmail(isNew) {
    if (!email || !pass) { setErr("Enter email and password"); return; }
    setBusy(true); setErr("");
    try {
      const fb = await getFirebase();
      if (isNew) await fb.createUserWithEmailAndPassword(fb.auth, email, pass);
      else       await fb.signInWithEmailAndPassword(fb.auth, email, pass);
    } catch(e) { setErr(e.message.replace("Firebase: ","").replace(/\s*\(.*\)/,"")); }
    finally { setBusy(false); }
  }

  return (
    <div className="ch-screen">
      <BgLayers charUrl={CHAR_MP} />
      <div className="ch-auth-scroll">
        <div style={{ height:128 }} />
        <div className="ch-panel">
          <div className="ch-curl" />
          <div style={{ textAlign:"center", marginBottom:22 }}>
            <div style={{ fontSize:36, marginBottom:8 }}>🔐</div>
            <h1 className="ch-title">Sign In to Battle</h1>
            <p className="ch-sub">Challenge friends & track your victories</p>
          </div>

          {mode === "choose" && (
            <>
              <button className="ch-btn-google" onClick={handleGoogle} disabled={busy}>
                Continue with Google
              </button>
              <div className="ch-divider-or" style={{ margin:"14px 0" }}>
                <div className="ch-divider-line" /><span className="ch-divider-text">OR</span><div className="ch-divider-line" />
              </div>
              <button className="ch-btn-primary" onClick={() => setMode("email")}>📧 Sign In with Email</button>
              {err && <div className="ch-err">{err}</div>}
              <button className="ch-btn-ghost" style={{ marginTop:10 }} onClick={onGuest}>← Play Solo as Guest</button>
            </>
          )}

          {mode === "email" && (
            <>
              <input className="ch-search-input" placeholder="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} style={{ marginBottom:8 }} />
              <input className="ch-search-input" placeholder="Password" type="password" value={pass} onChange={e=>setPass(e.target.value)} />
              {err && <div className="ch-err">{err}</div>}
              <div style={{ display:"flex", gap:8, marginTop:10, marginBottom:8 }}>
                <button className="ch-btn-primary" style={{ flex:1 }} onClick={() => handleEmail(false)} disabled={busy}>Sign In</button>
                <button className="ch-btn-secondary" style={{ flex:1 }} onClick={() => handleEmail(true)} disabled={busy}>Create Account</button>
              </div>
              <button className="ch-btn-ghost" onClick={() => { setMode("choose"); setErr(""); }}>← Back</button>
            </>
          )}
          <div style={{ height:420 }} />
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// SCREEN: Lobby
// ══════════════════════════════════════════════
function ScreenLobby({ user, playerData, activeGames, onNewChallenge, onOpenGame, onSignOut }) {
  const myRank = rankBadge(playerData?.score || 0);
  return (
    <div className="ch-screen">
      <BgLayers charUrl={CHAR_MP} />
      <div className="ch-content">
        <div style={{ height:210 }} />
        <div className="ch-panel">
          <div className="ch-curl" />
          <div style={{ textAlign:"center", marginBottom:16 }}>
            <div style={{ fontSize:30, marginBottom:4 }}>⚔️</div>
            <h1 className="ch-title">WhamBible</h1>
            <p className="ch-sub">Challenge · Compete · Win Glory</p>
          </div>

          {/* Player banner */}
          <div className="ch-player-banner">
            <div className="ch-avatar">
              {user.photoURL
                ? <img src={user.photoURL} alt="" style={{ width:"100%",height:"100%",borderRadius:"50%",objectFit:"cover" }} onError={e=>{e.target.style.display="none";}} />
                : "👤"}
            </div>
            <div className="ch-player-info">
              <div className="ch-player-name">{user.displayName || user.email || "Warrior"}</div>
              <div className="ch-player-stats">{playerData?.score||0} pts &nbsp;·&nbsp; {playerData?.gamesPlayed||0} games &nbsp;·&nbsp; 🔥{playerData?.streak||0}</div>
              <div style={{ marginTop:4 }}>
                <span className="ch-rank-badge" style={{ background:`${myRank.color}22`,border:`1px solid ${myRank.color}66`,color:myRank.color }}>
                  {myRank.icon} {myRank.label}
                </span>
              </div>
            </div>
          </div>

          <button className="ch-btn-challenge" onClick={onNewChallenge}>⚔️ Issue New Challenge</button>

          {/* Active games */}
          <div className="ch-ag-section">
            <div className="ch-ag-header">
              <span className="ch-ag-title">Active Battles</span>
              <span className="ch-ag-badge">{activeGames.length}</span>
            </div>
            {activeGames.length === 0 ? (
              <div className="ch-ag-empty">
                <div style={{ fontSize:28, marginBottom:8 }}>🏹</div>
                <div>No active battles yet</div>
                <div className="ch-ag-empty-hint">Issue a challenge to get started</div>
              </div>
            ) : (
              <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                {activeGames.map((g,i) => {
                  const isMyTurn   = g.currentTurn === user.uid;
                  const isComplete = g.status === "complete";
                  const myScore    = g.scores?.[user.uid] || 0;
                  const oppUid     = (g.players||[]).find(p=>p!==user.uid);
                  const oppScore   = g.scores?.[oppUid] || 0;
                  const oppName    = g.playerNames?.[oppUid] || "Opponent";
                  return (
                    <div key={g.id||i} className={`ch-ag-card ${isComplete?"complete":isMyTurn?"your-turn":"waiting"}`} onClick={() => onOpenGame(g)}>
                      <div className="ch-ag-avatar">👤</div>
                      <div className="ch-ag-body">
                        <div className="ch-ag-opp">{oppName}</div>
                        <div className="ch-ag-turn">
                          {isComplete ? "🏁 Battle ended" : isMyTurn ? "⚔️ Your turn!" : "⏳ Waiting…"}
                        </div>
                      </div>
                      <div className="ch-ag-score">{myScore}–{oppScore}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ display:"flex", gap:8, marginTop:14 }}>
            <button className="ch-btn-ghost" style={{ flex:1 }} onClick={onSignOut}>Sign Out</button>
            <button className="ch-btn-ghost" style={{ flex:1 }} onClick={() => window.location.href="/"}>← Home</button>
          </div>
          <div style={{ height:30 }} />
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// SCREEN: Pick Level
// ══════════════════════════════════════════════
function ScreenPickLevel({ game, myUid, isRound, suggestPts, onPick, onBack }) {
  const oppUid = game?.players?.find(p=>p!==myUid);
  return (
    <div className="ch-screen">
      <BgLayers charUrl={CHAR_KNIGHT} />
      <div className="ch-content">
        <div style={{ height:isRound?126:154 }} />
        <div className="ch-panel">
          <div className="ch-curl" />
          {isRound && game ? (
            <>
              <div className="ch-turn-banner">
                <span style={{ fontSize:22 }}>⚔️</span>
                <div>
                  <div className="ch-turn-name">{game.playerNames?.[myUid]||"You"}</div>
                  <div className="ch-turn-sub">Choose your challenge for the opponent</div>
                </div>
              </div>
              <VsStrip
                p1Name={game.playerNames?.[myUid]||"You"}
                p2Name={game.playerNames?.[oppUid]||"Opponent"}
                p1Score={game.scores?.[myUid]||0}
                p2Score={game.scores?.[oppUid]||0}
                round={`Round ${game.round||1}`}
              />
              <p className="ch-pick-instruction">⚔️ Select a difficulty to challenge your opponent</p>
            </>
          ) : (
            <div style={{ textAlign:"center", marginBottom:22 }}>
              <div style={{ fontSize:34, marginBottom:8 }}>⚔️</div>
              <h1 className="ch-title">Choose Level</h1>
              <p className="ch-sub">Select your challenge difficulty</p>
            </div>
          )}

          <div style={{ display:"flex",flexDirection:"column",gap:9,marginBottom:20,width:"100%" }}>
            {LEVELS.map(lv => (
              <button key={lv.pts} onClick={() => onPick(lv)}
                className={`ch-level-card ${lv.featured||lv.pts===suggestPts?"featured":""}`}>
                <span className="ch-level-icon">{lv.icon}</span>
                <div className="ch-level-info">
                  <span className="ch-level-title">{lv.name.toUpperCase()}</span>
                  <span className="ch-level-sub">{lv.sub}</span>
                </div>
                <div className="ch-level-pts">
                  <span className="ch-level-pts-num">{lv.pts}</span>
                  <span className="ch-level-pts-label">PTS</span>
                </div>
              </button>
            ))}
          </div>
          <button className="ch-btn-ghost" onClick={onBack}>← Back</button>
          <div style={{ height:24 }} />
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// SCREEN: Verse Stack
// ══════════════════════════════════════════════
function ScreenVerseStack({ level, onPick, onBack }) {
  const pool = window.WHAM_VERSES || SAMPLE_VERSES;
  const total = pool.length;
  const sliced = level.pts <= 5  ? pool.slice(0, Math.ceil(total*0.25))
               : level.pts <= 10 ? pool.slice(Math.floor(total*0.10), Math.ceil(total*0.60))
               : level.pts <= 15 ? pool.slice(Math.floor(total*0.35), Math.ceil(total*0.85))
               :                   pool;
  const verses = useRef(shuffle(sliced).slice(0,10)).current;
  const [sel, setSel] = useState(null);

  return (
    <div className="ch-screen">
      <BgLayers charUrl={CHAR_MP} />
      <div className="ch-content">
        <div style={{ height:126 }} />
        <div className="ch-panel">
          <div className="ch-curl" />
          <div style={{ textAlign:"center", marginBottom:16 }}>
            <div className="ch-label-tiny">Choose Your Challenge</div>
            <h1 className="ch-title">Pick a Verse</h1>
            <p className="ch-sub">Select the verse your opponent must identify</p>
          </div>
          <div className="ch-verse-grid">
            {verses.map((v,i) => (
              <button key={i} className={`ch-vs-card ${sel===i?"selected":""}`}
                onClick={() => { setSel(i); setTimeout(()=>onPick(v),220); }}>
                <div className="ch-vs-ref">{v.book}<br/>{v.chapter}:{v.verse}</div>
              </button>
            ))}
          </div>
          <div style={{ textAlign:"center", marginTop:12 }}>
            <button className="ch-btn-ghost" onClick={onBack}>← Back</button>
          </div>
          <div style={{ height:24 }} />
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// SCREEN: Select Challenger
// ══════════════════════════════════════════════
function ScreenSelectChallenger({ myUid, recentOpps, onChallenge, onBack }) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [status, setStatus]   = useState("");
  const [busy, setBusy]       = useState(false);
  const tid = useRef(null);

  async function runSearch(val) {
    if (val.length < 2) { setResults([]); setStatus(""); return; }
    setStatus("Searching…"); setResults([]);
    const fb = await getFirebase();
    const { db, collection, query, where, getDocs } = fb;
    let res = [];
    try {
      const q1 = query(collection(db,"players"), where("email","==",val));
      const s1 = await getDocs(q1);
      s1.forEach(d => { if (d.id!==myUid) res.push({ id:d.id, ...d.data() }); });
    } catch(e){}
    try {
      const q2 = query(collection(db,"players"), where("displayName","==",val));
      const s2 = await getDocs(q2);
      s2.forEach(d => { if (d.id!==myUid && !res.find(r=>r.id===d.id)) res.push({ id:d.id, ...d.data() }); });
    } catch(e){}
    if (res.length === 0) setStatus("No players found — challenge by email anyway");
    else setStatus("");
    setResults(res.slice(0,5));
  }

  function handleInput(val) {
    setSearch(val);
    clearTimeout(tid.current);
    tid.current = setTimeout(() => runSearch(val), 380);
  }

  async function issueToResult(r) {
    setBusy(true);
    await onChallenge({ id:r.id, displayName:r.displayName||r.email||"Warrior", photoURL:r.photoURL||"", fcmToken:r.fcmToken||null });
    setBusy(false);
  }

  return (
    <div className="ch-screen">
      <BgLayers charUrl={CHAR_MP} />
      <div className="ch-content">
        <div style={{ height:126 }} />
        <div className="ch-panel">
          <div className="ch-curl" />
          <div style={{ textAlign:"center", marginBottom:18 }}>
            <div style={{ fontSize:28, marginBottom:6 }}>🎯</div>
            <h1 className="ch-title">Select Opponent</h1>
            <p className="ch-sub">Challenge a recent opponent or search</p>
          </div>
          <div className="ch-section-label">Recent Opponents</div>
          <div style={{ display:"flex",flexDirection:"column",gap:8,marginBottom:18 }}>
            {recentOpps.length===0
              ? <div className="ch-empty-hint">No recent opponents yet — search below</div>
              : recentOpps.map((opp,i) => (
                  <div key={i} className="ch-opp-row">
                    <div className="ch-opp-avatar">👤</div>
                    <div className="ch-opp-info">
                      <div className="ch-opp-name">{opp.displayName||opp.name}</div>
                      <div className="ch-opp-meta">Recent opponent</div>
                    </div>
                    <button className="ch-opp-challenge-btn" disabled={busy} onClick={() => issueToResult(opp)}>⚔️ Challenge</button>
                  </div>
                ))
            }
          </div>
          <div className="ch-divider-or">
            <div className="ch-divider-line"/><span className="ch-divider-text">OR SEARCH</span><div className="ch-divider-line"/>
          </div>
          <input className="ch-search-input" placeholder="Name or email…" value={search} onChange={e=>handleInput(e.target.value)} />
          {status && <div style={{ fontSize:11,fontFamily:"'Cinzel',serif",color:C.goldDim,marginBottom:8 }}>{status}</div>}
          {results.length>0 && (
            <div style={{ display:"flex",flexDirection:"column",gap:6,marginBottom:12 }}>
              {results.map((r,i) => (
                <div key={i} className="ch-opp-row" style={{ cursor:"pointer" }} onClick={() => issueToResult(r)}>
                  <div className="ch-opp-avatar" style={{ width:30,height:30,fontSize:14 }}>👤</div>
                  <div className="ch-opp-info">
                    <div className="ch-opp-name">{r.displayName||r.email||"Player"}</div>
                    <div className="ch-opp-meta">{r.email||""}</div>
                  </div>
                  <button className="ch-opp-challenge-btn" disabled={busy}>⚔️ Challenge</button>
                </div>
              ))}
            </div>
          )}
          {search.length>=2 && results.length===0 && status.includes("No players") && (
            <button className="ch-btn-primary" style={{ marginBottom:10 }} disabled={busy}
              onClick={() => onChallenge({ id:"pending_"+Date.now(), displayName:search, photoURL:"", fcmToken:null })}>
              ⚔️ Challenge "{search}"
            </button>
          )}
          <button className="ch-btn-ghost" onClick={onBack}>← Back</button>
          <div style={{ height:24 }} />
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// SCREEN: Accept Challenge
// ══════════════════════════════════════════════
function ScreenAcceptChallenge({ game, myUid, onAccept, onDecline }) {
  const oppUid   = game.players?.find(p=>p!==myUid);
  const challName= game.playerNames?.[oppUid] || "Warrior";
  const pts      = game.pendingLevel  || 10;
  const levelName= game.pendingName   || "Warrior";
  const levelIcon= game.pendingIcon   || "⚔️";
  const verse    = game.pendingVerse  || null;

  return (
    <div className="ch-screen">
      <BgLayers charUrl={CHAR_MP} />
      <div className="ch-content">
        <div style={{ height:140 }} />
        <div className="ch-panel" style={{ display:"flex",flexDirection:"column",alignItems:"center",paddingBottom:32 }}>
          <div className="ch-curl" />
          <div className="ch-ac-avatar">👤</div>
          <div className="ch-label-tiny" style={{ marginBottom:6 }}>Incoming Challenge</div>
          <h1 className="ch-title" style={{ marginBottom:4 }}>{challName}</h1>
          <p className="ch-sub" style={{ marginBottom:22 }}>has challenged you!</p>
          <div className="ch-ac-level-badge">
            <span style={{ fontSize:22 }}>{levelIcon}</span>
            <span className="ch-ac-level-name">{levelName}</span>
            <span style={{ color:"rgba(255,255,255,0.3)" }}>·</span>
            <span className="ch-ac-pts">{pts} pts</span>
          </div>
          {verse && (
            <div className="ch-ac-verse-card">
              <div className="ch-verse-label">Your Challenge Verse</div>
              <p className="ch-ac-verse-text">"{(verse.text||"").slice(0,120)}{verse.text?.length>120?"…":""}"</p>
              <div className="ch-ac-verse-ref">— {verse.book} {verse.chapter}:{verse.verse}</div>
            </div>
          )}
          <button className="ch-btn-primary" onClick={onAccept}>⚔️ Accept Challenge</button>
          <button className="ch-btn-ghost" style={{ marginTop:10 }} onClick={onDecline}>← Decline</button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// SCREEN: Answer
// ══════════════════════════════════════════════
function ScreenAnswer({ game, myUid, onResult }) {
  const oppUid  = game.players?.find(p=>p!==myUid);
  const oppName = game.playerNames?.[oppUid] || "Opponent";
  const pts     = game.pendingLevel  || 10;
  const icon    = game.pendingIcon   || "⚔️";
  const verse   = game.pendingVerse  || SAMPLE_VERSES[0];

  const [timeLeft,  setTime]   = useState(TIME_LIMIT);
  const [answered,  setAnswered]= useState(false);
  const [chosen,    setChosen]  = useState(null);
  const [showHint,  setShowHint]= useState(false);
  const [whamActive,setWhamActive]=useState(false);

  const options   = useRef(buildOptions(verse)).current;
  const timerRef  = useRef(null);
  const audioRef  = useRef(null);
  const answeredRef = useRef(false);

  // Papa hint thresholds MP: Squire ≤13s, Warrior ≤15s, Knight ≤17s, Champion = none
  const hintAt = { 5:13, 10:15, 15:17 };
  const hintThreshold = hintAt[pts];

  useEffect(() => {
    audioRef.current = new Audio(WHAM_AUDIO);
    audioRef.current.preload = "auto";
    audioRef.current.load();
    let t = TIME_LIMIT;
    timerRef.current = setInterval(() => {
      t = parseFloat((t - 0.1).toFixed(1));
      setTime(t);
      if (hintThreshold && t <= hintThreshold && !showHint) setShowHint(true);
      if (t <= 0) { clearInterval(timerRef.current); handleAnswer(null); }
    }, 100);
    return () => clearInterval(timerRef.current);
  }, []);

  function handleAnswer(opt) {
    if (answeredRef.current) return;
    answeredRef.current = true;
    clearInterval(timerRef.current);
    setAnswered(true);
    setChosen(opt);
    const isCorrect = opt?.isCorrect === true;
    if (isCorrect) {
      try { audioRef.current.currentTime=0; audioRef.current.play().catch(()=>{}); } catch(e){}
      setWhamActive(true);
      setTimeout(() => { setWhamActive(false); setTimeout(() => onResult({ isCorrect, opt, verse, pts }), 300); }, 1620);
    } else {
      setTimeout(() => onResult({ isCorrect:false, opt, verse, pts }), 900);
    }
  }

  const timerPct   = (timeLeft / TIME_LIMIT) * 100;
  const timerColor = timeLeft > 10 ? C.teal : timeLeft > 5 ? C.gold : C.red;
  const correctRef = `${verse.book} ${verse.chapter}:${verse.verse}`;

  return (
    <div className="ch-screen">
      <BgLayers charUrl={CHAR_KNIGHT} />
      <WhamSlam active={whamActive} refText={correctRef} sub="Correct!" />
      <div className="ch-content">
        <div style={{ height:98 }} />
        <div className="ch-panel">
          <div className="ch-curl" />
          <div className="ch-answer-header">
            <div className="ch-challenge-from">{icon} {oppName} challenged you!</div>
            <div className="ch-pts-badge">{pts} pts</div>
          </div>
          <div className="ch-timer-bar-wrap">
            <div className="ch-timer-bar" style={{ width:`${timerPct}%`,background:timerColor }} />
          </div>
          <div className="ch-verse-card">
            <div className="ch-verse-ornament">✦ ✦ ✦</div>
            <p className="ch-verse-body">"{verse.text}"</p>
            <div className="ch-verse-ornament">✦ ✦ ✦</div>
            <div className="ch-verse-where">Where is this verse found?</div>
          </div>
          {showHint && !answered && (
            <div className="ch-papa-hint">
              💡 <strong>Papa says:</strong> This verse is from <em>{verse.book}</em>, chapter {verse.chapter}.
            </div>
          )}
          <p className="ch-choices-label">Select the correct Book · Chapter · Verse</p>
          <div style={{ display:"flex",flexDirection:"column",gap:8,marginBottom:14 }}>
            {options.map((opt,i) => {
              let cls = "ch-choice-btn";
              if (answered) {
                if (opt.isCorrect) cls += " correct";
                else if (opt === chosen) cls += " wrong";
              }
              return (
                <button key={i} className={cls} onClick={() => handleAnswer(opt)} disabled={answered}>
                  <div className="ch-choice-letter">{LETTERS[i]}</div>
                  <div className="ch-choice-text">
                    <span className="ch-choice-book">{opt.book}</span>
                    <span className="ch-choice-ref">Chapter {opt.chapter} · Verse {opt.verse}</span>
                  </div>
                  {answered && opt.isCorrect  && <span style={{ marginLeft:"auto",color:C.teal }}>✓</span>}
                  {answered && opt===chosen && !opt.isCorrect && <span style={{ marginLeft:"auto",color:C.red }}>✗</span>}
                </button>
              );
            })}
          </div>
          {answered && (
            <div className={`ch-feedback-bar ${chosen?.isCorrect?"correct":"wrong"}`}>
              {chosen?.isCorrect ? "✅ Correct!" : `❌ It was ${correctRef}`}
            </div>
          )}
          <div style={{ height:20 }} />
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// SCREEN: Round Result (waiting / just sent challenge)
// ══════════════════════════════════════════════
function ScreenRoundResult({ game, myUid, lastResult, gameCode, onNext }) {
  const oppUid  = game.players?.find(p=>p!==myUid);
  const iWaited = !lastResult; // I sent the challenge — now waiting
  const { isCorrect, verse, pts } = lastResult || {};

  function copyCode() {
    navigator.clipboard?.writeText(gameCode||"").catch(()=>{});
  }

  return (
    <div className="ch-screen">
      <BgLayers charUrl={CHAR_KNIGHT} />
      <div className="ch-content">
        <div style={{ height:126 }} />
        <div className="ch-panel">
          <div className="ch-curl" />
          <div className="ch-round-result-card">
            <div style={{ fontSize:38, marginBottom:8 }}>
              {iWaited ? "⚔️" : isCorrect ? "✅" : "❌"}
            </div>
            <h2 className="ch-title" style={{ marginBottom:4 }}>
              {iWaited
                ? `${game.pendingName||"Warrior"} Challenge Sent!`
                : isCorrect ? "Correct!" : "Missed It"}
            </h2>
            {verse && <p className="ch-verse-ref-small">{verse.book} {verse.chapter}:{verse.verse}</p>}
            {verse && <p className="ch-verse-body-small">"{verse.text?.slice(0,100)}…"</p>}

            <VsStrip
              p1Name={game.playerNames?.[myUid]||"You"}
              p2Name={game.playerNames?.[oppUid]||"Opponent"}
              p1Score={game.scores?.[myUid]||0}
              p2Score={game.scores?.[oppUid]||0}
              round={`Round ${game.round||1}`}
            />

            <div className="ch-share-wrap">
              <div className="ch-share-label">📋 Game Code — Share with opponent</div>
              <div className="ch-share-code" onClick={copyCode}>{(gameCode||"——").slice(0,8).toUpperCase()}</div>
              <div className="ch-share-hint">Tap to copy</div>
            </div>

            <button className="ch-btn-primary" onClick={onNext}>
              {iWaited ? "← Back to Battles" : game.round >= TOTAL_ROUNDS ? "🏆 View Results" : "Next Turn ⚔️"}
            </button>
          </div>
          <div style={{ height:24 }} />
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// SCREEN: Game Complete
// ══════════════════════════════════════════════
function ScreenGameComplete({ game, myUid, onNewBattle, onHome }) {
  const oppUid   = game.players?.find(p=>p!==myUid);
  const myScore  = game.scores?.[myUid]  || 0;
  const oppScore = game.scores?.[oppUid] || 0;
  const myName   = game.playerNames?.[myUid]  || "You";
  const oppName  = game.playerNames?.[oppUid] || "Opponent";
  const won  = myScore > oppScore;
  const draw = myScore === oppScore;
  const myRank = rankBadge(myScore);

  return (
    <div className="ch-screen">
      <BgLayers charUrl={CHAR_VICTORY} />
      <div className="ch-content">
        <div style={{ height:245 }} />
        <div className="ch-panel">
          <div className="ch-curl" />
          <div style={{ textAlign:"center", paddingBottom:32 }}>
            <div className="ch-gc-trophy">{won?"🏆":draw?"🤝":"⚔️"}</div>
            <h2 className="ch-title" style={{ marginBottom:4 }}>Battle Complete!</h2>
            <p className="ch-sub" style={{ marginBottom:12 }}>{(game.round||11)-1} rounds fought</p>
            <div className={`ch-gc-result-banner ${won?"win":draw?"draw":"loss"}`}>
              {won?"⚔️ VICTORY":draw?"🤝 DRAW":"💀 DEFEAT"}
            </div>
            <div className="ch-gc-scoreboard">
              <div className="ch-gc-player">
                <div className="ch-gc-avatar">👤</div>
                <div className="ch-gc-name">{myName}</div>
                <div className="ch-gc-score">{myScore}</div>
              </div>
              <div className="ch-gc-vs">VS</div>
              <div className="ch-gc-player">
                <div className="ch-gc-avatar">👤</div>
                <div className="ch-gc-name">{oppName}</div>
                <div className="ch-gc-score">{oppScore}</div>
              </div>
            </div>
            <div className="ch-gc-stats">
              <div className="ch-gc-stat">
                <div className="ch-gc-stat-val">{won?`+${myScore}`:"+0"}</div>
                <div className="ch-gc-stat-lbl">Pts Earned</div>
              </div>
              <div className="ch-gc-stat">
                <div className="ch-gc-stat-val">{(game.round||11)-1}</div>
                <div className="ch-gc-stat-lbl">Rounds</div>
              </div>
              <div className="ch-gc-stat">
                <div className="ch-gc-stat-val">{myRank.icon}</div>
                <div className="ch-gc-stat-lbl">Rank</div>
              </div>
            </div>
            <button className="ch-btn-primary" onClick={onNewBattle}>⚔️ New Battle</button>
            <button className="ch-btn-ghost" style={{ marginTop:10,width:"100%" }} onClick={onHome}>← Home</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// ROOT — Firebase state machine
// ══════════════════════════════════════════════
export default function Challenge() {
  const [fbReady,     setFbReady]     = useState(false);
  const [user,        setUser]        = useState(null);     // Firebase User
  const [playerData,  setPlayerData]  = useState(null);     // Firestore players/{uid}
  const [activeGames, setActiveGames] = useState([]);
  const [screen,      setScreen]      = useState("loading");
  const [toast,       setToast]       = useState("");
  const toastTid = useRef(null);

  // Current game state
  const [currentGame,   setCurrentGame]   = useState(null);
  const [currentGameId, setCurrentGameId] = useState(null);
  const [lastResult,    setLastResult]    = useState(null);

  // New challenge flow state
  const [ncLevel,  setNcLevel]  = useState(null);
  const [ncVerse,  setNcVerse]  = useState(null);
  const [recentOpps, setRecentOpps] = useState([]);

  const gamesUnsubRef = useRef(null);

  // ── Toast helper ──
  function showToast(msg, ms=2400) {
    setToast(msg);
    clearTimeout(toastTid.current);
    toastTid.current = setTimeout(() => setToast(""), ms);
  }

  // ── Upsert player profile ──
  async function upsertPlayer(fb, user) {
    const { db, doc, getDoc, setDoc, serverTimestamp } = fb;
    const ref  = doc(db, "players", user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        uid:         user.uid,
        displayName: user.displayName || user.email || "Anonymous",
        email:       user.email || "",
        photoURL:    user.photoURL || "",
        isAnonymous: user.isAnonymous,
        createdAt:   serverTimestamp(),
        score: 0, gamesPlayed: 0, streak: 0,
      });
    }
    const latest = await getDoc(ref);
    setPlayerData(latest.data());
    // Register FCM token
    try {
      if (fb.messaging) {
        const token = await fb.getToken(fb.messaging, { vapidKey: VAPID_KEY });
        if (token) await fb.updateDoc ? fb.updateDoc(ref, { fcmToken:token, lastSeen:serverTimestamp() }) : null;
      }
    } catch(e) { console.warn("FCM token:", e); }
  }

  // ── Subscribe active games ──
  function subscribeGames(fb, uid) {
    if (gamesUnsubRef.current) gamesUnsubRef.current();
    const { db, collection, query, where, orderBy, onSnapshot } = fb;
    const q = query(
      collection(db, "games"),
      where("players", "array-contains", uid),
      orderBy("updatedAt", "desc")
    );
    gamesUnsubRef.current = onSnapshot(q, snap => {
      const all = snap.docs.map(d => ({ id:d.id, ...d.data() }));
      const relevant = all.filter(g => {
        if (g.status !== "complete") return true;
        const upd = g.updatedAt?.toDate ? g.updatedAt.toDate() : null;
        return upd && (Date.now() - upd.getTime()) < 24*60*60*1000;
      });
      setActiveGames(relevant);
      // Nudge if it became our turn while watching lobby
      setCurrentGame(prev => {
        if (!prev) return prev;
        const updated = all.find(g => g.id === prev.id);
        return updated || prev;
      });
    }, err => console.warn("games sub:", err));
  }

  // ── Firebase init + auth listener ──
  useEffect(() => {
    let authUnsub = null;
    (async () => {
      const fb = await getFirebase();
      setFbReady(true);
      authUnsub = fb.onAuthStateChanged(fb.auth, async fbUser => {
        setUser(fbUser && !fbUser.isAnonymous ? fbUser : null);
        if (fbUser && !fbUser.isAnonymous) {
          await upsertPlayer(fb, fbUser);
          subscribeGames(fb, fbUser.uid);
          // ── Deep link: ?game=GAMEID ──
          const params = new URLSearchParams(window.location.search);
          const gameId = params.get("game") || params.get("code");
          if (gameId) {
            try {
              const { db, doc, getDoc } = fb;
              const snap = await getDoc(doc(db, "games", gameId));
              if (snap.exists()) {
                const g = { id:snap.id, ...snap.data() };
                setCurrentGame(g);
                setCurrentGameId(g.id);
                showToast("🔗 Opening game…");
                setTimeout(() => openGame(g, fbUser.uid), 600);
                return;
              } else { showToast("⚠️ Game not found"); }
            } catch(e) { console.warn("deep link:", e); }
          }
          setScreen("lobby");
        } else {
          if (gamesUnsubRef.current) { gamesUnsubRef.current(); gamesUnsubRef.current = null; }
          setScreen("auth");
        }
      });
    })();
    return () => { authUnsub?.(); gamesUnsubRef.current?.(); };
  }, []);

  // ── Open game — route to correct screen based on state ──
  function openGame(game, uid) {
    const myUid = uid || user?.uid;
    setCurrentGame(game);
    setCurrentGameId(game.id);
    if (game.status === "complete") {
      setScreen("complete"); return;
    }
    if (game.currentTurn === myUid) {
      if (game.status === "waiting_for_answer") {
        setScreen("accept");
      } else {
        setScreen("pick-level-round");
      }
    } else {
      showToast("⏳ Waiting for opponent…");
      setScreen("lobby");
    }
  }

  // ── Load recent opponents ──
  async function loadRecentOpps() {
    const fb = await getFirebase();
    const { db, collection, query, where, orderBy, limit, getDocs } = fb;
    try {
      const q = query(
        collection(db, "games"),
        where("players", "array-contains", user.uid),
        orderBy("updatedAt","desc"),
        limit(20)
      );
      const snap = await getDocs(q);
      const seen = new Set(); const opps = [];
      for (const d of snap.docs) {
        const g = d.data();
        const oUid = (g.players||[]).find(p=>p!==user.uid);
        if (!oUid || seen.has(oUid)) continue;
        seen.add(oUid);
        opps.push({ id:oUid, displayName:g.playerNames?.[oUid]||"Warrior", photoURL:g.playerPhotos?.[oUid]||"", fcmToken:null });
        if (opps.length >= 5) break;
      }
      setRecentOpps(opps);
    } catch(e) { console.warn("recent opps:", e); }
  }

  // ── Create / update game in Firestore ──
  async function createOrUpdateGame(oppDoc) {
    if (!user || !ncVerse || !ncLevel) { showToast("Missing verse or auth"); return; }
    const fb = await getFirebase();
    const { db, doc, getDoc, collection, addDoc, updateDoc, serverTimestamp } = fb;
    const myName  = user.displayName || user.email || "Warrior";
    const myPhoto = user.photoURL || "";
    const oppUid  = oppDoc.id;
    const oppName = oppDoc.displayName || "Opponent";
    const oppPhoto= oppDoc.photoURL || "";
    const isExisting = !!currentGameId && currentGame?.players?.includes(user.uid) && currentGame?.players?.includes(oppUid);

    try {
      showToast("⚔️ Issuing challenge…");
      let gameId, gameData;
      if (isExisting) {
        await updateDoc(doc(db,"games",currentGameId), {
          currentTurn: oppUid, status:"waiting_for_answer",
          pendingLevel:ncLevel.pts, pendingName:ncLevel.name, pendingIcon:ncLevel.icon,
          pendingVerse:ncVerse, updatedAt:serverTimestamp(),
        });
        gameId   = currentGameId;
        gameData = { ...currentGame, currentTurn:oppUid, status:"waiting_for_answer", pendingLevel:ncLevel.pts, pendingName:ncLevel.name, pendingIcon:ncLevel.icon, pendingVerse:ncVerse };
      } else {
        const ref = await addDoc(collection(db,"games"), {
          players:      [user.uid, oppUid],
          playerNames:  { [user.uid]:myName,  [oppUid]:oppName  },
          playerPhotos: { [user.uid]:myPhoto, [oppUid]:oppPhoto },
          scores:       { [user.uid]:0, [oppUid]:0 },
          currentTurn:  oppUid, status:"waiting_for_answer",
          pendingLevel:ncLevel.pts, pendingName:ncLevel.name, pendingIcon:ncLevel.icon,
          pendingVerse: ncVerse, round:1,
          createdAt:serverTimestamp(), updatedAt:serverTimestamp(), createdBy:user.uid,
        });
        gameId = ref.id;
        gameData = {
          id:gameId, players:[user.uid,oppUid],
          playerNames:{[user.uid]:myName,[oppUid]:oppName},
          playerPhotos:{[user.uid]:myPhoto,[oppUid]:oppPhoto},
          scores:{[user.uid]:0,[oppUid]:0},
          currentTurn:oppUid, status:"waiting_for_answer",
          pendingLevel:ncLevel.pts, pendingName:ncLevel.name, pendingIcon:ncLevel.icon,
          pendingVerse:ncVerse, round:1,
        };
      }
      setCurrentGame(gameData);
      setCurrentGameId(gameId);
      setLastResult(null);

      // Send push to opponent
      let token = oppDoc.fcmToken;
      if (!token) {
        try {
          const oSnap = await getDoc(doc(db,"players",oppUid));
          if (oSnap.exists()) token = oSnap.data().fcmToken || null;
        } catch(e){}
      }
      if (token) {
        await sendPush(token, "⚔️ WhamBible Challenge!", `${myName} sent you a ${ncLevel.pts}pt ${ncLevel.name} challenge!`, gameId, myName);
      }
      showToast(`${ncLevel.icon} Challenge sent to ${oppName}!`);
      setScreen("round-result");
    } catch(e) {
      showToast("Error: " + e.message);
      console.error("createOrUpdateGame:", e);
    }
  }

  // ── Submit answer to Firestore ──
  async function submitAnswer(result) {
    if (!user || !currentGameId) return;
    const fb = await getFirebase();
    const { db, doc, getDoc, updateDoc, serverTimestamp } = fb;
    const { isCorrect, verse, pts } = result;
    const game     = currentGame;
    const myUid    = user.uid;
    const oppUid   = game.players.find(p=>p!==myUid);
    const earned   = isCorrect ? pts : 0;
    const newScore = (game.scores?.[myUid]||0) + earned;
    const oppScore = game.scores?.[oppUid]||0;
    const newRound = (game.round||1) + 1;
    const isComplete = newRound > TOTAL_ROUNDS;

    try {
      await updateDoc(doc(db,"games",currentGameId), {
        [`scores.${myUid}`]: newScore,
        currentTurn:  oppUid,
        status:       isComplete ? "complete" : "pick_level",
        pendingVerse: null, pendingLevel:null, pendingName:null, pendingIcon:null,
        round:        newRound,
        lastAnswer:   { uid:myUid, correct:isCorrect, earned, verse:`${verse.book} ${verse.chapter}:${verse.verse}` },
        updatedAt:    serverTimestamp(),
      });
      const updatedGame = { ...game, scores:{ ...game.scores, [myUid]:newScore }, currentTurn:oppUid, status:isComplete?"complete":"pick_level", round:newRound };
      setCurrentGame(updatedGame);
      setLastResult(result);

      // Update player stats
      try {
        const { getDoc: gd } = fb;
        const pSnap = await gd(doc(db,"players",myUid));
        if (pSnap.exists()) {
          const d = pSnap.data();
          await updateDoc(doc(db,"players",myUid), {
            score:       (d.score||0) + earned,
            streak:      isCorrect ? (d.streak||0)+1 : 0,
            lastSeen:    serverTimestamp(),
            ...(isComplete ? { gamesPlayed:(d.gamesPlayed||0)+1, ...(newScore>oppScore?{wins:(d.wins||0)+1}:{}) } : {}),
          });
        }
      } catch(e) { console.warn("stats:", e); }

      // Push opponent — their turn
      try {
        const oSnap = await getDoc(doc(db,"players",oppUid));
        if (oSnap.exists() && oSnap.data().fcmToken) {
          const myName = game.playerNames?.[myUid]||"Opponent";
          if (isComplete) {
            await sendPush(oSnap.data().fcmToken, "🏁 Battle Over!", `${myName} played their last answer!`, currentGameId, myName);
          } else {
            await sendPush(oSnap.data().fcmToken, "⚔️ Your turn to challenge!", `${myName} answered — now YOU pick the verse!`, currentGameId, myName);
          }
        }
      } catch(e) { console.warn("push opp:", e); }

      if (isComplete) { setScreen("complete"); }
      else            { setScreen("round-result"); }
    } catch(e) {
      showToast("Error: " + e.message);
      console.error("submitAnswer:", e);
    }
  }

  // ── Sign out ──
  async function handleSignOut() {
    const fb = await getFirebase();
    await fb.signOut(fb.auth);
    setUser(null); setActiveGames([]); setScreen("auth");
  }

  // ── Render ──
  if (screen === "loading") return (
    <div style={{ minHeight:"100vh",background:C.dark,display:"flex",alignItems:"center",justifyContent:"center" }}>
      <div style={{ fontFamily:"'Cinzel',serif",fontSize:14,color:C.goldDim,letterSpacing:2 }}>Loading…</div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh",background:C.dark,fontFamily:"'Georgia',serif",overflowX:"hidden",position:"relative" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800;900&display=swap');
        .ch-bg-land { position:fixed;inset:0;z-index:0;pointer-events:none;background-image:url('${LANDSCAPE_BG}');background-size:cover;background-position:center top;opacity:1; }
        .ch-bg-char { position:fixed;inset:0;z-index:1;pointer-events:none;background-size:90% auto;background-position:center 4%;background-repeat:no-repeat;opacity:1; }
        .ch-bg-dark { display:none; }
        .ch-bg-rim  { position:fixed;inset:0;z-index:3;pointer-events:none;background:radial-gradient(ellipse at 50% -5%,rgba(212,146,26,0.20) 0%,transparent 55%); }
        .ch-screen  { height:100vh;position:relative;overflow-y:hidden;overflow-x:hidden;overscroll-behavior:none; }
        .ch-content { position:relative;z-index:4;max-width:480px;margin:0 auto;padding:0 16px 140px;display:flex;flex-direction:column;align-items:center;width:100%; }
        .ch-panel   { width:100%;background:transparent;border-radius:20px 20px 0 0;padding:22px 18px 80px;margin-top:-28px;max-height:60vh;overflow-y:scroll;-webkit-overflow-scrolling:touch;scroll-snap-type:none;overscroll-behavior:contain; }
        .ch-auth-scroll { position:relative;z-index:4;width:100%;max-width:480px;margin:0 auto;padding:0 16px; }
        .ch-curl    { width:70%;height:4px;margin:0 auto 14px;border-radius:2px;background:linear-gradient(90deg,transparent,rgba(212,146,26,0.7),rgba(58,189,212,0.5),rgba(212,146,26,0.7),transparent); }
        .ch-title   { font-family:'Cinzel',serif;font-size:22px;font-weight:900;color:${C.gold};letter-spacing:2px;margin:0 0 4px;text-align:center; }
        .ch-sub     { font-size:14px;font-style:italic;color:rgba(240,228,192,0.5);margin:0;text-align:center; }
        .ch-label-tiny { font-family:'Cinzel',serif;font-size:10px;letter-spacing:3px;color:${C.goldDim};text-transform:uppercase;margin-bottom:6px;text-align:center; }
        .ch-section-label { font-family:'Cinzel',serif;font-size:10px;letter-spacing:2px;color:rgba(201,162,39,0.45);text-transform:uppercase;margin-bottom:10px; }
        .ch-pick-instruction { font-family:'Cinzel',serif;font-size:12px;color:rgba(201,162,39,0.6);text-align:center;margin-bottom:14px;letter-spacing:1px; }
        .ch-err { font-size:12px;color:${C.red};margin:8px 0;text-align:center;font-family:'Cinzel',serif; }

        /* Player banner */
        .ch-player-banner { display:flex;align-items:center;gap:12px;padding:12px 14px;background:rgba(201,162,39,0.07);border:1px solid rgba(201,162,39,0.2);border-radius:12px;margin-bottom:14px; }
        .ch-avatar { width:44px;height:44px;border-radius:50%;background:rgba(201,162,39,0.15);border:2px solid rgba(201,162,39,0.4);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;overflow:hidden; }
        .ch-player-info  { flex:1; }
        .ch-player-name  { font-family:'Cinzel',serif;font-size:14px;font-weight:700;color:#e2e8f0;margin-bottom:2px; }
        .ch-player-stats { font-size:12px;color:rgba(201,162,39,0.6); }
        .ch-rank-badge   { font-family:'Cinzel',serif;font-size:10px;padding:3px 10px;border-radius:20px;font-weight:700;letter-spacing:0.5px; }

        /* Active games */
        .ch-btn-challenge { width:100%;padding:14px;background:linear-gradient(135deg,${C.gold},#a07720);border:none;border-radius:12px;color:#0f172a;font-family:'Cinzel',serif;font-size:14px;font-weight:800;letter-spacing:2px;text-transform:uppercase;cursor:pointer;margin-bottom:16px;box-shadow:0 4px 20px rgba(212,146,26,0.35); }
        .ch-ag-section   { width:100%;margin-bottom:8px; }
        .ch-ag-header    { display:flex;align-items:center;justify-content:space-between;margin-bottom:10px; }
        .ch-ag-title     { font-family:'Cinzel',serif;font-size:11px;letter-spacing:2px;color:rgba(201,162,39,0.6);text-transform:uppercase; }
        .ch-ag-badge     { background:rgba(201,162,39,0.2);color:${C.gold};font-size:11px;font-family:'Cinzel',serif;padding:2px 10px;border-radius:20px;font-weight:700; }
        .ch-ag-empty     { text-align:center;padding:20px;color:rgba(255,255,255,0.35);font-size:13px; }
        .ch-ag-empty-hint{ font-size:11px;color:rgba(255,255,255,0.2);margin-top:4px; }
        .ch-ag-card      { display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:12px;cursor:pointer;border:1px solid rgba(201,162,39,0.15);background:rgba(201,162,39,0.04);transition:all 0.15s; }
        .ch-ag-card.your-turn { border-color:rgba(212,146,26,0.5);background:rgba(212,146,26,0.1); }
        .ch-ag-card.complete  { opacity:0.55; }
        .ch-ag-avatar { width:36px;height:36px;border-radius:50%;background:rgba(201,162,39,0.15);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0; }
        .ch-ag-body  { flex:1; }
        .ch-ag-opp   { font-family:'Cinzel',serif;font-size:13px;color:#e2e8f0;font-weight:700; }
        .ch-ag-turn  { font-size:11px;color:rgba(255,255,255,0.4);margin-top:2px; }
        .ch-ag-score { font-family:'Cinzel',serif;font-size:13px;color:${C.gold};font-weight:700;white-space:nowrap; }

        /* Level cards */
        .ch-level-card  { display:flex;align-items:center;gap:12px;padding:14px 16px;border-radius:12px;cursor:pointer;border:1px solid rgba(201,162,39,0.18);background:rgba(0,0,0,0.4);transition:all 0.18s;width:100%;text-align:left; }
        .ch-level-card.featured { border-color:${C.gold};background:rgba(212,146,26,0.1);box-shadow:0 0 18px rgba(212,146,26,0.2); }
        .ch-level-card:hover { transform:translateX(3px);border-color:${C.goldDim};background:rgba(201,162,39,0.1); }
        .ch-level-icon { font-size:26px;flex-shrink:0; }
        .ch-level-info { display:flex;flex-direction:column;gap:2px;flex:1; }
        .ch-level-title{ font-family:'Cinzel',serif;font-size:13px;font-weight:800;color:#e2e8f0;letter-spacing:1px; }
        .ch-level-sub  { font-size:11px;color:rgba(240,228,192,0.45); }
        .ch-level-pts  { display:flex;flex-direction:column;align-items:flex-end;flex-shrink:0; }
        .ch-level-pts-num   { font-family:'Cinzel',serif;font-size:22px;font-weight:900;color:${C.gold};line-height:1; }
        .ch-level-pts-label { font-family:'Cinzel',serif;font-size:9px;color:rgba(201,162,39,0.5);letter-spacing:1px; }

        /* VS Strip */
        .ch-vs-strip  { display:flex;align-items:center;width:100%;padding:12px 0;margin-bottom:16px; }
        .ch-vs-player { display:flex;flex-direction:column;align-items:center;flex:1;gap:2px; }
        .ch-vs-player.left  { align-items:flex-start; }
        .ch-vs-player.right { align-items:flex-end; }
        .ch-vs-name  { font-family:'Cinzel',serif;font-size:12px;color:rgba(240,228,192,0.7);letter-spacing:1px; }
        .ch-vs-score { font-family:'Cinzel',serif;font-size:24px;font-weight:900;color:${C.gold}; }
        .ch-vs-label { font-size:10px;color:rgba(201,162,39,0.4); }
        .ch-vs-mid   { display:flex;flex-direction:column;align-items:center;padding:0 14px; }
        .ch-vs-vs    { font-family:'Cinzel',serif;font-size:14px;font-weight:900;color:rgba(255,255,255,0.2); }
        .ch-vs-round { font-family:'Cinzel',serif;font-size:9px;color:rgba(201,162,39,0.4);letter-spacing:1px;margin-top:2px; }

        /* Turn banner */
        .ch-turn-banner { display:flex;align-items:center;gap:12px;padding:12px 14px;background:rgba(201,162,39,0.08);border:1px solid rgba(201,162,39,0.2);border-radius:12px;margin-bottom:14px; }
        .ch-turn-name   { font-family:'Cinzel',serif;font-size:14px;font-weight:700;color:${C.gold}; }
        .ch-turn-sub    { font-size:12px;color:rgba(240,228,192,0.5);margin-top:2px; }

        /* Verse grid */
        .ch-verse-grid { display:grid;grid-template-columns:repeat(5,1fr);grid-template-rows:1fr 1fr;gap:8px;margin-bottom:18px;width:100%; }
        .ch-vs-card    { padding:9px 5px;border-radius:10px;border:1px solid rgba(201,162,39,0.18);background:rgba(201,162,39,0.04);cursor:pointer;text-align:center;transition:all 0.15s; }
        .ch-vs-card:hover,.ch-vs-card.selected { border-color:${C.gold};background:rgba(212,146,26,0.14);transform:scale(1.03); }
        .ch-vs-ref { font-family:'Cinzel',serif;font-size:9px;color:${C.gold};line-height:1.4;font-weight:700; }

        /* Opponent rows */
        .ch-opp-row { display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;background:rgba(201,162,39,0.04);border:1px solid rgba(201,162,39,0.12); }
        .ch-opp-avatar { width:36px;height:36px;border-radius:50%;background:rgba(201,162,39,0.15);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0; }
        .ch-opp-info { flex:1; }
        .ch-opp-name { font-family:'Cinzel',serif;font-size:13px;color:#e2e8f0;font-weight:700; }
        .ch-opp-meta { font-size:11px;color:rgba(255,255,255,0.35); }
        .ch-opp-challenge-btn { padding:7px 12px;background:linear-gradient(135deg,${C.gold},#a07720);border:none;border-radius:8px;color:#0f172a;font-family:'Cinzel',serif;font-size:11px;font-weight:800;cursor:pointer;white-space:nowrap; }
        .ch-divider-or { display:flex;align-items:center;gap:10px;margin:14px 0; }
        .ch-divider-line { flex:1;height:1px;background:rgba(201,162,39,0.15); }
        .ch-divider-text { font-family:'Cinzel',serif;font-size:9px;color:rgba(201,162,39,0.35);letter-spacing:2px; }
        .ch-search-input { width:100%;padding:11px 14px;background:rgba(0,0,0,0.5);border:1px solid rgba(201,162,39,0.3);border-radius:10px;color:#e2e8f0;font-size:14px;outline:none;margin-bottom:10px;box-sizing:border-box;font-family:'Cinzel',serif; }
        .ch-search-input::placeholder { color:rgba(201,162,39,0.35); }
        .ch-empty-hint { font-size:13px;color:rgba(255,255,255,0.25);font-style:italic;text-align:center;padding:12px; }

        /* Accept challenge */
        .ch-ac-avatar    { width:72px;height:72px;border-radius:50%;background:rgba(201,162,39,0.15);border:2px solid rgba(201,162,39,0.4);display:flex;align-items:center;justify-content:center;font-size:34px;margin-bottom:14px;box-shadow:0 0 28px rgba(201,162,39,0.25); }
        .ch-ac-level-badge { display:inline-flex;align-items:center;gap:8px;background:rgba(201,162,39,0.12);border:1px solid rgba(201,162,39,0.35);border-radius:50px;padding:8px 20px;margin-bottom:22px; }
        .ch-ac-level-name{ font-family:'Cinzel',serif;font-size:14px;font-weight:800;color:${C.gold};letter-spacing:1px; }
        .ch-ac-pts       { font-family:'Cinzel',serif;font-size:14px;font-weight:700;color:#e2e8f0; }
        .ch-ac-verse-card{ background:rgba(201,162,39,0.05);border:1px solid rgba(201,162,39,0.15);border-radius:14px;padding:16px 20px;width:100%;max-width:340px;margin-bottom:28px; }
        .ch-ac-verse-text{ font-size:15px;font-style:italic;color:rgba(240,228,192,0.8);line-height:1.55;margin:0 0 10px; }
        .ch-ac-verse-ref { font-family:'Cinzel',serif;font-size:11px;font-weight:700;color:rgba(201,162,39,0.55);text-align:right; }
        .ch-verse-label  { font-family:'Cinzel',serif;font-size:9px;letter-spacing:2px;color:rgba(201,162,39,0.45);text-transform:uppercase;margin-bottom:8px; }

        /* Answer screen */
        .ch-answer-header{ display:flex;align-items:center;justify-content:space-between;margin-bottom:10px; }
        .ch-challenge-from { font-family:'Cinzel',serif;font-size:12px;color:rgba(201,162,39,0.7);letter-spacing:1px; }
        .ch-pts-badge    { background:rgba(212,146,26,0.2);color:${C.gold};padding:4px 12px;border-radius:20px;font-family:'Cinzel',serif;font-size:12px;font-weight:800; }
        .ch-timer-bar-wrap{ width:100%;height:5px;background:rgba(255,255,255,0.08);border-radius:3px;overflow:hidden;margin-bottom:14px; }
        .ch-timer-bar    { height:100%;border-radius:3px;transition:width 0.1s linear,background 0.5s; }
        .ch-verse-card   { background:rgba(201,162,39,0.05);border:1px solid rgba(201,162,39,0.18);border-radius:14px;padding:16px 20px;margin-bottom:14px;text-align:center; }
        .ch-verse-ornament{ font-size:10px;color:rgba(201,162,39,0.35);letter-spacing:8px;margin:6px 0; }
        .ch-verse-body   { font-size:14px;line-height:1.7;color:rgba(240,228,192,0.85);font-style:italic;margin:0; }
        .ch-verse-where  { font-family:'Cinzel',serif;font-size:10px;letter-spacing:2px;color:rgba(201,162,39,0.5);text-transform:uppercase;margin-top:10px; }
        .ch-papa-hint    { width:100%;background:rgba(26,58,92,0.12);border:1px solid rgba(58,189,212,0.3);border-radius:10px;padding:10px 14px;margin-bottom:10px;font-family:'Cinzel',serif;font-size:11px;color:rgba(240,228,192,0.8);letter-spacing:0.5px;animation:chHintIn 0.4s ease; }
        .ch-choices-label{ font-family:'Cinzel',serif;font-size:10px;letter-spacing:2px;color:rgba(201,162,39,0.45);text-transform:uppercase;text-align:center;margin-bottom:10px; }
        .ch-choice-btn   { display:flex;align-items:center;gap:12px;width:100%;padding:12px 14px;border-radius:10px;cursor:pointer;border:1px solid rgba(201,162,39,0.15);background:rgba(0,0,0,0.45);color:#e2e8f0;text-align:left;transition:all 0.15s; }
        .ch-choice-btn:hover:not(:disabled){ border-color:rgba(201,162,39,0.4);background:rgba(201,162,39,0.08); }
        .ch-choice-btn.correct{ border-color:${C.teal};background:rgba(30,122,140,0.18);box-shadow:0 0 14px rgba(30,122,140,0.3); }
        .ch-choice-btn.wrong  { border-color:${C.red};background:rgba(192,58,43,0.12); }
        .ch-choice-btn:disabled{ cursor:default; }
        .ch-choice-letter{ font-family:'Cinzel',serif;font-size:14px;font-weight:800;opacity:0.5;min-width:18px;color:${C.gold}; }
        .ch-choice-text  { display:flex;flex-direction:column;gap:2px; }
        .ch-choice-book  { font-family:'Cinzel',serif;font-size:13px;font-weight:700;color:#e2e8f0; }
        .ch-choice-ref   { font-size:11px;color:rgba(240,228,192,0.45); }
        .ch-feedback-bar { width:100%;padding:10px 14px;border-radius:10px;text-align:center;font-family:'Cinzel',serif;font-size:13px;font-weight:700;letter-spacing:1px;margin-bottom:10px; }
        .ch-feedback-bar.correct{ background:rgba(30,122,140,0.18);color:${C.teal};border:1px solid rgba(30,122,140,0.4); }
        .ch-feedback-bar.wrong  { background:rgba(192,58,43,0.12);color:${C.red};border:1px solid rgba(192,58,43,0.3); }

        /* Round result */
        .ch-round-result-card { width:100%;display:flex;flex-direction:column;align-items:center;text-align:center;padding-bottom:24px; }
        .ch-verse-ref-small   { font-family:'Cinzel',serif;font-size:12px;color:${C.gold};margin-bottom:6px; }
        .ch-verse-body-small  { font-size:13px;font-style:italic;color:rgba(240,228,192,0.6);line-height:1.6;margin:0 0 14px; }
        .ch-share-wrap  { width:100%;padding:14px 16px;background:rgba(201,162,39,0.06);border:1px solid rgba(201,162,39,0.2);border-radius:12px;margin:14px 0; }
        .ch-share-label { font-family:'Cinzel',serif;font-size:10px;letter-spacing:2px;color:rgba(201,162,39,0.5);text-transform:uppercase;margin-bottom:8px; }
        .ch-share-code  { font-family:'Cinzel',serif;font-size:22px;font-weight:900;color:${C.gold};letter-spacing:4px;cursor:pointer; }
        .ch-share-hint  { font-size:11px;color:rgba(201,162,39,0.35);margin-top:4px; }

        /* Game complete */
        .ch-gc-trophy  { font-size:72px;margin-bottom:10px;animation:chTrophyPop 0.5s cubic-bezier(0.34,1.56,0.64,1); }
        .ch-gc-result-banner { font-family:'Cinzel',serif;font-size:16px;font-weight:900;letter-spacing:3px;padding:10px 28px;border-radius:50px;margin:12px auto;display:inline-block; }
        .ch-gc-result-banner.win  { background:rgba(212,146,26,0.2);color:${C.gold};border:1.5px solid ${C.gold}; }
        .ch-gc-result-banner.draw { background:rgba(58,189,212,0.15);color:${C.tealLight};border:1.5px solid ${C.tealLight}; }
        .ch-gc-result-banner.loss { background:rgba(192,58,43,0.15);color:${C.red};border:1.5px solid ${C.red}; }
        .ch-gc-scoreboard{ display:flex;align-items:center;justify-content:center;gap:20px;margin:18px 0; }
        .ch-gc-player    { display:flex;flex-direction:column;align-items:center;gap:4px; }
        .ch-gc-avatar    { font-size:28px; }
        .ch-gc-name      { font-family:'Cinzel',serif;font-size:12px;color:rgba(240,228,192,0.7); }
        .ch-gc-score     { font-family:'Cinzel',serif;font-size:32px;font-weight:900;color:${C.gold}; }
        .ch-gc-vs        { font-family:'Cinzel',serif;font-size:16px;color:rgba(255,255,255,0.2);font-weight:900; }
        .ch-gc-stats     { display:flex;gap:12px;justify-content:center;margin-bottom:22px; }
        .ch-gc-stat      { background:rgba(201,162,39,0.07);border:1px solid rgba(201,162,39,0.18);border-radius:12px;padding:12px 18px;text-align:center; }
        .ch-gc-stat-val  { font-family:'Cinzel',serif;font-size:20px;font-weight:900;color:${C.gold}; }
        .ch-gc-stat-lbl  { font-size:10px;color:rgba(201,162,39,0.45);margin-top:4px;letter-spacing:1px; }

        /* Buttons */
        .ch-btn-primary   { width:100%;padding:14px;background:linear-gradient(135deg,${C.gold},#a07720);border:none;border-radius:12px;color:#0f172a;font-family:'Cinzel',serif;font-size:14px;font-weight:800;letter-spacing:2px;text-transform:uppercase;cursor:pointer;transition:all 0.18s;box-shadow:0 4px 18px rgba(212,146,26,0.35); }
        .ch-btn-primary:hover { transform:translateY(-2px);box-shadow:0 7px 26px rgba(212,146,26,0.5); }
        .ch-btn-primary:disabled { opacity:0.55;cursor:not-allowed;transform:none; }
        .ch-btn-secondary { width:100%;padding:13px;background:${C.teal};border:none;border-radius:12px;color:#fff;font-family:'Cinzel',serif;font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;cursor:pointer;transition:all 0.18s; }
        .ch-btn-ghost     { width:100%;padding:11px 20px;background:transparent;border:1px solid rgba(201,162,39,0.25);border-radius:10px;color:rgba(201,162,39,0.65);font-family:'Cinzel',serif;font-size:12px;letter-spacing:1px;text-transform:uppercase;cursor:pointer;transition:all 0.15s; }
        .ch-btn-ghost:hover { background:rgba(201,162,39,0.08);color:${C.gold}; }
        .ch-btn-google    { width:100%;padding:13px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.2);border-radius:12px;color:#e2e8f0;font-family:'Cinzel',serif;font-size:13px;font-weight:700;letter-spacing:1px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;transition:all 0.15s;margin-bottom:6px; }
        .ch-btn-google:hover { background:rgba(255,255,255,0.14); }

        @keyframes chHintIn    { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
        @keyframes chTrophyPop { from{transform:scale(0.4);opacity:0} to{transform:scale(1);opacity:1} }
      `}</style>

      <Toast msg={toast} />

      {/* ── AUTH ── */}
      {screen === "auth" && (
        <ScreenAuthGate
          onSignIn={() => {}}
          onGuest={() => window.location.href = "/"}
        />
      )}

      {/* ── LOBBY ── */}
      {screen === "lobby" && user && (
        <ScreenLobby
          user={user}
          playerData={playerData}
          activeGames={activeGames}
          onNewChallenge={async () => {
            setNcLevel(null); setNcVerse(null); setCurrentGame(null); setCurrentGameId(null);
            setScreen("pick-level-new");
          }}
          onOpenGame={(g) => openGame(g, user.uid)}
          onSignOut={handleSignOut}
        />
      )}

      {/* ── PICK LEVEL (new game) ── */}
      {screen === "pick-level-new" && (
        <ScreenPickLevel
          isRound={false}
          suggestPts={suggestedLevel(playerData?.score||0)}
          onPick={(lv) => { setNcLevel(lv); setScreen("verse-stack"); }}
          onBack={() => setScreen("lobby")}
        />
      )}

      {/* ── PICK LEVEL (round within existing game) ── */}
      {screen === "pick-level-round" && currentGame && (
        <ScreenPickLevel
          isRound={true}
          game={currentGame}
          myUid={user?.uid}
          suggestPts={suggestedLevel(playerData?.score||0)}
          onPick={(lv) => { setNcLevel(lv); setScreen("verse-stack"); }}
          onBack={() => setScreen("lobby")}
        />
      )}

      {/* ── VERSE STACK ── */}
      {screen === "verse-stack" && ncLevel && (
        <ScreenVerseStack
          level={ncLevel}
          onPick={(v) => {
            setNcVerse(v);
            if (currentGame && currentGameId) {
              // Existing game round — skip challenger select
              setScreen("select-challenger-existing");
            } else {
              loadRecentOpps();
              setScreen("select-challenger");
            }
          }}
          onBack={() => setScreen(currentGame ? "pick-level-round" : "pick-level-new")}
        />
      )}

      {/* ── SELECT CHALLENGER (new game) ── */}
      {screen === "select-challenger" && (
        <ScreenSelectChallenger
          myUid={user?.uid}
          recentOpps={recentOpps}
          onChallenge={async (opp) => {
            await createOrUpdateGame(opp);
          }}
          onBack={() => setScreen("verse-stack")}
        />
      )}

      {/* ── SELECT CHALLENGER (existing game — opponent pre-set) ── */}
      {screen === "select-challenger-existing" && currentGame && (
        (() => {
          const oppUid = currentGame.players?.find(p=>p!==user?.uid);
          const oppDoc = { id:oppUid, displayName:currentGame.playerNames?.[oppUid]||"Opponent", photoURL:currentGame.playerPhotos?.[oppUid]||"", fcmToken:null };
          createOrUpdateGame(oppDoc);
          return <div style={{ minHeight:"100vh",background:C.dark,display:"flex",alignItems:"center",justifyContent:"center" }}><div style={{ fontFamily:"'Cinzel',serif",fontSize:14,color:C.goldDim,letterSpacing:2 }}>Sending challenge…</div></div>;
        })()
      )}

      {/* ── ACCEPT CHALLENGE ── */}
      {screen === "accept" && currentGame && (
        <ScreenAcceptChallenge
          game={currentGame}
          myUid={user?.uid}
          onAccept={() => setScreen("answer")}
          onDecline={() => setScreen("lobby")}
        />
      )}

      {/* ── ANSWER ── */}
      {screen === "answer" && currentGame && (
        <ScreenAnswer
          game={currentGame}
          myUid={user?.uid}
          onResult={submitAnswer}
        />
      )}

      {/* ── ROUND RESULT ── */}
      {screen === "round-result" && currentGame && (
        <ScreenRoundResult
          game={currentGame}
          myUid={user?.uid}
          lastResult={lastResult}
          gameCode={currentGameId}
          onNext={() => setScreen("lobby")}
        />
      )}

      {/* ── GAME COMPLETE ── */}
      {screen === "complete" && currentGame && (
        <ScreenGameComplete
          game={currentGame}
          myUid={user?.uid}
          onNewBattle={() => { setCurrentGame(null); setCurrentGameId(null); setScreen("lobby"); }}
          onHome={() => window.location.href = "/"}
        />
      )}
    </div>
  );
}
