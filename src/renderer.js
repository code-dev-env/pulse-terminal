// name, bg, bg2 (chrome), fg, accent, muted, ANSI [black red green yellow blue magenta cyan white]
const RAW = [
  [
    "macOS Pro",
    "#1e1e1e",
    "#2c2c2e",
    "#f2f2f2",
    "#0a84ff",
    "#8e8e93",
    [
      "#000000",
      "#ff453a",
      "#32d74b",
      "#ffd60a",
      "#0a84ff",
      "#bf5af2",
      "#64d2ff",
      "#d1d1d6",
    ],
  ],
  [
    "macOS Basic",
    "#ffffff",
    "#ececec",
    "#1d1d1f",
    "#007aff",
    "#8e8e93",
    [
      "#000000",
      "#c91b00",
      "#00a600",
      "#a68a00",
      "#0225c7",
      "#c930c7",
      "#00a5c5",
      "#bfbfbf",
    ],
  ],
  [
    "Ubuntu",
    "#300a24",
    "#3e1632",
    "#eeeeec",
    "#e95420",
    "#8f6f85",
    [
      "#2e3436",
      "#cc0000",
      "#4e9a06",
      "#c4a000",
      "#3465a4",
      "#75507b",
      "#06989a",
      "#d3d7cf",
    ],
  ],
  [
    "Midnight",
    "#0f111a",
    "#171a27",
    "#c0c5ce",
    "#82aaff",
    "#5c6370",
    [
      "#1a1d2b",
      "#f07178",
      "#c3e88d",
      "#ffcb6b",
      "#82aaff",
      "#c792ea",
      "#89ddff",
      "#c0c5ce",
    ],
  ],
  [
    "Dracula",
    "#1e1f29",
    "#282a36",
    "#f8f8f2",
    "#bd93f9",
    "#6272a4",
    [
      "#21222c",
      "#ff5555",
      "#50fa7b",
      "#f1fa8c",
      "#bd93f9",
      "#ff79c6",
      "#8be9fd",
      "#f8f8f2",
    ],
  ],
  [
    "Nord",
    "#2e3440",
    "#3b4252",
    "#d8dee9",
    "#88c0d0",
    "#616e88",
    [
      "#3b4252",
      "#bf616a",
      "#a3be8c",
      "#ebcb8b",
      "#81a1c1",
      "#b48ead",
      "#88c0d0",
      "#e5e9f0",
    ],
  ],
  [
    "Gruvbox Dark",
    "#282828",
    "#3c3836",
    "#ebdbb2",
    "#fabd2f",
    "#928374",
    [
      "#282828",
      "#cc241d",
      "#98971a",
      "#d79921",
      "#458588",
      "#b16286",
      "#689d6a",
      "#a89984",
    ],
  ],
  [
    "Solarized Dark",
    "#002b36",
    "#073642",
    "#93a1a1",
    "#268bd2",
    "#586e75",
    [
      "#073642",
      "#dc322f",
      "#859900",
      "#b58900",
      "#268bd2",
      "#d33682",
      "#2aa198",
      "#eee8d5",
    ],
  ],
  [
    "Solarized Light",
    "#fdf6e3",
    "#eee8d5",
    "#586e75",
    "#268bd2",
    "#93a1a1",
    [
      "#073642",
      "#dc322f",
      "#859900",
      "#b58900",
      "#268bd2",
      "#d33682",
      "#2aa198",
      "#eee8d5",
    ],
  ],
  [
    "Tokyo Night",
    "#1a1b26",
    "#24283b",
    "#c0caf5",
    "#7aa2f7",
    "#565f89",
    [
      "#15161e",
      "#f7768e",
      "#9ece6a",
      "#e0af68",
      "#7aa2f7",
      "#bb9af7",
      "#7dcfff",
      "#a9b1d6",
    ],
  ],
  [
    "One Dark",
    "#282c34",
    "#21252b",
    "#abb2bf",
    "#61afef",
    "#5c6370",
    [
      "#3f4451",
      "#e06c75",
      "#98c379",
      "#e5c07b",
      "#61afef",
      "#c678dd",
      "#56b6c2",
      "#abb2bf",
    ],
  ],
  [
    "Monokai",
    "#272822",
    "#3e3d32",
    "#f8f8f2",
    "#a6e22e",
    "#75715e",
    [
      "#272822",
      "#f92672",
      "#a6e22e",
      "#f4bf75",
      "#66d9ef",
      "#ae81ff",
      "#a1efe4",
      "#f8f8f2",
    ],
  ],
  [
    "Catppuccin Mocha",
    "#1e1e2e",
    "#313244",
    "#cdd6f4",
    "#cba6f7",
    "#6c7086",
    [
      "#45475a",
      "#f38ba8",
      "#a6e3a1",
      "#f9e2af",
      "#89b4fa",
      "#f5c2e7",
      "#94e2d5",
      "#bac2de",
    ],
  ],
  [
    "Rosé Pine",
    "#191724",
    "#26233a",
    "#e0def4",
    "#c4a7e7",
    "#6e6a86",
    [
      "#26233a",
      "#eb6f92",
      "#9ccfd8",
      "#f6c177",
      "#31748f",
      "#c4a7e7",
      "#ebbcba",
      "#e0def4",
    ],
  ],
  [
    "Ayu Mirage",
    "#1f2430",
    "#2a3040",
    "#cccac2",
    "#ffcc66",
    "#707a8c",
    [
      "#191e2a",
      "#ed8274",
      "#a6cc70",
      "#fad07b",
      "#6dcbfa",
      "#cfbafa",
      "#90e1c6",
      "#c7c7c7",
    ],
  ],
  [
    "Everforest",
    "#2d353b",
    "#343f44",
    "#d3c6aa",
    "#a7c080",
    "#859289",
    [
      "#475258",
      "#e67e80",
      "#a7c080",
      "#dbbc7f",
      "#7fbbb3",
      "#d699b6",
      "#83c092",
      "#d3c6aa",
    ],
  ],
  [
    "Cyberpunk",
    "#0b0014",
    "#1a0b2e",
    "#f0e6ff",
    "#ff2a6d",
    "#7a5c99",
    [
      "#1a0b2e",
      "#ff2a6d",
      "#05ffa1",
      "#fffb96",
      "#01c8ee",
      "#b967ff",
      "#05d9e8",
      "#d1f7ff",
    ],
  ],
  [
    "Deep Ocean",
    "#0a2540",
    "#12365c",
    "#d6e9ff",
    "#4cc9f0",
    "#6a8bb0",
    [
      "#0e2f52",
      "#ff6b81",
      "#5be3a3",
      "#ffd166",
      "#4ea8ff",
      "#c39bff",
      "#4cc9f0",
      "#d6e9ff",
    ],
  ],
  [
    "Forest",
    "#12301f",
    "#1b4230",
    "#dcefd9",
    "#7bd88f",
    "#6f9a7c",
    [
      "#1b4230",
      "#ef7d6f",
      "#7bd88f",
      "#e6d36a",
      "#6fb7d9",
      "#c59be0",
      "#6fd8c1",
      "#dcefd9",
    ],
  ],
  [
    "Burgundy",
    "#3a0f1c",
    "#4d1827",
    "#f5dde2",
    "#ff7a93",
    "#a56a77",
    [
      "#4d1827",
      "#ff6b6b",
      "#9be28c",
      "#ffd479",
      "#7fb4ff",
      "#e59bff",
      "#7fe0d6",
      "#f5dde2",
    ],
  ],
  [
    "Royal Purple",
    "#2a1450",
    "#3a1f6b",
    "#eadfff",
    "#b388ff",
    "#8c75b8",
    [
      "#3a1f6b",
      "#ff6e9c",
      "#6ef0a8",
      "#ffe06b",
      "#7aa7ff",
      "#d58bff",
      "#6ee3f5",
      "#eadfff",
    ],
  ],
  [
    "Sunset",
    "#3b1f14",
    "#4f2d1c",
    "#ffe8d1",
    "#ff9a4d",
    "#a8805f",
    [
      "#4f2d1c",
      "#ff6b5b",
      "#a8d86b",
      "#ffcf5a",
      "#6fa8e8",
      "#e58bc4",
      "#6fd1c0",
      "#ffe8d1",
    ],
  ],
  [
    "Teal Lagoon",
    "#0b3b3c",
    "#115052",
    "#d9f5f2",
    "#2de2c8",
    "#6aa5a3",
    [
      "#115052",
      "#ff7a7a",
      "#7af0a0",
      "#f5de6b",
      "#5db8ff",
      "#c79bff",
      "#2de2c8",
      "#d9f5f2",
    ],
  ],
  [
    "Crimson Night",
    "#1c0a0d",
    "#2d1216",
    "#f2dcdc",
    "#ff3b4e",
    "#9a6065",
    [
      "#2d1216",
      "#ff3b4e",
      "#6fdc8c",
      "#ffc857",
      "#5a9bff",
      "#d070ff",
      "#5fd9d0",
      "#f2dcdc",
    ],
  ],
  [
    "Synthwave",
    "#241b4b",
    "#31256a",
    "#f3e8ff",
    "#ff4fd8",
    "#8e7ac0",
    [
      "#31256a",
      "#ff5f8f",
      "#72f1b8",
      "#fede5d",
      "#36c4ff",
      "#ff4fd8",
      "#2de2e6",
      "#f3e8ff",
    ],
  ],
  [
    "Matrix",
    "#030d05",
    "#0a1c0e",
    "#8dff9d",
    "#00ff41",
    "#3f8a4f",
    [
      "#0a1c0e",
      "#ff5555",
      "#00ff41",
      "#d6ff5a",
      "#3fb6ff",
      "#c06bff",
      "#3fffd0",
      "#8dff9d",
    ],
  ],
  [
    "Coffee",
    "#2b1d14",
    "#3b2a1e",
    "#efdcc6",
    "#d9a066",
    "#947a63",
    [
      "#3b2a1e",
      "#e0705f",
      "#a5c26b",
      "#e5b95a",
      "#7aa5c9",
      "#c490b5",
      "#7bbfb0",
      "#efdcc6",
    ],
  ],
  [
    "Slate Blue",
    "#2b3a55",
    "#364868",
    "#e3eaf7",
    "#8fb5ff",
    "#7a8cab",
    [
      "#364868",
      "#ff7f8f",
      "#8fe0a8",
      "#f5d77a",
      "#8fb5ff",
      "#d3a5ff",
      "#7fdcf0",
      "#e3eaf7",
    ],
  ],
  [
    "Sky Light",
    "#e8f4ff",
    "#d3e8fa",
    "#17324d",
    "#1e88e5",
    "#6b8aa6",
    [
      "#17324d",
      "#d32f2f",
      "#2e8b57",
      "#b58900",
      "#1e88e5",
      "#8e44ad",
      "#00838f",
      "#9fb4c7",
    ],
  ],
  [
    "Mint Light",
    "#e6f7ef",
    "#d0eedf",
    "#16352a",
    "#12a37a",
    "#6a9484",
    [
      "#16352a",
      "#d3455b",
      "#12a37a",
      "#b58900",
      "#2f7fd1",
      "#9b59b6",
      "#0f9aa8",
      "#9ec2b2",
    ],
  ],
  [
    "Rose Light",
    "#fff0f3",
    "#ffdde4",
    "#4a1f2a",
    "#e0446a",
    "#a8707c",
    [
      "#4a1f2a",
      "#d32f4f",
      "#2e8b57",
      "#c58a00",
      "#3b7dd8",
      "#a64ca6",
      "#18929e",
      "#d9b3bb",
    ],
  ],
  [
    "Lavender Light",
    "#f1ecff",
    "#e1d8fb",
    "#2c2150",
    "#7c4dff",
    "#8a7fb0",
    [
      "#2c2150",
      "#d33a63",
      "#2e8b57",
      "#b58900",
      "#4a6fe0",
      "#7c4dff",
      "#1a8fa0",
      "#b9afd9",
    ],
  ],
  [
    "Paper",
    "#faf4e6",
    "#eee5cf",
    "#3b3426",
    "#c0612b",
    "#9b9078",
    [
      "#3b3426",
      "#c0392b",
      "#4f8a2b",
      "#b58900",
      "#2c6fb0",
      "#8e4a9e",
      "#1f8a8a",
      "#c9bfa6",
    ],
  ],
];

