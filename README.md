# Pulse Terminal

A fast, multi-tab, fully customizable terminal for Windows, built with Electron and [xterm.js](https://xtermjs.org/). It ships with a themed powerline prompt, a system-info startup banner, and native Windows window snapping.

## Features

- **Multi-tab sessions**, each backed by its own shell process through ConPTY ([node-pty](https://github.com/microsoft/node-pty)). Tabs can be reordered by dragging and scroll horizontally when they overflow.
- **PowerShell 7 support**: uses `pwsh` when installed and falls back to Windows PowerShell 5.1.
- **33 built-in color themes**, dark and light, including Dracula, Nord, Gruvbox, Tokyo Night, Catppuccin Mocha, Solarized, Synthwave, Matrix, Paper, and more.
- **Powerline-style prompt** showing user, working directory, and git branch with a dirty-state indicator. It uses the terminal's ANSI palette, so it follows the active theme.
- **Startup banner** with a mascot and a system snapshot (OS, CPU, memory, disk, uptime).
- **Quick commands**: a customizable list of commands you can run with one click.
- **Adjustable window opacity, font family, font size, and line height**, saved between sessions.
- **Editing conveniences**: click inside the current input line to move the cursor, multi-line input with `Shift+Enter` / `Alt+Enter`, and multi-line paste that doesn't execute immediately.
- **Native window behavior**: Windows Snap Layouts and edge snapping on the frameless and transparent window.
- **Portable build is single-instance**: launching it again focuses the running window.
- Bundled [Cascadia Code Nerd Font](https://www.nerdfonts.com/) (CaskaydiaCove NF) for prompt glyphs.

## Requirements

- Windows 10 or later (x64)
- [Node.js](https://nodejs.org/) 18 or later and npm
- Build tools for native modules, if prebuilt binaries are unavailable for your platform (`node-pty` and `koffi`)

## Getting started

```powershell
git clone https://github.com/code-dev-env/pulse-terminal.git
cd pulse-terminal
npm install
npm start
```

On Windows you can also run `launch.bat` after installing dependencies.

## Building a portable executable

```powershell
npm run dist
```

The portable build is written to `dist/Pulse Terminal.exe`.

## Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `Ctrl+T` | New tab |
| `Ctrl+W` | Close current tab |
| `Ctrl+Tab` / `Ctrl+Shift+Tab` | Next / previous tab |
| `Ctrl+C` / `Ctrl+Shift+C` | Copy selection (`Ctrl+C` copies only when text is selected, otherwise it interrupts) |
| `Ctrl+V` / `Ctrl+Shift+V` | Paste |
| `Shift+Enter` / `Alt+Enter` | Insert a new line without running the command |
| `Ctrl+Z` | Undo back to the previous word boundary |
| `Ctrl++` / `Ctrl+-` | Increase / decrease font size |
| `Ctrl+0` | Reset font size |
| `Ctrl+L` | Clear screen and redraw banner |
| `Esc` | Close settings or menus |

## Project structure

```
src/
  main.js        Electron main process: window, PTY management, startup banner
  preload.js     Secure bridge between main and renderer (context isolation)
  renderer.js    Tabs, themes, settings, and xterm.js setup
  prompt.ps1     PowerShell prompt and banner script
  index.html     UI markup
  style.css      UI styles
  fonts/         Bundled Nerd Font files
build/           App icon and icon generation script
```

## Configuration

Theme, font family, font size, line height, opacity, and quick commands are stored in the app's local storage and can be changed from the Settings panel.

## Contributing

Issues and pull requests are welcome. For larger changes, please open an issue first to discuss what you would like to change.

## License

Released under the [MIT License](LICENSE).
