@echo off
REM ===================================================
REM 清理占用端口的进程
REM 用法: kill-port.bat [端口号]
REM 示例: kill-port.bat 8360
REM ===================================================

setlocal enabledelayedexpansion

REM 默认端口
set PORT=8360

REM 如果提供了参数，使用参数作为端口
if not "%1"=="" (
    set PORT=%1
)

echo.
echo ============================================
echo 清理端口 %PORT% 占用进程
echo ============================================
echo.

REM 查找占用端口的进程
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":%PORT%" ^| findstr "LISTENING"') do (
    set PID=%%a
    if not "!PID!"=="" (
        echo [发现] 端口 %PORT% 被进程 !PID! 占用
        
        REM 获取进程名称
        for /f "tokens=1" %%b in ('tasklist /FI "PID eq !PID!" /NH') do (
            echo [进程] %%b (PID: !PID!)
        )
        
        REM 强制终止进程
        echo [操作] 正在终止进程 !PID!...
        taskkill /F /PID !PID! >nul 2>&1
        
        if !errorlevel! equ 0 (
            echo [成功] 进程 !PID! 已终止
        ) else (
            echo [失败] 无法终止进程 !PID! (可能需要管理员权限)
        )
        echo.
    )
)

echo ============================================
echo 清理完成
echo ============================================
echo.

REM 等待 2 秒确保端口释放
timeout /t 2 /nobreak >nul

REM 再次检查端口
netstat -aon | findstr ":%PORT%" | findstr "LISTENING" >nul 2>&1
if !errorlevel! equ 0 (
    echo [警告] 端口 %PORT% 仍被占用，可能需要手动处理
) else (
    echo [确认] 端口 %PORT% 已释放
)

echo.
pause

