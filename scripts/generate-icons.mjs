import sharp from 'sharp';
import { writeFileSync } from 'fs';

// SVG: Three family figures forming a T, connected by linking arms
// Centre figure is taller (forms the T stem), all three linked (forms the crossbar)
const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <!-- Background -->
  <rect width="512" height="512" rx="100" fill="#1e40af"/>

  <!-- Warm radial glow from centre -->
  <radialGradient id="glow" cx="50%" cy="55%" r="55%">
    <stop offset="0%" stop-color="#3b82f6"/>
    <stop offset="100%" stop-color="#1e3a8a"/>
  </radialGradient>
  <rect width="512" height="512" rx="100" fill="url(#glow)"/>

  <!-- Left figure: head + body -->
  <circle cx="126" cy="188" r="38" fill="white" opacity="0.92"/>
  <rect x="102" y="228" width="48" height="72" rx="16" fill="white" opacity="0.92"/>

  <!-- Right figure: head + body -->
  <circle cx="386" cy="188" r="38" fill="white" opacity="0.92"/>
  <rect x="362" y="228" width="48" height="72" rx="16" fill="white" opacity="0.92"/>

  <!-- Centre figure: head + tall stem (forms T vertical) -->
  <circle cx="256" cy="155" r="48" fill="white"/>
  <rect x="228" y="206" width="56" height="210" rx="18" fill="white"/>

  <!-- Linking arms / T crossbar -->
  <rect x="102" y="252" width="308" height="36" rx="18" fill="white" opacity="0.88"/>

  <!-- Warm heart at the base, symbol of togetherness -->
  <text x="256" y="455" font-size="68" text-anchor="middle" fill="#fde68a">♥</text>
</svg>
`.trim();

const svgBuffer = Buffer.from(svg);

async function generate() {
  await sharp(svgBuffer).resize(512, 512).png().toFile('public/icon-512.png');
  console.log('✓ icon-512.png');

  await sharp(svgBuffer).resize(192, 192).png().toFile('public/icon-192.png');
  console.log('✓ icon-192.png');
}

generate().catch(err => { console.error(err); process.exit(1); });
