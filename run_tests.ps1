# ScriptPlatform One-Click Test Script
# Usage: ./run_tests.ps1

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🚀 Starting Comprehensive Test Suite" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 1. Backend Tests (Go)
Write-Host "`n[1/3] Running Go Backend Tests..." -ForegroundColor Yellow
go test -v ./server/...
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Go Tests Passed!" -ForegroundColor Green
} else {
    Write-Host "❌ Go Tests Failed!" -ForegroundColor Red
    exit $LASTEXITCODE
}

# 2. Core Tests (Python)
Write-Host "`n[2/3] Running Python Core Tests..." -ForegroundColor Yellow
$env:PYTHONPATH = "."
python -m pytest core/test --alluredir=allure-results
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Python Tests Passed!" -ForegroundColor Green
} else {
    Write-Host "❌ Python Tests Failed!" -ForegroundColor Red
    exit $LASTEXITCODE
}

# 3. Frontend Tests (Playwright)
Write-Host "`n[3/3] Running Frontend E2E Tests..." -ForegroundColor Yellow
Set-Location frontend
npm run test:e2e
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Frontend Tests Passed!" -ForegroundColor Green
} else {
    Write-Host "❌ Frontend Tests Failed!" -ForegroundColor Red
    Set-Location ..
    exit $LASTEXITCODE
}
Set-Location ..

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "🎉 All Tests Passed Successfully!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Tip: To view Allure reports, run 'allure serve allure-results' if installed."
