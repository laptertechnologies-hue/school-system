$fp = "C:\Users\LAPTER\.gemini\antigravity\scratch\school-system\src\app\school\[subdomain]\page.tsx"
$f = Get-Content -LiteralPath $fp
$out = $f[0..6733] + $f[6840..($f.Length - 1)]
Set-Content -LiteralPath $fp -Value $out -Encoding UTF8
Write-Host "Done. New line count: $($out.Length)"
