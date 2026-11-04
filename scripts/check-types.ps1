Write-Host "Checking Shopping Items TypeScript..." -ForegroundColor Cyan

npx tsc --noEmit

if ($LASTEXITCODE -ne 0) {
    Write-Host "TypeScript validation failed." -ForegroundColor Red
    exit 1
}

Write-Host "TypeScript validation passed!" -ForegroundColor Green
