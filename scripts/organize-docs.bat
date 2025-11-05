@echo off
chcp 65001 >nul
echo ========================================
echo 🗂️  Maestro 文档整理脚本
echo ========================================
echo.

cd /d "%~dp0.."

echo [1/8] 创建目录结构...
if not exist "docs\archive\root" mkdir "docs\archive\root"
if not exist "docs\archive\backend" mkdir "docs\archive\backend"
if not exist "docs\requirements" mkdir "docs\requirements"
if not exist "docs\guides" mkdir "docs\guides"
if not exist "docs\iterations" mkdir "docs\iterations"
if not exist "docs\technical" mkdir "docs\technical"
echo ✓ 目录结构已创建
echo.

echo [2/8] 归档根目录历史文档...
set count=0
for %%f in (ITERATION-2-COMPLETION.md ITERATION-3-COMPLETION.md ITERATION-4-COMPLETION.md ITERATION-4-PHASE-1-SUMMARY.md ITERATION-4-QUICKSTART.md PHASE-2-IMPLEMENTATION.md PHASE-3-COMPLETION.md PHASE-4-QUICKSTART.md PHASE-5-QUICKSTART.md PHASE-5-TEST-RESULTS.md PLAYWRIGHT-TEST-REPORT.md) do (
    if exist "%%f" (
        move /Y "%%f" "docs\archive\root\" >nul 2>&1
        echo   归档: %%f
        set /a count+=1
    )
)
echo ✓ 根目录历史文档已归档: %count% 个
echo.

echo [3/8] 整理需求文档到 docs\requirements\...
set count=0
for %%f in (PRD需求.md 原型设计.md 数据库设计.md 界面设计.md) do (
    if exist "%%f" (
        move /Y "%%f" "docs\requirements\" >nul 2>&1
        echo   移动: %%f
        set /a count+=1
    )
)
echo ✓ 需求文档已整理: %count% 个
echo.

echo [4/8] 整理指南文档到 docs\guides\...
set count=0
for %%f in (LOCAL-DEV-GUIDE.md 迭代开发指南.md) do (
    if exist "%%f" (
        move /Y "%%f" "docs\guides\" >nul 2>&1
        echo   移动: %%f
        set /a count+=1
    )
)
if exist "QUICKSTART.md" (
    move /Y "QUICKSTART.md" "docs\guides\QUICKSTART-V1.md" >nul 2>&1
    echo   移动: QUICKSTART.md -^> QUICKSTART-V1.md
    set /a count+=1
)
echo ✓ 指南文档已整理: %count% 个
echo.

echo [5/8] 归档backend文档...
cd backend
set count=0
for %%f in (CHANGELOG-ITERATION-2.md COMPLETE-INTEGRATION-SUMMARY.md FINAL-INTEGRATION-COMPLETE.md FINAL-TEST-REPORT.md ITERATION-2-QUICKSTART.md ITERATION-2-SUMMARY.md ITERATION-3-QUICKSTART.md README-ITERATION-3.md TEST-RESULTS-WITH-REAL-SERVICES.md TEST-SUCCESS-SUMMARY.md PROJECT-RUN-SUMMARY.md QUICK-TEST-GUIDE.md) do (
    if exist "%%f" (
        move /Y "%%f" "..\docs\archive\backend\" >nul 2>&1
        echo   归档: %%f
        set /a count+=1
    )
)
echo ✓ backend文档已归档: %count% 个
echo.

echo [6/8] 整理LLM文档...
if not exist "docs\llm" mkdir "docs\llm"
set count=0
for %%f in (MIDSCENE-DASHSCOPE-SETUP.md MODEL-UPGRADE-SUMMARY.md QWEN3-SETUP-SUCCESS.md REAL-API-IMPLEMENTATION-SUMMARY.md REAL-API-INTEGRATION.md REAL-API-QUICKSTART.md) do (
    if exist "%%f" (
        move /Y "%%f" "docs\llm\" >nul 2>&1
        echo   移动: %%f
        set /a count+=1
    )
)
echo ✓ LLM文档已整理: %count% 个
echo.

echo [7/8] 整理迭代报告到 docs\iterations\...
cd ..
if not exist "docs\iterations" mkdir "docs\iterations"
set count=0
for %%f in (docs\iteration-*.md docs\phase-5-delivery-report.md) do (
    if exist "%%f" (
        move /Y "%%f" "docs\iterations\" >nul 2>&1
        echo   移动: %%~nxf
        set /a count+=1
    )
)
echo ✓ 迭代报告已整理: %count% 个
echo.

echo [8/8] 清理临时文件...
cd backend
set count=0
for %%f in (test-debug.log test-final.log test-full.log test-output.log test-result.txt) do (
    if exist "%%f" (
        del /F /Q "%%f" >nul 2>&1
        echo   删除: %%f
        set /a count+=1
    )
)
echo ✓ 临时文件已清理: %count% 个
echo.

cd ..

echo ========================================
echo ✨ 文档整理完成！
echo ========================================
echo.
echo 📊 整理统计:
echo   • 归档根目录文档
echo   • 归档backend文档
echo   • 整理需求文档（PRD、设计文档）
echo   • 整理指南文档（快速开始、本地开发）
echo   • 整理迭代报告（0-5）
echo   • 整理LLM文档
echo   • 清理临时文件
echo.
echo 📚 新的文档结构:
echo   ├─ docs\README.md              (文档索引)
echo   ├─ docs\requirements\          (需求和设计)
echo   │  ├─ PRD需求.md
echo   │  ├─ 原型设计.md
echo   │  ├─ 数据库设计.md
echo   │  ├─ 界面设计.md
echo   │  └─ llm-ui-automation-*.md
echo   ├─ docs\guides\                (操作指南)
echo   │  ├─ QUICKSTART.md
echo   │  ├─ QUICKSTART-V1.md
echo   │  ├─ LOCAL-DEV-GUIDE.md
echo   │  └─ 迭代开发指南.md
echo   ├─ docs\iterations\            (迭代报告 0-5)
echo   ├─ docs\technical\             (技术文档)
echo   │  └─ INTEGRATION-TESTING.md
echo   └─ docs\archive\               (历史文档)
echo      ├─ root\
echo      └─ backend\
echo.
echo 🔗 下一步:
echo   1. 查看文档索引: docs\README.md
echo   2. 快速开始: docs\guides\QUICKSTART.md
echo   3. 本地开发: docs\guides\LOCAL-DEV-GUIDE.md
echo ========================================
echo.

pause

