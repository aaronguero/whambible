# WhamBible Session — April 20, 2026
## Tonight's Build List (ordered for efficiency)

### VISUAL POLISH
- [ ] 1. WHAM SLAM — Cinzel font + gold gradient + cinematic underlay (not pink/purple)
- [ ] 2. Verse cards — reduce opacity so landscape bleeds through
- [ ] 3. Recovery screen — cinematic theme overhaul (cobalt/gold, Cinzel headers)

### GAME FLOW FIXES
- [ ] 4. Recovery flow — full SP loop verified on device
- [ ] 5. Streak bonus — display correct, timing clean, visual feedback sharp
- [ ] 6. Answer flow transition — smooth entry from WHAM SLAM into reveal card
- [ ] 7. Answer screen back button — replace browser confirm() with styled in-game modal

### ALREADY STAGED (include in final push)
- [x] Menu dropdown CSS class toggle fix (commit dec736faf2)
- [x] SP flow: WHAM SLAM→showResult, nextVerse guard, retIndex→showResult

### MISSING / ADDED BY CREATOR
- [ ] 8. Timer bar — verify it resets cleanly between verses (no ghost timer)
- [ ] 9. Progress dots — confirm correct/wrong/recovered colors are visible on cinematic bg
- [ ] 10. Level select screen — confirm rank pre-highlight renders on cinematic bg (gold card visible)
- [ ] 11. Game over screen — cinematic theme check (currently may still be dark/old palette)
- [ ] 12. Recovery screen — snap-to-correct animation on wrong answer (verify it works)
- [ ] 13. Papa character — verify hint fires at correct thresholds in SP
- [ ] 14. HUD back button — replace "← Exit" text with styled icon button (consistent with new design)

### FINAL PUSH
- [ ] 15. Unlock Netlify deploy
- [ ] 16. Single push all changes to GitHub root
- [ ] 17. Verify live on whambible.com after deploy
- [ ] 18. iPhone review pass — Aaron confirms each screen

---
*This file is the ground truth for tonight. Check off as we go.*