const rgba = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

function lighten(hex, amt = 0.25) {
  const n = parseInt(hex.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) =>
    Math.round(v + (255 - v) * amt),
  );
  return "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");
}

const THEMES = RAW.map(([name, bg, bg2, fg, accent, muted, a]) => {
  const names = [
    "black",
    "red",
    "green",
    "yellow",
    "blue",
    "magenta",
    "cyan",
    "white",
  ];
  const xterm = {
    background: "#00000000",
    foreground: fg,
    cursor: accent,
    cursorAccent: bg,
    selectionBackground: accent + "55",
  };
  names.forEach((n, i) => {
    xterm[n] = a[i];
    xterm["bright" + n[0].toUpperCase() + n.slice(1)] =
      i === 0 ? muted : lighten(a[i]);
  });
  return { name, ui: { bg, bg2, fg, accent, muted }, xterm, ansi: a };
});

const QUICK_DEFAULTS = [
  "cd ..",
  "cd ../..",
  "cd ~",
  "D:",
  "C:",
  "ls",
  "git status",
  "clear",
];

const load = (k, d) => {
  try {
    return JSON.parse(localStorage.getItem(k)) ?? d;
  } catch {
    return d;
  }
};
let themeIdx = Math.max(
  0,
  THEMES.findIndex((t) => t.name === load("themeName", "macOS Pro")),
);
let opacity = load("opacity", 100);
let fontSize = load("fontSize", 14);
let quick = load("quick", QUICK_DEFAULTS);
let lineHeight = load("lineHeight", 1.2);
const FONTS = [
  ["CaskaydiaCove Nerd Font (bundled)", "'CaskaydiaCove NF'"],
  ["Cascadia Mono", "'Cascadia Mono'"],
  ["Cascadia Code", "'Cascadia Code'"],
  ["Consolas", "Consolas"],
  ["Lucida Console", "'Lucida Console'"],
  ["Courier New", "'Courier New'"],
  ["JetBrains Mono", "'JetBrains Mono'"],
  ["Fira Code", "'Fira Code'"],
  ["Source Code Pro", "'Source Code Pro'"],
];
let fontIdx = Math.max(
  0,
  FONTS.findIndex((f) => f[0] === load("fontName", FONTS[0][0])),
);
// the bundled Nerd Font stays in the chain so prompt glyphs keep rendering whichever font is picked
const fontStack = () =>
  `${FONTS[fontIdx][1]}, 'CaskaydiaCove NF', 'Cascadia Mono', Consolas, monospace`;

