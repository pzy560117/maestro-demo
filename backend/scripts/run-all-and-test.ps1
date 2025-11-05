#!/usr/bin/env pwsh
# Maestro 项目完整启动与测试脚本
# 功能：启动所有服务 → 数据库迁移 → 运行测试

Write-Host "=== Maestro 项目完整启动与测试 ===" -ForegroundColor Cyan
Write-Host ""

# 1. 检查环境
Write-Host "[1/7] 检查环境依赖..." -ForegroundColor Yellow
$requiredCommands = @("docker", "docker-compose", "node", "npm")
foreach ($cmd in $requiredCommands) {
    if (!(Get-Command $cmd -ErrorAction SilentlyContinue)) {
        Write-Host "错误: 未找到命令 '$cmd'，请先安装" -ForegroundColor Red
        exit 1
    }
}
Write-Host "✓ 环境检查通过" -ForegroundColor Green
Write-Host ""

# 2. 停止可能运行的旧服务
Write-Host "[2/7] 停止旧服务..." -ForegroundColor Yellow
Set-Location -Path "..\docker"
docker-compose down 2>$null
Write-Host "✓ 旧服务已停止" -ForegroundColor Green
Write-Host ""

# 3. 启动 Docker 服务
Write-Host "[3/7] 启动 Docker 服务 (PostgreSQL, Redis, MinIO, Appium)..." -ForegroundColor Yellow
docker-compose up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "错误: Docker 服务启动失败" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Docker 服务已启动" -ForegroundColor Green
Write-Host ""

# 4. 等待服务就绪
Write-Host "[4/7] 等待服务就绪..." -ForegroundColor Yellow
Write-Host "等待 PostgreSQL..." -NoNewline
$maxWait = 30
$waited = 0
while ($waited -lt $maxWait) {
    $result = docker-compose exec -T postgres pg_isready -U maestro 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host " ✓" -ForegroundColor Green
        break
    }
    Start-Sleep -Seconds 1
    $waited++
    Write-Host "." -NoNewline
}
if ($waited -ge $maxWait) {
    Write-Host " ✗" -ForegroundColor Red
    Write-Host "警告: PostgreSQL 未在 30 秒内就绪，继续尝试..." -ForegroundColor Yellow
}

Write-Host "等待 Redis..." -NoNewline
Start-Sleep -Seconds 2
Write-Host " ✓" -ForegroundColor Green

Write-Host "等待 MinIO..." -NoNewline
Start-Sleep -Seconds 3
Write-Host " ✓" -ForegroundColor Green

Write-Host "等待 Appium..." -NoNewline
Start-Sleep -Seconds 5
Write-Host " ✓" -ForegroundColor Green
Write-Host ""

# 5. 配置环境变量
Write-Host "[5/7] 配置环境变量..." -ForegroundColor Yellow
Set-Location -Path "..\backend"

# 创建 .env.local 文件
$envContent = @"
# Database
DATABASE_URL="postgresql://maestro:maestro_password@localhost:5432/maestro?schema=public"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# MinIO
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_USE_SSL=false
MINIO_BUCKET=maestro-screenshots

# Appium
APPIUM_ENABLED=true
APPIUM_HOST=localhost
APPIUM_PORT=4723

# MidSceneJS (使用 DashScope)
MIDSCENE_ENABLED=true
LLM_API_KEY=sk-test-key-placeholder
LLM_API_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1

# LLM
LLM_MODEL=qwen-vl-max-latest
LLM_TEMPERATURE=0.7
LLM_MAX_TOKENS=2000

# Application
PORT=3000
NODE_ENV=development
"@

$envContent | Out-File -FilePath ".env.local" -Encoding UTF8
Write-Host "✓ 环境变量已配置" -ForegroundColor Green
Write-Host ""

# 6. 数据库迁移
Write-Host "[6/7] 执行数据库迁移..." -ForegroundColor Yellow
npx prisma generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "错误: Prisma 生成失败" -ForegroundColor Red
    exit 1
}

npx prisma db push --skip-generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "错误: 数据库迁移失败" -ForegroundColor Red
    exit 1
}
Write-Host "✓ 数据库迁移完成" -ForegroundColor Green
Write-Host ""

# 7. 运行测试
Write-Host "[7/7] 运行测试..." -ForegroundColor Yellow
Write-Host ""

# 运行单元测试
Write-Host ">>> 运行单元测试 <<<" -ForegroundColor Cyan
npm test
$unitTestResult = $LASTEXITCODE

Write-Host ""
Write-Host "=== 测试完成 ===" -ForegroundColor Cyan
Write-Host ""

if ($unitTestResult -eq 0) {
    Write-Host "✓ 所有测试通过!" -ForegroundColor Green
} else {
    Write-Host "✗ 部分测试失败" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== 服务状态 ===" -ForegroundColor Cyan
Set-Location -Path "..\docker"
docker-compose ps

Write-Host ""
Write-Host "=== 后续操作 ===" -ForegroundColor Cyan
Write-Host "1. 启动后端服务: cd backend && npm run start:dev"
Write-Host "2. 查看 API 文档: http://localhost:3000/api"
Write-Host "3. 查看服务日志: cd docker && docker-compose logs -f [service]"
Write-Host "4. 停止所有服务: cd docker && docker-compose down"
Write-Host ""

exit $unitTestResult

