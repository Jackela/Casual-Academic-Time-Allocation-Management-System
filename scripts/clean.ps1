param()
$ErrorActionPreference = 'Stop'

Write-Host "Cleaning repository generated artifacts..."

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

$paths = @(
  Join-Path $root 'build'
  Join-Path $root '.gradle'
  Join-Path $root 'test-results'
  Join-Path $root 'artifacts'
  Join-Path $root 'logs'
  Join-Path $root 'frontend/dist'
  Join-Path $root 'frontend/coverage'
  Join-Path $root 'frontend/playwright-report'
  Join-Path $root 'frontend/playwright-screenshots'
  Join-Path $root 'frontend/test-results'
  Join-Path $root 'frontend/trace-inspect'
  Join-Path $root 'frontend/.vite'
  Join-Path $root 'frontend/src/contracts/generated'
)

foreach ($p in $paths) {
  if (Test-Path -LiteralPath $p) {
    Write-Host " - Remove-Item $p"
    Remove-Item -LiteralPath $p -Recurse -Force -ErrorAction SilentlyContinue
  }
}

Write-Host "Done."

