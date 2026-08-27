$token = 'VGSiPmaqzig7qLF3oJS4kmLR66Ed'
$response = Invoke-RestMethod -Method GET -Uri 'https://api.desec.io/v1/domains' -Headers @{Authorization="Token $token"}
Write-Output "Token Valid: $($response.success)"
Write-Output "Domains found: $($response.data.Count)"
if ($response.data) {
    $response.data | ForEach-Object { Write-Output "Domain: $($_.name) - Status: $($_.status)" }
}