# WhamBible — Base44 Preview Backup
**Date:** April 21, 2026
**Source:** wham-bible.base44.app (Base44 preview environment)

## Files
- pages/Home.jsx        — Home screen (language select, verse of day, play/challenge/donate buttons)
- pages/SoloGame.jsx    — Solo game loop (level select, answer screen, WHAM SLAM, hints)
- pages/Challenge.jsx   — Multiplayer (Firebase Auth + Firestore + FCM push notifications)
- pages/Recovery.jsx    — Recovery scroll wheel mechanic (momentum physics, snap-to-center)
- functions/sendPushNotification.ts — Base44 backend function for FCM push

## Stack
- React JSX (inline styles, no external CSS framework)
- Firebase Auth + Firestore (project: wham-bible)
- FCM push notifications via Base44 backend function
- Cinzel typography (Google Fonts)
- Cinematic cobalt/teal/gold palette

## Assets (hosted on Base44 CDN)
- Landscape BG: https://media.base44.com/images/public/69df9a909b33058a5ce47831/33b065c94_generated_image.png
- Logo overlay: https://media.base44.com/images/public/69df9a909b33058a5ce47831/1caa728f7_generated_image.png
- Solo char:    https://media.base44.com/images/public/69df9a909b33058a5ce47831/b23c98cb8_generated_image.png
- Gameover char:https://media.base44.com/images/public/69df9a909b33058a5ce47831/c5aa4771c_generated_image.png
- Prayer char:  https://media.base44.com/images/public/69df9a909b33058a5ce47831/a21cde22c_generated_image.png
- Recovery char:https://media.base44.com/images/public/69df9a909b33058a5ce47831/833513c9d_generated_image.png
- MP char:      https://media.base44.com/images/public/69df9a909b33058a5ce47831/10c016255_generated_image.png
- WHAM audio:   https://media.base44.com/videos/public/69c40c6701d9dfdb1df69d2b/5d143ab80_51a54c36d_wham-slam-voice1.webm
