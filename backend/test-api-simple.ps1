# Maestro Backend API Quick Test
# PowerShell Script

Write-Host "`nMaestro Backend API Test" -ForegroundColor Cyan
Write-Host "========================" -ForegroundColor Gray

# 1. Health Check
Write-Host "`n1. Testing Health Endpoint..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/health" -Method Get
    Write-Host "   OK - Status: $($health.status)" -ForegroundColor Green
    Write-Host "   Uptime: $([math]::Round($health.uptime, 2))s" -ForegroundColor Green
} catch {
    Write-Host "   FAIL - $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 2. Create Device
Write-Host "`n2. Creating Test Device..." -ForegroundColor Yellow
$deviceData = @{
    serial = "test-device-001"
    model = "Pixel 6 Pro"
    osVersion = "Android 13"
    deviceType = "EMULATOR"
    resolution = "1440x3120"
} | ConvertTo-Json

try {
    $device = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/devices" `
        -Method Post `
        -Body $deviceData `
        -ContentType "application/json"
    
    Write-Host "   OK - Device created: $($device.data.serial)" -ForegroundColor Green
    $deviceId = $device.data.id
} catch {
    if ($_.ErrorDetails.Message -match "already exists") {
        Write-Host "   INFO - Device already exists" -ForegroundColor Yellow
    } else {
        Write-Host "   FAIL - $($_.Exception.Message)" -ForegroundColor Red
    }
}

# 3. List Devices
Write-Host "`n3. Listing Devices..." -ForegroundColor Yellow
try {
    $devices = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/devices" -Method Get
    Write-Host "   OK - Found $($devices.total) devices" -ForegroundColor Green
    if ($devices.data.Count -gt 0) {
        $devices.data | Select-Object -First 3 | ForEach-Object {
            Write-Host "   - $($_.serial) [$($_.status)]" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "   FAIL - $($_.Exception.Message)" -ForegroundColor Red
}

# 4. Create App
Write-Host "`n4. Creating Test App..." -ForegroundColor Yellow
$appData = @{
    name = "Test App"
    packageName = "com.test.app"
    description = "Test application"
} | ConvertTo-Json

try {
    $app = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/apps" `
        -Method Post `
        -Body $appData `
        -ContentType "application/json"
    
    Write-Host "   OK - App created: $($app.data.name)" -ForegroundColor Green
} catch {
    if ($_.ErrorDetails.Message -match "already exists") {
        Write-Host "   INFO - App already exists" -ForegroundColor Yellow
    } else {
        Write-Host "   FAIL - $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n========================" -ForegroundColor Gray
Write-Host "Test Complete!" -ForegroundColor Green
Write-Host "`nAPI Docs: http://localhost:3000/api/docs`n" -ForegroundColor Cyan

