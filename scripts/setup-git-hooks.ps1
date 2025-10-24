Param()
Write-Host "Configuring local git hooks path to .githooks" -ForegroundColor Cyan
git config core.hooksPath .githooks
Write-Host "Done. Pre-commit will now enforce E2E guardrails." -ForegroundColor Green

