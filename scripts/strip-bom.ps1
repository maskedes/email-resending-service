$ErrorActionPreference = 'Stop'
$paths = @('dashboard\app\overview\domains\page.tsx', 'dashboard\app\sites\page.tsx')
foreach ($p in $paths) {
  $b = [IO.File]::ReadAllBytes($p)
  if ($b.Length -ge 3 -and $b[0] -eq 0xEF -and $b[1] -eq 0xBB -and $b[2] -eq 0xBF) {
    [IO.File]::WriteAllBytes($p, $b[3..($b.Length - 1)])
    Write-Host "$p : BOM stripped"
  } else {
    Write-Host "$p : no BOM"
  }
}
