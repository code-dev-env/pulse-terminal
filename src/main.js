const { app, BrowserWindow, ipcMain, screen } = require("electron");
const path = require("path");
const os = require("os");
const fs = require("fs");
const pty = require("node-pty");
const platform = require("./platform");
const { enableNativeWindow, isOpaque } = require("./platform/window");
const shells = require("./platform/shell");

// One process owns every window. Launching the app again (installed, portable or AppImage) asks that process for a new
// window, so all windows share the same settings and no second Electron instance has to boot.
// The Windows portable exe unpacks the app to one fixed folder in %TEMP% and its launcher deletes that folder when its
// process exits, so the extra portable process can't just quit: it stays hidden until the first one is gone.
const isPortable = !!process.env.PORTABLE_EXECUTABLE_DIR;
const gotLock = app.requestSingleInstanceLock();
const pidFile = path.join(app.getPath("userData"), "instance.pid");
if (gotLock) {
  app.on("second-instance", () => app.whenReady().then(createWindow));
  try {
    fs.mkdirSync(path.dirname(pidFile), { recursive: true });
    fs.writeFileSync(pidFile, String(process.pid));
  } catch {}
} else if (isPortable) {
  const alive = (pid) => {
    if (!pid) return false;
    try {
      process.kill(pid, 0);
      return true;
    } catch (err) {
      return err.code === "EPERM";
    }
  };
  let misses = 0;
  const wait = setInterval(() => {
    let pid = 0;
    try {
      pid = Number(fs.readFileSync(pidFile, "utf8"));
    } catch {}
    misses = alive(pid) ? 0 : misses + 1;
    if (misses >= 3) {
      clearInterval(wait);
      app.quit();
    }
  }, 500);
} else {
  app.quit();
}

/* ---------- settings: one JSON file in the user's app-data folder, shared by every window and every launch ---------- */
const SETTING_KEYS = new Set([
  "themeName",
  "opacity",
  "fontSize",
  "lineHeight",
  "fontName",
  "quick",
  "_migrated",
]);
const settingsFile = path.join(app.getPath("userData"), "settings.json");
let settings = {};
const dirtyKeys = new Set();
let settingsTimer = null;

function readSettingsFile() {
  try {
    const o = JSON.parse(fs.readFileSync(settingsFile, "utf8"));
    return o && typeof o === "object" && !Array.isArray(o) ? o : {};
  } catch {
    return {};
  }
}

function flushSettings() {
  clearTimeout(settingsTimer);
  settingsTimer = null;
  if (!dirtyKeys.size) return;
  // merge into what is on disk so a change made by another process isn't overwritten with stale values
  const disk = readSettingsFile();
  for (const k of dirtyKeys) disk[k] = settings[k];
  dirtyKeys.clear();
  try {
    fs.mkdirSync(path.dirname(settingsFile), { recursive: true });
    const tmp = settingsFile + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(disk, null, 2), "utf8");
    fs.renameSync(tmp, settingsFile);
  } catch (err) {
    console.error("settings not saved:", err.message);
  }
}

// The renderer reads the current settings synchronously while its page loads
ipcMain.on("settings:get", (e) => {
  e.returnValue = settings;
});
ipcMain.on("settings:set", (e, key, value) => {
  if (!SETTING_KEYS.has(key)) return;
  settings[key] = value;
  dirtyKeys.add(key);
  clearTimeout(settingsTimer);
  settingsTimer = setTimeout(flushSettings, 400);
  for (const w of BrowserWindow.getAllWindows())
    if (!w.isDestroyed() && w.webContents !== e.sender)
      w.webContents.send("settings:changed", key, value);
});
ipcMain.on("shell:label", (e) => {
  e.returnValue = shells.label();
});

/* ---------- per-window state ---------- */
const winState = new WeakMap(); // BrowserWindow -> { maxed, restoreBounds, nativeSnap, resizeTimer }
const winOf = (e) => BrowserWindow.fromWebContents(e.sender);

