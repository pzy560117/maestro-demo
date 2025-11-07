# 后端常见问题解决指南

## 🔧 端口占用问题

### 问题现象
```
Error: listen EADDRINUSE: address already in use :::8360
```

### 快速解决方案

#### 方式1：使用 npm 脚本（推荐）
```bash
cd backend

# 只清理后端进程和端口
npm run kill:backend

# 清理并自动重启（一步到位）
npm run restart
```

#### 方式2：使用批处理文件（Windows）
```bash
# 清理后端
backend\scripts\kill-backend.bat

# 一键重启
backend\scripts\restart-backend.bat

# 清理所有服务（后端+Appium+前端）
backend\scripts\kill-all-services.bat
```

#### 方式3：手动清理特定端口
```bash
# 清理指定端口
backend\scripts\kill-port.bat 8360

# 清理其他端口
backend\scripts\kill-port.bat 4723  # Appium
backend\scripts\kill-port.bat 5173  # 前端
```

### 脚本功能说明

| 脚本 | 功能 | 使用场景 |
|------|------|----------|
| `kill-backend.ts` | 清理后端 Node.js 进程和 8360 端口 | 后端启动失败、端口占用 |
| `kill-backend.bat` | 批处理版本的后端清理 | 快速清理 |
| `restart-backend.bat` | 清理并重启后端 | 一键重启开发环境 |
| `kill-port.bat` | 清理指定端口 | 清理任意端口占用 |
| `kill-all-services.bat` | 清理所有服务 | 完全重置开发环境 |

---

## 🚀 Appium 会话创建问题

### 问题1：找不到设备
```
Error: Could not find a connected Android device in 20000ms
```

#### 解决方案
1. **检查设备连接**
   ```bash
   adb devices
   # 应该看到设备状态为 "device"
   ```

2. **重启 ADB 服务**
   ```bash
   adb kill-server
   adb start-server
   adb devices
   ```

3. **检查设备授权**
   - 确保设备屏幕解锁
   - 确认 USB 调试已授权
   - 查看设备上是否有授权弹窗

4. **重启 Appium Server**
   - 停止 Appium
   - 重新启动：`appium --address 127.0.0.1 --port 4723`

### 问题3：Appium 版本兼容警告
```
Driver "uiautomator2" may be incompatible with the current version of Appium
```

#### 说明
这是一个警告，不是错误。通常不影响功能。

#### 验证是否正常
```bash
# 测试 Appium 状态
curl http://127.0.0.1:4723/status
# 应该返回: {"value":{"ready":true}}
```

#### 解决方案（如果确实遇到问题）
```bash
# 方案1: 降级到 Appium 2.x（推荐）
npm uninstall -g appium
npm install -g appium@2.11.3

# 方案2: 升级 UiAutomator2 驱动
appium driver install uiautomator2@latest

# 重新启动
appium --address 127.0.0.1 --port 4723
```

> **Appium 3.x 注意事项**
> - 必须使用 `appium-uiautomator2-driver >= 6.0.0`
> - 项目内 `package.json` 的 `appium` 依赖需升级到 `^3.1.0`
> - 检查驱动：`appium driver list --installed --json`
> - Docker Compose 已移除 Appium 服务，需本地手动启动（参考 `backend/QUICK-REFERENCE.md`）

### 问题2：会话创建超时
```
State transition timeout after 60000ms (state: BOOTSTRAPPING)
```

#### 原因分析
- UiAutomator2 服务安装/启动慢
- 应用首次启动需要权限授权
- 设备性能不足

#### 已实施的优化
后端已配置以下优化参数：

```typescript
// BOOTSTRAPPING 状态超时：180秒（3分钟）
// WebDriver 连接超时：180秒
// 自动重试：3次
// 自动授予权限：启用
// 禁用动画：启用（加速）
```

#### 手动解决
1. **检查 UiAutomator2 安装**
   ```bash
   adb shell pm list packages | findstr uiautomator2
   # 应该看到：
   # package:io.appium.uiautomator2.server
   # package:io.appium.settings
   ```

2. **手动安装 UiAutomator2**
   ```bash
   # 如果未安装，Appium 会自动安装
   # 可以手动触发：删除旧版本后重新创建会话
   adb uninstall io.appium.uiautomator2.server
   adb uninstall io.appium.settings
   ```

3. **释放卡住的设备**
   ```sql
   -- 通过数据库释放
   docker exec maestro-postgres psql -U maestro -d maestro -c \
     "UPDATE devices SET status = 'AVAILABLE' WHERE status = 'BUSY';"
   ```

   或使用健康检查接口：
   ```bash
   curl -X POST http://localhost:8360/api/v1/orchestrator/health/fix-stuck-tasks
   ```

### 问题3：Activity 自动检测失败

#### 检查日志
后端日志应该显示：
```
[AppiumRealService] ✅ Detected main activity for com.xxx: .activities.MainActivity
```

如果显示：
```
[AppiumRealService] Could not detect main activity, using .MainActivity
```

#### 手动查询 Activity
```bash
adb shell dumpsys package com.your.app | findstr "android.intent.action.MAIN"
```

#### 在任务中指定 Activity（未来功能）
目前系统会自动检测，无需手动指定。

---

## 📊 任务执行问题

### 问题1：任务一直处于 QUEUED 状态

#### 原因
- 调度器未启动
- 没有可用设备
- 设备状态为 BUSY

