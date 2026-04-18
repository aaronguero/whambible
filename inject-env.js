// Netlify build script — injects environment variables into HTML/JS files
const fs   = require('fs');
const path = require('path');

const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || 'AIzaSyAb5sxWjKHYkKHiou8CnXYrMweaS6P8rIE';

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
  const fp      = path.join(__dirname, file);
  if (!fs.existsSync(fp)) return;
  let   content = fs.readFileSync(fp, 'utf8');
  Object.entries(replacements).forEach(([placeholder, value]) => {
    content = content.split(placeholder).join(value);
  });
  fs.writeFileSync(fp, content);
  console.log(`✅ Injected: ${file}`);
});

console.log('✅ Build complete');
process.exit(0);
