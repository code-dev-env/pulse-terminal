// Run with: npx electron build/make-icon.js  -> writes build/icon.ico and src/icon.png
const { app, BrowserWindow, nativeImage } = require('electron');
const fs = require('fs');
const path = require('path');

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#34343a"/><stop offset="1" stop-color="#16161a"/></linearGradient>
    <linearGradient id="or" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffa14a"/><stop offset="1" stop-color="#ff6a2b"/></linearGradient>
  </defs>
  <rect x="10" y="10" width="236" height="236" rx="56" fill="url(#bg)" stroke="#4a4a52" stroke-width="3"/>
  <path d="M82 88 L128 128 L82 168" fill="none" stroke="url(#or)" stroke-width="24" stroke-linecap="round" stroke-linejoin="round"/>
  <rect x="140" y="156" width="56" height="22" rx="11" fill="url(#or)"/>
</svg>`;

app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 256, height: 256, show: false, transparent: true, frame: false, useContentSize: true,
    webPreferences: { offscreen: true } });
  await win.loadURL('data:text/html,' + encodeURIComponent(`<body style="margin:0;background:transparent">${SVG}</body>`));
  await new Promise((r) => setTimeout(r, 400));
  const img = await win.webContents.capturePage({ x: 0, y: 0, width: 256, height: 256 });
  const png256 = img.toPNG();
  fs.writeFileSync(path.join(__dirname, '..', 'src', 'icon.png'), png256);

  const sizes = [16, 32, 48, 64, 128, 256];
  const pngs = sizes.map((s) => (s === 256 ? png256 : img.resize({ width: s, height: s, quality: 'best' }).toPNG()));
  const head = Buffer.alloc(6); head.writeUInt16LE(1, 2); head.writeUInt16LE(sizes.length, 4);
  let offset = 6 + 16 * sizes.length;
  const dir = sizes.map((s, i) => {
    const e = Buffer.alloc(16);
    e[0] = s === 256 ? 0 : s; e[1] = s === 256 ? 0 : s;
    e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6);
    e.writeUInt32LE(pngs[i].length, 8); e.writeUInt32LE(offset, 12);
    offset += pngs[i].length;
    return e;
  });
  fs.writeFileSync(path.join(__dirname, 'icon.ico'), Buffer.concat([head, ...dir, ...pngs]));
  console.log('icons written');
  app.quit();
});
