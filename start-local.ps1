# Opens the latest code of this project on http://localhost:3000 (local database).
# Run from PowerShell:  C:\Users\abhis\satta-next\start-local.ps1
# Stop it with Ctrl+C.

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
$env:Path = "C:\Users\abhis\tools\node-v24.20.0-win-x64;C:\Users\abhis\tools\git\cmd;$env:Path"

# 1. Local MySQL (the site's local database) must be running.
if (-not (Get-Process mysqld -ErrorAction SilentlyContinue)) {
  Write-Host 'Starting local MySQL...'
  Start-Process -FilePath 'C:\Users\abhis\tools\mysql-8.4.0-winx64\bin\mysqld.exe' `
    -ArgumentList '--datadir=C:\Users\abhis\tools\mysql-data', '--console' -WindowStyle Hidden
  Start-Sleep -Seconds 8
}

# 2. Show which saved version is running.
Write-Host ('Code version: ' + (git log --oneline -1))

# 3. Install packages if needed, then start the site and open the browser.
if (-not (Test-Path node_modules)) { npm install }
Start-Job { Start-Sleep -Seconds 12; Start-Process 'http://localhost:3000' } | Out-Null
Write-Host 'Starting http://localhost:3000 (first page load takes a few seconds; Ctrl+C to stop)'
npx next dev -p 3000
