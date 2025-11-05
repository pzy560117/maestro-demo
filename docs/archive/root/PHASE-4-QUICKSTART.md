# Phase 4 WebSocket 快速启动指南

## ✅ 已完成功能

- ✅ 后端 WebSocket Gateway（Socket.IO）
- ✅ 前端 WebSocket Hook（自动连接、事件订阅）
- ✅ 实时任务状态推送
- ✅ 实时告警通知推送
- ✅ Dashboard、TaskList、TaskDetail、AlertCenter 实时更新

---

## 🚀 快速启动

### 1. 后端配置

后端无需额外配置，WebSocket 服务已自动集成。

### 2. 前端配置

创建 `frontend/.env` 文件（如果不存在）：

```env
# API Base URL
VITE_API_URL=http://localhost:3000/api/v1

# WebSocket URL
VITE_WS_URL=http://localhost:3000/events
```

### 3. 启动服务

**启动后端**：
```bash
cd backend
npm run start:dev
```

**启动前端**：
```bash
cd frontend
npm run dev
```

### 4. 验证 WebSocket 连接

1. 打开浏览器访问 `http://localhost:5173`
2. 打开浏览器控制台（F12）
3. 查看是否有以下日志：
   - `Connecting to WebSocket: http://localhost:3000/events`
   - `WebSocket connected: <socket-id>`
   - `Dashboard: WebSocket connected`

---

## 🧪 测试实时更新

### 测试任务实时推送

1. 访问 Dashboard 或 TaskList 页面
2. 打开另一个浏览器窗口（或使用 Postman）
3. 创建一个新任务：
   ```bash
   POST http://localhost:3000/api/v1/tasks
   ```
4. 观察第一个窗口中的任务列表是否自动刷新

**预期效果**：
- 控制台输出：`Task update received`
- Dashboard 任务统计卡片自动更新
- TaskList 表格自动刷新

### 测试告警实时推送

1. 访问 AlertCenter 页面
2. 通过 API 创建一个新告警：
   ```bash
   POST http://localhost:3000/api/v1/alerts
   ```
3. 观察告警列表是否自动刷新

**预期效果**：
- 控制台输出：`Alert received`
- 告警统计卡片自动更新
- 告警列表表格自动刷新

---

## 📋 事件类型说明

### 任务事件

**`task:update`** - 任务状态更新
```typescript
{
  taskId: string;
  status: string;
  timestamp: string;
  name?: string;
  appVersion?: string;
  deviceCount?: number;
  cancelled?: boolean;
}
```

**触发时机**：
- 创建任务
- 更新任务状态
- 取消任务

### 告警事件

**`alert:new`** - 新告警通知
```typescript
{
  alert: {
    id: string;
    alertType: string;
    severity: string;
    message: string;
    status: string;
    taskRunId?: string;
  };
  timestamp: string;
}
```

**`alert:update`** - 告警状态更新
```typescript
{
  alertId: string;
  status: string;
  timestamp: string;
}
```

**触发时机**：
- 系统检测到异常（新告警）
- 确认告警
- 解决告警
- 忽略告警

### 任务运行事件

**`taskrun:update`** - 任务运行记录更新
```typescript
{
  taskRunId: string;
  timestamp: string;
  [key: string]: any;
}
```

---

## 🔧 调试技巧

### 查看 WebSocket 连接状态

在浏览器控制台执行：
```javascript
// 查看当前页面的 WebSocket 状态
console.log('WebSocket Status:', window.__wsStatus);
```

### 手动触发事件（测试用）

后端临时添加测试端点：
```typescript
@Get('test/emit-task-update')
testEmitTaskUpdate() {
  this.wsGateway.emitTaskUpdate('test-task-id', 'RUNNING', {
    name: 'Test Task',
  });
  return { message: 'Event emitted' };
}
```

### 查看网络请求

1. 打开浏览器开发者工具
2. 切换到 Network 标签
3. 筛选 WS（WebSocket）
4. 查看 WebSocket 连接和消息

---

## 🐛 常见问题

### 1. WebSocket 连接失败

**错误信息**：`WebSocket connection error`

**解决方案**：
- 确认后端正在运行
- 检查 `.env` 中的 `VITE_WS_URL` 配置
- 确认端口 3000 未被占用
- 检查防火墙设置

### 2. 事件未实时更新

**问题**：创建任务后前端没有自动刷新

**解决方案**：
- 打开控制台查看是否有 WebSocket 事件日志
- 确认后端是否调用了 `wsGateway.emit...()` 方法
- 检查前端是否正确订阅了事件
- 刷新页面重新建立 WebSocket 连接

### 3. 页面刷新后连接断开

**问题**：页面刷新后 WebSocket 未自动重连

**解决方案**：
- 这是正常行为，页面刷新会重新初始化 WebSocket
- `useWebSocket` Hook 会在组件挂载时自动连接
- 如需保持长连接，可在 App 根组件初始化 WebSocket

---

## 📊 性能监控

### WebSocket 连接数

查看当前连接的客户端数量：
```bash
# 后端日志会显示连接/断开事件
[WebSocketGateway] Client connected: <socket-id>
[WebSocketGateway] Client disconnected: <socket-id>
```

### 事件推送频率

查看事件推送日志：
```bash
[WebSocketGateway] Task update emitted: <task-id> -> <status>
[WebSocketGateway] Alert emitted: <alert-id> (<severity>)
```

---

## 📚 相关文档

- [完整实现文档](./docs/phase-4-websocket-implementation.md)
- [Iteration 4 交付报告](./docs/iteration-4-delivery-report.md)
- [NestJS WebSockets 文档](https://docs.nestjs.com/websockets/gateways)
- [Socket.IO 文档](https://socket.io/docs/v4/)

---

## ✨ 下一步

WebSocket 实时更新功能已完全就绪！你可以：

1. **继续 Phase 5**：API 文档完善和集成测试
2. **开始下一个迭代**：根据业务需求规划新功能
3. **性能优化**：实现房间机制、消息队列等高级特性

---

**祝你开发顺利！** 🎉


