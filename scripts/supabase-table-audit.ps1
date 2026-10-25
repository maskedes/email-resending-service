# Supabase table audit -- proves which tables actually receive writes.
# Reports: exists / row count / latest created_at per table.
# Usage: powershell -File scripts/supabase-table-audit.ps1
$ErrorActionPreference = "Continue"

# Load SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env (repo root)
$envFile = Join-Path $PSScriptRoot "..\.env"
$cfg = @{}
Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$') { $cfg[$Matches[1]] = $Matches[2] }
}
$base = $cfg["SUPABASE_URL"].TrimEnd('/')
$key  = $cfg["SUPABASE_SERVICE_ROLE_KEY"]

$tables = @(
    "profiles", "api_keys", "api_key_members", "emails", "email_events",
    "domains", "webhooks", "templates",
    "sites", "links", "link_logs", "link_triggers",
    "sms_gateways", "sms_messages", "sms_events"
)

$headers = @{
    "apikey"        = $key
    "Authorization" = "Bearer $key"
    "Prefer"        = "count=exact"
}

"=== SUPABASE TABLE AUDIT - $((Get-Date).ToString('yyyy-MM-dd HH:mm')) ==="
"{0,-16} {1,-10} {2,10} {3,-25} {4}" -f "TABLE", "EXISTS", "ROWS", "LAST WRITE", "NOTE"

foreach ($t in $tables) {
    try {
        $apiUrl = "$base/rest/v1/$t" + "?select=*" + "&order=created_at.desc&limit=1"
        try {
            $resp = Invoke-WebRequest -Uri $apiUrl -Headers $headers -TimeoutSec 30
        } catch {
            # fallback: table without created_at column -> order by id
            $apiUrl = "$base/rest/v1/$t" + "?select=*" + "&order=id.desc&limit=1"
            $resp = Invoke-WebRequest -Uri $apiUrl -Headers $headers -TimeoutSec 30
        }
        $content = $resp.Content | ConvertFrom-Json
        $range = $resp.Headers["Content-Range"]
        $total = if ($range -match '/(\d+)$') { $Matches[1] } elseif ($range) { $range } else { "?" }
        $row0 = if ($content.Count -gt 0) { $content[0] } else { $null }
        $stampCol = if ($row0) { if ($row0.created_at) { $row0.created_at } elseif ($row0.timestamp) { $row0.timestamp } elseif ($row0.updated_at) { $row0.updated_at } else { "-" } } else { "-" }
        "{0,-16} {1,-10} {2,10} {3,-25} {4}" -f $t, "YES", $total, $stampCol, ""
    } catch {
        $msg = $_.Exception.Message
        $detail = ""
        try { $detail = ($_.ErrorDetails.Message | ConvertFrom-Json).message } catch {}
        if ($detail -match 'relation .* does not exist|\*" is not in|PGRST205') {
            "{0,-16} {1,-10} {2,10} {3,-25} {4}" -f $t, "NO", "-", "-", "table missing in DB!"
        } else {
            "{0,-16} {1,-10} {2,10} {3,-25} {4}" -f $t, "?", "-", "-", (($detail, $msg) -join " | ")
        }
    }
}