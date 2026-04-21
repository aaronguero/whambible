// Netlify build script — injects environment variables into HTML/JS files
const fs   = require('fs');
const path = require('path');

const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || '';

// Debug: print whether the key was found (never prints the actual key)
console.log('FIREBASE_API_KEY present:', FIREBASE_API_KEY.length > 0 ? 'YES ✅' : 'NO ❌ — check Netlify env vars');

const replacements = {
  '%%FIREBASE_API_KEY%%': FIREBASE_API_KEY,
};

const targets = [
  'game.html',
  'index.html',
  'challenge.html',
  'recovery.html',
  'firebase-messaging-sw.js',
];

targets.forEach(file => {
  const fp = path.join(__dirname, file);
  if (!fs.existsSync(fp)) { console.warn(`Warning: Skipping missing file: ${file}`); return; }
  let content = fs.readFileSync(fp, 'utf8');
  Object.entries(replacements).forEach(([placeholder, value]) => {
    if (!value) console.warn(`Warning: ENV missing for ${placeholder} in ${file}`);
    content = content.split(placeholder).join(value);
  });
  fs.writeFileSync(fp, content);
  console.log(`Injected: ${file}`);
});
console.log('Build complete');
