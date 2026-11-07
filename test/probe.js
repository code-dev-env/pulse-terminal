const fs = require('fs'), path = require('path');
process.stdin.setRawMode(true); process.stdin.resume(); process.stdin.setEncoding('utf8');
let buf = ''; process.stdin.on('data', d => buf += d);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const q = async (name, seq, wait = 400) => { buf = ''; process.stdout.write(seq); await sleep(wait); const r = buf; return [name, r ? JSON.stringify(r) : 'NO RESPONSE']; };
(async () => {
  const res = {};
  const probes = [
    ['DA1 (ESC[c)', '\x1b[c'],
    ['DA2 (ESC[>c)', '\x1b[>c'],
    ['XTVERSION (ESC[>q)', '\x1b[>q'],
    ['DSR cursor pos (ESC[6n)', '\x1b[6n'],
    ['DECRQM sync-output 2026', '\x1b[?2026$p'],
    ['DECRQM bracketed-paste 2004', '\x1b[?2004$p'],
    ['DECRQM focus-events 1004', '\x1b[?1004$p'],
    ['DECRQM mode 2027 grapheme clustering', '\x1b[?2027$p'],
    ['DECRQM mode 2031/2048 in-band resize', '\x1b[?2048$p'],
    ['kitty keyboard protocol query (ESC[?u)', '\x1b[?u'],
    ['OSC 10 fg color query', '\x1b]10;?\x07'],
    ['OSC 11 bg color query', '\x1b]11;?\x07'],
    ['OSC 4 palette query', '\x1b]4;1;?\x07'],
    ['XTWINOPS text-area px (ESC[14t)', '\x1b[14t'],
    ['XTWINOPS cell px (ESC[16t)', '\x1b[16t'],
    ['XTWINOPS size chars (ESC[18t)', '\x1b[18t'],
    ['DECRQSS SGR', '\x1bP$qm\x1b\\'],
    ['XTGETTCAP RGB', '\x1bP+q524742\x1b\\'],
  ];
  for (const [n, s] of probes) { const [k, v] = await q(n, s); res[k] = v; }
  res['_size'] = process.stdout.columns + 'x' + process.stdout.rows;
  res['_env TERM/COLORTERM/TERM_PROGRAM/WT_SESSION'] = [process.env.TERM, process.env.COLORTERM, process.env.TERM_PROGRAM, process.env.WT_SESSION, 'COLORFGBG=' + process.env.COLORFGBG].join(' | ');
  fs.writeFileSync(path.join(__dirname, 'probe-out.json'), JSON.stringify(res, null, 1));
  process.stdout.write('\r\nPROBE_DONE\r\n'); process.exit(0);
})();
