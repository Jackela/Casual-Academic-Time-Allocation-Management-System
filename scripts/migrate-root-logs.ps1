# migrate-root-logs.ps1
# Purpose: Migrate polluted log files from root to logs/ directory (Windows PowerShell)
# Usage: powershell -ExecutionPolicy Bypass -File scripts\migrate-root-logs.ps1

$ErrorActionPreference = 'Stop'

Write-Host "🧹 Starting root directory cleanup..." -ForegroundColor Cyan

# Ensure logs directory exists
$null = New-Item -ItemType Directory -Force -Path "logs\archived-root-logs"

# Timestamp for archive
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$archiveDir = "logs\archived-root-logs\$timestamp"
$null = New-Item -ItemType Directory -Force -Path $archiveDir

# Log files to migrate
$logFiles = @(
  "backend.log",
  "backend-dev.log",
  "backend-e2e.log",
  "frontend-dev.log",
  "frontend-e2e.log",
  "testci.log"
)

# Temporary/junk files to delete
$junkFiles = @(
  "CON",
  "nul",
  "patch.tmp"
)

# Migrate log files
Write-Host "📦 Migrating log files to $archiveDir..." -ForegroundColor Yellow
foreach ($file in $logFiles) {
  if (Test-Path $file) {
    Move-Item -Path $file -Destination "$archiveDir\" -Force
    Write-Host "  ✓ Moved: $file → $archiveDir\" -ForegroundColor Green
  } else {
    Write-Host "  ⊘ Not found: $file" -ForegroundColor Gray
  }
}

# Delete junk files
Write-Host "🗑️  Removing junk files..." -ForegroundColor Yellow
foreach ($file in $junkFiles) {
  if (Test-Path $file) {
    Remove-Item -Path $file -Force
    Write-Host "  ✓ Deleted: $file" -ForegroundColor Green
  } else {
    Write-Host "  ⊘ Not found: $file" -ForegroundColor Gray
  }
}

# Create .gitkeep in logs directory
$null = New-Item -ItemType File -Force -Path "logs\.gitkeep"

Write-Host ""
Write-Host "✅ Cleanup complete!" -ForegroundColor Green
Write-Host "📊 Summary:" -ForegroundColor Cyan
Write-Host "   - Logs archived to: $archiveDir"
Write-Host "   - Junk files removed"
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Review archived logs: dir $archiveDir"
Write-Host "  2. Update .gitignore: git add .gitignore"
Write-Host "  3. Verify: git status"
