$body = @{
    type = "A"
    name = "boardme"
    ttl = 300
    values = @("185.227.111.25")
} | ConvertTo-Json -Compress
Invoke-RestMethod -Method Post -Uri 'https://domain-api.digitalplat.org/api/v1/domains/mailenvoy.qd.je/dns/records' -Headers @{Authorization='Bearer dp_live_bHe4Cl0KNXI5VU25qNGnav7j'} -ContentType 'application/json' -Body $body