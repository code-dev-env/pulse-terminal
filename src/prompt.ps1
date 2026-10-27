[Console]::OutputEncoding = [Text.Encoding]::UTF8
$e = [char]27
$script:sep = [string][char]0xE0B0
$script:iBranch = [string][char]0xE0A0
$script:iUser = [string][char]0xF007
$script:iDir = [string][char]0xF07C
$script:arrow = [string][char]0x276F
$script:ellipsis = [string][char]0x2026

function global:Show-Banner {
  if ($env:CT_BANNER -and (Test-Path $env:CT_BANNER)) {
    [Console]::Out.Write([IO.File]::ReadAllText($env:CT_BANNER, [Text.Encoding]::UTF8))
    Remove-Item $env:CT_BANNER -Force -ErrorAction SilentlyContinue
  }
}
Show-Banner

# Clearing the console redraws the banner. The OSC marker asks the app for a fresh banner file, which is printed
# from here (not injected by the app) so the shell's own cursor ends up below it.
function global:Clear-Console {
  Clear-Host
  [Console]::Out.Write("$([char]27)]777;ct-banner$([char]7)")
  $t = [Diagnostics.Stopwatch]::StartNew()
  while (-not (Test-Path $env:CT_BANNER) -and $t.ElapsedMilliseconds -lt 2000) { Start-Sleep -Milliseconds 15 }
  Show-Banner
}
Set-Alias -Name clear -Value Clear-Console -Option AllScope -Scope Global -Force
Set-Alias -Name cls -Value Clear-Console -Option AllScope -Scope Global -Force
try {
  Set-PSReadLineKeyHandler -Chord Ctrl+l -ScriptBlock {
    [Microsoft.PowerShell.PSConsoleReadLine]::RevertLine()
    [Microsoft.PowerShell.PSConsoleReadLine]::Insert('Clear-Console')
    [Microsoft.PowerShell.PSConsoleReadLine]::AcceptLine()
  }
} catch {}

function global:prompt {
  $ok = $?
  $cwd = (Get-Location).Path
  $p = $cwd
  if ($p.StartsWith($HOME, [StringComparison]::OrdinalIgnoreCase)) { $p = '~' + $p.Substring($HOME.Length) }
  $parts = @($p -split '[\\/]' | Where-Object { $_ })
  if ($parts.Count -gt 3) { $p = $script:ellipsis + '/' + ($parts[-3..-1] -join '/') }
  $leaf = Split-Path -Leaf $cwd
  if (-not $leaf) { $leaf = $cwd }
  $host.UI.RawUI.WindowTitle = $leaf

  $line = "$e[0m$e[30;44m $script:iUser $env:USERNAME $e[34;45m$script:sep$e[30;45m $script:iDir $p "
  $last = 5
  $branch = $null
  try { $branch = git rev-parse --abbrev-ref HEAD 2>$null } catch {}
  if ($branch) {
    $dirty = git status --porcelain 2>$null
    $c = if ($dirty) { 3 } else { 2 }
    $line += "$e[3${last};4${c}m$script:sep$e[30;4${c}m $script:iBranch $branch"
    if ($dirty) { $line += ' *' }
    $line += ' '
    $last = $c
  }
  $line += "$e[0;3${last}m$script:sep$e[0m"
  $col = if ($ok) { "$e[32m" } else { "$e[31m" }
  return "$line`n$col$script:arrow$e[0m "
}
