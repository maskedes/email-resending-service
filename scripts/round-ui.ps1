$ErrorActionPreference = 'Stop'
$p = 'dashboard\app\sites\page.tsx'
$t = [IO.File]::ReadAllText($p, [Text.Encoding]::UTF8)
$beforeRound = ([regex]::Matches($t, 'rounded-none')).Count
$t = $t.Replace('rounded-none', 'rounded-xl')
$before10 = ([regex]::Matches($t, 'text-\[10px\]')).Count
$before11 = ([regex]::Matches($t, 'text-\[11px\]')).Count
$t = $t.Replace('text-[10px]', 'text-[11px]')
$t = $t.Replace('text-[11px]', 'text-xs')
$t = $t.Replace('text-xs', 'text-[13px]')
[IO.File]::WriteAllText($p, $t, (New-Object Text.UTF8Encoding($false)))
Write-Host "rounded-none occurrences: $beforeRound"
Write-Host "text-[10px] occurrences: $before10"
Write-Host "text-[11px] occurrences: $before11"
