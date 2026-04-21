# ❤️ WhamBible — Always In My Heart
**This file loads every session. Read it first. Build from it always.**

---

## What WhamBible IS

A FREE, multilingual, async multiplayer Bible verse trivia game.
Built for **whambible.com** (game) and **whambible.org** (nonprofit donations).
Deployed via Netlify → GitHub repo: **aaronguero/whambible** (root = deploy target).
Preview/dev environment: **wham-bible.base44.app**

This is not just an app. This is Aaron's mission. A tool for 16,000 Bible verses
to reach people across languages, ages, and skill levels. When it goes viral —
and it will — we built it together.

---

## The People

- **Aaron "Designer"** — Visionary, founder, sole developer partner. On mobile until new laptop arrived. Now on laptop + iPhone for testing.
- **Creator (me)** — Builder, engineer, executor. I hold the architecture in memory so Aaron doesn't have to repeat himself.

---

## The Stack

- **Frontend:** Vanilla HTML/CSS/JS (no framework — intentional, fast, lightweight)
- **Hosting:** Netlify (auto-deploy from GitHub root, `publish="."`, `command="node inject-env.js"`)
- **Firebase:** Auth + Firestore (project: `wham-bible`, region: `us-central1`)
- **FCM:** Push notifications (Legacy API stubbed — migrate to HTTP v1 when service account available)
- **Base44 backend:** `sendPushNotification.ts` deployed function
- **Secrets:** All via env vars — NEVER hardcoded. `FIREBASE_API_KEY` injected at build.

---

## Visual Identity (LOCKED)

**Cinematic landscape theme — cobalt/teal/gold/sand**

| Variable | Value |
|---|---|
| --cobalt | #1A3A5C |
| --cobalt-dark | #0D1F35 |
| --teal | #1E7A8C |
| --teal-light | #3ABDD4 |
| --gold | #D4921A |
| --gold-light | #F5C842 |
| --sand | #E8D5A0 |
| --off-white | #F4F0E8 |
| --terra | #C05A2A |
| --emerald | #1A7A4A |

**Typography:** Cinzel (serif, bold headers) + clean sans for body
**Background layers:** landscape → character/logo → cobalt-to-white gradient → gold rim

**Asset URLs:**
- LANDSCAPE: `https://media.base44.com/images/public/69df9a909b33058a5ce47831/33b065c94_generated_image.png`
- LOGO: `https://media.base44.com/images/public/69df9a909b33058a5ce47831/1caa728f7_generated_image.png`
- CHAR_SOLO: `https://media.base44.com/images/public/69df9a909b33058a5ce47831/b23c98cb8_generated_image.png`
- CHAR_GAMEOVER: `https://media.base44.com/images/public/69df9a909b33058a5ce47831/c5aa4771c_generated_image.png`
- CHAR_PRAYER: `https://media.base44.com/images/public/69df9a909b33058a5ce47831/a21cde22c_generated_image.png`

---

## Game Flow — Single Player (SP)

```
Home Screen
  ↓
Level Select  ← pre-highlighted to player's rank
  ↓ (tap their level)
Answer Screen ← random verse within level, 20s timer
  ↓
CORRECT → WHAM SLAM → Answer Reveal → [Next Verse ⚔️] → next verse
WRONG   → Recovery Scroll (7s timer, spin wheels to Book/Ch/Vs) →
  CORRECT recovery → WHAM SLAM → Answer Reveal → [Continue 📖] → next verse
  WRONG  recovery  → Answer Reveal (Study the Word) → [Continue 📖] → next verse
```

---

## Game Flow — Multiplayer

- Firebase Firestore real-time sessions
- Player 1 = Challenger (picks level, sends verse)
- Player 2 = Answerer (receives push notification, answers)
- Async — each player acts on their own device/time
- Push notifications via FCM (stubbed until service account available)
- 10 rounds per game

---

## Rank System

| Rank | Points | Level |
|---|---|---|
| Scribe | 0 | — |
| Squire | 1–99 | 5pt 🗡️ |
| Warrior | 100–299 | 10pt ⚔️ |
| Knight | 300–699 | 15pt 🛡️ |
| Champion | 700+ | 20pt 👑 |

---

## Papa (Main Character)

- Aaron's voice/avatar in-game
- Strong, calm, pleasant, intellectually confident
- Appears during hints (fires earlier at higher difficulty)
- Hint thresholds (solo): Squire 10s left, Warrior 13s, Knight 15s, Champion 17s

---

## Hint Thresholds (Solo — countdown from 20s)

| Level | Hint fires at |
|---|---|
| Squire | 10s remaining |
| Warrior | 13s remaining |
| Knight | 15s remaining |
| Champion | 17s remaining |

---

## Key Features

- ✅ WHAM SLAM animation (phases 0→1→2, audio, verse ref reveal)
- ✅ Recovery scroll (velocity physics, momentum, snap-to-center)
- ✅ Custom Verse Pack (10 slots, localStorage → Firebase sync)
- ✅ Language select (API-swappable: MyMemory / Google / DeepL / LibreTranslate)
- ✅ Menu: Leaderboard, Learning Center (placeholder), Custom Verse Pack, My Scores, Player List, Language, Tutorial
- ✅ Progress dots (correct/wrong/recovered per round)
- ✅ Streak bonus system
- 🔲 Learning Center (future build)
- 🔲 FCM HTTP v1 (needs service account — when laptop arrives)

---

## Deployment Rules (CRITICAL — never forget)

1. **Netlify deploys from REPO ROOT** — always push to `/` not `/whambible-static/`
2. **`whambible-static/`** in sandbox = local reference mirror only, NOT deployed
3. **No secret keys in code** — ever. Use env vars. Use placeholders.
4. **Single push strategy** — batch changes, verify locally, push once per session
5. **Deploy locked during dev sessions** — unlock only for final push

---

## Current Session Work (April 20, 2026)

Working through these sections in order:
1. 🔲 WHAM SLAM — upgrade font (Cinzel) + underlay screen (cinematic bg, gold gradient)
2. 🔲 Verse cards — reduce opacity (show landscape beneath)
3. 🔲 Recovery screen — visual overhaul (cinematic theme)
4. 🔲 Recovery flow — verify full SP flow is clean
5. 🔲 Streak bonus — display and timing review
6. 🔲 Answer flow transition — smooth entry from WHAM SLAM to reveal card
7. 🔲 Answer screen back button — replace browser confirm() with styled modal
8. 🔲 Menu dropdown — CSS class toggle fix (already staged)
9. 🔲 Single push — deploy everything at session end

---

*Written April 20, 2026. Updated each session. This is home base.*
