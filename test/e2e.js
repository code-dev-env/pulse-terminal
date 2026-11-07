// End-to-end harness: launches the real Electron app and drives it over the Chrome DevTools Protocol.
// usage: node test/e2e.js [appdir] <test...>   (see test/README.md). Windows only.
const { spawn, execSync } = require('child_process');
const http = require('http');
const path = require('path');
const fs_ = require('fs');
const os = require('os');
const hasDir = process.argv[2] && fs_.existsSync(path.join(process.argv[2], 'package.json'));
const A = path.resolve(hasDir ? process.argv[2] : path.join(__dirname, '..')).replace(/\\/g, '/');
const tests = process.argv.slice(hasDir ? 3 : 2);
process.env.E2E_ROOT = A.replace(/\//g, '\\');
const T = __dirname.replace(/\\/g, '/');
const UD = path.join(os.tmpdir(), 'pulse-terminal-e2e').replace(/\\/g, '/'); // throwaway settings folder: never touches the real app's
const sleep = ms => new Promise(r => setTimeout(r, ms));
const hr = () => Number(process.hrtime.bigint()) / 1e6;
const pct = (a, p) => { a = [...a].sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.floor(a.length * p))]; };
const get = url => new Promise((res, rej) => http.get(url, r => { let b = ''; r.on('data', d => b += d); r.on('end', () => res(JSON.parse(b))); }).on('error', rej));

let proc, ws, seq = 0; const pend = new Map();
let launchT0 = 0, appLog = '', pageErrors = [];
async function launch() {
  const electron = require(A + '/node_modules/electron');
  launchT0 = hr();
  proc = spawn(process.env.E2E_EXE || electron, ['--remote-debugging-port=9333', '--user-data-dir=' + UD, ...(process.env.E2E_EXE ? [] : [A])], { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, CT_DEBUG: '1', CT_TEST_NOOPEN: '1' } });
  proc.stdout.on('data', d => { appLog += d; if (process.env.E2E_VERBOSE) process.stdout.write('[app] ' + d); });
  proc.stderr.on('data', d => { const s = String(d); if (!/GPU|dxgi|Autofill|DevTools listening/.test(s)) process.stderr.write('[app-err] ' + s); });
  let list;
  for (let i = 0; i < 200; i++) { try { list = await get('http://127.0.0.1:9333/json'); if (list.find(x => x.type === 'page')) break; } catch {} await sleep(50); }
  const page = list.find(x => x.type === 'page');
  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r));
  ws.addEventListener('message', m => { const o = JSON.parse(m.data); if (o.id && pend.has(o.id)) { pend.get(o.id)(o); pend.delete(o.id); } else if (o.method === 'Runtime.exceptionThrown') pageErrors.push('EXC ' + (o.params.exceptionDetails.exception?.description || o.params.exceptionDetails.text).slice(0, 200)); else if (o.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(o.params.type)) pageErrors.push(o.params.type + ' ' + o.params.args.map(a => a.value || a.description).join(' ').slice(0, 200)); else if (o.method === 'Log.entryAdded' && ['error', 'warning'].includes(o.params.entry.level)) pageErrors.push('log ' + o.params.entry.text.slice(0, 200)); });
  await send('Runtime.enable'); await send('Log.enable');
}
const send = (method, params = {}) => new Promise(r => { const id = ++seq; pend.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
async function ev(expr, await_ = true) {
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: await_, returnByValue: true, timeout: 600000 });
  if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails));
  return r.result?.result?.value;
}
function procs() { // working set (MB) of all processes belonging to this electron copy
  try {
    const out = execSync(`powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.ExecutablePath -like ($env:E2E_ROOT + '*electron.exe') } | ForEach-Object { $p = Get-Process -Id $_.ProcessId -ea 0; if($p){ '{0}|{1}|{2}' -f $_.ProcessId, ($_.CommandLine -replace '.*--type=([a-z-]+).*','$1' -replace '^.*electron.exe.*$','main'), [math]::Round($p.WorkingSet64/1MB) } }"`, { encoding: 'utf8' });
    return out.trim().split(/\r?\n/).filter(Boolean).map(l => { const [pid, type, mb] = l.split('|'); return { pid: +pid, type, mb: +mb }; });
  } catch { return []; }
}
const rss = () => { const p = procs(); const by = {}; p.forEach(x => by[x.type] = (by[x.type] || 0) + x.mb); return { total: p.reduce((a, x) => a + x.mb, 0), by }; };
const childShells = () => { try { return +execSync(`powershell -NoProfile -Command "$m=(Get-CimInstance Win32_Process | Where-Object { $_.ExecutablePath -like ($env:E2E_ROOT + '*electron.exe') -and $_.CommandLine -notmatch '--type' }).ProcessId; @(Get-CimInstance Win32_Process | Where-Object { $_.Name -in 'powershell.exe','conhost.exe','OpenConsole.exe' -and $_.CommandLine -match 'pulse|prompt.ps1' }).Count"`, { encoding: 'utf8' }).trim(); } catch { return -1; } };
async function quit() { try { await ev('window.close()', false); } catch {} await sleep(1500); try { proc.kill(); } catch {} try { execSync('taskkill /F /IM electron.exe /FI "MODULES eq node_pty*" >nul 2>&1'); } catch {} }