#### 解决方案
1. **检查调度器状态**
   ```bash
   curl http://localhost:8360/api/v1/orchestrator/status
   ```

2. **手动启动调度器**
   ```bash
   curl -X POST http://localhost:8360/api/v1/orchestrator/scheduler/start
   ```

3. **检查设备状态**
   ```sql
   docker exec maestro-postgres psql -U maestro -d maestro -c \
     "SELECT id, serial, status FROM devices;"
   ```

4. **释放设备**
   ```sql
   docker exec maestro-postgres psql -U maestro -d maestro -c \
     "UPDATE devices SET status = 'AVAILABLE' WHERE id = 'device-id';"
   ```

### 问题2：任务卡在 RUNNING 状态

#### 使用健康检查
```bash
# 自动扫描并修复卡住的任务（超过30分钟无更新）
curl -X POST http://localhost:8360/api/v1/orchestrator/health/fix-stuck-tasks
```

返回示例：
```json
{
  "scanned": 5,
  "fixed": 2,
  "taskRunIds": ["xxx-xxx", "yyy-yyy"]
}
```

---

## 🗄️ 数据库问题

### 问题：数据库连接失败
```
Error: Can't reach database server
```

#### 解决方案
1. **检查 Docker 容器**
   ```bash
   docker ps | findstr maestro
   # 应该看到 maestro-postgres 运行中
   ```

2. **启动 Docker 服务**
   ```bash
   cd docker
   docker-compose up -d
   ```

3. **检查数据库连接**
   ```bash
   docker exec maestro-postgres psql -U maestro -d maestro -c "SELECT 1;"
   ```

### 问题：Prisma 迁移失败

#### 重置数据库（谨慎！）
```bash
cd backend
npm run prisma:reset
# 或
npx prisma migrate reset
```

---

## 📝 日志查看

### 后端日志
后端日志直接输出到控制台，包含：
- HTTP 请求/响应
- 任务调度信息
- Appium 会话创建
- 状态机转换
- 错误堆栈

### 查看特定任务的执行日志

#### 方式1：前端查看（推荐）
1. 访问任务详情页：`http://localhost:5173/tasks/:taskId`
2. 向下滚动到"实时运行日志"区域
3. 每2秒自动刷新

#### 方式2：API 查询
```bash
# 获取任务运行详情
curl http://localhost:8360/api/v1/orchestrator/task-runs/:taskRunId

# 返回包含 events 数组
{
  "id": "xxx",
  "status": "RUNNING",
  "events": [
    {
      "id": "1",
      "eventType": "STATE_CHANGE",
      "detail": {"from": "IDLE", "to": "BOOTSTRAPPING"},
      "occurredAt": "2025-11-06T08:00:00Z"
    }
  ]
}
```

#### 方式3：数据库查询
```sql
-- 查询任务运行事件
docker exec maestro-postgres psql -U maestro -d maestro -c \
  "SELECT event_type, detail, occurred_at 
   FROM task_run_events 
   WHERE task_run_id = 'task-run-id' 
   ORDER BY occurred_at DESC 
   LIMIT 20;"
```

---

## 🔄 完整开发流程

### 每次开发前
```bash
# 1. 启动 Docker 服务
cd docker
docker-compose up -d

# 2. 检查设备连接
adb devices

# 3. 启动 Appium
appium

# 4. 启动后端（自动清理）
cd backend
npm run restart

# 5. 启动前端
cd frontend
npm run dev
```

### 遇到问题时
```bash
# 端口占用 → 清理重启
cd backend
npm run restart

# 设备卡住 → 健康检查
curl -X POST http://localhost:8360/api/v1/orchestrator/health/fix-stuck-tasks

# 完全重置 → 清理所有服务
backend\scripts\kill-all-services.bat
```

---

## 💡 最佳实践

### 1. 定期清理
每天开始工作前：
```bash
npm run kill:backend  # 清理残留进程
```

### 2. 监控日志
保持终端打开，观察后端日志：
- ✅ `Detected main activity` - Activity 检测成功
- ✅ `Appium session created` - 会话创建成功
- ❌ `State transition timeout` - 需要检查设备

### 3. 使用健康检查
每小时运行一次：
```bash
curl -X POST http://localhost:8360/api/v1/orchestrator/health/fix-stuck-tasks
```

### 4. 前端实时监控
创建任务后立即查看详情页，确认任务正常执行。

---

## 📞 获取帮助

如果以上方法都无法解决问题：

1. **查看完整日志**
   - 后端日志（控制台输出）
   - Appium 日志
   - 浏览器控制台（F12）

2. **提供以下信息**
   - 错误截图
   - 任务 ID
   - 设备信息：`adb devices -l`
   - 数据库状态

3. **联系团队**
   - 提交 Issue
   - 团队协作工具

---

## 🎯 快速命令速查表

```bash
# 清理与重启
npm run kill:backend          # 清理后端
npm run restart               # 清理并重启
backend\scripts\kill-all-services.bat  # 清理所有

# 设备管理
adb devices                   # 查看设备
adb kill-server && adb start-server  # 重启 ADB

# 数据库操作
docker exec maestro-postgres psql -U maestro -d maestro  # 进入数据库

# 健康检查
curl -X POST http://localhost:8360/api/v1/orchestrator/health/fix-stuck-tasks

# 日志查询
curl http://localhost:8360/api/v1/orchestrator/task-runs/:id
```

---

**最后更新**: 2025-11-06

