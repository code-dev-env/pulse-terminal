// Feature / correctness tests for the new behaviour. Loaded by e2e.js: require('./feat.js')(T_, ctx)
const fs = require('fs');
module.exports = (T_, c) => {
  const { ev, send, sleep, hr, T, UD, get, getLog, clearLog, spawn, procCount } = c;
  let pass = 0, fail = 0;
  const check = (name, ok, detail = '') => { ok ? pass++ : fail++; console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };
  const fresh = async () => {
    await ev(`(async()=>{ const old=active; await newTab(); closeTab(old); })()`);
    const r = await ev(`window.__h.waitText('\\\\uE0B0', 8000)`); await sleep(150); return r.ok;
  };
  const type = s => ev(`window.__h.type(${JSON.stringify(s)}); 0`, false);
  const wait = (re, ms = 8000) => ev(`window.__h.waitText(${JSON.stringify(re)}, ${ms})`);
  const screen = (n = 40) => ev(`window.__h.text(${n})`);
  const summary = (title) => { console.log(`  => ${title}: ${pass} passed, ${fail} failed`); pass = 0; fail = 0; };

  T_.feat_replies = async () => {
    const outf = T + '/probe-out.json'; try { fs.unlinkSync(outf); } catch {}
    await fresh(); await type(`node ${T}/probe.js\r`); await wait('PROBE_DONE', 30000);
    const p = JSON.parse(fs.readFileSync(outf, 'utf8')); const g = k => p[Object.keys(p).find(x => x.startsWith(k))] || '';
    check('XTVERSION answered (through ConPTY)', /PulseTerminal/.test(g('XTVERSION')), g('XTVERSION'));
    check('XTWINOPS 14t (pixel size) answered', /\[4;\d+;\d+t/.test(g('XTWINOPS text-area')), g('XTWINOPS text-area'));
    check('XTWINOPS 16t (cell size) answered', /\[6;\d+;\d+t/.test(g('XTWINOPS cell')), g('XTWINOPS cell'));
    check('DA1 / DA2 / DSR still answered', /\[\?61/.test(g('DA1')) && /\[>0;/.test(g('DA2')) && /\[\d+;\d+R/.test(g('DSR')));
    check('COLORTERM/TERM_PROGRAM/COLORFGBG set in the shell env', /truecolor/.test(g('_env')) && /PulseTerminal/.test(g('_env')) && /COLORFGBG=15;0/.test(g('_env')), g('_env'));
    // Handler level (replies captured before they reach the pty; Windows' ConPTY drops OSC replies and answers DECRQM itself)
    const cap = JSON.parse(await ev(`(async()=>{ const t=active; window.__cap=[]; t.rawSend=s=>window.__cap.push(s);
      await new Promise(r=>t.term.write('\\x1b]10;?\\x07\\x1b]11;?\\x1b\\\\\\x1b]4;1;?;200;?\\x07\\x1b[?2026$p\\x1b]10;?;?\\x07\\x1b]4;999;?\\x07', r)); delete t.rawSend; return JSON.stringify(window.__cap); })()`));
    const ui = JSON.parse(await ev(`JSON.stringify({fg:THEMES[themeIdx].ui.fg, bg:THEMES[themeIdx].ui.bg, red:THEMES[themeIdx].xterm.red})`));
    const spec = h => 'rgb:' + [1, 3, 5].map(i => h.slice(i, i + 2).repeat(2)).join('/');
    check('OSC 10 reply carries the theme foreground', cap[0] === `\x1b]10;${spec(ui.fg)}\x1b\\`, JSON.stringify(cap[0]));
    check('OSC 11 reply carries the theme background', cap[1] === `\x1b]11;${spec(ui.bg)}\x1b\\`, JSON.stringify(cap[1]));
    check('OSC 4 replies: theme red, and cube colour 200 = #ff00d7', cap[2] === `\x1b]4;1;${spec(ui.red)}\x1b\\` && cap[3] === `\x1b]4;200;rgb:ffff/0000/d7d7\x1b\\`, JSON.stringify(cap.slice(2, 4)));
    check('DECRQM 2026 reply says "supported, off"', cap[4] === '\x1b[?2026;2$y', JSON.stringify(cap[4]));
    check('OSC 10;?;? answers both foreground and background', cap[5] && cap[5].startsWith('\x1b]10;') && cap[6] && cap[6].startsWith('\x1b]11;'), JSON.stringify(cap.slice(5, 7)));
    check('out-of-range palette query is ignored', cap.length === 7, `${cap.length} replies`);
    await sleep(1500);
    const w = JSON.parse(await ev(`(async()=>{ const t=active.term; const res={}; const cases={ascii:'a', cjk:'日', emoji:'😀', rocket:'🚀', flag:'🇯🇵', combining:'e\\u0301', nerd:'\\ue0b0', box:'═', kr:'한'};
      for (const [k,s] of Object.entries(cases)) { await new Promise(r=>t.write('\\x1b[2J\\x1b[H'+s, r)); res[k]=t.buffer.active.cursorX; } return JSON.stringify(res); })()`));
    check('glyph widths (ascii1 cjk2 emoji2 rocket2 flag2 combining1 nerd1 box1 kr2)', w.ascii === 1 && w.cjk === 2 && w.emoji === 2 && w.rocket === 2 && w.flag === 2 && w.combining === 1 && w.nerd === 1 && w.box === 1 && w.kr === 2, JSON.stringify(w));
    summary('terminal replies');
  };

  T_.feat_links = async () => {
    clearLog();
    const before = (await get('http://127.0.0.1:9333/json')).filter(x => x.type === 'page').length;
    await ev(`(()=>{ const w = window.open('https://example.com/a'); return 0; })()`); await sleep(1200);
    const after = (await get('http://127.0.0.1:9333/json')).filter(x => x.type === 'page').length;
    check('window.open() does not create an in-app window', after === before, `${before} -> ${after}`);
    check('...and the URL goes to the system browser', getLog().includes('[open] https://example.com/a'));
    clearLog();
    for (const u of ['file:///C:/Windows/win.ini', 'ms-settings:network', 'javascript:alert(1)', 'calc:', 'data:text/html,hi', 'steam://run/1']) await ev(`window.term.openExternal(${JSON.stringify(u)}); 0`, false);
    await ev(`window.term.openExternal('https://ok.test/x'); window.term.openExternal('mailto:a@b.test'); 0`, false); await sleep(600);
    const log = getLog();
    check('dangerous schemes are refused', !/\[open\] (file|ms-settings|javascript|calc|data|steam)/.test(log), log.trim().replace(/\n/g, ' | '));
    check('https and mailto links are allowed', log.includes('[open] https://ok.test/x') && log.includes('[open] mailto:a@b.test'));
    await ev(`(()=>{ setTimeout(()=>{ location.href='file:///C:/Windows/win.ini'; },0); return 0})()`, false); await sleep(1200);
    const url = await ev(`location.href`);
    check('page cannot be navigated away', /index\.html$/.test(url), url);
    // real clicks on a printed URL and on an OSC 8 hyperlink
    await fresh();
    await ev(`active.term.write('\\x1b[2J\\x1b[Hgo to https://weblink.test/path now\\r\\n\\x1b]8;;https://osc8.test/page\\x07HYPERLINK\\x1b]8;;\\x07 end\\r\\n')`);
    await sleep(300);
    const geo = JSON.parse(await ev(`(()=>{ const r=active.term.element.querySelector('.xterm-screen').getBoundingClientRect(); return JSON.stringify({l:r.left,t:r.top,cw:r.width/active.term.cols,ch:r.height/active.term.rows}); })()`));
    const click = async (col, row) => {
      const x = geo.l + (col + .5) * geo.cw, y = geo.t + (row + .5) * geo.ch;
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y }); await sleep(120);
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 }); await sleep(400);
    };
    clearLog(); await click(12, 0);
    check('clicking a printed URL opens it in the browser', getLog().includes('[open] https://weblink.test/path'), getLog().trim());
    clearLog(); await click(3, 1);
    check('clicking an OSC 8 hyperlink opens it in the browser', getLog().includes('[open] https://osc8.test/page'), getLog().trim());
    summary('links & navigation');
  };

  T_.feat_drop = async () => {
    await fresh();
    const f = (T + '/my file (1).txt').replace(/\//g, '\\'); fs.writeFileSync(f, 'x');
    const g = (T + '/plain.txt').replace(/\//g, '\\'); fs.writeFileSync(g, 'x');
    const geo = JSON.parse(await ev(`(()=>{ const r=document.getElementById('terminals').getBoundingClientRect(); return JSON.stringify({x:r.left+200,y:r.top+150}); })()`));
    await ev(`window.__drops=[]; ['dragenter','dragover','drop'].forEach(n=>document.addEventListener(n,e=>{ let extra=''; if(n==='drop'){ try{ extra=' path='+window.term.pathOf(e.dataTransfer.files[0]); }catch(x){ extra=' ERR='+x.message; } } window.__drops.push(n+':'+(e.dataTransfer?e.dataTransfer.files.length+'f':'none')+extra); },true)); 0`, false);
    const rs = [];
    for (const ty of ['dragEnter', 'dragOver', 'drop']) rs.push(JSON.stringify((await send('Input.dispatchDragEvent', { type: ty, x: geo.x, y: geo.y, data: { items: [], files: [f, g], dragOperationsMask: 1 } })).error || 'ok'));
    await sleep(700);
    console.log('  [debug] cdp results', rs.join(','), ' events seen by page:', await ev(`JSON.stringify(window.__drops)`));
    const s = await screen(8);
    console.log('  [debug] screen tail:', JSON.stringify(s.slice(-400)));
    check('dropped file paths are typed at the prompt (quoted when needed)', s.includes('"' + f + '"') || s.replace(/\n/g, '').includes('"' + f + '"'), s.split('\n').filter(l => l.includes('❯')).join('|').slice(0, 160));
    check('...unquoted when plain', s.replace(/\n/g, '').includes(g));
    check('window still shows the terminal after a drop', /index\.html$/.test(await ev(`location.href`)));
    await type('\x03'); summary('file drop');
  };

  T_.feat_paste = async () => {
    // exact bytes via a raw echo program
    await fresh(); await type(`node ${T}/rawecho.js 2004\r`); await wait('RAWECHO_READY', 8000); await sleep(200);
    await ev(`pasteText(active, 'line1\\nline2\\r\\nline3'); 0`, false); await sleep(500);
    let s = await screen(10);
    check('bracketed paste: text is wrapped in 200~/201~ with CR line breaks', s.includes('RAW:"\\u001b[200~line1\\rline2\\rline3\\u001b[201~"'), s.split('\n').filter(l => l.includes('RAW:')).join('|').slice(0, 200));
    await ev(`pasteText(active, 'a\\x03b\\x1b[201~c\\x7fd\\te'); 0`, false); await sleep(500); s = await screen(10);
    check('control characters (^C, ESC, DEL) are stripped from pastes; tab kept', s.includes('RAW:"\\u001b[200~ab[201~cd\\te\\u001b[201~"'), s.split('\n').filter(l => l.includes('RAW:')).slice(-1)[0]);
    await type('\x04'); await sleep(500);
    await type(`node ${T}/rawecho.js\r`); await wait('RAWECHO_READY', 8000); await sleep(200);
    await ev(`pasteText(active, 'one\\ntwo\\n'); 0`, false); await sleep(500); s = await screen(10);
    check('no bracketed mode: plain CR line breaks, no ESC+CR', s.includes('RAW:"one\\rtwo\\r"'), s.split('\n').filter(l => l.includes('RAW:')).slice(-1)[0]);
    await type('\x04'); await sleep(400);
    // a REPL: lines must run as typed
    await type('node\r'); await wait('Welcome to Node', 8000); await sleep(600);
    await ev(`pasteText(active, '40+2\\n6*7\\n'); 0`, false); await sleep(1200); s = await screen(15);
    check('paste into a REPL executes each line', /(^|\n)42\s*\n[^]*\n?42/.test(s) || (s.match(/(^|\n)42\s*(\n|$)/g) || []).length >= 2, s.split('\n').filter(l => /42/.test(l)).join('|'));
    await type('.exit\r'); await sleep(600);
    // PowerShell prompt: multi-line paste must NOT run the lines
    await type('\x03'); await sleep(300);
    await ev(`pasteText(active, 'echo PASTED_A\\necho PASTED_B\\necho PASTED_C'); 0`, false); await sleep(900); s = await screen(12);
    const ran = /(^|\n)PASTED_[ABC]\s*(\n|$)/.test(s);
    check('multi-line paste at the PowerShell prompt is not executed', !ran && s.includes('echo PASTED_A') && s.includes('echo PASTED_C'));
    check('prompt tracking says "at prompt" there', await ev(`active.atPrompt`) === true);
    await type('\r'); await sleep(900); s = await screen(15);
    check('...and runs when Enter is pressed', /(^|\n)PASTED_A\s*\n/.test(s) && /(^|\n)PASTED_C\s*(\n|$)/.test(s));
    // big paste: confirmation, declined
    await ev(`window.__confirms=0; window.confirm=()=>{window.__confirms++; return false;}; pasteText(active,'z'.repeat(60000)); 0`, false); await sleep(400);
    check('pasting >50 KB asks first; declining sends nothing', (await ev(`window.__confirms`)) === 1 && !(await screen(6)).includes('zzzzzzzz'));
    await ev(`pasteText(active,'small'); 0`, false); await sleep(300);
    check('small pastes do not ask', (await ev(`window.__confirms`)) === 1 && (await screen(8)).includes('small'));
    await type('\x03'); summary('paste');
  };

  T_.feat_search = async () => {
    await fresh();
    await type(`1..6 | % { "SRCH_foo_$_"; "other $_" }; "srch_FOO_up"\r`); await wait('srch_FOO_up', 8000); await sleep(300);
    await ev(`openSearch(); 0`, false); await sleep(100);
    check('search bar opens and takes focus', (await ev(`!searchBar.classList.contains('hidden') && document.activeElement===searchInput`)) === true);
    const setQ = async (q) => { await ev(`searchInput.value=${JSON.stringify(q)}; searchInput.dispatchEvent(new Event('input')); 0`, false); await sleep(350); return ev(`searchCount.textContent`); };
    // expected counts come from the buffer itself (the typed command line contains the term too)
    const count = (flags, re) => ev(`(()=>{ const b=active.term.buffer.active; let n=0; for(let i=0;i<b.length;i++){ const m=b.getLine(i).translateToString(true).match(new RegExp(${JSON.stringify(re)}, ${JSON.stringify(flags)})); if(m) n+=m.length; } return n; })()`);
    const wantI = await count('gi', 'srch_foo'), wantS = await count('g', 'SRCH_foo');
    let cnt = await setQ('srch_foo'); check(`case-insensitive search finds every occurrence (${wantI})`, cnt.endsWith('/' + wantI), cnt);
    cnt = await setQ('SRCH_foo');
    await ev(`document.getElementById('search-case').click(); 0`, false); await sleep(900); cnt = await ev(`searchCount.textContent`);
    check(`match-case narrows to exact-case occurrences (${wantS})`, cnt.endsWith('/' + wantS) && wantS < wantI, `${cnt} (insensitive ${wantI})`);
    await ev(`document.getElementById('search-case').click(); 0`, false);
    await ev(`document.getElementById('search-regex').click(); 0`, false); cnt = await setQ('SRCH_f.o_\\d'); check('regex search works (6 matches)', /\/6$/.test(cnt), cnt);
    await ev(`document.getElementById('search-regex').click(); 0`, false);
    cnt = await setQ('no_such_text_xyz'); check('no match is reported', cnt === 'none' && (await ev(`searchInput.classList.contains('nomatch')`)) === true, cnt);
    await setQ('other');
    const a = await ev(`searchCount.textContent`);
    await ev(`searchInput.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter'})); 0`, false); await sleep(250);
    const b = await ev(`searchCount.textContent`);
    check('Enter moves to the next match', a !== b, `${a} -> ${b}`);
    await ev(`searchInput.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'})); 0`, false); await sleep(150);
    check('Escape closes the bar and returns focus to the terminal', (await ev(`searchBar.classList.contains('hidden')`)) === true);
    // the real keyboard shortcut must not leak ^F to the shell
    await type('abc'); await sleep(200);
    await ev(`active.term.focus(); 0`, false);
    await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', modifiers: 10, key: 'F', code: 'KeyF', windowsVirtualKeyCode: 70 });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', modifiers: 10, key: 'F', code: 'KeyF', windowsVirtualKeyCode: 70 }); await sleep(300);
    check('Ctrl+Shift+F opens search', (await ev(`!searchBar.classList.contains('hidden')`)) === true);
    await ev(`closeSearch(); 0`, false); await type('\x03'); summary('search');
  };

  T_.feat_scrollback = async () => {
    await fresh();
    await ev(`(()=>{ const s=document.getElementById('scrollback'); s.value='1000'; s.dispatchEvent(new Event('change')); return 0; })()`, false); await sleep(900);
    check('setting applies to all tabs live', (await ev(`tabs.every(t=>t.term.options.scrollback===1000)`)) === true);
    let saved = {}; try { saved = JSON.parse(fs.readFileSync(UD + '/settings.json', 'utf8')); } catch {}
    check('setting is persisted to settings.json', saved.scrollback === 1000, JSON.stringify(saved).slice(0, 120));
    await type('1..3000 | % { "SBLINE $_" }\r'); await wait('SBLINE 3000', 15000); await sleep(400);
    const len = await ev(`active.term.buffer.active.length`);
    check('buffer is capped near 1000 lines + screen', len <= 1000 + 80, `buffer length ${len}`);
    await ev(`(()=>{ const s=document.getElementById('scrollback'); s.value='50000'; s.dispatchEvent(new Event('change')); return 0; })()`, false); await sleep(600);
    check('can be raised again live', (await ev(`active.term.options.scrollback`)) === 50000);
    await ev(`(()=>{ const s=document.getElementById('scrollback'); s.value='10000'; s.dispatchEvent(new Event('change')); return 0; })()`, false);
    summary('scrollback setting');
  };

  T_.feat_profiles = async () => {
    const profs = JSON.parse(await ev(`JSON.stringify(PROFILES)`));
    console.log('  profiles offered:', profs.map(p => `${p.id}${p.integrated ? '*' : ''}`).join(', '));
    check('default profile first, menu button visible when >1', profs[0].id === 'default' && ((await ev(`!document.getElementById('profile-btn').classList.contains('hidden')`)) === (profs.length > 1)));
    const before = procCount();
    for (const p of profs.filter(p => !p.integrated)) {
      await ev(`(async()=>{ const old=active; await newTab(${JSON.stringify(p.id)}); closeTab(old); })()`); await sleep(p.id === 'wsl' ? 4000 : 1500);
      await type(`echo PROFILE_${p.id}_OK\r`);
      const r = await wait(`(?:^|\\\n)PROFILE_${p.id}_OK`, 20000);
      const looksUnavailable = p.id === 'wsl' && /no installed distributions|not installed|Windows Subsystem/i.test(r.s);
      if (looksUnavailable) console.log('  SKIP  wsl has no distribution installed'); else check(`profile "${p.label}" starts and runs a command`, r.ok, r.ok ? '' : r.s.split('\n').slice(0, 4).join('|'));
    }
    await ev(`(async()=>{ const old=active; await newTab('definitely-not-a-profile'); closeTab(old); })()`); await sleep(1500);
    check('unknown profile id falls back to the default shell', (await wait('\\\uE0B0', 8000)).ok);
    await sleep(1500);
    check('no shell processes leaked by profile tabs', procCount() <= before + 1, `${before} -> ${procCount()}`);
    summary('profiles');
  };

  T_.feat_typeahead = async () => {
    let ok = 0; const N = 10, lat = [];
    for (let i = 0; i < N; i++) {
      await ev(`(async()=>{ const old=active; const p = newTab(); const t = tabs[tabs.length-1]; sendInput(t, 'echo TA_${i}_'+'OK\\r'); await p; closeTab(old); })()`);
      const t0 = hr(); const r = await wait(`(?:^|\\\n)TA_${i}_OK`, 6000); if (r.ok) { ok++; lat.push(hr() - t0); }
    }
    check(`input typed the instant a tab opens is not lost (was 1 of 8)`, ok === N, `${ok}/${N}`);
    summary('type-ahead');
  };

  T_.feat_sync = async () => {
    await fresh();
    await type(`node ${T}/syncprobe.js hold\r`);
    const seen = await ev(`(async()=>{ const t0=performance.now(); let sawA=false, sawAonly=false, sawBoth=false; const t=active.term;
      while(performance.now()-t0<4000){ const b=t.buffer.active; let s=''; for(let i=0;i<t.rows;i++){ const l=b.getLine(b.viewportY+i); if(l) s+=l.translateToString(true); }
        if(s.includes('FRAME_HALF_A')){ sawA=true; if(!s.includes('FRAME_HALF_B')) sawAonly=true; else sawBoth=true; }
        if(s.includes('SYNC_DONE')) break; await new Promise(r=>setTimeout(r,2)); }
      return JSON.stringify({sawA,sawAonly,sawBoth}); })()`);
    const o = JSON.parse(seen);
    check('synchronized update: half-drawn frame is never visible', o.sawBoth && !o.sawAonly, JSON.stringify(o));
    await type('\x03'); await fresh();
    await type(`node ${T}/syncprobe.js cap\r`);
    const t0 = hr(); const r = await wait('NEVER_ENDS_VISIBLE_AFTER_CAP', 3000); const ms = hr() - t0;
    check('an update that never ends is released by the 150 ms cap', r.ok && ms < 900, `visible after ${ms.toFixed(0)} ms`);
    await wait('SYNC_DONE', 6000); summary('synchronized output');
  };

  T_.feat_image = async () => {
    await fresh();
    const n0 = await ev(`active.term.element.querySelectorAll('canvas').length`);
    clearLog();
    await type(`node ${T}/imgprobe.js\r`); const r = await wait('IMG_DONE', 10000); await sleep(500);
    const n1 = await ev(`active.term.element.querySelectorAll('canvas').length`);
    check('sixel + iTerm2 image output is accepted without breaking the stream', r.ok);
    check('an image layer was created', n1 > n0, `canvases ${n0} -> ${n1}`);
    await type('echo STILL_FINE\r'); check('terminal still responsive after images', (await wait('(?:^|\\\n)STILL_FINE', 5000)).ok);
    summary('inline images');
  };
};
