const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');
const pty = require('node-pty');

let win;

// A transparent Electron window has no native resize frame, so Windows won't offer Snap Layouts or edge snapping.
// Adding WS_THICKFRAME / WS_MAXIMIZEBOX / WS_MINIMIZEBOX to it restores those.
function enableNativeSnap(w) {
  try {
    const koffi = require('koffi');
    const user32 = koffi.load('user32.dll');
    const GetStyle = user32.func('intptr_t __stdcall GetWindowLongPtrW(void* hWnd, int nIndex)');
    const SetStyle = user32.func('intptr_t __stdcall SetWindowLongPtrW(void* hWnd, int nIndex, intptr_t value)');
    const SetPos = user32.func('bool __stdcall SetWindowPos(void* hWnd, void* after, int x, int y, int cx, int cy, uint flags)');
    const buf = w.getNativeWindowHandle();
    const hwnd = koffi.decode(buf, 'void *');
    const GWL_STYLE = -16;
    const style = Number(GetStyle(hwnd, GWL_STYLE));
    SetStyle(hwnd, GWL_STYLE, style | 0x00040000 | 0x00010000 | 0x00020000);
    SetPos(hwnd, null, 0, 0, 0, 0, 0x0001 | 0x0002 | 0x0004 | 0x0010 | 0x0020);
    return true;
  } catch (err) {
    console.error('native snap unavailable:', err.message);
    return false;
  }
}
const ptys = new Map();
let nextId = 1;

// Oh-My-Posh style powerline prompt (src/prompt.ps1). It uses the terminal's ANSI palette, so it follows the theme.
function promptScript() {
  const out = path.join(os.tmpdir(), 'custom-terminal-prompt.ps1');
  fs.writeFileSync(out, fs.readFileSync(path.join(__dirname, 'prompt.ps1'), 'utf8'), 'utf8');
  return out;
}

/* ---------- startup banner: mascot + system snapshot ---------- */
const cpuTimes = () => os.cpus().reduce((a, c) => {
  const t = c.times;
  a.idle += t.idle;
  a.total += t.user + t.nice + t.sys + t.idle + t.irq;
  return a;
}, { idle: 0, total: 0 });

async function cpuUsage() {
  const a = cpuTimes();
  await new Promise((r) => setTimeout(r, 150));
  const b = cpuTimes();
  const total = b.total - a.total;
  return total ? Math.round((1 - (b.idle - a.idle) / total) * 100) : 0;
}

// Synchronous variant for redraws: average CPU load since the previous sample
let lastCpu = cpuTimes();
function cpuUsageSince() {
  const a = lastCpu, b = (lastCpu = cpuTimes());
  const total = b.total - a.total;
  return total ? Math.round((1 - (b.idle - a.idle) / total) * 100) : 0;
}

const BANNER_MARK = '\x1b]777;ct-banner\x07';