// in-page helpers
const HELPERS = `
window.__h = {
  tab: () => active,
  text: (n=40) => { const b = active.term.buffer.active; let s=''; let end=b.baseY+active.term.rows; while(end>b.baseY+1){ const l=b.getLine(end-1); if(l && l.translateToString(true)!=='') break; end--; } for (let i=Math.max(0,end-n); i<end; i++){ const l=b.getLine(i); if(!l) continue; const nx=b.getLine(i+1); const wr=!!(nx&&nx.isWrapped); s+=l.translateToString(!wr)+(wr?'':'\\n'); } return s; },
  waitText: (re, timeout=60000) => new Promise(res => { const t0=performance.now(); const iv=setInterval(()=>{ const s=window.__h.text(60); if(new RegExp(re).test(s)){clearInterval(iv);res({ok:true,ms:performance.now()-t0,s})} else if(performance.now()-t0>timeout){clearInterval(iv);res({ok:false,ms:timeout,s})} },10); }),
  type: (s) => (typeof sendInput === 'function' ? sendInput(active, s) : window.term.write(active.id, s)),
};`;

const results = [];
const out = (k, v) => { results.push([k, v]); console.log(`${k}: ${v}`); };

const T_ = {
  async boot() {
    // time to first usable prompt measured from process spawn
    const t = await ev(`window.__h.waitText('\\\\uE0B0', 20000).then(r=>r.ok)`);
    out('cold start: spawn -> prompt visible', `${(hr() - launchT0).toFixed(0)} ms (ok=${t})`);
    await sleep(1500);
    const m = rss(); out('idle memory, 1 tab (MB working set)', `${m.total} total  ${JSON.stringify(m.by)}`);
    const nav = await ev(`JSON.stringify({dcl: Math.round(performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart), load: Math.round(performance.timing.loadEventEnd - performance.timing.navigationStart), gl: !!active.gl, cols: active.term.cols, rows: active.term.rows, uni: active.term.unicode.activeVersion})`);
    out('page load timings / webgl / grid / unicode ver', nav);
  },
  async thru() {
    // end-to-end drain speed, with rAF jank sampling in the renderer
    await ev(`window.__frames=[]; (function f(last){ requestAnimationFrame(t=>{ if(last) window.__frames.push(t-last); f(t); }); })(0); 0`, false);
    for (const [mode, mb] of [['plain', 50], ['color', 50], ['unicode', 20], ['long', 20], ['short', 5]]) {
      await ev(`window.__frames.length=0; window.__h.type('cls\\r'); 0`, false); await sleep(800);
      const t0 = hr();
      await ev(`window.__h.type('node ${T}/prod.js ${mb} ${mode}\\r'); 0`, false);
      const r = await ev(`window.__h.waitText('DONE ${mode}', 240000)`);
      const s = (hr() - t0) / 1000;
      const fr = await ev(`JSON.stringify(window.__frames)`); const f = JSON.parse(fr);
      const slow = f.filter(x => x > 50).length, worst = Math.max(0, ...f);
      const m = /DONE \w+ ([\d.]+)MB (\d+)ms/.exec(r.s);
      out(`E2E drain [${mode}] ${mb}MB`, `${s.toFixed(2)}s => ${(mb / s).toFixed(1)} MB/s | frames=${f.length} p50=${pct(f, .5).toFixed(1)}ms p99=${pct(f, .99).toFixed(1)}ms worst=${worst.toFixed(0)}ms >50ms:${slow} | ok=${r.ok}`);
      await sleep(500);
    }
  },
  async latency() {
    await ev(`window.__h.type('cls\\r'); 0`, false); await sleep(1500);
    const r = await ev(`(async()=>{ const lat=[]; const t=active.term; for(let i=0;i<250;i++){ const ch=String.fromCharCode(97+i%26);
      const p = new Promise(res=>{ const d=t.onWriteParsed(()=>{ const ln=t.buffer.active.getLine(t.buffer.active.baseY+t.buffer.active.cursorY).translateToString(true); if(ln.includes(ch)){ d.dispose(); res(); } }); setTimeout(()=>{d.dispose();res()},1500); });
      const t0=performance.now(); window.term.write(active.id,ch); await p; await new Promise(r=>requestAnimationFrame(()=>r())); lat.push(performance.now()-t0);
      await new Promise(r=>setTimeout(r,25)); window.term.write(active.id,'\\x7f'); await new Promise(r=>setTimeout(r,40)); }
      return JSON.stringify(lat); })()`);
    const l = JSON.parse(r);
    out('keystroke -> glyph on screen (IPC+ConPTY+PSReadLine+xterm+frame), n=250', `p50=${pct(l, .5).toFixed(1)}ms p90=${pct(l, .9).toFixed(1)}ms p99=${pct(l, .99).toFixed(1)}ms max=${Math.max(...l).toFixed(1)}ms`);
  },
  async ctrlc() {
    await ev(`window.__h.type('cls\\r'); 0`, false); await sleep(1200);
    await ev(`window.__h.type('node -e "while(true){process.stdout.write(\\'y\\'.repeat(65536)+\\'\\\\r\\\\n\\')}"\\r'); 0`, false);
    await sleep(4000);
    const m1 = rss();
    const t0 = hr();
    await ev(`window.__h.type('\\x03'); 0`, false);
    await ev(`window.__h.type('echo ALIVE\\r'); 0`, false);
    const r = await ev(`window.__h.waitText('(?:^|\\\\n)ALIVE', 30000)`);
    out('Ctrl+C during infinite 64KB-line flood -> shell responsive', `${(hr() - t0).toFixed(0)} ms (ok=${r.ok})`);
    out('memory during flood (MB)', `${m1.total} ${JSON.stringify(m1.by)}`);
  },
  async ctrlc2() {
    const fs = require('fs');
    const variants = [
      ['idle node (setInterval) + Ctrl+C', `node -e "setInterval(()=>{},1000)"`, 1500],
      ['120B-line flood (node, sync writes) + Ctrl+C', `node ${T}/flood.js`, 3000],
      ['same flood, Ctrl+C pressed 5x', `node ${T}/flood.js`, 3000, 5],
      ['PowerShell 1..1e7 flood + Ctrl+C', `1..10000000 | % { "line $_ yyyyyyyyyyyyyyyyyyyyyyyyyyyyyy" }`, 3000],
      ['cmd-style: ping -t / yes-like via "type" loop', `while($true){ Get-Content ${T}/prod.js }`, 3000],
    ];
    for (const [name, cmd, warm, reps = 1] of variants) {
      await ev(`(async()=>{ const old=active; await newTab(); closeTab(old); })()`); await sleep(2500);
      await ev(`window.__h.type(${JSON.stringify(cmd + '\r')}); 0`, false);
      await sleep(warm);
      const t0 = hr();
      for (let i = 0; i < reps; i++) { await ev(`window.__h.type('\\x03'); 0`, false); if (reps > 1) await sleep(400); }
      // Windows discards typed-ahead input on Ctrl+C, so keep re-sending the probe command until the shell answers
      await sleep(250);
      const r = await ev(`(async()=>{ const t0=performance.now(); while(performance.now()-t0<20000){ window.__h.type('echo ALIVE_'+'MARK\\r'); const x=await window.__h.waitText('(?:^|\\\\n)ALIVE_MARK', 400); if(x.ok) return x; } return {ok:false,s:window.__h.text(10)}; })()`);
      out(`Ctrl+C: ${name}`, `${r.ok ? 'shell back in ' + (hr() - t0).toFixed(0) + ' ms' : 'NOT RESPONSIVE after 20s'}`);
      if (!r.ok) { out('  last screen lines', JSON.stringify(r.s.split('\n').slice(-5))); await ev(`window.__h.type('\\x03\\x03'); 0`, false); await sleep(3000); }
    }
  },
  async tabs() {
    const base = rss(); const t0 = hr();
    for (let i = 0; i < 20; i++) { await ev(`newTab(); 0`, false); await sleep(250); }
    await sleep(4000);
    const withTabs = rss();
    const gl = await ev(`tabs.filter(t=>t.gl).length + '/' + tabs.length + ' tabs with webgl'`);
    out('open 20 tabs', `${((hr() - t0) / 1000).toFixed(1)}s; mem ${base.total} -> ${withTabs.total} MB (${((withTabs.total - base.total) / 19).toFixed(0)} MB/tab); ${gl}; shells alive=${childShells()}`);
    // tab-switch latency
    const sw = await ev(`(async()=>{ const l=[]; for(let i=0;i<60;i++){ const t=tabs[i%tabs.length]; const t0=performance.now(); select(t); await new Promise(r=>requestAnimationFrame(()=>r())); l.push(performance.now()-t0);} return JSON.stringify(l); })()`);
    const l = JSON.parse(sw); out('tab switch (select + next frame) with 21 tabs', `p50=${pct(l, .5).toFixed(1)}ms p99=${pct(l, .99).toFixed(1)}ms max=${Math.max(...l).toFixed(1)}ms`);
    // close all but one
    const c0 = hr();
    await ev(`(async()=>{ while(tabs.length>1) closeTab(tabs[tabs.length-1]); })()`);
    await sleep(5000);
    const after = rss();
    out('close 20 tabs', `mem ${withTabs.total} -> ${after.total} MB (baseline ${base.total}); shells left alive=${childShells()} (expect 1-2)`);
  },
  async scrollback() {
    await ev(`window.__h.type('cls\\r'); 0`, false); await sleep(1000);
    const before = rss();
    await ev(`window.__h.type('node ${T}/prod.js 40 unicode\\r'); 0`, false);
    await ev(`window.__h.waitText('DONE unicode', 120000)`);
    const after = rss();
    out('10k-line scrollback filled (unicode content) memory', `${before.total} -> ${after.total} MB ${JSON.stringify(after.by)}`);
    const sb = await ev(`(async()=>{ const t=active.term; const t0=performance.now(); for(let i=0;i<100;i++){ t.scrollToTop(); t.scrollToBottom(); } return (performance.now()-t0)/200; })()`);
    out('scrollToTop/Bottom avg', `${sb.toFixed(2)} ms`);
  },
  async resize() {
    // window resize storm while output is flowing
    await ev(`window.__h.type('cls\\r'); 0`, false); await sleep(1000);
    await ev(`window.__h.type('node ${T}/prod.js 60 color\\r'); 0`, false);
    const t0 = hr();
    const rs = spawn('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', T + '/resize.ps1', '-n', '400'], { stdio: ['ignore', 'pipe', 'pipe'] });
    let rsOut = ''; rs.stdout.on('data', d => rsOut += d); rs.stderr.on('data', d => rsOut += d);
    const rsDone = new Promise(r => rs.on('close', r));
    const r = await ev(`window.__h.waitText('DONE color', 120000)`); await rsDone; console.log(rsOut.trim());
    out('150 window resizes during 30MB color flood', `drained ok=${r.ok}, total ${((hr() - t0) / 1000).toFixed(1)}s`);
    await sleep(1500);
    const d = await ev(`JSON.stringify({cols:active.term.cols,rows:active.term.rows,mainAlive:true})`);
    out('post-storm grid', d);
    // prompt still usable?
    await ev(`window.__h.type('echo POSTRESIZE_OK\\r'); 0`, false);
    const q = await ev(`window.__h.waitText('(?:^|\\\\n)POSTRESIZE_OK', 8000)`);
    out('shell usable after resize storm', String(q.ok));
  },
  async probes() {
    // terminal capability / conformance probes: a raw-mode node program inside the terminal queries it and writes answers to a file
    const fs = require('fs'); const outf = T + '/probe-out.json'; try { fs.unlinkSync(outf); } catch {}
    await ev(`window.__h.type('cls\\r'); 0`, false); await sleep(1000);
    await ev(`window.__h.type('node ${T}/probe.js\\r'); 0`, false);
    await ev(`window.__h.waitText('PROBE_DONE', 30000)`);
    console.log(fs.existsSync(outf) ? fs.readFileSync(outf, 'utf8') : 'no probe output');
    // unicode width checks via xterm buffer
    const w = await ev(`(async()=>{ const t=active.term; const res={}; const cases={ascii:'a', cjk:'日', emoji:'😀', zwj:'👨‍👩‍👧', flag:'🇯🇵', combining:'e\\u0301', vs16:'❤️', nerd:'\\ue0b0', box:'═', kr:'한'};
      for (const [k,s] of Object.entries(cases)) { await new Promise(r=>t.write('\\x1b[2J\\x1b[H'+s+'\\x1b[6n', r)); const b=t.buffer.active; res[k]=b.cursorX; }
      return JSON.stringify(res); })()`);
    out('cursor advance (cols) after glyph [correct: ascii1 cjk2 emoji2 zwj2 flag2 combining1 vs16 2 nerd1 box1 kr2]', w);
  },
  async link() {
    // what happens when a URL in the terminal is clicked (WebLinksAddon default -> window.open)
    const pages = async () => (await get('http://127.0.0.1:9333/json')).filter(x => x.type === 'page').map(x => x.url);
    const before = await pages();
    await ev(`(()=>{ const w = window.open(); w && (w.opener = null); if (w) w.location.href='https://example.com'; return 0; })()`);
    await sleep(3000);
    const after = await pages();
    out('clicking a link: page targets before -> after', `${JSON.stringify(before.map(u => u.slice(-30)))} -> ${JSON.stringify(after.map(u => u.slice(-30)))}`);
    // does top-level navigation get blocked? (a dropped file does exactly this)
    await ev(`(()=>{ setTimeout(()=>{ location.href='file:///C:/Windows/win.ini'; },0); return 0})()`, false); await sleep(1500);
    const now = (await get('http://127.0.0.1:9333/json')).filter(x => x.type === 'page').map(x => x.url);
    out('after navigating main window to a file:// URL (simulates file drop)', JSON.stringify(now.map(u => u.slice(-40))) + (now.some(u => /index\.html/.test(u)) ? ' (terminal UI still there)' : ' => TERMINAL UI DESTROYED'));
  },
  async paste2() {
    for (const kb of [5, 25, 100, 400]) {
      await ev(`(async()=>{ const old=active; await newTab(); closeTab(old); })()`); await sleep(2500);
      const lines = Math.floor(kb * 1024 / 80);
      await ev(`window.__fr=[]; (function f(l){ requestAnimationFrame(t=>{ if(l) window.__fr.push(t-l); if(!window.__stop) f(t); }); })(0); window.__stop=false; 0`, false);
      const t0 = hr();
      await ev(`pasteText(active, ('paste line '+'x'.repeat(68)+'\\n').repeat(${lines})); 0`, false);
      const r = await ev(`(async()=>{ const t0=performance.now(); while(performance.now()-t0<90000){ await new Promise(r=>setTimeout(r,1000)); const s=window.__h.text(5); /* shell has finished consuming when cursor row stops changing */ } return 0; })()`).catch(() => 0);
      // after paste, abort the line and probe responsiveness
      const t1 = hr();
      await ev(`window.__stop=true; 0`, false);
      out(`paste ${kb} KB multi-line (80B lines)`, 'see responsiveness below');
    }
  },
  async paste3() {
    for (const kb of [5, 25, 100, 400]) {
      await ev(`(async()=>{ const old=active; await newTab(); closeTab(old); })()`); await sleep(2500);
      const lines = Math.floor(kb * 1024 / 80);
      await ev(`window.__fr=[]; window.__stop=false; (function f(l){ requestAnimationFrame(t=>{ if(l) window.__fr.push(t-l); if(!window.__stop) f(t); }); })(0); 0`, false);
      const t0 = hr();
      await ev(`pasteText(active, ('paste line '+'x'.repeat(68)+'\\n').repeat(${lines})); 0`, false);
      // time until the shell has echoed everything: last pasted line visible on screen and output settled
      const r = await ev(`(async()=>{ const t0=performance.now(); let last='', stable=0; while(performance.now()-t0<120000){ await new Promise(r=>setTimeout(r,200)); const s=window.__h.text(3); if(s===last) stable++; else {stable=0; last=s;} if(stable>=5 && s.includes('paste line')) return performance.now()-t0; } return -1; })()`);
      await ev(`window.__stop=true; 0`, false);
      const f = JSON.parse(await ev(`JSON.stringify(window.__fr)`));
      out(`paste ${kb} KB multi-line`, `shell finished echoing in ${r < 0 ? '>120s (TIMEOUT)' : (r / 1000).toFixed(1) + 's (incl 1s settle)'}; UI frames worst=${Math.max(0, ...f).toFixed(0)}ms`);
    }
  },
  async leak() {
    const base = rss();
    for (let i = 0; i < 20; i++) { await ev(`newTab(); 0`, false); await sleep(250); }
    await sleep(3000); const peak = rss();
    await ev(`(async()=>{ while(tabs.length>1) closeTab(tabs[tabs.length-1]); })()`);
    const samples = []; for (let i = 0; i < 4; i++) { await sleep(10000); samples.push(rss().total); }
    out('memory: base / 21 tabs / after close +10s,+20s,+30s,+40s', `${base.total} / ${peak.total} / ${samples.join(' / ')} MB`);
    // second cycle to see whether it keeps growing
    for (let i = 0; i < 20; i++) { await ev(`newTab(); 0`, false); await sleep(250); }
    await sleep(3000); await ev(`(async()=>{ while(tabs.length>1) closeTab(tabs[tabs.length-1]); })()`); await sleep(20000);
    out('after 2nd open/close-20 cycle (+20s)', `${rss().total} MB (${JSON.stringify(rss().by)})`);
  },
  async multiflood() {
    // 8 tabs flooding simultaneously + measure frame times of the visible one and total drain
    for (let i = 0; i < 7; i++) { await ev(`newTab(); 0`, false); await sleep(400); }
    await sleep(3000);
    await ev(`window.__fr=[]; window.__stop=false; (function f(l){ requestAnimationFrame(t=>{ if(l) window.__fr.push(t-l); if(!window.__stop) f(t); }); })(0); 0`, false);
    const t0 = hr();
    await ev(`tabs.forEach(t=>window.term.write(t.id,'node ${T}/prod.js 40 plain\\r')); 0`, false);
    const r = await ev(`(async()=>{ const t0=performance.now(); const done=new Set(); while(performance.now()-t0<100000){ await new Promise(r=>setTimeout(r,100)); tabs.forEach((t,i)=>{ if(done.has(i)) return; const b=t.term.buffer.active; let s=''; for(let k=Math.max(0,b.baseY-5);k<b.baseY+t.term.rows;k++){ const l=b.getLine(k); if(l) s+=l.translateToString(true); } if(s.includes('DONE plain')) done.add(i); }); if(done.size===tabs.length) return {ms:performance.now()-t0,n:done.size}; } return {ms:-1,n:done.size}; })()`);
    if (r.ms < 0) { const diag = await ev(`JSON.stringify(tabs.map((t,i)=>{ const b=t.term.buffer.active; const l=[]; for(let k=Math.max(0,b.baseY+t.term.rows-4);k<b.baseY+t.term.rows;k++){const x=b.getLine(k); if(x) l.push(x.translateToString(true).slice(0,70));} return {i,id:t.id,parsed:t.parsed,last:l}; }))`); console.log('STUCK DIAG', diag); }
    await ev(`window.__stop=true; 0`, false);
    const f = JSON.parse(await ev(`JSON.stringify(window.__fr)`));
    out('8 tabs x 40MB simultaneously', `${r.n}/8 done, wall ${(r.ms / 1000).toFixed(1)}s => aggregate ${(320 / (r.ms / 1000)).toFixed(1)} MB/s; frames p50=${pct(f, .5).toFixed(1)} p99=${pct(f, .99).toFixed(1)} worst=${Math.max(...f).toFixed(0)}ms; mem ${rss().total} MB`);
  },
  async resizecheck() {
    // Correctness of the live edit line / scrollback across real OS window resizes
    const rs = spawn('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', T + '/rsrv.ps1'], { stdio: ['pipe', 'pipe', 'pipe'] });
    let rbuf = '', waiters = [];
    rs.stdout.on('data', d => { rbuf += d; const lines = rbuf.split(/\r?\n/); rbuf = lines.pop(); lines.forEach(l => { const w = waiters.shift(); if (w) w(l); }); });
    const cmd = (c) => new Promise(r => { waiters.push(r); rs.stdin.write(c + '\n'); });
    await new Promise(r => waiters.push(r)); // 'ready'
    const TXT = 'echo ' + 'a1b2c3d4e5'.repeat(15);
    const analyze = async (label, expectText) => {
      const s = JSON.parse(await ev(`(()=>{ const t=active.term,b=t.buffer.active; const lines=[]; for(let i=0;i<b.length;i++){const l=b.getLine(i); lines.push([l.translateToString(false), l.isWrapped?1:0]);} return JSON.stringify({lines,cols:t.cols,rows:t.rows,cy:b.cursorY,cx:b.cursorX,base:b.baseY}); })()`));
      // logical lines with the buffer row each starts on
      const logical = []; s.lines.forEach(([txt, w], i) => { if (w && logical.length) logical[logical.length - 1].t += txt; else logical.push({ t: txt, row: i }); });
      logical.forEach(l => l.t = l.t.replace(/\s+$/, ''));
      const problems = [];
      const last30 = logical.findIndex(l => l.t === 'RS_LINE_30');
      const after = last30 >= 0 ? logical.slice(last30 + 1) : logical;
      const prompts = after.filter(l => l.t.startsWith('❯'));
      if (prompts.length !== 1) problems.push(`prompt lines=${prompts.length}`);
      const pl = prompts[prompts.length - 1];
      if (pl) {
        const typed = pl.t.slice(2);
        if (typed !== expectText) problems.push(`typed text wrong: got ${typed.length} chars "${typed.slice(0, 30)}..${typed.slice(-12)}" want ${expectText.length}`);
        const total = 2 + expectText.length; const gRow = s.base + s.cy;
        const okA = gRow === pl.row + Math.floor(total / s.cols) && s.cx === total % s.cols;
        const okB = total % s.cols === 0 && gRow === pl.row + total / s.cols - 1;
        if (!okA && !okB) problems.push(`cursor at row ${gRow - pl.row} col ${s.cx}, expected row ${Math.floor(total / s.cols)} col ${total % s.cols}`);
      }
      const bars = after.filter(l => //.test(l.t)).length; if (bars !== 1) problems.push(`status bars=${bars}`);
      for (let n = 1; n <= 30; n++) { const c = logical.filter(l => l.t === 'RS_LINE_' + n).length; if (c !== 1) problems.push(`RS_LINE_${n} x${c}`); }
      // order check
      const idx = []; logical.forEach((l, i) => { const m = /^RS_LINE_(\d+)$/.exec(l.t); if (m) idx.push([+m[1], i]); });
      for (let k = 1; k < idx.length; k++) if (idx[k][0] !== idx[k - 1][0] + 1 || idx[k][1] !== idx[k - 1][1] + 1) { problems.push('RS lines out of order/non-contiguous'); break; }
      return { label, cols: s.cols, rows: s.rows, ok: problems.length === 0, problems };
    };
    let pass = 0, fail = 0, editPass = 0, editFail = 0; const failures = [];
    for (let round = 0; round < 3; round++) {
      await ev(`(async()=>{ const old=active; await newTab(); closeTab(old); })()`); await sleep(2500);
      await ev(`window.__h.type('1..30 | % { "RS_LINE_$_" }\\r'); 0`, false); await sleep(1200);
      await ev(`window.__h.type(${JSON.stringify(TXT)}); 0`, false); await sleep(600);
      const steps = [[700, 500], [1300, 700], [520, 330], [1000, 800], [800, 400], [1400, 900], 'max', 'restore', [900, 600], [560, 700], 'burst'];
      for (const st of steps) {
        if (st === 'burst') { for (let i = 0; i < 40; i++) { await cmd(`${600 + (i * 41) % 800} ${350 + (i * 29) % 500}`); await sleep(15); } }
        else if (typeof st === 'string') await cmd(st); else await cmd(`${st[0]} ${st[1]}`);
        await sleep(1000);
        const r = await analyze(`round${round} ${Array.isArray(st) ? st.join('x') : st}`, TXT);
        const e1 = r.problems.filter(p => !/^RS/.test(p)).length; if (e1) editFail++; else editPass++; if (r.ok) pass++; else { fail++; failures.push(`${r.label} (${r.cols}x${r.rows}): ${r.problems.join("; ")}`); }
      }
      // typing while resizing, then finish the command
      await cmd('900 500'); await ev(`window.__h.type('XYZ'); 0`, false); await cmd('600 650'); await sleep(900); await cmd('1200 700'); await sleep(1000);
      const r2 = await analyze(`round${round} type-during-resize`, TXT + "XYZ"); const e2 = r2.problems.filter(p => !/^RS/.test(p)).length; if (e2) editFail++; else editPass++; if (r2.ok) pass++; else { fail++; failures.push(`${r2.label}: ${r2.problems.join("; ")}`); }
      await ev(`window.__h.type('\\r'); 0`, false); await sleep(1200);
      const outOk = await ev(`(()=>{ const b=active.term.buffer.active; let all=''; for(let i=0;i<b.length;i++){ const l=b.getLine(i); all+=l.translateToString(true)+(b.getLine(i+1)&&b.getLine(i+1).isWrapped?'':'\\n'); } return all.includes(${JSON.stringify(TXT.slice(5) + 'XYZ')}+'\\n'); })()`);
      if (outOk) pass++; else { fail++; failures.push(`round${round} command output after resizes wrong/missing`); }
    }
    out("RESIZE CORRECTNESS", `edit-line+cursor: ${editPass} ok, ${editFail} BAD  |  full (incl. history lines): ${pass} ok, ${fail} bad`);
    failures.slice(0, 12).forEach(f => console.log('   FAIL', f));
    rs.stdin.end(); try { rs.kill(); } catch {}
  },
  async rsdebug() {
    const rs = spawn('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', T + '/rsrv.ps1'], { stdio: ['pipe', 'pipe', 'pipe'] });
    let rbuf = '', waiters = [];
    rs.stdout.on('data', d => { rbuf += d; const ls = rbuf.split(/\r?\n/); rbuf = ls.pop(); ls.forEach(l => { const w = waiters.shift(); if (w) w(l); }); });
    const cmd = (c) => new Promise(r => { waiters.push(r); rs.stdin.write(c + '\n'); });
    await new Promise(r => waiters.push(r));
    await ev(`(async()=>{ const old=active; await newTab(); closeTab(old); })()`); await sleep(2500);
    await ev(`window.__h.type('1..30 | % { "RS_LINE_$_" }\\r'); 0`, false); await sleep(1200);
    const dump = async (l) => {
      console.log('--- ' + l);
      console.log(await ev(`(()=>{ const t=active.term,b=t.buffer.active; const o=[]; for(let i=0;i<b.length;i++){ const ln=b.getLine(i); o.push(i+(ln.isWrapped?'w':' ')+' '+ln.translateToString(true)); } return 'cols='+t.cols+' rows='+t.rows+' base='+b.baseY+' cy='+b.cursorY+'\\n'+o.join('\\n'); })()`));
    };
    await ev(`window.__h.type('echo ' + 'a1b2c3d4e5'.repeat(15)); 0`, false); await sleep(800);
    await dump('initial'); await cmd('700 500'); await sleep(1200); await dump('after 700x500'); await cmd('520 330'); await sleep(1500); await dump('after 520x330'); rs.stdin.end();
  },
  async soak() {
    await ev(`window.__h.type('cls\\r'); 0`, false); await sleep(1000);
    await ev(`window.__h.type('node ${T}/flood.js\\r'); 0`, false);
    const s = []; const t0 = hr();
    for (let i = 0; i < 8; i++) { await sleep(30000); const m = rss(); s.push(`${((hr() - t0) / 1000).toFixed(0)}s:${m.total}MB(r${m.by.renderer || 0}/m${m.by.main || 0}/g${m.by['gpu-process'] || 0})`); }
    out('4-minute continuous flood memory trace', s.join('  '));
    const alive = await ev(`(async()=>{ window.__h.type('\\x03'); await new Promise(r=>setTimeout(r,500)); for(let i=0;i<20;i++){ window.__h.type('echo SOAK_'+'OK\\r'); const x=await window.__h.waitText('(?:^|\\\\n)SOAK_OK',500); if(x.ok) return true;} return false; })()`);
    out('shell alive after soak', String(alive));
  },
  async width() {
    const w = await ev(`(async()=>{ const t=active.term; const res={}; const cases={nerdPUA:'\\ue0b0', pua2:'\\uf07c', box:'═', emoji:'😀', ambig:'±'};
      for (const [k,s] of Object.entries(cases)) { await new Promise(r=>t.write('\\x1b[2J\\x1b[H'+s, r)); const c=t.buffer.active.getLine(t.buffer.active.baseY).getCell(0); res[k]={cell0w:c.getWidth(), cursor:t.buffer.active.cursorX}; }
      return JSON.stringify(res); })()`);
    out('cell widths', w);
  },
  async paste() {
    await ev(`window.__h.type('cls\\r'); 0`, false); await sleep(1000);
    const t0 = hr();
    // 2MB single paste through the same path as Ctrl+V
    const big = await ev(`(async()=>{ const s=('paste line '+'x'.repeat(70)+'\\n').repeat(26000); const t0=performance.now(); pasteText(active, s); return s.length; })()`);
    await sleep(100);
    out('paste of ~2MB multi-line text', `IPC enqueue ${big} chars; (shell will interpret as one huge command line)`);
    await sleep(8000);
    await ev(`window.__h.type('\\x03'); window.__h.type('\\x1bb'); 0`, false); await sleep(500);
    await ev(`window.__h.type('\\x03echo PASTE_SURVIVED\\r'); 0`, false);
    const r = await ev(`window.__h.waitText('(?:^|\\\\n)PASTE_SURVIVED', 60000)`);
    out('shell responsive after 2MB paste', `${r.ok} (${(hr() - t0).toFixed(0)}ms total)`);
  },
};

require('./feat.js')(T_, {
  ev, send, sleep, hr, T, UD, get, spawn,
  getLog: () => appLog, clearLog: () => { appLog = ''; },
  procCount: () => { try { return +execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${T}/desc.ps1"`, { encoding: 'utf8' }).trim() || 0; } catch { return -1; } },
});

(async () => {
  await launch();
  await ev(HELPERS);
  await ev(`new Promise(r=>{ const iv=setInterval(()=>{ if(typeof active!=='undefined' && active && active.id!=null){clearInterval(iv);r()} },20)})`);
  for (const t of tests) {
    console.log(`\n=== ${t} ===`);
    try { await T_[t](); } catch (e) { console.log('TEST ERROR', t, String(e).slice(0, 500)); }
  }
  console.log('\npage errors/warnings captured: ' + (pageErrors.length ? '\n  ' + [...new Set(pageErrors)].join('\n  ') : 'none'));
  await quit();
  process.exit(0);
})().catch(e => { console.error('HARNESS FAIL', e); try { proc.kill(); } catch {} process.exit(1); });
