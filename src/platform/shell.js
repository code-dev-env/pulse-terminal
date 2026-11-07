const fs = require("fs");
const os = require("os");
const path = require("path");
const { isWin } = require("./index");

// Which shell to start, and how. candidates() returns specs in order of preference; main.js tries them in turn,
// so a missing shell, a failed start or (on Linux) a shell that dies immediately falls through to the next, plainer one.
//   spec = { label, file, args, env? }

const SCRIPTS = path.join(__dirname, "..", "shell");

// The shell scripts ship inside app.asar, which an external shell can't read, so copies go to a private temp folder.
let dir = null;
function scriptsDir() {
  if (!dir) {
    dir = path.join(os.tmpdir(), `pulse-terminal-${process.pid}`);
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function script(name) {
  const out = path.join(scriptsDir(), name);
  if (!fs.existsSync(out)) {
    let text = fs.readFileSync(path.join(SCRIPTS, name), "utf8");
    // always LF for bash/zsh: a CRLF checkout of the repo would otherwise break them
    if (!name.endsWith(".ps1")) text = text.replace(/\r\n/g, "\n");
    fs.writeFileSync(out, text, "utf8");
  }
  return out;
}

function cleanup() {
  if (!dir) return;
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {}
  dir = null;
}

const powershellArgs = () => [
  "-NoLogo",
  "-NoExit",
  "-ExecutionPolicy",
  "Bypass",
  "-Command",
  `. '${script("prompt.ps1")}'`,
];

/* ---------- Windows ---------- */

// PowerShell 7+ (pwsh) if installed, else null so the caller falls back to the inbox Windows PowerShell 5.1
function findPwsh() {
  const dirs = (process.env.PATH || "").split(path.delimiter).filter(Boolean);
  // PATH can be incomplete when the packaged exe is launched from Explorer/a shortcut, so also try the known install spots
  dirs.push(
    path.join(
      process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local"),
      "Microsoft",
      "WindowsApps",
    ),
    path.join(
      process.env.ProgramFiles || "C:\\Program Files",
      "PowerShell",
      "7",
    ),
  );
  for (const d of dirs) {
    const f = path.join(d, "pwsh.exe");
    // The Store/winget install is an app-execution alias (reparse point): existsSync/statSync fail on it with EACCES, lstat doesn't
    try {
      fs.lstatSync(f);
      return f;
    } catch {}
  }
  return null;
}

function windowsCandidates() {
  const out = [];
  const pwsh = findPwsh();
  if (pwsh) out.push({ label: "PowerShell", file: pwsh, args: powershellArgs() });
  out.push({ label: "PowerShell", file: "powershell.exe", args: powershellArgs() });
  return out;
}

const firstExisting = (files) => files.find((f) => f && fs.existsSync(f)) || null;

// Extra shells offered in the new-tab menu. `integrated` shells load src/shell/prompt.ps1, which tells the app when the
// prompt is ready (see the ct-prompt marker in renderer.js); the others are started as they are.
function windowsProfiles() {
  const sys = path.join(process.env.SystemRoot || "C:\\Windows", "System32");
  const pf = [process.env.ProgramFiles, process.env["ProgramFiles(x86)"], process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, "Programs")];
  const list = [{ id: "default", label: "PowerShell", integrated: true, specs: windowsCandidates() }];
  if (findPwsh())
    list.push({
      id: "winps",
      label: "Windows PowerShell",
      integrated: true,
      specs: [{ label: "PowerShell", file: "powershell.exe", args: powershellArgs() }],
    });
  list.push({
    id: "cmd",
    label: "Command Prompt",
    integrated: false,
    specs: [{ label: "cmd", file: path.join(sys, "cmd.exe"), args: [] }],
  });
  const wsl = firstExisting([path.join(sys, "wsl.exe")]);
  if (wsl)
    list.push({ id: "wsl", label: "WSL", integrated: false, specs: [{ label: "wsl", file: wsl, args: ["--cd", "~"] }] });
  const bash = firstExisting(pf.filter(Boolean).map((d) => path.join(d, "Git", "bin", "bash.exe")));
  if (bash)
    list.push({
      id: "gitbash",
      label: "Git Bash",
      integrated: false,
      specs: [{ label: "bash", file: bash, args: ["--login", "-i"] }],
    });
  return list;
}

/* ---------- Linux ---------- */

const isExecutable = (f) => {
  try {
    fs.accessSync(f, fs.constants.X_OK);
    return fs.statSync(f).isFile();
  } catch {
    return false;
  }
};

// Any shell without a dedicated integration (fish, dash, ...) is started untouched. A tiny sh wrapper prints the startup
// banner first, so it still looks like the rest of the app (it just has no custom prompt).
const WRAP =
  'if [ -n "$CT_BANNER" ] && [ -f "$CT_BANNER" ]; then cat "$CT_BANNER"; rm -f "$CT_BANNER"; fi; exec "$0"';
function plain(file, label) {
  return isExecutable("/bin/sh")
    ? { label, file: "/bin/sh", args: ["-c", WRAP, file] }
    : { label, file, args: [] };
}

// zsh only reads its startup files from $ZDOTDIR. Point that at a stub which loads the user's own files first and then
// ours, then restores their ZDOTDIR for everything started from the shell.
function zshDotDir() {
  const d = path.join(scriptsDir(), "zsh");
  if (!fs.existsSync(d)) {
    fs.mkdirSync(d, { recursive: true });
    fs.writeFileSync(
      path.join(d, ".zshenv"),
      '[ -f "$CT_ORIG_ZDOTDIR/.zshenv" ] && . "$CT_ORIG_ZDOTDIR/.zshenv"\n',
    );
    fs.writeFileSync(
      path.join(d, ".zshrc"),
      `ZDOTDIR="$CT_ORIG_ZDOTDIR"\n[ -f "$ZDOTDIR/.zshrc" ] && . "$ZDOTDIR/.zshrc"\n. '${script("prompt.zsh")}'\n`,
    );
  }
  return d;
}

function linuxCandidates() {
  const wanted = [
    process.env.SHELL,
    "/bin/bash",
    "/usr/bin/bash",
    "/bin/zsh",
    "/usr/bin/zsh",
    "/bin/sh",
  ];
  const seen = new Set();
  const out = [];
  for (const file of wanted) {
    if (!file || !path.isAbsolute(file) || !isExecutable(file)) continue;
    let real = file;
    try {
      real = fs.realpathSync(file); // /bin/bash and /usr/bin/bash are usually the same file
    } catch {}
    if (seen.has(real)) continue;
    seen.add(real);
    const label = path.basename(file);
    if (label === "bash")
      out.push({ label, file, args: ["--rcfile", script("prompt.bash"), "-i"] });
    else if (label === "zsh")
      out.push({
        label,
        file,
        args: ["-i"],
        env: {
          ZDOTDIR: zshDotDir(),
          CT_ORIG_ZDOTDIR: process.env.ZDOTDIR || os.homedir(),
        },
      });
    else if (label === "pwsh")
      out.push({ label, file, args: powershellArgs() });
    // the same shell with no integration, in case the integrated start fails
    out.push(plain(file, label));
  }
  return out;
}

/* ---------- shared ---------- */

let cached = null;
function candidates() {
  return (cached ??= isWin ? windowsCandidates() : linuxCandidates());
}

// Name shown on new tabs until the shell sets its own title
const label = () => (isWin ? "PowerShell" : (candidates()[0]?.label ?? "Terminal"));

let profileList = null;
const allProfiles = () =>
  (profileList ??= isWin
    ? windowsProfiles()
    : [{ id: "default", label: label(), integrated: false, specs: candidates() }]);

// What the renderer is told about (no file paths): id, label and whether the shell reports its prompt
const profiles = () => allProfiles().map(({ id, label, integrated }) => ({ id, label, integrated }));

// Shell specs for a profile id; an unknown id (the renderer is untrusted input) falls back to the default profile
const candidatesFor = (id) => (allProfiles().find((p) => p.id === id) || allProfiles()[0]).specs;

// Environment for a shell: when launched from an AppImage or a desktop entry the app's own variables would otherwise leak
// into every program started from the terminal.
const LEAKY = ["APPIMAGE", "APPDIR", "ARGV0", "OWD", "CHROME_DESKTOP", "ELECTRON_RUN_AS_NODE"];
function env(spec, banner, light) {
  const e = { ...process.env, CT_BANNER: banner };
  if (!isWin) for (const k of LEAKY) delete e[k];
  // Programs pick truecolor and per-terminal quirks from these (Windows Terminal sets WT_SESSION in the same spirit).
  // COLORFGBG ("foreground;background" palette indexes) is how vim and others tell a light theme from a dark one; the
  // colour query they would otherwise use (OSC 11) can't get its reply back through Windows' ConPTY.
  e.COLORFGBG = light ? "0;15" : "15;0";
  e.COLORTERM ??= "truecolor";
  e.TERM_PROGRAM = "PulseTerminal";
  e.TERM_PROGRAM_VERSION = version();
  return Object.assign(e, spec.env);
}

function version() {
  try {
    return require("electron").app.getVersion();
  } catch {
    return "";
  }
}

module.exports = { candidates, candidatesFor, profiles, label, env, cleanup };