const ptys = new Map(); // id -> { p, win, cols, rows, queue, size, timer, unacked, paused }
let nextId = 1;

/* ---------- startup banner: mascot + system snapshot ---------- */
const cpuTimes = () =>
  os.cpus().reduce(
    (a, c) => {
      const t = c.times;
      a.idle += t.idle;
      a.total += t.user + t.nice + t.sys + t.idle + t.irq;
      return a;
    },
    { idle: 0, total: 0 },
  );

// Average CPU load since the previous sample. Reading it never waits, so opening a tab isn't delayed by a measurement.
const coreCount = os.cpus().length;
let lastCpu = cpuTimes(),
  lastUsage = 0;
function cpuUsageSince() {
  const a = lastCpu,
    b = cpuTimes();
  const total = b.total - a.total;
  if (total < 200 * coreCount) return lastUsage; // under ~200 ms of data is too noisy to show
  lastCpu = b;
  return (lastUsage = Math.round((1 - (b.idle - a.idle) / total) * 100));
}

const BANNER_MARK = "\x1b]777;ct-banner\x07";

function buildBanner(cpu) {
  const ESC = "\x1b[",
    R = ESC + "0m",
    B = ESC + "1m",
    DIM = ESC + "90m";
  const OR = ESC + "38;2;255;122;48m",
    EYE = ESC + "38;2;45;30;30m",
    L = ESC + "36m";
  const px = { o: OR + "█", e: EYE + "█", h: OR + "▀", l: OR + "▄", " ": " " };
  const mascot = [
    "  llllllllllll  ",
    " oooooooooooooo ",
    " ooeeooooooeeoo ",
    " ooeeooooooeeoo ",
    " oooooooooooooo ",
    " ooeooooooooeoo ",
    " ooooeeeeeeoooo ",
    "  hhhhhhhhhhhh  ",
    "  llll    llll  ",
  ].map((row) => "  " + [...row].map((c) => px[c]).join("") + R);

  const bar = (pct, w = 12) => {
    const n = Math.round((pct / 100) * w);
    const col = pct < 60 ? "32" : pct < 85 ? "33" : "31";
    return `${ESC}${col}m${"█".repeat(n)}${R}${DIM}${"░".repeat(w - n)}${R}`;
  };
  const gb = (b) => (b / 1024 ** 3).toFixed(1);
  const total = os.totalmem(),
    used = total - os.freemem();
  const memPct = Math.round((used / total) * 100);
  const model = (os.cpus()[0]?.model || "Unknown CPU")
    .replace(/\((R|TM)\)|CPU|Processor/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 36);
  const up = os.uptime();
  const uptime = `${Math.floor(up / 86400)}d ${Math.floor((up % 86400) / 3600)}h ${Math.floor((up % 3600) / 60)}m`;

  let disk = "";
  try {
    const s = fs.statfsSync(platform.diskRoot());
    const t = s.blocks * s.bsize,
      f = s.bavail * s.bsize;
    const pct = Math.round(((t - f) / t) * 100);
    disk = `${L}Disk${R}    ${bar(pct)} ${gb(t - f)}/${gb(t)} GB`;
  } catch {}

  const info = [
    `${B}${OR}Pulse Terminal${R} ${DIM}v${app.getVersion()}${R}`,
    DIM + "─".repeat(40) + R,
    `${L}User${R}    ${os.userInfo().username}@${os.hostname()}`,
    `${L}OS${R}      ${platform.osLabel()}`,
    `${L}CPU${R}     ${model}`,
    `${L}Usage${R}   ${bar(cpu)} ${cpu}%`,
    `${L}Memory${R}  ${bar(memPct)} ${gb(used)}/${gb(total)} GB`,
    disk,
    `${L}Uptime${R}  ${uptime}`,
    "",
    "  " + [1, 2, 3, 4, 5, 6].map((i) => `${ESC}3${i}m██`).join("") + R,
  ];
  const rows = Math.max(mascot.length, info.length);
  const blank = " ".repeat(18);
  const out = [""];
  for (let i = 0; i < rows; i++)
    out.push((mascot[i] || blank) + "   " + (info[i] || ""));
  out.push("", "");
  return out.join("\r\n");
}