function buildBanner(cpu) {
  const ESC = '\x1b[', R = ESC + '0m', B = ESC + '1m', DIM = ESC + '90m';
  const OR = ESC + '38;2;255;122;48m', EYE = ESC + '38;2;45;30;30m', L = ESC + '36m';
  const px = { o: OR + '█', e: EYE + '█', h: OR + '▀', l: OR + '▄', ' ': ' ' };
  const mascot = [
    '  llllllllllll  ',
    ' oooooooooooooo ',
    ' ooeeooooooeeoo ',
    ' ooeeooooooeeoo ',
    ' oooooooooooooo ',
    ' ooeooooooooeoo ',
    ' ooooeeeeeeoooo ',
    '  hhhhhhhhhhhh  ',
    '  llll    llll  ',
  ].map((row) => '  ' + [...row].map((c) => px[c]).join('') + R);

  const bar = (pct, w = 12) => {
    const n = Math.round((pct / 100) * w);
    const col = pct < 60 ? '32' : pct < 85 ? '33' : '31';
    return `${ESC}${col}m${'█'.repeat(n)}${R}${DIM}${'░'.repeat(w - n)}${R}`;
  };
  const gb = (b) => (b / 1024 ** 3).toFixed(1);
  const total = os.totalmem(), used = total - os.freemem();
  const memPct = Math.round((used / total) * 100);
  const model = (os.cpus()[0]?.model || 'Unknown CPU').replace(/\((R|TM)\)|CPU|Processor/g, '').replace(/\s+/g, ' ').trim().slice(0, 36);
  const up = os.uptime();
  const uptime = `${Math.floor(up / 86400)}d ${Math.floor((up % 86400) / 3600)}h ${Math.floor((up % 3600) / 60)}m`;

  let disk = '';
  try {
    const s = fs.statfsSync(process.env.SystemDrive ? process.env.SystemDrive + '\\' : 'C:\\');
    const t = s.blocks * s.bsize, f = s.bavail * s.bsize;
    const pct = Math.round(((t - f) / t) * 100);
    disk = `${L}Disk${R}    ${bar(pct)} ${gb(t - f)}/${gb(t)} GB`;
  } catch {}

  const info = [
    `${B}${OR}Custom Terminal${R} ${DIM}v${app.getVersion()}${R}`,
    DIM + '─'.repeat(40) + R,
    `${L}User${R}    ${os.userInfo().username}@${os.hostname()}`,
    `${L}OS${R}      ${os.version()} (${os.release()})`,
    `${L}CPU${R}     ${model}`,
    `${L}Usage${R}   ${bar(cpu)} ${cpu}%`,
    `${L}Memory${R}  ${bar(memPct)} ${gb(used)}/${gb(total)} GB`,
    disk,
    `${L}Uptime${R}  ${uptime}`,
    '',
    '  ' + [1, 2, 3, 4, 5, 6].map((i) => `${ESC}3${i}m██`).join('') + R,
  ];
  const rows = Math.max(mascot.length, info.length);
  const blank = ' '.repeat(18);
  const out = [''];
  for (let i = 0; i < rows; i++) out.push((mascot[i] || blank) + '   ' + (info[i] || ''));
  out.push('', '');
  return out.join('\r\n');
}

function createWindow() {
  win = new BrowserWindow({
    width: 1100,
    height: 700,
    minWidth: 520,
    minHeight: 320,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    icon: path.join(__dirname, 'icon.png'),
    title: 'Custom Terminal',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
    },
  });
  win.setMenuBarVisibility(false);
  if (process.env.CT_DEBUG) win.webContents.on('console-message', (e) => console.log('[renderer]', e.message ?? e));
  win.loadFile(path.join(__dirname, 'index.html'));
  nativeSnap = enableNativeSnap(win);
  if (nativeSnap) {
    // Windows now owns maximize / resize / snapping; just mirror the state to the UI
    const native = () => !win.isDestroyed() && win.webContents.send('win:maxstate', win.isMaximized(), true);
    win.on('maximize', native);
    win.on('unmaximize', native);
    win.webContents.on('did-finish-load', native);
  } else {
    watchDragSnap();
  }
}

