@echo off
chcp 65001 >nul
REM Maestro - Run Tests (Assumes Services Already Running)

echo ========================================
echo   Maestro - Run Tests
echo   (Services must be running first)
echo ========================================
echo.

echo Checking Docker services status...
cd /d D:\Project\maestro\docker
docker-compose ps
echo.

echo Press any key to continue with tests, or Ctrl+C to cancel...
pause >nul

cd /d D:\Project\maestro\backend

echo.
echo [1/3] Configuring environment...
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

echo [2/3] Running database migration...
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

echo [3/3] Running tests...
echo.
call npm test
set TEST_RESULT=%errorlevel%

echo.
echo ========================================
if %TEST_RESULT% equ 0 (
    echo   ALL TESTS PASSED!
) else (
    echo   SOME TESTS FAILED
)
echo ========================================
echo.

exit /b %TEST_RESULT%