function createWindow() {
  const opaque = isOpaque();
  const opts = {
    width: 1100,
    height: 700,
    minWidth: 520,
    minHeight: 320,
    frame: false,
    transparent: !opaque,
    backgroundColor: opaque ? "#1e1e1e" : "#00000000",
    icon: path.join(__dirname, "icon.png"),
    title: "Pulse Terminal",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      spellcheck: false,
      additionalArguments: opaque ? ["--ct-opaque"] : [],
    },
  };
  // cascade a new window down and right of the one in front, so windows don't stack exactly on top of each other
  const ref = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
  if (ref && !ref.isMaximized()) {
    const b = ref.getBounds();
    const wa = screen.getDisplayMatching(b).workArea;
    const x = b.x + 32,
      y = b.y + 32;
    if (
      x + opts.width <= wa.x + wa.width &&
      y + opts.height <= wa.y + wa.height
    ) {
      opts.x = x;
      opts.y = y;
    }
  }
  const win = new BrowserWindow(opts);
  const st = { maxed: false, restoreBounds: null, nativeSnap: false, resizeTimer: null };
  winState.set(win, st);
  win.setMenuBarVisibility(false);
  if (process.env.CT_DEBUG)
    win.webContents.on("console-message", (e) =>
      console.log("[renderer]", e.message ?? e),
    );
  win.loadFile(path.join(__dirname, "index.html"));
  st.nativeSnap = enableNativeWindow(win);
  if (st.nativeSnap) {
    // The OS now owns maximize / resize / snapping; just mirror the state to the UI
    const native = () =>
      !win.isDestroyed() &&
      win.webContents.send("win:maxstate", win.isMaximized(), true);
    win.on("maximize", native);
    win.on("unmaximize", native);
    win.webContents.on("did-finish-load", native);
  } else {
    watchDragSnap(win, st);
  }
  win.on("closed", () => {
    clearInterval(st.resizeTimer);
    for (const [id, r] of ptys) if (r.win === win) killPty(id);
  });
  if (process.env.CT_DEBUG) console.log("[main] window opened");
  return win;
}

/* ---------- pty output: batched, with backpressure ---------- */
// Output is coalesced into at most one IPC message per BATCH_MS (the first chunk after a quiet spell goes out at once, so
// typing echo isn't delayed). The renderer acknowledges what xterm has parsed; if too much is unacknowledged the pty is
// paused, so a runaway command can't flood xterm's buffer and Ctrl+C stays responsive.
const BATCH_MS = 8,
  BATCH_MAX = 64 * 1024;
const FLOW_HIGH = 512 * 1024,
  FLOW_LOW = 128 * 1024;

function pump(id, r) {
  r.timer = null;
  if (!r.queue.length) return;
  const data = r.queue.length === 1 ? r.queue[0] : r.queue.join("");
  r.queue = [];
  r.size = 0;
  if (!r.win.isDestroyed()) r.win.webContents.send("pty:data", id, data);
  r.timer = setTimeout(() => pump(id, r), BATCH_MS);
}

function queueData(id, r, d) {
  r.queue.push(d);
  r.size += d.length;
  r.unacked += d.length;
  if (!r.paused && r.unacked > FLOW_HIGH) {
    r.paused = true;
    r.p.pause();
  }
  if (!r.timer) pump(id, r);
  else if (r.size >= BATCH_MAX) {
    clearTimeout(r.timer);
    pump(id, r);
  }
}

function killPty(id) {
  const r = ptys.get(id);
  if (!r) return;
  ptys.delete(id);
  clearTimeout(r.timer);
  try {
    r.p.kill();
  } catch {}
}

