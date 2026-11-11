$ErrorActionPreference = 'Stop'
$path = 'dashboard\app\sites\page.tsx'
$cp = [Text.Encoding]::GetEncoding(1252)
$strict = New-Object Text.UTF8Encoding($false, $true)
$good = @(0x2014, 0x2191, 0x2193, 0x2715, 0x29C9)
$t = [IO.File]::ReadAllText($path, [Text.Encoding]::UTF8)
$sb = New-Object System.Text.StringBuilder
$leftover = New-Object System.Collections.Generic.List[string]
$converted = 0
$i = 0
while ($i -lt $t.Length) {
  $ch = $t[$i]
  $bad = [int]$ch -ge 128 -and -not ($good -contains [int]$ch)
  if (-not $bad) { [void]$sb.Append($ch); $i++; continue }
  $j = $i
  while ($j -lt $t.Length) {
    $c2 = [int]$t[$j]
    if ($c2 -lt 128 -or ($good -contains $c2)) { break }
    $j++
  }
  $run = $t.Substring($i, $j - $i)
  $ok = $false
  try {
    $bytes = $cp.GetBytes($run)
    $s = $strict.GetString($bytes)
    if ($s.IndexOf([char]0xFFFD) -lt 0) { [void]$sb.Append($s); $ok = $true; $converted++ }
  } catch { }
  if (-not $ok) { [void]$sb.Append($run); $leftover.Add($run) }
  $i = $j
}
[IO.File]::WriteAllText($path, $sb.ToString(), (New-Object Text.UTF8Encoding($false)))
Write-Host "converted runs: $converted"
Write-Host "leftover runs: $($leftover.Count)"
foreach ($l in $leftover) { Write-Host "LEFTOVER: [$l]" }
