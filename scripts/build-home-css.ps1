$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$work = Join-Path $root "tmp\home-css-build"
$bundle = Join-Path $work "home.bundle.css"
$purged = Join-Path $work "purged"
$purgedBundle = Join-Path $purged "home.bundle.css"
$output = Join-Path $root "home.min.css"

New-Item -ItemType Directory -Force -Path $work, $purged | Out-Null

Push-Location $root
try {
  npx.cmd --yes lightningcss-cli@1.33.0 --bundle --minify scripts/home-entry.css -o $bundle
  npx.cmd --yes purgecss@8.0.0 --css $bundle --content index.html "*.js" --output $purged
  npx.cmd --yes lightningcss-cli@1.33.0 --minify $purgedBundle -o $output
  Write-Output "Built home.min.css ($((Get-Item $output).Length) bytes)."
} finally {
  Pop-Location
}
