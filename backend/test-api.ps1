# Maestro Backend API 测试脚本
# 使用PowerShell测试后端API

Write-Host "`n🧪 Maestro Backend API 测试" -ForegroundColor Cyan
Write-Host "=" * 50 -ForegroundColor Gray

# 1. 测试Health接口
Write-Host "`n1️⃣ 测试 Health 接口..." -ForegroundColor Yellow
$health = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/health" -Method Get
Write-Host "   ✅ Status: $($health.status)" -ForegroundColor Green
Write-Host "   ⏱️  Uptime: $([math]::Round($health.uptime, 2))s" -ForegroundColor Green

# 2. 创建设备
Write-Host "`n2️⃣ 创建测试设备..." -ForegroundColor Yellow
$deviceData = @{
    serial = "emulator-5554"
    model = "Pixel 6 Pro"
    osVersion = "Android 13"
    deviceType = "EMULATOR"
    resolution = "1440x3120"
    tags = @{
        location = "dev-machine"
        purpose = "testing"
    }
} | ConvertTo-Json

try {
    $device = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/devices" `
        -Method Post `
        -Body $deviceData `
        -ContentType "application/json"
    
    Write-Host "   ✅ 设备创建成功!" -ForegroundColor Green
    Write-Host "   📱 设备ID: $($device.data.id)" -ForegroundColor Cyan
    Write-Host "   📱 序列号: $($device.data.serial)" -ForegroundColor Cyan
    Write-Host "   📊 状态: $($device.data.status)" -ForegroundColor Cyan
    
    $deviceId = $device.data.id
} catch {
    if ($_.Exception.Response.StatusCode -eq 409) {
        Write-Host "   ⚠️  设备已存在，获取设备列表..." -ForegroundColor Yellow
        $devicesUrl2 = "http://localhost:3000/api/v1/devices?page=1&pageSize=10"
        $devices = Invoke-RestMethod -Uri $devicesUrl2 -Method Get
        if ($devices.data.Count -gt 0) {
            $deviceId = $devices.data[0].id
            Write-Host "   📱 使用已有设备ID: $deviceId" -ForegroundColor Cyan
        }
    } else {
        Write-Host "   ❌ 错误: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# 3. 获取设备列表
Write-Host "`n3️⃣ 获取设备列表..." -ForegroundColor Yellow
$devicesUrl = "http://localhost:3000/api/v1/devices?page=1&pageSize=10"
$devices = Invoke-RestMethod -Uri $devicesUrl -Method Get
Write-Host "   ✅ 共找到 $($devices.total) 个设备" -ForegroundColor Green
foreach ($dev in $devices.data) {
    Write-Host "   - $($dev.serial) [$($dev.status)]" -ForegroundColor Gray
}

# 4. 创建应用
Write-Host "`n4️⃣ 创建测试应用..." -ForegroundColor Yellow
$appData = @{
    name = "企业审批中心"
    packageName = "com.company.approval"
    description = "内部审批流程管理应用"
} | ConvertTo-Json

try {
    $app = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/apps" `
        -Method Post `
        -Body $appData `
        -ContentType "application/json"
    
    Write-Host "   ✅ 应用创建成功!" -ForegroundColor Green
    Write-Host "   📦 应用ID: $($app.data.id)" -ForegroundColor Cyan
    Write-Host "   📦 应用名: $($app.data.name)" -ForegroundColor Cyan
    
    $appId = $app.data.id
} catch {
    if ($_.Exception.Response.StatusCode -eq 409) {
        Write-Host "   ⚠️  应用已存在，获取应用列表..." -ForegroundColor Yellow
        $appsUrl = "http://localhost:3000/api/v1/apps?page=1&pageSize=10"
        $apps = Invoke-RestMethod -Uri $appsUrl -Method Get
        if ($apps.data.Count -gt 0) {
            $appId = $apps.data[0].id
            Write-Host "   📦 使用已有应用ID: $appId" -ForegroundColor Cyan
        }
    } else {
        Write-Host "   ❌ 错误: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# 5. 创建应用版本
if ($appId) {
    Write-Host "`n5️⃣ 创建应用版本..." -ForegroundColor Yellow
    $versionData = @{
        appId = $appId
        versionName = "1.0.0"
        versionCode = 100
        changelog = "初始版本发布"
        releasedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    } | ConvertTo-Json
    
    try {
        $version = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/app-versions" `
            -Method Post `
            -Body $versionData `
            -ContentType "application/json"
        
        Write-Host "   ✅ 版本创建成功!" -ForegroundColor Green
        Write-Host "   🔖 版本号: $($version.data.versionName)" -ForegroundColor Cyan
    } catch {
        if ($_.Exception.Response.StatusCode -eq 409) {
            Write-Host "   ⚠️  版本已存在" -ForegroundColor Yellow
        } else {
            Write-Host "   ❌ 错误: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

Write-Host "`n" + "=" * 50 -ForegroundColor Gray
Write-Host "✅ API测试完成！" -ForegroundColor Green
Write-Host "`n📚 查看完整API文档: http://localhost:3000/api/docs" -ForegroundColor Cyan
Write-Host ""

