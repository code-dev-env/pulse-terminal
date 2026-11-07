// mode "hold": a frame split in two halves 120 ms apart inside a synchronized update; "cap": an update that never ends
const w = s => process.stdout.write(s);
const mode = process.argv[2] || 'hold';
w('\x1b[2J\x1b[H');
if (mode === 'hold') {
  w('\x1b[?2026h'); w('FRAME_HALF_A');
  setTimeout(() => { w('FRAME_HALF_B'); w('\x1b[?2026l'); w('\r\nSYNC_DONE\r\n'); }, 100);
} else {
  w('\x1b[?2026h'); w('NEVER_ENDS_VISIBLE_AFTER_CAP');
  setTimeout(() => { w('\x1b[?2026l'); w('\r\nSYNC_DONE\r\n'); }, 2500);
}
