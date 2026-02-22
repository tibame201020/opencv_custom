$ErrorActionPreference = "Stop"

# Use adb stub for tests
$env:ADB_BIN = "..\tools\adb_stub.bat"
$env:PYTHONPATH = (Get-Location).Path + "\core"

Write-Host "Running Playwright Tests against wails dev Server..." -ForegroundColor Yellow
Set-Location frontend
npx playwright test e2e/workflow_e2e.spec.ts --reporter=list
$testExitCode = $LASTEXITCODE

Set-Location ..

if ($testExitCode -eq 0) {
    Write-Host "`n✅ UI Tests Passed!" -ForegroundColor Green
} else {
    Write-Host "`n❌ UI Tests Failed!" -ForegroundColor Red
}
exit $testExitCode
