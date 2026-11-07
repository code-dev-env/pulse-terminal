# End-to-end tests (Windows)

These launch the real app and drive it through the Chrome DevTools Protocol, so every number and check includes the
IPC, ConPTY, xterm.js and rendering. They open a window on your desktop and use a throwaway settings folder in the
OS temp directory (your real settings are never touched).

```sh
npm install
npm run test:e2e                       # feature checks + startup + keystroke latency
node test/e2e.js thru                  # drain speed for plain / colour / unicode / long / short-line output
node test/e2e.js resizecheck           # edit line, cursor and scrollback stay correct across real window resizes
node test/e2e.js ctrlc2 tabs multiflood leak soak
```

`feat_*` are pass/fail feature checks; the others print measurements. `resizecheck` reports two numbers: the
edit-line/cursor checks must all pass (the stale-row bug PSReadLine 2.0 has after a resize), while the "history lines"
figure shows a known ConPTY artifact (one scrollback line can be lost or doubled when the window shrinks while the
input line wraps). Both versions of the app (before and after the changes in this folder's commit) behave the same.

Why the app keeps Windows' inbox ConPTY (`useConptyDll: false` in `src/main.js`): node-pty's bundled `conpty.dll` is
2.7x to 10x faster at draining output, but with it `resizecheck` fails on nearly every resize (the edit line comes
back wrong), and the same happens with xterm's reflow switched off. Run `resizecheck` before ever switching.

Helper programs run inside the terminal: `prod.js` (bulk output), `flood.js` (endless output), `probe.js` (terminal
queries), `rawecho.js` (shows the exact bytes the terminal sends), `syncprobe.js`, `imgprobe.js`.
