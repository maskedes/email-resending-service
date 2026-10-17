const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const pub = path.join(__dirname, '..', 'public');
const out = path.join(pub, 'google-oauth-logo.png');

(async () => {
  // 1. Render SVG at high res on white.
  const rendered = await sharp(path.join(pub, 'logo.svg'), { density: 300 })
    .flatten({ background: '#ffffff' })
    .png()
    .toBuffer();
  const meta = await sharp(rendered).metadata();

  // 2. Scan raw pixels for the non-white bounding box.
  const { data, info } = await sharp(rendered).raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  let minX = width, minY = height, maxX = 0, maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      if (data[i] < 245 || data[i + 1] < 245 || data[i + 2] < 245) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  const bw = maxX - minX + 1, bh = maxY - minY + 1;
  const pad = Math.round(Math.max(bw, bh) * 0.06);

  // 3. Extract, pad to a centered square, output 512x512 PNG.
  const side = Math.max(bw, bh) + pad * 2;
  await sharp(rendered)
    .extract({
      left: Math.max(0, minX - pad),
      top: Math.max(0, minY - pad),
      width: Math.min(width, bw + pad * 2),
      height: Math.min(height, bh + pad * 2),
    })
    .resize(side, side, { fit: 'contain', position: 'centre', background: '#ffffff' })
    .extend({
      top: 0, bottom: 0, left: 0, right: 0,
      background: '#ffffff',
    })
    .resize(512, 512, { fit: 'fill', kernel: 'lanczos3' })
    .png()
    .toFile(out);

  const m = await sharp(out).metadata();
  console.log('written', out, m.width + 'x' + m.height, Math.round(fs.statSync(out).size / 1024) + 'KB');
})();
