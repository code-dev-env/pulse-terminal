# Pulse Terminal

A fast, multi-tab, fully customizable terminal for Windows and Linux, built with Electron and [xterm.js](https://xtermjs.org/). It ships with a themed powerline prompt, a system-info startup banner, and native window snapping.

## Features

- **Multi-tab sessions**, each backed by its own shell process through a PTY ([node-pty](https://github.com/microsoft/node-pty), ConPTY on Windows). Tabs can be reordered by dragging and scroll horizontally when they overflow.
- **Shells**: PowerShell 7 (falling back to Windows PowerShell 5.1) on Windows; your login shell on Linux, with the full prompt for bash and zsh (see [Linux](#linux)).
- **33 built-in color themes**, dark and light, including Dracula, Nord, Gruvbox, Tokyo Night, Catppuccin Mocha, Solarized, Synthwave, Matrix, Paper, and more.
- **Powerline-style prompt** showing user, working directory, and git branch with a dirty-state indicator. It uses the terminal's ANSI palette, so it follows the active theme.
- **Startup banner** with a mascot and a system snapshot (OS, CPU, memory, disk, uptime).
- **Quick commands**: a customizable list of commands you can run with one click.
- **Adjustable window opacity, font family, font size, and line height**, saved between sessions.
- **Editing conveniences**: click inside the current input line to move the cursor, multi-line input with `Shift+Enter` / `Alt+Enter`, and multi-line paste that doesn't execute immediately.
- **Native window behavior**: Windows Snap Layouts and edge snapping on the frameless and transparent window; on Linux the window manager handles maximize, resize and snapping.
- **Multiple windows, one process**: launching the app again (portable, installed or AppImage) opens another window in the running instance. All windows share the same settings and changes show up in every open window.
- **GPU rendering and flow control**: WebGL terminal rendering (with an automatic fallback to the DOM renderer), batched PTY output, and backpressure so heavy output stays smooth and Ctrl+C stays responsive.
- Bundled [Cascadia Code Nerd Font](https://www.nerdfonts.com/) (CaskaydiaCove NF) for prompt glyphs.

## Requirements

- **Windows**: Windows 10 or later (x64)
- **Linux**: a 64-bit (x64) distribution with a desktop session. Developed and tested on Ubuntu (WSL2 / WSLg); other distributions should work but are untested.
- [Node.js](https://nodejs.org/) 18 or later and npm (to run from source or build)
- Build tools for native modules: `node-pty` ships Windows prebuilds but is compiled from source on Linux (`build-essential` and `python3`)

## Getting started

```sh
git clone https://github.com/code-dev-env/pulse-terminal.git
cd pulse-terminal
npm install
npm start
```

On Windows you can also run `launch.bat` after installing dependencies. On Linux, if Electron's sandbox refuses to start from a source checkout, run `npx electron . --no-sandbox`.

## Building

Packages are built on the platform they target, because `node-pty` is a native module.

### Windows

```powershell
npm run dist            # portable exe and installer
npm run dist:portable   # portable exe only
npm run dist:installer  # installer only
```

Output goes to `dist/`: `Pulse Terminal Portable.exe` (portable) and `Pulse Terminal Setup.exe` (installer, per-user, lets you pick the install folder). The installer starts faster than the portable build, which has to unpack itself to a temp folder on every launch.

### Linux

```sh
npm run dist:linux      # AppImage and .deb
npm run dist:appimage   # AppImage only (portable)
npm run dist:deb        # .deb only (installable)
```

Output goes to `dist/`: `Pulse-Terminal-<version>-x86_64.AppImage` and `pulse-terminal_<version>_amd64.deb`. The build needs `build-essential` and `python3` so that `node-pty` can be compiled for Electron.

### Continuous integration

`.github/workflows/build.yml` builds both platforms on every push and pull request. Pushing a tag like `v1.1.0` also publishes the Windows and Linux packages as a GitHub Release.

## Linux

**Install**

- **.deb** (Debian, Ubuntu and derivatives): `sudo apt install ./pulse-terminal_<version>_amd64.deb`
- **AppImage** (portable, any distribution): `chmod +x Pulse-Terminal-*.AppImage && ./Pulse-Terminal-*.AppImage`
  - AppImages need FUSE 2: `sudo apt install libfuse2` (`libfuse2t64` on Ubuntu 24.04 and later), or run with `--appimage-extract-and-run`.
  - On distributions that restrict unprivileged user namespaces (for example Ubuntu 24.04) Chromium's sandbox can refuse to start from an AppImage. Run it with `--no-sandbox`, or use the `.deb`, which ships a properly configured sandbox helper.

**Shells.** New tabs start `$SHELL`. bash and zsh get the full experience (powerline prompt, banner, `clear` and `Ctrl+L` redraw the banner, `Alt+Enter` for a new line); your own `~/.bashrc` / `~/.zshrc` load first. PowerShell (`pwsh`) uses the same prompt script as on Windows. Any other shell (fish, dash, ...) starts untouched, after the startup banner.

**Fallbacks.** If something is missing or broken the app steps down rather than failing:

- If the preferred shell can't start, or exits immediately with an error (for example a startup file that fails), the next candidate is tried: your shell without the integration, then bash, zsh and `sh`.
- WebGL rendering falls back to xterm's DOM renderer when the GPU or driver can't provide it.
- No compositor (transparent windows render black): start with `PULSE_OPAQUE=1` (or the `--opaque` flag) for a normal opaque window.
- A desktop where maximize or resize misbehaves: start with `PULSE_MANUAL_WINDOW=1` to use the app's own resize handles and maximize logic.

**Differences from Windows.** `Ctrl+Z` is normal job control (the word-wise undo is a PowerShell feature). Multi-line paste uses bracketed paste. The font list offers common Linux monospace fonts.

## Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `Ctrl+T` | New tab |
| `Ctrl+W` | Close current tab |
| `Ctrl+Tab` / `Ctrl+Shift+Tab` | Next / previous tab |
| `Ctrl+C` / `Ctrl+Shift+C` | Copy selection (`Ctrl+C` copies only when text is selected, otherwise it interrupts) |
| `Ctrl+V` / `Ctrl+Shift+V` | Paste |
| `Shift+Enter` / `Alt+Enter` | Insert a new line without running the command |
| `Ctrl+Z` | Undo back to the previous word boundary (PowerShell on Windows) |
| `Ctrl++` / `Ctrl+-` | Increase / decrease font size |
| `Ctrl+0` | Reset font size |
| `Ctrl+L` | Clear screen and redraw banner |
| `Esc` | Close settings or menus |

## Project structure

```
src/
  main.js          Electron main process: windows, settings, PTY management, startup banner
  preload.js       Secure bridge between main and renderer (context isolation)
  renderer.js      Tabs, themes, settings, and xterm.js setup
  index.html       UI markup
  style.css        UI styles
  platform/
    index.js       Platform checks and OS-specific helpers (OS name, disk root)
    shell.js       Which shell to start and how, with fallbacks (Windows and Linux)
    window.js      Native window handling per platform, and the Linux opaque fallback
  shell/
    prompt.ps1     PowerShell prompt and banner script
    prompt.bash    bash prompt and banner script
    prompt.zsh     zsh prompt and banner script
  fonts/           Bundled Nerd Font files
build/             App icons and the icon generation script
.github/workflows/ CI: build and release
```

## Configuration

Theme, font family, font size, line height, opacity, and quick commands are changed from the Settings panel and the Quick commands menu. Changes are saved automatically to `settings.json` in the app's data folder (under `%APPDATA%` on Windows, `~/.config` on Linux) and are used by every window and every future launch. The quick commands start from a small generic list (`cd ..`, `ls`, `git status`, ...); add or remove your own and they are kept.

## Contributing

Issues and pull requests are welcome. For larger changes, please open an issue first to discuss what you would like to change. Platform-specific code lives in `src/platform/` and `src/shell/`; the rest of the app is shared.

## License

Released under the [MIT License](LICENSE).
