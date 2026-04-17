# Deployment Checkpoint

## Last deployed: April 17, 2026
- Firebase API key moved to env var (FIREBASE_API_KEY in Netlify)
- inject-env.js build script in place
- Button shading fix (iOS Safari -webkit-appearance)

## Still to build / known bugs
- [ ] Menu button — not fully wired
- [ ] Multiplayer flow — needs full Firebase testing
- [ ] Push notifications — FCM wiring needs live test
- [ ] Language selection — translation API keys not set
- [ ] Papa character / audio
- [ ] Screen transitions polish

## To redeploy
1. Push changes to GitHub (auto-triggers Netlify)
2. Or: app.netlify.com/sites/whambible/deploys → Trigger deploy

## Env vars required in Netlify
- FIREBASE_API_KEY ✅ set

## 🚩 Side Notes / Flags for Later
- [ ] Google API key restrictions: add *.whambible.com/* in Google Cloud Console (currently only *.whambible.org/* and *.netlify.app/*)
