# 文档整理脚本
# 用途: 整理项目文档，归档历史文档，清理临时文件

Write-Host "🗂️  Maestro 文档整理脚本" -ForegroundColor Cyan
Write-Host ("=" * 60)

# 切换到项目根目录
$projectRoot = "D:\Project\maestro"
Set-Location $projectRoot

# 创建归档目录
Write-Host "`n📁 创建归档目录..." -ForegroundColor Yellow
$archiveDirs = @(
    "docs\archive\root",
    "docs\archive\backend",
    "docs\archive\logs"
)

foreach ($dir in $archiveDirs) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "  ✅ 创建: $dir" -ForegroundColor Green
    }
}

# 归档根目录文档
Write-Host "`n📦 归档根目录文档..." -ForegroundColor Yellow
$rootDocs = @(
    "ITERATION-2-COMPLETION.md",
    "ITERATION-3-COMPLETION.md",
    "ITERATION-4-COMPLETION.md",
    "ITERATION-4-PHASE-1-SUMMARY.md",
    "PHASE-2-IMPLEMENTATION.md",
    "PHASE-3-COMPLETION.md",
    "PLAYWRIGHT-TEST-REPORT.md"
)

foreach ($doc in $rootDocs) {
    if (Test-Path $doc) {
        Move-Item $doc "docs\archive\root\" -Force
        Write-Host "  ✅ 归档: $doc" -ForegroundColor Green
    }
}

# 归档backend文档
Write-Host "`n📦 归档backend文档..." -ForegroundColor Yellow
Set-Location "backend"

$backendDocs = @(
    "CHANGELOG-ITERATION-2.md",
    "COMPLETE-INTEGRATION-SUMMARY.md",
    "FINAL-INTEGRATION-COMPLETE.md",
    "FINAL-TEST-REPORT.md",
    "ITERATION-2-QUICKSTART.md",
    "ITERATION-2-SUMMARY.md",
    "ITERATION-3-QUICKSTART.md",
    "README-ITERATION-3.md",
    "TEST-INTEGRATION-FINAL.md",
    "TEST-INTEGRATION-RESULTS.md",
    "TEST-RESULTS-WITH-REAL-SERVICES.md",
    "TEST-SUCCESS-SUMMARY.md",
    "PROJECT-RUN-SUMMARY.md",
    "QUICK-TEST-GUIDE.md"
)

foreach ($doc in $backendDocs) {
    if (Test-Path $doc) {
        Move-Item $doc "..\docs\archive\backend\" -Force
        Write-Host "  ✅ 归档: $doc" -ForegroundColor Green
    }
}

# 移动LLM文档到backend/docs
Write-Host "`n📚 整理LLM文档..." -ForegroundColor Yellow
if (-not (Test-Path "docs\llm")) {
    New-Item -ItemType Directory -Path "docs\llm" -Force | Out-Null
}

$llmDocs = @(
    "MIDSCENE-DASHSCOPE-SETUP.md",
    "MODEL-UPGRADE-SUMMARY.md",
    "QWEN3-SETUP-SUCCESS.md",
    "REAL-API-IMPLEMENTATION-SUMMARY.md",
    "REAL-API-INTEGRATION.md",
    "REAL-API-QUICKSTART.md"
)

foreach ($doc in $llmDocs) {
    if (Test-Path $doc) {
        Move-Item $doc "docs\llm\" -Force
        Write-Host "  ✅ 移动: $doc → backend/docs/llm/" -ForegroundColor Green
    }
}

# 清理临时日志文件
Write-Host "`n🗑️  清理临时文件..." -ForegroundColor Yellow
$tempFiles = @(
    "test-debug.log",
    "test-final.log",
    "test-full.log",
    "test-output.log",
    "test-result.txt"
)

foreach ($file in $tempFiles) {
    if (Test-Path $file) {
        Remove-Item $file -Force
        Write-Host "  ✅ 删除: $file" -ForegroundColor Green
    }
}

# 返回项目根目录
Set-Location $projectRoot

# 显示整理结果
Write-Host ""
Write-Host ("=" * 60)
Write-Host "✨ 文档整理完成!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 整理统计:" -ForegroundColor Cyan
Write-Host "  • 归档根目录文档: $($rootDocs.Count) 个"
Write-Host "  • 归档backend文档: $($backendDocs.Count) 个"
Write-Host "  • 整理LLM文档: $($llmDocs.Count) 个"
Write-Host "  • 删除临时文件: $($tempFiles.Count) 个"
Write-Host ""
Write-Host "📚 新的文档结构:" -ForegroundColor Cyan
Write-Host "  • 文档索引: docs\README.md"
Write-Host "  • 快速开始: docs\guides\QUICKSTART.md"
Write-Host "  • 项目主页: README.md"
Write-Host "  • 技术文档: docs\technical\"
Write-Host "  • 迭代报告: docs\iterations\"
Write-Host ""
Write-Host "🔗 下一步:" -ForegroundColor Yellow
Write-Host "  1. 查看新的文档索引: docs\README.md"
Write-Host "  2. 阅读整理说明: docs\DOCUMENTATION-REORGANIZATION.md"
Write-Host "  3. 更新书签和链接"
Write-Host ""
Write-Host ("=" * 60)

