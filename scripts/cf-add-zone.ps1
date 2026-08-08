$token = $env:CF_TOKEN
$body = @{
  name    = "e-nvoy.nx.kg"
  account = @{ id = "3927cfb1b7b9165d4cf08006a04f175f" }
  type    = "full"
  jump_start = $false
} | ConvertTo-Json -Depth 5

Write-Output "=== Try adding zone e-nvoy.nx.kg (full error) ==="
try {
  $r = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/zones" -Headers @{ Authorization = "Bearer $token" } -Method Post -ContentType "application/json" -Body $body
  $r | ConvertTo-Json -Depth 6
} catch {
  $resp = $_.Exception.Response
  if ($resp) {
    $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
    $errBody = $reader.ReadToEnd()
    Write-Output ("HTTP " + [int]$resp.StatusCode)
    Write-Output $errBody
  } else {
    Write-Output ("ERROR: " + $_.Exception.Message)
  }
}