/* ---------- starting a shell ---------- */
function spawnPty(spec, cols, rows, banner) {
  const opts = {
    name: "xterm-256color",
    cols,
    rows,
    cwd: os.homedir(),
    env: shells.env(spec, banner),
  };
  if (platform.isWin) {
    opts.useConpty = true;
    // The bundled conpty.dll never repaints on resize, so xterm's reflow and ConPTY's drift apart and PSReadLine then draws at a stale row.
    // The inbox ConPTY repaints its whole viewport on every resize, which keeps xterm in sync.
    opts.useConptyDll = false;
  }
  return pty.spawn(spec.file, spec.args, opts);
}

// A shell that dies this soon after starting, with an error, almost certainly has a broken startup file or script
const EARLY_EXIT_MS = 3000;

// Starts the first working shell from specs[from..]; later entries are fallbacks
function startShell(id, r, specs, from, banner) {
  let p = null,
    idx = from;
  for (; idx < specs.length; idx++) {
    try {
      p = spawnPty(specs[idx], r.cols, r.rows, banner);
      break;
    } catch (err) {
      console.error(`could not start ${specs[idx].file}:`, err.message);
    }
  }
  if (!p) throw new Error("no usable shell could be started");
  const started = Date.now();
  r.p = p;
  p.onData((d) => {
    const i = d.indexOf(BANNER_MARK);
    if (i < 0) return queueData(id, r, d);
    // `clear` was run: write a fresh banner file for the shell to print itself, so the terminal tracks the cursor below it
    try {
      fs.writeFileSync(banner, buildBanner(cpuUsageSince()), "utf8");
    } catch {}
    queueData(id, r, d.slice(0, i) + d.slice(i + BANNER_MARK.length));
  });
  p.onExit(({ exitCode }) => {
    if (r.p !== p || ptys.get(id) !== r) return; // replaced, or already killed from this side
    if (
      !platform.isWin &&
      exitCode !== 0 &&
      Date.now() - started < EARLY_EXIT_MS &&
      idx + 1 < specs.length
    ) {
      console.error(`${specs[idx].file} exited with ${exitCode} right after starting; trying the next shell`);
      try {
        fs.writeFileSync(banner, buildBanner(cpuUsageSince()), "utf8");
        return startShell(id, r, specs, idx + 1, banner);
      } catch (err) {
        console.error(err.message);
      }
    }
    ptys.delete(id);
    clearTimeout(r.timer);
    if (r.win.isDestroyed()) return;
    if (r.queue.length) r.win.webContents.send("pty:data", id, r.queue.join(""));
    r.win.webContents.send("pty:exit", id);
  });
}

ipcMain.handle("pty:create", (e, { cols, rows }) => {
  const win = winOf(e);
  const id = nextId++;
  const banner = path.join(
    os.tmpdir(),
    `pulse-terminal-banner-${id}-${process.pid}.txt`,
  );
  fs.writeFileSync(banner, buildBanner(cpuUsageSince()), "utf8");
  const r = { p: null, win, cols, rows, queue: [], size: 0, timer: null, unacked: 0, paused: false };
  ptys.set(id, r);
  try {
    startShell(id, r, shells.candidates(), 0, banner);
  } catch (err) {
    ptys.delete(id);
    throw err;
  }
  return id;
});
ipcMain.on("pty:write", (e, id, d) => ptys.get(id)?.p.write(d));
ipcMain.on("pty:ack", (e, id, n) => {
  const r = ptys.get(id);
  if (!r) return;
  r.unacked = Math.max(0, r.unacked - n);
  if (r.paused && r.unacked < FLOW_LOW) {
    r.paused = false;
    r.p.resume();
  }
});
ipcMain.on("pty:resize", (e, id, cols, rows) => {
  const r = ptys.get(id);
  if (!r) return;
  r.cols = cols;
  r.rows = rows;
  try {
    r.p.resize(cols, rows);
  } catch {}
});
ipcMain.on("pty:kill", (e, id) => killPty(id));
ipcMain.on("win:min", (e) => winOf(e)?.minimize());

