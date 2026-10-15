import { URL, fileURLToPath } from 'node:url';
import sharp from 'sharp';

const PUBLIC_DIR = new URL('../public/', import.meta.url);
const RENDER_DENSITY = 288;

const ICONS = [
  { source: 'icon.svg', output: 'icon-192.png', size: 192 },
  { source: 'icon.svg', output: 'icon-512.png', size: 512 },
  { source: 'icon-maskable.svg', output: 'icon-maskable-512.png', size: 512 },
  { source: 'icon-maskable.svg', output: 'apple-touch-icon.png', size: 180 },
];

function publicPath(name) {
  return fileURLToPath(new URL(name, PUBLIC_DIR));
}

function render({ source, output, size }) {
  return sharp(publicPath(source), { density: RENDER_DENSITY })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(publicPath(output));
}

await Promise.all(ICONS.map(render));
