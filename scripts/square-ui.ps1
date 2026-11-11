$ErrorActionPreference = 'Stop'
$p = 'dashboard\app\sites\page.tsx'
$t = [IO.File]::ReadAllText($p, [Text.Encoding]::UTF8)
$t = $t.Replace('rounded-xl', 'rounded-none').Replace('rounded-2xl', 'rounded-none').Replace('rounded-lg', 'rounded-none').Replace('rounded-md', 'rounded-none')
[IO.File]::WriteAllText($p, $t, (New-Object Text.UTF8Encoding($false)))
Write-Host 'done'
