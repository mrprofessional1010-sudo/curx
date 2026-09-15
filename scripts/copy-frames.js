const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'frames');
const heroDir = path.join(__dirname, '..', 'public', 'curx', 'hero');
const publicFramesDir = path.join(__dirname, '..', 'public', 'frames');

fs.mkdirSync(heroDir, { recursive: true });
fs.mkdirSync(publicFramesDir, { recursive: true });

for (let i = 1; i <= 240; i++) {
  const d3 = String(i).padStart(3, '0');
  const d4 = String(i).padStart(4, '0');
  const srcFile = path.join(srcDir, `ezgif-frame-${d3}.jpg`);

  if (fs.existsSync(srcFile)) {
    // Copy as public/frames/ezgif-frame-001.jpg
    fs.copyFileSync(srcFile, path.join(publicFramesDir, `ezgif-frame-${d3}.jpg`));
    // Also as public/curx/hero/frame-0001.webp or jpg
    fs.copyFileSync(srcFile, path.join(heroDir, `frame-${d4}.jpg`));
    fs.copyFileSync(srcFile, path.join(heroDir, `frame-${d4}.webp`)); // duplicate as webp alias if searched
  }
}

console.log('Successfully copied all 240 frames to public directories.');
