@echo off
chcp 65001 >nul
REM Maestro Project - Start All Services and Run Tests

echo ========================================
echo   Maestro - Start Services and Test
echo ========================================
echo.

REM 1. Check Environment
echo [1/7] Checking environment...
where docker >nul 2>&1
if errorlevel 1 (
    echo ERROR: docker not found
    exit /b 1
)
where docker-compose >nul 2>&1
if errorlevel 1 (
    echo ERROR: docker-compose not found
    exit /b 1
)
where node >nul 2>&1
if errorlevel 1 (
    echo ERROR: node not found
    exit /b 1
)
where npm >nul 2>&1
if errorlevel 1 (
    echo ERROR: npm not found
    exit /b 1
)
echo Environment check passed
echo.

REM 2. Stop Old Services
echo [2/7] Stopping old services...
cd /d D:\Project\maestro\docker
docker-compose down >nul 2>&1
echo Old services stopped
echo.

REM 3. Start Docker Services
echo [3/7] Starting Docker services (PostgreSQL, Redis, MinIO, Appium)...
docker-compose up -d
if errorlevel 1 (
    echo ERROR: Failed to start Docker services
    exit /b 1
)
echo Docker services started
echo.

REM 4. Wait for Services
echo [4/7] Waiting for services to be ready...
echo Waiting for PostgreSQL (15s)...
timeout /t 15 /nobreak >nul
echo PostgreSQL ready

echo Waiting for Redis (2s)...
timeout /t 2 /nobreak >nul
echo Redis ready

echo Waiting for MinIO (3s)...
timeout /t 3 /nobreak >nul
echo MinIO ready

echo Waiting for Appium (5s)...
timeout /t 5 /nobreak >nul
echo Appium ready
echo.

REM 5. Configure Environment
echo [5/7] Configuring environment variables...
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
echo # MidSceneJS
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

echo Environment configured
echo.

REM 6. Database Migration
echo [6/7] Running database migration...
call npx prisma generate
if errorlevel 1 (
    echo ERROR: Prisma generate failed
    exit /b 1
)

call npx prisma db push --skip-generate
if errorlevel 1 (
    echo ERROR: Database migration failed
    exit /b 1
)
echo Database migration completed
echo.

REM 7. Run Tests
echo [7/7] Running tests...
echo.
echo ===== Running Unit Tests =====
call npm test
set TEST_RESULT=%errorlevel%

echo.
echo ========================================
echo   Test Completed
echo ========================================
echo.

if %TEST_RESULT% equ 0 (
    echo All tests passed!
) else (
    echo Some tests failed
)

echo.
echo ========================================
echo   Service Status
echo ========================================
cd /d D:\Project\maestro\docker
docker-compose ps

echo.
echo ========================================
echo   Next Steps
echo ========================================
echo 1. Start backend: cd backend ^&^& npm run start:dev
echo 2. View API docs: http://localhost:3000/api
echo 3. View logs: cd docker ^&^& docker-compose logs -f [service]
echo 4. Stop services: cd docker ^&^& docker-compose down
echo.

exit /b %TEST_RESULT%

