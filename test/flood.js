// infinite flood, writes pid marker; sync writes like `yes`
const fs=require('fs'); fs.writeFileSync(process.argv[2]||'flood.pid', String(process.pid));
const line='y'.repeat(120)+'\r\n'; const chunk=line.repeat(500);
while(true) process.stdout.write(chunk);
