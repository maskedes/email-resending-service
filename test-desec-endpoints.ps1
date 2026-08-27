$token = 'VGSiPmaqzig7qLF3oJS4kmLR66Ed'
# Try different desec.io API endpoints
$endpoints = @(
    "https://api.desec.io/v1/domains"
    "https://desec.io/api/v1/domains"
    "https://desec.io/v1/domains"
)

foreach ($endpoint in $endpoints) {
    Write-Output "Testing: $endpoint"
    try {
        $response = Invoke-RestMethod -Method GET -Uri $endpoint -Headers @{Authorization="Token $token"} -TimeoutSec 10
        Write-Output "SUCCESS: $endpoint"
        Write-Output "Domains: $($response.data.Count)"
        if ($response.data) {
            $response.data | ForEach-Object { Write-Output "  - $($_.name)" }
        }
    } catch {
        Write-Output "FAILED: $endpoint - $_"
    }
    Write-Output "---"
}