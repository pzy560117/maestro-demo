# 🧪 Maestro 测试指南

> 从前端开始测试完整系统的操作指南

## ✅ 前置条件

在开始测试前，确保以下服务已启动：

### 1. 数据库服务（PostgreSQL）

```bash
# 使用 Docker Compose 启动
cd docker
docker-compose up -d postgres
```

验证：
```bash
docker ps | grep postgres
```

### 2. 后端服务

```bash
cd backend
npm run start:dev
```

验证：
```bash
# 访问健康检查
curl http://localhost:3000/api/v1/health

# 访问 Swagger 文档
open http://localhost:3000/api/docs
```

### 3. 前端服务

```bash
cd frontend
npm run dev
```

验证：
```bash
# 浏览器访问
open http://localhost:5173
```

## 🎯 测试流程

### 第一步：打开浏览器控制台

1. 打开 Chrome/Edge 浏览器
2. 按 `F12` 或 `Ctrl+Shift+I` 打开开发者工具
3. 切换到 **Console** 标签
4. 清空控制台：点击 🚫 图标

### 第二步：访问前端应用

访问：http://localhost:5173

**期望看到的日志**：
```
[DEBUG] [Logger] Logger initialized in development mode
[DEBUG] [WebSocket] Connecting to WebSocket
[INFO] [WebSocket] WebSocket connected
```

### 第三步：导航测试

点击侧边栏各个菜单，观察日志输出：

#### 1. 访问仪表板（Dashboard）
- **路径**: `/dashboard`
- **期望日志**:
```
[DEBUG] [API] API请求: GET /api/v1/tasks?status=...
[DEBUG] [API] API响应: GET /api/v1/tasks
[DEBUG] [API] API请求: GET /api/v1/devices
[DEBUG] [API] API响应: GET /api/v1/devices
```

#### 2. 查看任务列表（Tasks）
- **路径**: `/tasks`
- **期望日志**:
```
[DEBUG] [API] API请求: GET /api/v1/tasks
[DEBUG] [API] API响应: GET /api/v1/tasks
{
  requestId: "...",
  status: 200,
  code: 0,
  data: { tasks: [...], total: 0 }
}
```

#### 3. 创建任务
- **路径**: `/tasks/new`
- **操作**: 填写表单并提交
- **期望日志**:
```
[DEBUG] [API] API请求: GET /api/v1/apps
[DEBUG] [API] API请求: GET /api/v1/devices
[DEBUG] [API] API请求: POST /api/v1/tasks
{
  requestId: "...",
  method: "POST",
  url: "/api/v1/tasks",
  data: {
    name: "测试任务",
    appVersionId: "...",
    deviceIds: [...]
  }
}
[DEBUG] [API] API响应: POST /api/v1/tasks
{
  status: 201,
  code: 0,
  data: { id: "...", name: "测试任务", ... }
}
[INFO] [WebSocket] WebSocket connected
[DEBUG] [WebSocket] WebSocket subscribing to event: task:update
```

#### 4. 查看设备列表（Devices）
- **路径**: `/devices`
- **期望日志**:
```
[DEBUG] [API] API请求: GET /api/v1/devices
[DEBUG] [API] API响应: GET /api/v1/devices
```

#### 5. 查看应用列表（Apps）
- **路径**: `/apps`
- **期望日志**:
```
[DEBUG] [API] API请求: GET /api/v1/apps
[DEBUG] [API] API响应: GET /api/v1/apps
```

#### 6. 查看截图库（Screens）
- **路径**: `/screens`
- **期望日志**:
```
[DEBUG] [API] API请求: GET /api/v1/screens
[DEBUG] [API] API响应: GET /api/v1/screens
```

#### 7. 查看告警中心（Alerts）
- **路径**: `/alerts`
- **期望日志**:
```
[DEBUG] [API] API请求: GET /api/v1/alerts
[DEBUG] [API] API响应: GET /api/v1/alerts
```

## 📊 日志检查清单

### ✅ 必须看到的日志

| 模块 | 日志内容 | 级别 |
|------|---------|------|
| Logger | Logger initialized | INFO |
| WebSocket | Connecting to WebSocket | DEBUG |
| WebSocket | WebSocket connected | INFO |
| API | API请求: GET /xxx | DEBUG |
| API | API响应: GET /xxx | DEBUG |

### ⚠️ 可能的警告日志

| 日志内容 | 含义 | 处理方式 |
|---------|------|---------|
| API业务错误 | 后端返回 code != 0 | 检查请求参数 |
| WebSocket disconnected | WebSocket 断开 | 检查后端是否运行 |
| 请求参数错误 | 400 错误 | 检查表单数据 |
| 请求的资源不存在 | 404 错误 | 检查 API 路径 |

### ❌ 不应该看到的日志

