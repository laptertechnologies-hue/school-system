$fp = "C:\Users\LAPTER\.gemini\antigravity\scratch\school-system\src\app\school\[subdomain]\page.tsx"
$f = Get-Content -LiteralPath $fp
$out = $f[0..6838] + $f[7275..($f.Length - 1)]
Set-Content -LiteralPath $fp -Value $out -Encoding UTF8
Write-Host "Done. New line count: $($out.Length)"
