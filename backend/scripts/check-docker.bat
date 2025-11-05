@echo off
chcp 65001 >nul
echo ========================================
echo   Docker Status Check
echo ========================================
echo.

echo Checking Docker client...
docker version 2>nul
if errorlevel 1 (
    echo [ERROR] Docker client is not installed or Docker Desktop is not running
    echo.
    echo Please:
    echo 1. Install Docker Desktop from https://www.docker.com/products/docker-desktop
    echo 2. Start Docker Desktop application
    echo 3. Wait for Docker engine to start (system tray icon turns green)
    echo 4. Run this script again
    echo.
    exit /b 1
)

echo.
echo Checking Docker daemon...
docker ps >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker daemon is not running
    echo.
    echo Please start Docker Desktop:
    echo 1. Open Docker Desktop application
    echo 2. Wait for the engine to start (system tray icon turns green)
    echo 3. Run this script again
    echo.
    exit /b 1
)

echo [OK] Docker is running!
echo.

echo Current running containers:
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo.

echo ========================================
echo   Docker is ready for use!
echo ========================================
echo.
echo Next steps:
echo 1. Start services: cd ..\docker ^&^& docker-compose up -d
echo 2. Run tests: cd ..\backend ^&^& npm test
echo.

exit /b 0

