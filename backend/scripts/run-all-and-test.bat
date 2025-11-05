@echo off
REM Maestro 项目完整启动与测试脚本
REM 功能：启动所有服务 -> 数据库迁移 -> 运行测试

echo ======================================
echo   Maestro 项目完整启动与测试
echo ======================================
echo.

REM 1. 检查环境
echo [1/7] 检查环境依赖...
where docker >nul 2>&1
if errorlevel 1 (
    echo 错误: 未找到 docker 命令，请先安装
    exit /b 1
)
where docker-compose >nul 2>&1
if errorlevel 1 (
    echo 错误: 未找到 docker-compose 命令，请先安装
    exit /b 1
)
where node >nul 2>&1
if errorlevel 1 (
    echo 错误: 未找到 node 命令，请先安装
    exit /b 1
)
where npm >nul 2>&1
if errorlevel 1 (
    echo 错误: 未找到 npm 命令，请先安装
    exit /b 1
)
echo 环境检查通过
echo.

REM 2. 停止可能运行的旧服务
echo [2/7] 停止旧服务...
cd /d D:\Project\maestro\docker
docker-compose down >nul 2>&1
echo 旧服务已停止
echo.

REM 3. 启动 Docker 服务
echo [3/7] 启动 Docker 服务 (PostgreSQL, Redis, MinIO, Appium)...
docker-compose up -d
if errorlevel 1 (
    echo 错误: Docker 服务启动失败
    exit /b 1
)
echo Docker 服务已启动
echo.

REM 4. 等待服务就绪
echo [4/7] 等待服务就绪...
echo 等待 PostgreSQL...
timeout /t 15 /nobreak >nul
echo PostgreSQL 就绪

echo 等待 Redis...
timeout /t 2 /nobreak >nul
echo Redis 就绪

echo 等待 MinIO...
timeout /t 3 /nobreak >nul
echo MinIO 就绪

echo 等待 Appium...
timeout /t 5 /nobreak >nul
echo Appium 就绪
echo.

REM 5. 配置环境变量
echo [5/7] 配置环境变量...
cd /d D:\Project\maestro\backend

(
echo # Database
echo DATABASE_URL="postgresql://maestro:maestro_password@127.0.0.1:5432/maestro?schema=public"
echo.
echo # Redis
echo REDIS_HOST=127.0.0.1
echo REDIS_PORT=6379
echo.
echo # MinIO
echo MINIO_ENDPOINT=127.0.0.1
echo MINIO_PORT=9000
echo MINIO_ACCESS_KEY=minioadmin
echo MINIO_SECRET_KEY=minioadmin
echo MINIO_USE_SSL=false
echo MINIO_BUCKET=maestro-screenshots
echo.
echo # Appium
echo APPIUM_ENABLED=true
echo APPIUM_HOST=127.0.0.1
echo APPIUM_PORT=4723
echo.
echo # MidSceneJS ^(使用 DashScope^)
echo MIDSCENE_ENABLED=true
echo LLM_API_KEY=sk-test-key-placeholder
echo LLM_API_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
echo.
echo # LLM
echo LLM_MODEL=qwen-vl-max-latest
echo LLM_TEMPERATURE=0.7
echo LLM_MAX_TOKENS=2000
echo.
echo # Application
echo PORT=3000
echo NODE_ENV=development
) > .env.local

echo 环境变量已配置
echo.

REM 6. 数据库迁移
echo [6/7] 执行数据库迁移...
call npx prisma generate
if errorlevel 1 (
    echo 错误: Prisma 生成失败
    exit /b 1
)

call npx prisma db push --skip-generate
if errorlevel 1 (
    echo 错误: 数据库迁移失败
    exit /b 1
)
echo 数据库迁移完成
echo.

REM 7. 运行测试
echo [7/7] 运行测试...
echo.
echo ===== 运行单元测试 =====
call npm test
set TEST_RESULT=%errorlevel%

echo.
echo ======================================
echo   测试完成
echo ======================================
echo.

if %TEST_RESULT% equ 0 (
    echo 所有测试通过!
) else (
    echo 部分测试失败
)

echo.
echo ======================================
echo   服务状态
echo ======================================
cd /d D:\Project\maestro\docker
docker-compose ps

echo.
echo ======================================
echo   后续操作
echo ======================================
echo 1. 启动后端服务: cd backend ^&^& npm run start:dev
echo 2. 查看 API 文档: http://localhost:3000/api
echo 3. 查看服务日志: cd docker ^&^& docker-compose logs -f [service]
echo 4. 停止所有服务: cd docker ^&^& docker-compose down
echo.

exit /b %TEST_RESULT%

