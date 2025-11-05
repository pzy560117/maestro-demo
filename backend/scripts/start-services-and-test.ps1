# ====================================
# Maestro 启动真实服务并运行测试 (Windows)
# ====================================

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Maestro - 启动真实服务并运行测试" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 步骤 1: 启动 Docker 服务
Write-Host "[1/6] 启动 Docker 服务..." -ForegroundColor Yellow
Set-Location ..\docker
docker-compose up -d

# 等待服务就绪
Write-Host "等待服务启动..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# 检查服务状态
Write-Host "检查服务状态..." -ForegroundColor Yellow
docker-compose ps

Write-Host ""

# 步骤 2: 检查服务健康状态
Write-Host "[2/6] 检查服务健康状态..." -ForegroundColor Yellow

# PostgreSQL
Write-Host -NoNewline "PostgreSQL: "
try {
    docker-compose exec -T postgres pg_isready -U maestro | Out-Null
    Write-Host "✓ 健康" -ForegroundColor Green
} catch {
    Write-Host "✗ 不健康" -ForegroundColor Red
    exit 1
}

# Redis
Write-Host -NoNewline "Redis: "
try {
    docker-compose exec -T redis redis-cli ping | Out-Null
    Write-Host "✓ 健康" -ForegroundColor Green
} catch {
    Write-Host "✗ 不健康" -ForegroundColor Red
    exit 1
}

# MinIO
Write-Host -NoNewline "MinIO: "
try {
    $response = Invoke-WebRequest -Uri "http://localhost:9000/minio/health/live" -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "✓ 健康" -ForegroundColor Green
    } else {
        throw "MinIO 不健康"
    }
} catch {
    Write-Host "✗ 不健康" -ForegroundColor Red
    exit 1
}

# Appium
Write-Host -NoNewline "Appium: "
try {
    $response = Invoke-WebRequest -Uri "http://localhost:4723/status" -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "✓ 健康" -ForegroundColor Green
    } else {
        throw "Appium 不健康"
    }
} catch {
    Write-Host "✗ 不健康" -ForegroundColor Red
    Write-Host "注意：Appium 可能需要更长时间启动" -ForegroundColor Yellow
}

Write-Host ""

# 步骤 3: 配置环境变量
Write-Host "[3/6] 配置环境变量..." -ForegroundColor Yellow
Set-Location ..\backend

$envContent = @"
# 数据库配置
DATABASE_URL=postgresql://maestro:maestro_password@localhost:5432/maestro

# API 配置
PORT=3000
NODE_ENV=test

# LLM 配置（使用 Mock）
LLM_API_ENDPOINT=https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions
LLM_API_KEY=sk-test-key
LLM_MODEL_NAME=qwen-vl-max

# Appium 配置（启用真实 API）
APPIUM_ENABLED=true
APPIUM_SERVER_URL=http://localhost:4723

# MidSceneJS 配置（暂时禁用）
MIDSCENE_ENABLED=false

# MinIO 对象存储配置（启用）
MINIO_ENABLED=true
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin

# 日志配置
LOG_LEVEL=debug
"@

$envContent | Out-File -FilePath ".env" -Encoding UTF8

Write-Host "✓ 环境变量已配置" -ForegroundColor Green
Write-Host ""

# 步骤 4: 运行数据库迁移
Write-Host "[4/6] 运行数据库迁移..." -ForegroundColor Yellow
npm run prisma:generate
npm run prisma:migrate deploy

Write-Host "✓ 数据库迁移完成" -ForegroundColor Green
Write-Host ""

# 步骤 5: 运行健康检查
Write-Host "[5/6] 检查集成健康..." -ForegroundColor Yellow

# 启动应用（后台）
$backendJob = Start-Job -ScriptBlock { 
    Set-Location $using:PWD
    npm run start:dev 
}

# 等待应用启动
Write-Host -NoNewline "等待应用启动"
$started = $false
for ($i = 1; $i -le 30; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000/api/v1/health" -UseBasicParsing -TimeoutSec 2
        if ($response.StatusCode -eq 200) {
            Write-Host " ✓" -ForegroundColor Green
            $started = $true
            break
        }
    } catch {
        Write-Host -NoNewline "."
        Start-Sleep -Seconds 1
    }
}

if (-not $started) {
    Write-Host " ✗" -ForegroundColor Red
    Write-Host "应用启动超时" -ForegroundColor Red
    Stop-Job $backendJob
    Remove-Job $backendJob
    exit 1
}

# 检查集成健康
Write-Host ""
Write-Host "集成服务健康检查："
try {
    $healthResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/v1/integrations/health" -UseBasicParsing
    $healthResponse.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
} catch {
    Write-Host "健康检查失败" -ForegroundColor Red
}

Write-Host ""

# 步骤 6: 运行测试
Write-Host "[6/6] 运行测试..." -ForegroundColor Yellow
Write-Host ""

# 停止后台应用
Stop-Job $backendJob
Remove-Job $backendJob

# 运行单元测试
Write-Host "运行单元测试..." -ForegroundColor Yellow
npm test

Write-Host ""

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "✓ 所有测试完成！" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "服务状态："
Write-Host "  - PostgreSQL: http://localhost:5432"
Write-Host "  - Redis: http://localhost:6379"
Write-Host "  - MinIO Console: http://localhost:9001"
Write-Host "  - Appium: http://localhost:4723"
Write-Host "  - Backend API: http://localhost:3000"
Write-Host ""
Write-Host "MinIO 访问："
Write-Host "  - 用户名: minioadmin"
Write-Host "  - 密码: minioadmin"
Write-Host ""
Write-Host "停止服务："
Write-Host "  cd docker && docker-compose down"
Write-Host ""

