# counts non-electron processes that descend from the scratch electron main process
$all = Get-CimInstance Win32_Process
$main = $all | Where-Object { $_.ExecutablePath -like ($env:E2E_ROOT + '*electron.exe') -and $_.CommandLine -notmatch '--type=' } | Select-Object -First 1
if (-not $main) { 0; exit }
$ids = @{}; $queue = [System.Collections.Queue]::new(); $queue.Enqueue([int]$main.ProcessId)
while ($queue.Count) { $p = $queue.Dequeue(); foreach ($c in $all | Where-Object { $_.ParentProcessId -eq $p }) { if (-not $ids.ContainsKey([int]$c.ProcessId)) { $ids[[int]$c.ProcessId] = $c.Name; $queue.Enqueue([int]$c.ProcessId) } } }
($ids.Values | Where-Object { $_ -ne 'electron.exe' }).Count
