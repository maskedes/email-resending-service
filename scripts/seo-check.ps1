# SEO reachability check — simulates crawler requests against the dashboard.
# Usage: pwsh ./scripts/seo-check.ps1 [base-url]
param(
    [string]$BaseUrl = "https://mailenvoy.qd.je"
)

$ErrorActionPreference = "Continue"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$results = [System.Collections.Generic.List[object]]::new()
function Add-Check($name, $ok, $detail) {
    $results.Add([pscustomobject]@{ Check = $name; OK = [bool]$ok; Detail = $detail })
}
$ChromeUA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36"
$GooglebotUA = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"
$BingbotUA = "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)"

# 1. Homepage reachable (normal browser)
$homeResp = $null
try {
    $homeResp = Invoke-WebRequest -Uri $BaseUrl -UserAgent $ChromeUA -TimeoutSec 20
    Add-Check "Homepage reachable (Chrome UA)" ($homeResp.StatusCode -eq 200) "HTTP $($homeResp.StatusCode)"
} catch { Add-Check "Homepage reachable (Chrome UA)" $false $_.Exception.Message }

# 2. Homepage available to Googlebot
try {
    $gb = Invoke-WebRequest -Uri $BaseUrl -UserAgent $GooglebotUA -TimeoutSec 20
    Add-Check "Googlebot can fetch homepage" ($gb.StatusCode -eq 200) "HTTP $($gb.StatusCode)"
} catch { Add-Check "Googlebot can fetch homepage" $false $_.Exception.Message }

# 3. Homepage available to Bingbot
try {
    $bb = Invoke-WebRequest -Uri $BaseUrl -UserAgent $BingbotUA -TimeoutSec 20
    Add-Check "Bingbot can fetch homepage" ($bb.StatusCode -eq 200) "HTTP $($bb.StatusCode)"
} catch { Add-Check "Bingbot can fetch homepage" $false $_.Exception.Message }

# 4. HTTP -> HTTPS redirect (via curl.exe - HttpWebRequest mis-reports this)
try {
    $rf = (& curl.exe -s -o NUL -w "%{http_code} %{redirect_url}" ($BaseUrl -replace '^https','http')) | Where-Object { $_ }
    $parts = ($rf -join ' ') -split '\s+', 2
    $code = $parts[0]
    $target = if ($parts.Count -gt 1) { $parts[1] } else { '' }
    Add-Check "HTTP redirects to HTTPS" (($code -in '301','307','308') -and $target -match '^https:') "curl: $code -> $target"
} catch { Add-Check "HTTP redirects to HTTPS" $false $_.Exception.Message }

# 5. robots.txt
try {
    $robots = Invoke-WebRequest -Uri "$BaseUrl/robots.txt" -UserAgent $ChromeUA -TimeoutSec 20
    $txt = $robots.Content
    $hasSitemap = $txt -match "Sitemap:"
    $allowsAll = $txt -match "User-agent:\s*\*"
    Add-Check "robots.txt exists" ($robots.StatusCode -eq 200) "$($txt.Length) bytes"
    Add-Check "robots.txt declares Sitemap" $hasSitemap ($txt -split "`n" | Where-Object { $_ -match "Sitemap" } | ForEach-Object { $_.Trim() } | Select-Object -First 1)
} catch { Add-Check "robots.txt exists" $false $_.Exception.Message }

# 6. sitemap.xml parseable + URLs
try {
    $sm = Invoke-WebRequest -Uri "$BaseUrl/sitemap.xml" -UserAgent $ChromeUA -TimeoutSec 20
    [xml]$xml = $sm.Content
    $urls = @($xml.urlset.url.loc) | Where-Object { $_ }
    Add-Check "sitemap.xml parseable" ($sm.StatusCode -eq 200) "$($urls.Count) URLs"
    $bad = @($urls) | Where-Object { $_ -notmatch '^https://' }
    Add-Check "sitemap URLs are HTTPS" ($bad.Count -eq 0) $(if ($bad.Count) { "non-HTTPS: $($bad -join ', ')" } else { "all $($urls.Count) HTTPS ($( @($urls) | Select-Object -First 3 )...)" })
} catch { Add-Check "sitemap.xml parseable" $false $_.Exception.Message }

# 7. Head SEO tags on homepage
try {
    if (-not $homeResp) { $homeResp = Invoke-WebRequest -Uri $BaseUrl -UserAgent $ChromeUA -TimeoutSec 20 }
    $html = $homeResp.Content
    function Tag($regex) { $m = [regex]::Match($html, $regex); if ($m.Success) { $m.Groups[2].Value.Trim().Substring(0, [Math]::Min(90, $m.Groups[2].Value.Trim().Length)) } else { $null } }
    $title = Tag '<title[^>]*>([^<]*)</title>'
    Add-Check "<title> present" ![string]::IsNullOrEmpty($title) "title=$title"
    $desc = Tag '<meta[^>]+name="description"[^>]+content="([^"]*)"'
    Add-Check "meta description present" ![string]::IsNullOrEmpty($desc) "desc=$desc"
    $canonical = Tag '<link[^>]+rel="canonical"[^>]+href="([^"]*)"'
    Add-Check "canonical link present" ![string]::IsNullOrEmpty($canonical) "canonical=$canonical"
    $noindex = ($html -match 'name="robots"[^>]+content="[^"]*noindex')
    Add-Check "no NOINDEX on homepage" (-not $noindex) $(if ($noindex) { "FOUND noindex - will block indexing!" } else { "clean" })
    $gsc = Tag '<meta[^>]+name="google-site-verification"[^>]+content="([^"]*)"'
    $bing = Tag '<meta[^>]+name="msvalidate.01"[^>]+content="([^"]*)"'
    Add-Check "Google Search Console verification meta" ![string]::IsNullOrEmpty($gsc) $(if ($gsc) { "content=$($gsc.Substring(0,[Math]::Min(15,$gsc.Length)))..." } else { "missing (set NEXT_PUBLIC_GOOGLE_SEARCH_CONSOLE_CODE)" })
    Add-Check "Bing Webmaster verification meta" ![string]::IsNullOrEmpty($bing) $(if ($bing) { "content=$($bing.Substring(0,[Math]::Min(15,$bing.Length)))..." } else { "missing (set NEXT_PUBLIC_BING_WEBMASTER_CODE)" })
} catch { Add-Check "Head SEO tags" $false $_.Exception.Message }

# 8. API health (so SEO tools hitting referenced endpoints don't 500)
try {
    $api = Invoke-WebRequest -Uri "https://api.mailenvoy.qd.je/health" -TimeoutSec 20
    Add-Check "API health reachable" ($api.StatusCode -eq 200) "HTTP $($api.StatusCode)"
} catch { Add-Check "API health reachable" $false $_.Exception.Message }

""
"=== SEO CHECK RESULTS for $BaseUrl ==="
$results | ForEach-Object { "{0} {1,-42} {2}" -f $(if ($_.OK) { "PASS" } else { "FAIL" }), $_.Check, $_.Detail }
""
"passed: $(@($results | Where-Object OK).Count)/$($results.Count)"