// Where the OS can't maximize or edge-resize the window (transparent windows on Windows), both are done by hand.
const sendMax = (win, st) =>
  !win.isDestroyed() && win.webContents.send("win:maxstate", st.maxed);
function setMaximized(win, st, on) {
  if (on === st.maxed) return;
  if (on) {
    st.restoreBounds = win.getBounds();
    win.setBounds(screen.getDisplayMatching(st.restoreBounds).workArea);
  } else {
    win.setBounds(st.restoreBounds);
  }
  st.maxed = on;
  sendMax(win, st);
}
ipcMain.on("win:max", (e) => {
  const win = winOf(e),
    st = win && winState.get(win);
  if (!st) return;
  if (st.nativeSnap) return win.isMaximized() ? win.unmaximize() : win.maximize();
  setMaximized(win, st, !st.maxed);
});

// The OS's drag-to-top snap doesn't exist for such windows: maximize when a title-bar drag ends at the top edge.
// Dragging a maximized window away restores it.
function watchDragSnap(win, st) {
  let ignore = false;
  win.on("moved", () => {
    if (ignore) return;
    const c = screen.getCursorScreenPoint();
    const area = screen.getDisplayNearestPoint(c).bounds;
    if (!st.maxed && c.y <= area.y + 4) {
      ignore = true;
      setMaximized(win, st, true);
      setTimeout(() => (ignore = false), 300);
    } else if (st.maxed) {
      const wa = screen.getDisplayMatching(win.getBounds()).workArea;
      const b = win.getBounds();
      if (b.x !== wa.x || b.y !== wa.y) {
        st.maxed = false;
        sendMax(win, st);
        if (st.restoreBounds)
          win.setSize(st.restoreBounds.width, st.restoreBounds.height);
      }
    }
  });
}

const MIN_W = 520,
  MIN_H = 320;
ipcMain.on("win:rs-start", (e, edge) => {
  const win = winOf(e),
    st = win && winState.get(win);
  if (!st) return;
  clearInterval(st.resizeTimer);
  const b = win.getBounds();
  const c0 = screen.getCursorScreenPoint();
  st.resizeTimer = setInterval(() => {
    if (win.isDestroyed()) return clearInterval(st.resizeTimer);
    const c = screen.getCursorScreenPoint();
    const dx = c.x - c0.x,
      dy = c.y - c0.y;
    let { x, y, width, height } = b;
    if (edge.includes("e")) width = Math.max(MIN_W, b.width + dx);
    if (edge.includes("s")) height = Math.max(MIN_H, b.height + dy);
    if (edge.includes("w")) {
      width = Math.max(MIN_W, b.width - dx);
      x = b.x + b.width - width;
    }
    if (edge.includes("n")) {
      height = Math.max(MIN_H, b.height - dy);
      y = b.y + b.height - height;
    }
    win.setBounds({ x, y, width, height });
  }, 8);
});
ipcMain.on("win:rs-end", (e) => {
  const st = winState.get(winOf(e));
  if (!st) return;
  clearInterval(st.resizeTimer);
  st.resizeTimer = null;
});
ipcMain.on("win:close", (e) => winOf(e)?.close());
ipcMain.handle("win:ismax", (e) => {
  const win = winOf(e),
    st = win && winState.get(win);
  return st ? (st.nativeSnap ? win.isMaximized() : st.maxed) : false;
});

if (gotLock)
  app.whenReady().then(() => {
    settings = readSettingsFile();
    createWindow();
  });
app.on("window-all-closed", () => {
  for (const id of [...ptys.keys()]) killPty(id);
  app.quit();
});
app.on("will-quit", () => {
  flushSettings();
  if (!gotLock) return;
  shells.cleanup();
  try {
    fs.rmSync(pidFile, { force: true });
  } catch {}
});
