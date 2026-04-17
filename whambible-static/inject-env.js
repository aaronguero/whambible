// Netlify build script — injects environment variables into HTML/JS files
// Run automatically before deploy via netlify.toml build command
const fs   = require('fs');
const path = require('path');

const replacements = {
  '%%FIREBASE_API_KEY%%': process.env.FIREBASE_API_KEY || '',
};

const targets = [
  'game.html',
  'index.html',
  'challenge.html',
  'recovery.html',
  'firebase-messaging-sw.js',
];

let ok = true;
targets.forEach(file => {
  const fp      = path.join(__dirname, file);
  let   content = fs.readFileSync(fp, 'utf8');
  Object.entries(replacements).forEach(([placeholder, value]) => {
    if (!value) {
      console.error(`❌ ENV missing for ${placeholder} — set it in Netlify dashboard`);
      ok = false;
    }
    content = content.split(placeholder).join(value);
  });
  fs.writeFileSync(fp, content);
  console.log(`✅ Injected: ${file}`);
});

if (!ok) process.exit(1);