const tabs = []; // { id, el, pane, term, fit }
let active = null;
let tabCount = 0;

const $ = (id) => document.getElementById(id);
const tabsEl = $("tabs");
const termsEl = $("terminals");

/* ---------- theme ---------- */
function applyTheme() {
  const t = THEMES[themeIdx];
  const r = document.documentElement.style;
  for (const [k, v] of Object.entries(t.ui)) r.setProperty("--" + k, v);
  const a = opacity / 100;
  r.setProperty("--bga", rgba(t.ui.bg, a));
  r.setProperty("--bg2a", rgba(t.ui.bg2, a));
  tabs.forEach((tab) => (tab.term.options.theme = t.xterm));
  localStorage.setItem("themeName", JSON.stringify(t.name));
  document
    .querySelectorAll(".card")
    .forEach((c, i) => c.classList.toggle("sel", i === themeIdx));
}

function buildThemeGrid() {
  const grid = $("theme-grid");
  THEMES.forEach((t, i) => {
    const [k, r, g, y, b, m] = t.ansi;
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="preview" style="background:${t.ui.bg};color:${t.ui.fg}">
        <div><span class="pl" style="background:${b};color:${t.ui.bg}">user</span><span class="pl" style="background:${m};color:${t.ui.bg}">~/dev</span><span class="pl" style="background:${g};color:${t.ui.bg}">main</span></div>
        <div><span style="color:${g}">❯</span> git status</div>
        <div style="color:${t.ui.muted}">On branch main</div>
        <div><span style="color:${r}">■</span><span style="color:${y}">■</span><span style="color:${g}">■</span><span style="color:${b}">■</span><span style="color:${m}">■</span></div>
      </div>
      <div class="name">${t.name}</div>`;
    card.onclick = () => {
      themeIdx = i;
      applyTheme();
    };
    grid.appendChild(card);
  });
}

/* ---------- tabs ---------- */
async function newTab() {
  const pane = document.createElement("div");
  pane.className = "pane";
  termsEl.appendChild(pane);

  const term = new Terminal({
    fontFamily: fontStack(),
    fontSize,
    lineHeight,
    allowTransparency: true,
    cursorBlink: true,
    cursorStyle: "bar",
    allowProposedApi: true,
    scrollback: 10000,
    overviewRuler: { width: 6 },
    theme: THEMES[themeIdx].xterm,
    // ConPTY reflows the screen itself on resize; without this xterm reflows too and the two fight, losing/misplacing text
    windowsPty: { backend: "conpty", buildNumber: window.term.winBuild },
  });
  const fit = new FitAddon.FitAddon();
  term.loadAddon(fit);
  term.loadAddon(new WebLinksAddon.WebLinksAddon());
  term.open(pane);
  pane.classList.add("active");
  fit.fit();
  pane.classList.remove("active");

  const id = await window.term.create(term.cols, term.rows);
  const el = document.createElement("div");
  el.className = "tab";
  el.draggable = true;
  el.innerHTML = `<span class="label">PowerShell ${++tabCount}</span><span class="x">×</span>`;
  const tab = { id, el, pane, term, fit };
  tabs.push(tab);
  tabsEl.appendChild(el);

  term.onData((d) => window.term.write(id, d));
  // right-click / menu pastes arrive as native paste events; route them through pasteText too
  pane.addEventListener(
    "paste",
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      const t = e.clipboardData.getData("text");
      if (t) pasteText(id, t);
    },
    true,
  );
  enableClickToMove(term, pane, id);
  // ConPTY redraws its whole viewport on every resize, so only the settled size is sent to it.
  let resizeTimer = null,
    sent = { cols: term.cols, rows: term.rows };
  term.onResize(({ cols, rows }) => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (cols === sent.cols && rows === sent.rows) return;
      sent = { cols, rows };
      window.term.resize(id, cols, rows);
    }, 120);
  });
  // Child processes (npm -> cmd.exe, etc.) title the console with their exe path; keep the folder name the prompt set instead
  term.onTitleChange((t) => {
    if (t && !/\.exe$/i.test(t.trim()))
      el.querySelector(".label").textContent =
        t.split(/[\\/]/).pop().slice(0, 24) || t;
  });
  term.attachCustomKeyEventHandler((e) => {
    if (e.type !== "keydown") return true;
    if (
      e.ctrlKey &&
      !e.altKey &&
      e.code === "KeyC" &&
      (e.shiftKey || term.hasSelection())
    ) {
      navigator.clipboard.writeText(term.getSelection());
      if (!e.shiftKey) term.clearSelection();
      return false;
    }
    if (e.ctrlKey && !e.altKey && e.code === "KeyV") {
      e.preventDefault(); // otherwise the textarea's native paste fires too and the text lands twice
      navigator.clipboard.readText().then((t) => t && pasteText(id, t));
      return false;
    }
    // ESC+CR (Alt+Enter) is bound to AddLine in prompt.ps1
    if (e.shiftKey && !e.ctrlKey && !e.altKey && e.key === "Enter") {
      e.preventDefault(); // suppresses the keypress event, which xterm would otherwise turn into a plain Enter
      window.term.write(id, "\x1b\r");
      return false;
    }
    return true;
  });
  el.addEventListener("dragstart", (e) => {
    dragTab = tab;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", "");
    setTimeout(() => el.classList.add("dragging"), 0);
  });
  el.addEventListener("dragend", () => {
    dragTab = null;
    el.classList.remove("dragging");
  });
  el.addEventListener("click", () => select(tab));
  el.querySelector(".x").addEventListener("click", (e) => {
    e.stopPropagation();
    window.term.kill(id);
    closeTab(tab);
  });
  select(tab);
}

// Dragging a tab left/right reorders it live: it moves before the first tab whose midpoint is right of the pointer.
let dragTab = null;
tabsEl.addEventListener("dragover", (e) => {
  if (!dragTab) return;
  e.preventDefault();
  const others = tabs.filter((t) => t !== dragTab);
  const next = others.find((t) => {
    const r = t.el.getBoundingClientRect();
    return e.clientX < r.left + r.width / 2;
  });
  const from = tabs.indexOf(dragTab);
  tabs.splice(from, 1);
  tabs.splice(next ? tabs.indexOf(next) : tabs.length, 0, dragTab);
  if (next) {
    if (dragTab.el.nextSibling !== next.el)
      tabsEl.insertBefore(dragTab.el, next.el);
  } else if (tabsEl.lastChild !== dragTab.el) tabsEl.appendChild(dragTab.el);
});
tabsEl.addEventListener("drop", (e) => e.preventDefault());

// A raw newline would run the pasted line immediately; Alt+Enter (AddLine in prompt.ps1) just starts a new line.
function pasteText(id, text) {
  window.term.write(
    id,
    text.replace(/(\r\n|\r|\n)+$/, "").replace(/\r\n|\r|\n/g, "\x1b\r"),
  );
}

// Clicking inside the line being typed moves the cursor there by sending the right number of arrow keys.
function enableClickToMove(term, pane, id) {
  let down = null;
  pane.addEventListener("mousedown", (e) => {
    down = e.button === 0 ? { x: e.clientX, y: e.clientY } : null;
  });
  pane.addEventListener("mouseup", (e) => {
    if (!down || e.button !== 0) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    down = null;
    const buf = term.buffer.active;
    if (moved > 4 || term.hasSelection() || buf.type !== "normal") return;
    const screen = term.element
      .querySelector(".xterm-screen")
      .getBoundingClientRect();
    const col = Math.floor(
      (e.clientX - screen.left) / (screen.width / term.cols),
    );
    const row = Math.floor(
      (e.clientY - screen.top) / (screen.height / term.rows),
    );
    if (col < 0 || col >= term.cols || row < 0 || row >= term.rows) return;
    // the editable region is the cursor's line plus the wrapped rows around it
    let first = buf.cursorY,
      last = buf.cursorY;
    while (first > 0 && buf.getLine(buf.viewportY + first)?.isWrapped) first--;
    while (
      last < term.rows - 1 &&
      buf.getLine(buf.viewportY + last + 1)?.isWrapped
    )
      last++;
    if (row < first || row > last) return;
    const delta =
      row * term.cols + col - (buf.cursorY * term.cols + buf.cursorX);
    if (delta)
      window.term.write(
        id,
        (delta > 0 ? "\x1b[C" : "\x1b[D").repeat(Math.abs(delta)),
      );
  });
}

function select(tab) {
  active = tab;
  tabs.forEach((t) => {
    t.el.classList.toggle("active", t === tab);
    t.pane.classList.toggle("active", t === tab);
  });
  tab.fit.fit();
  tab.term.focus();
}

function closeTab(tab) {
  const i = tabs.indexOf(tab);
  if (i < 0) return;
  tabs.splice(i, 1);
  tab.el.remove();
  tab.pane.remove();
  tab.term.dispose();
  if (!tabs.length) return newTab();
  if (active === tab) select(tabs[Math.max(0, i - 1)]);
}

window.term.onData((id, d) => tabs.find((t) => t.id === id)?.term.write(d));
window.term.onExit((id) => {
  const t = tabs.find((t) => t.id === id);
  if (t) closeTab(t);
});
let fitFrame = 0;
const refit = () => {
  cancelAnimationFrame(fitFrame);
  fitFrame = requestAnimationFrame(() => {
    if (!active) return;
    const dims = active.fit.proposeDimensions();
    if (
      dims &&
      Number.isFinite(dims.cols) &&
      (dims.cols !== active.term.cols || dims.rows !== active.term.rows)
    )
      active.fit.fit();
  });
};
new ResizeObserver(refit).observe(termsEl);
window.addEventListener("resize", refit);

function setFont(n) {
  fontSize = Math.min(28, Math.max(9, n));
  localStorage.setItem("fontSize", fontSize);
  tabs.forEach((t) => {
    t.term.options.fontSize = fontSize;
    t.fit.fit();
  });
}

function setLineHeight(n) {
  lineHeight = Math.min(2, Math.max(1, Math.round(n * 100) / 100));
  localStorage.setItem("lineHeight", lineHeight);
  tabs.forEach((t) => {
    t.term.options.lineHeight = lineHeight;
    t.fit.fit();
  });
}

function setFontFamily(i) {
  fontIdx = i;
  localStorage.setItem("fontName", JSON.stringify(FONTS[i][0]));
  tabs.forEach((t) => {
    t.term.options.fontFamily = fontStack();
    t.fit.fit();
  });
}

const fontSel = $("font-family");
FONTS.forEach(([name], i) => {
  const o = document.createElement("option");
  o.value = i;
  o.textContent = name;
  o.style.fontFamily = FONTS[i][1];
  fontSel.appendChild(o);
});
fontSel.value = fontIdx;
fontSel.onchange = () => setFontFamily(Number(fontSel.value));
const lhSlider = $("line-height");
lhSlider.value = lineHeight;
$("line-height-val").textContent = lineHeight.toFixed(2);
lhSlider.oninput = () => {
  setLineHeight(Number(lhSlider.value));
  $("line-height-val").textContent = lineHeight.toFixed(2);
};

/* ---------- quick commands ---------- */
const menu = $("quick-menu");

function renderQuick() {
  const list = $("quick-list");
  list.innerHTML = "";
  if (!quick.length)
    list.innerHTML =
      '<div class="q-empty">No commands yet. Add one below.</div>';
  quick.forEach((cmd, i) => {
    const row = document.createElement("div");
    row.className = "q-item";
    row.innerHTML =
      '<span class="cmd"></span><span class="del" title="Remove">✕</span>';
    row.querySelector(".cmd").textContent = cmd;
    row.onclick = () => {
      pasteCommand(cmd);
      closeMenu();
    };
    row.querySelector(".del").onclick = (e) => {
      e.stopPropagation();
      quick.splice(i, 1);
      saveQuick();
    };
    list.appendChild(row);
  });
}

function saveQuick() {
  localStorage.setItem("quick", JSON.stringify(quick));
  renderQuick();
}

// Types the command at the prompt without pressing Enter.
function pasteCommand(cmd) {
  if (!active) return;
  window.term.write(active.id, cmd);
  active.term.focus();
}

function addQuick() {
  const input = $("quick-input");
  const v = input.value.trim();
  if (!v) return;
  if (!quick.includes(v)) quick.push(v);
  input.value = "";
  saveQuick();
}

function closeMenu() {
  menu.classList.add("hidden");
  active?.term.focus();
}
$("quick-btn").onclick = (e) => {
  e.stopPropagation();
  menu.classList.toggle("hidden");
  if (!menu.classList.contains("hidden")) $("quick-input").focus();
};
$("quick-add-btn").onclick = addQuick;
$("quick-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") addQuick();
});
document.addEventListener("mousedown", (e) => {
  if (!menu.contains(e.target) && e.target.id !== "quick-btn")
    menu.classList.add("hidden");
});

/* ---------- settings + window controls ---------- */
const settings = $("settings");
const closeSettings = () => {
  settings.classList.add("hidden");
  active?.term.focus();
};
$("settings-btn").onclick = () => settings.classList.remove("hidden");
$("settings-close").onclick = closeSettings;
settings.addEventListener("mousedown", (e) => {
  if (e.target === settings) closeSettings();
});
$("new-tab").onclick = newTab;
$("w-close").onclick = () => window.term.close();
const opSlider = $("opacity");
opSlider.value = opacity;
$("opacity-val").textContent = opacity + "%";
opSlider.oninput = () => {
  opacity = Number(opSlider.value);
  $("opacity-val").textContent = opacity + "%";
  localStorage.setItem("opacity", opacity);
  applyTheme();
};
document.querySelectorAll(".rs").forEach((h) => {
  h.addEventListener("pointerdown", (e) => {
    h.setPointerCapture(e.pointerId);
    window.term.resizeStart(h.dataset.edge);
  });
  h.addEventListener("pointerup", () => window.term.resizeEnd());
  h.addEventListener("lostpointercapture", () => window.term.resizeEnd());
});
window.term.onMaxState((m, native) => {
  document.body.classList.toggle("maximized", m);
  if (native) document.body.classList.add("native");
});
$("w-min").onclick = () => window.term.minimize();
$("w-max").onclick = () => window.term.maximize();

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeSettings();
    menu.classList.add("hidden");
    return;
  }
  if (!e.ctrlKey) return;
  if (e.code === "KeyT") {
    e.preventDefault();
    newTab();
  } else if (e.code === "KeyW") {
    e.preventDefault();
    if (active) {
      window.term.kill(active.id);
      closeTab(active);
    }
  } else if (e.code === "Equal") setFont(fontSize + 1);
  else if (e.code === "Minus") setFont(fontSize - 1);
  else if (e.code === "Digit0") setFont(14);
  else if (e.code === "Tab") {
    e.preventDefault();
    const i = tabs.indexOf(active);
    select(tabs[(i + (e.shiftKey ? tabs.length - 1 : 1)) % tabs.length]);
  }
});

(async () => {
  buildThemeGrid();
  renderQuick();
  applyTheme();
  // the bundled Nerd Font must be ready before xterm measures its cells
  await Promise.all(
    ["400", "700"].map((w) =>
      document.fonts.load(`${w} 14px "CaskaydiaCove NF"`),
    ),
  ).catch(() => {});
  newTab();
})();
