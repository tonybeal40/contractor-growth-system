$ErrorActionPreference = "Stop"

$toolRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

python "$toolRoot\lead_engine.py" scan `
  --config "$toolRoot\config.json" `
  --seed "$toolRoot\initial-public-opportunities.json" `
  --output "$toolRoot\output"

if ($LASTEXITCODE -ne 0) {
  throw "Public opportunity scan failed with exit code $LASTEXITCODE"
}

python "$toolRoot\lead_engine.py" scan `
  --config "$toolRoot\config.josh-highland.json" `
  --seed "$toolRoot\initial-highland-opportunities.json" `
  --output "$toolRoot\output\josh-highland"

if ($LASTEXITCODE -ne 0) {
  throw "Josh Highland opportunity scan failed with exit code $LASTEXITCODE"
}

python "$toolRoot\social_publisher.py" render `
  --campaigns "$toolRoot\campaigns.json" `
  --output "$toolRoot\output"

if ($LASTEXITCODE -ne 0) {
  throw "Social queue render failed with exit code $LASTEXITCODE"
}

Write-Host "Daily All-Pro and Josh Highland lead review files are ready in $toolRoot\output"
