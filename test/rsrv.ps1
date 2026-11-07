# persistent resize server: reads "w h" | "max" | "restore" lines, replies "ok"
Add-Type @"
using System; using System.Runtime.InteropServices;
public class W { [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr h, IntPtr a, int x,int y,int w,int hh,uint f);
 [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h,int c); }
"@
$p = Get-Process electron -ea 0 | ? { $_.MainWindowTitle -eq 'Pulse Terminal' } | select -First 1
if(-not $p){ 'NOWINDOW'; exit 1 }
$h=$p.MainWindowHandle; [W]::ShowWindow($h,9)|Out-Null
'ready'
while(($l=[Console]::In.ReadLine()) -ne $null){
  if($l -eq 'max'){ [W]::ShowWindow($h,3)|Out-Null }
  elseif($l -eq 'restore'){ [W]::ShowWindow($h,9)|Out-Null }
  else { $a=$l.Split(' '); [W]::SetWindowPos($h,[IntPtr]::Zero,50,50,[int]$a[0],[int]$a[1],0x0014)|Out-Null }
  'ok'
}
