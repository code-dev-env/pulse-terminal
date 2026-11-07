// prints every chunk it receives on stdin as JSON, so the exact bytes the terminal sent are visible
// usage: node rawecho.js [2004]   (2004 = ask the terminal for bracketed paste first)
process.stdin.setRawMode(true); process.stdin.resume(); process.stdin.setEncoding('utf8');
if (process.argv[2] === '2004') process.stdout.write('\x1b[?2004h');
process.stdout.write('RAWECHO_READY\r\n');
process.stdin.on('data', d => {
  if (d === '\x04') { process.stdout.write('\x1b[?2004l'); process.exit(0); }
  process.stdout.write('RAW:' + JSON.stringify(d) + '\r\n');
});