ipcMain.handle('pty:create', async (e, { cols, rows }) => {
  const id = nextId++;
  const banner = path.join(os.tmpdir(), `custom-terminal-banner-${id}-${process.pid}.txt`);
  fs.writeFileSync(banner, buildBanner(await cpuUsage()), 'utf8');
  const p = pty.spawn('powershell.exe', ['-NoLogo', '-NoExit', '-ExecutionPolicy', 'Bypass', '-Command', `. '${promptScript()}'`], {
    name: 'xterm-256color',
    cols, rows,
    cwd: fs.existsSync('D:\\Ajay') ? 'D:\\Ajay' : os.homedir(),
    env: { ...process.env, CT_BANNER: banner },
    useConpty: true,
    useConptyDll: true,
  });
  ptys.set(id, p);
  p.onData((d) => {
    if (win.isDestroyed()) return;
    const i = d.indexOf(BANNER_MARK);
    if (i < 0) return win.webContents.send('pty:data', id, d);
    // `clear` was run: write a fresh banner file for the shell to print itself, so ConPTY tracks the cursor below it
    try { fs.writeFileSync(banner, buildBanner(cpuUsageSince()), 'utf8'); } catch {}
    win.webContents.send('pty:data', id, d.slice(0, i) + d.slice(i + BANNER_MARK.length));
  });
  p.onExit(() => {
    ptys.delete(id);
    if (!win.isDestroyed()) win.webContents.send('pty:exit', id);
  });
  return id;
});
ipcMain.on('pty:write', (e, id, d) => ptys.get(id)?.write(d));
ipcMain.on('pty:resize', (e, id, cols, rows) => { try { ptys.get(id)?.resize(cols, rows); } catch {} });
ipcMain.on('pty:kill', (e, id) => { ptys.get(id)?.kill(); ptys.delete(id); });
ipcMain.on('win:min', () => win.minimize());

// Transparent windows can't be maximized or edge-resized by Windows, so both are done by hand.
let maxed = false, restoreBounds = null, nativeSnap = false;
const sendMax = () => !win.isDestroyed() && win.webContents.send('win:maxstate', maxed);
function setMaximized(on) {
  if (on === maxed) return;
  if (on) {
    restoreBounds = win.getBounds();
    win.setBounds(screen.getDisplayMatching(restoreBounds).workArea);
  } else {
    win.setBounds(restoreBounds);
  }
  maxed = on;
  sendMax();
}
ipcMain.on('win:max', () => {
  if (nativeSnap) return win.isMaximized() ? win.unmaximize() : win.maximize();
  setMaximized(!maxed);
});

// Windows' drag-to-top snap doesn't exist for transparent windows: maximize when a title-bar drag ends at the top edge.
// Dragging a maximized window away restores it.
function watchDragSnap() {
  let ignore = false;
  win.on('moved', () => {
    if (ignore) return;
    const c = screen.getCursorScreenPoint();
    const area = screen.getDisplayNearestPoint(c).bounds;
    if (!maxed && c.y <= area.y + 4) {
      ignore = true;
      setMaximized(true);
      setTimeout(() => (ignore = false), 300);
    } else if (maxed) {
      const wa = screen.getDisplayMatching(win.getBounds()).workArea;
      const b = win.getBounds();
      if (b.x !== wa.x || b.y !== wa.y) { maxed = false; sendMax(); if (restoreBounds) win.setSize(restoreBounds.width, restoreBounds.height); }
    }
  });
}

const MIN_W = 520, MIN_H = 320;
let resizeTimer = null;
ipcMain.on('win:rs-start', (e, edge) => {
  clearInterval(resizeTimer);
  const b = win.getBounds();
  const c0 = screen.getCursorScreenPoint();
  resizeTimer = setInterval(() => {
    const c = screen.getCursorScreenPoint();
    const dx = c.x - c0.x, dy = c.y - c0.y;
    let { x, y, width, height } = b;
    if (edge.includes('e')) width = Math.max(MIN_W, b.width + dx);
    if (edge.includes('s')) height = Math.max(MIN_H, b.height + dy);
    if (edge.includes('w')) { width = Math.max(MIN_W, b.width - dx); x = b.x + b.width - width; }
    if (edge.includes('n')) { height = Math.max(MIN_H, b.height - dy); y = b.y + b.height - height; }
    win.setBounds({ x, y, width, height });
  }, 8);
});
ipcMain.on('win:rs-end', () => { clearInterval(resizeTimer); resizeTimer = null; });
ipcMain.on('win:close', () => win.close());
ipcMain.handle('win:ismax', () => (nativeSnap ? win.isMaximized() : maxed));

app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
  ptys.forEach((p) => p.kill());
  app.quit();
});
