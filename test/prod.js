// producer: node prod.js <MB> <mode> [outfile]  -> writes MB of output, prints timing marker
const fs=require('fs');
const mb=+process.argv[2]||10, mode=process.argv[3]||'plain', out=process.argv[4];
let line;
if(mode==='plain') line='The quick brown fox jumps over the lazy dog 0123456789 abcdefghijklmnopqrstuvwxyz ABCDEFG\r\n';
else if(mode==='color'){ line=''; for(let i=0;i<16;i++) line+=`\x1b[38;2;${i*16};${255-i*16};128mcolor${i} \x1b[48;5;${i*15}mbg\x1b[0m `; line+='\r\n'; }
else if(mode==='unicode') line='日本語のテキスト 中文字符 한국어 😀🚀🎉 é̃ ñ ✓ ★ ╔═══╗ \u{1F468}\u200D\u{1F469}\u200D\u{1F467}\r\n';
else if(mode==='long') line='x'.repeat(5000)+'\r\n';
else if(mode==='short') line='a\r\n';
const target=mb*1024*1024, chunk=line.repeat(Math.max(1,Math.floor(65536/line.length)));
let sent=0; const t0=process.hrtime.bigint();
function go(){ while(sent<target){ const ok=process.stdout.write(chunk); sent+=chunk.length; if(!ok) return process.stdout.once('drain',go);} 
  const ms=Number(process.hrtime.bigint()-t0)/1e6; const msg=`\x1b[0m\r\nDONE ${mode} ${(sent/1048576).toFixed(1)}MB ${ms.toFixed(0)}ms ${(sent/1048576/(ms/1000)).toFixed(1)}MB/s\r\n`;
  process.stdout.write(msg); if(out) fs.writeFileSync(out,msg); }
go();