| 日志内容 | 问题 | 解决方案 |
|---------|------|---------|
| 网络错误，请检查网络连接 | 后端未启动 | 启动后端服务 |
| WebSocket connection error | WebSocket 服务未启动 | 检查后端 WebSocket 配置 |
| 服务器错误 (500) | 后端异常 | 查看后端日志 |

## 🔍 详细日志示例

### 完整的任务创建流程

```
# 1. 页面加载，获取应用列表
[2025-11-05T10:00:00.000Z] [DEBUG] [API] API请求: GET /api/v1/apps
{
  requestId: "1730880000000-abc123",
  method: "GET",
  url: "/apps",
  baseURL: "/api/v1"
}

[2025-11-05T10:00:00.050Z] [DEBUG] [API] API响应: GET /api/v1/apps
{
  requestId: "1730880000000-abc123",
  status: 200,
  code: 0,
  data: [
    { id: "...", name: "测试应用", packageName: "com.example.test" }
  ]
}

# 2. 获取设备列表
[2025-11-05T10:00:00.100Z] [DEBUG] [API] API请求: GET /api/v1/devices
{
  requestId: "1730880000100-def456",
  method: "GET",
  url: "/devices"
}

[2025-11-05T10:00:00.150Z] [DEBUG] [API] API响应: GET /api/v1/devices
{
  requestId: "1730880000100-def456",
  status: 200,
  code: 0,
  data: [
    { id: "...", serial: "emulator-5554", model: "Pixel 6", status: "AVAILABLE" }
  ]
}

# 3. 提交任务创建
[2025-11-05T10:00:05.000Z] [DEBUG] [API] API请求: POST /api/v1/tasks
{
  requestId: "1730880005000-ghi789",
  method: "POST",
  url: "/tasks",
  data: {
    name: "UI自动化测试任务",
    appVersionId: "app-version-uuid",
    deviceIds: ["device-uuid-1"],
    coverageProfile: "STANDARD",
    maxDepth: 3
  }
}

[2025-11-05T10:00:05.150Z] [DEBUG] [API] API响应: POST /api/v1/tasks
{
  requestId: "1730880005000-ghi789",
  status: 201,
  code: 0,
  message: "遍历任务创建成功",
  data: {
    id: "task-uuid-123",
    name: "UI自动化测试任务",
    status: "QUEUED",
    createdAt: "2025-11-05T10:00:05.150Z"
  }
}

# 4. WebSocket 实时更新
[2025-11-05T10:00:05.200Z] [DEBUG] [WebSocket] WebSocket subscribing to event: task:update
[2025-11-05T10:00:06.000Z] [INFO] [WebSocket] Received event: task:update
{
  taskId: "task-uuid-123",
  status: "RUNNING",
  timestamp: "2025-11-05T10:00:06.000Z"
}
```

## 🐛 常见问题排查

### 问题1：看不到任何日志

**原因**: 浏览器控制台过滤器设置
**解决**:
1. 确保控制台级别设置为 "所有级别"
2. 清除所有过滤器
3. 刷新页面

### 问题2：API 请求失败（网络错误）

**原因**: 后端服务未启动或端口不正确
**解决**:
```bash
# 检查后端是否运行
curl http://localhost:3000/api/v1/health

# 检查端口占用
netstat -ano | findstr :3000  # Windows
lsof -i :3000                 # Mac/Linux
```

### 问题3：WebSocket 无法连接

**原因**: WebSocket 配置错误
**解决**:
1. 检查后端 WebSocket 服务是否启动
2. 查看 `frontend/.env` 中的 `VITE_WS_URL`
3. 确认后端 CORS 配置

### 问题4：日志太多，看不清

**解决**:
```javascript
// 在控制台中临时禁用 DEBUG 日志
logger.disable('DEBUG');

// 使用控制台过滤器
// 输入关键词如: [API] 或 [WebSocket]
```

## 📈 性能监控

### 查看 API 响应时间

后端日志会显示每个请求的耗时：
```
{
  "type": "RESPONSE",
  "duration": "125ms",  // 响应时间
  "url": "/api/v1/tasks"
}
```

### 监控指标

- ✅ API 响应时间 < 500ms（正常）
- ⚠️ API 响应时间 500ms-1s（需要优化）
- ❌ API 响应时间 > 1s（性能问题）

## 🎬 下一步

完成基本测试后，可以进行：

1. **API 集成测试**: 参考 [`docs/technical/INTEGRATION-TESTING.md`](../technical/INTEGRATION-TESTING.md)
2. **E2E 测试**: 使用 Playwright MCP 进行端到端测试
3. **性能测试**: 使用 k6 或 JMeter 进行压力测试

## 📚 相关文档

- [日志使用指南](../technical/LOGGING-GUIDE.md) - 详细的日志配置说明
- [快速开始](./QUICKSTART.md) - 项目启动指南
- [API 文档](http://localhost:3000/api/docs) - Swagger API 文档

---

**开始测试吧！** 🚀  
所有日志都会在浏览器控制台清晰显示，方便追踪问题和调试。

