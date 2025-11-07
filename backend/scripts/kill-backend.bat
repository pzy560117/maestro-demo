@echo off
REM ===================================================
REM 清理后端 Node.js 进程和端口 8360
REM ===================================================

echo.
echo [清理] 停止后端服务...

REM 停止所有 Node.js 进程
taskkill /F /IM node.exe >nul 2>&1

REM 清理端口 8360
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8360" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo [完成] 后端服务已清理
echo.

timeout /t 1 /nobreak >nul

