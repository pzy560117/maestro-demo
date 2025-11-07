# Maestro Backend 开发环境启动脚本 (PowerShell)
# 设置环境变量并启动开发服务器

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Maestro Backend - Development Mode" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 设置环境变量
$env:PORT = "8360"
$env:NODE_ENV = "development"
$env:APPIUM_ENABLED = "true"
$env:APPIUM_SERVER_URL = "http://localhost:4723"

Write-Host "[Config] PORT=$env:PORT" -ForegroundColor Green
Write-Host "[Config] APPIUM_ENABLED=$env:APPIUM_ENABLED" -ForegroundColor Green
Write-Host "[Config] APPIUM_SERVER_URL=$env:APPIUM_SERVER_URL" -ForegroundColor Green
Write-Host ""

# 切换到 backend 目录
Set-Location -Path $PSScriptRoot\..

# 启动开发服务器
npm run start:dev

