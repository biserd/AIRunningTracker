// scripts/generate-icons.js
// Generates the 16/48/128 PNG icons used by the Chrome extension.
// Run: node scripts/generate-icons.js
// Requires the `canvas` package (only used by this build script, not bundled
// with the extension itself): npm install --no-save canvas

const fs = require('fs');
const path = require('path');

let createCanvas;
try {
  ({ createCanvas } = require('canvas'));
} catch (err) {
  console.error(
    "The `canvas` package isn't installed. Install it one-time with:\n" +
    "  npm install --no-save canvas\n" +
    "Then re-run: node scripts/generate-icons.js"
  );
  process.exit(1);
}

const sizes = [16, 48, 128];
const outputDir = path.join(__dirname, '..', 'extension', 'icons');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

sizes.forEach((size) => {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Orange background with rounded corners
  const radius = size * 0.2;
  ctx.fillStyle = '#FC4C02';
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(size - radius, 0);
  ctx.quadraticCurveTo(size, 0, size, radius);
  ctx.lineTo(size, size - radius);
  ctx.quadraticCurveTo(size, size, size - radius, size);
  ctx.lineTo(radius, size);
  ctx.quadraticCurveTo(0, size, 0, size - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();
  ctx.fill();

  // White lightning bolt ⚡
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold ${Math.round(size * 0.6)}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('⚡', size / 2, size / 2 + size * 0.04);

  const buffer = canvas.toBuffer('image/png');
  const outputPath = path.join(outputDir, `icon${size}.png`);
  fs.writeFileSync(outputPath, buffer);
  console.log(`Generated: ${outputPath}`);
});

console.log('Icons generated successfully.');
