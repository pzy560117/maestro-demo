@echo off
REM ===================================================
REM 停止所有 Maestro 相关服务
REM ===================================================

echo.
echo ============================================
echo 停止 Maestro 所有服务
echo ============================================
echo.

REM 1. 停止 Node.js（后端）
echo [1/3] 停止后端服务...
taskkill /F /IM node.exe >nul 2>&1
if %errorlevel% equ 0 (
    echo [✓] 后端已停止
) else (
    echo [·] 后端未运行
)

REM 2. 停止 Appium
echo [2/3] 停止 Appium 服务...
for /f "tokens=2" %%a in ('tasklist /FI "IMAGENAME eq node.exe" /FI "WINDOWTITLE eq Appium*" ^| findstr "node.exe"') do (
    taskkill /F /PID %%a >nul 2>&1
)
echo [✓] Appium 已停止

REM 3. 清理端口
echo [3/3] 清理端口占用...
for %%p in (8360 4723 5173) do (
    for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":%%p" ^| findstr "LISTENING"') do (
        taskkill /F /PID %%a >nul 2>&1
    )
)
echo [✓] 端口已清理

echo.
echo ============================================
echo 所有服务已停止
echo ============================================
echo.
pause

