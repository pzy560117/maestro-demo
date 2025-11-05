# 📝 Maestro 日志使用指南

> 完整的前后端日志配置和使用说明

## 🎯 日志系统概述

Maestro 项目已配置完整的前后端日志系统，所有日志信息都会输出到控制台，方便开发和调试。

### 日志级别

- **DEBUG**: 详细的调试信息（默认启用）
- **INFO**: 一般信息
- **WARN**: 警告信息
- **ERROR**: 错误信息

## 🖥️ 后端日志（NestJS）

### 配置位置

**文件**: `backend/src/main.ts`

```typescript
const app = await NestFactory.create(AppModule, {
  logger: ['error', 'warn', 'log', 'debug', 'verbose'],
});

// 全局日志拦截器
app.useGlobalInterceptors(new LoggingInterceptor());
```

### 日志拦截器

**文件**: `backend/src/modules/common/interceptors/logging.interceptor.ts`

#### 记录内容
- ✅ 请求信息（method, url, params, body）
- ✅ 响应信息（statusCode, duration）
- ✅ 错误信息（error message, stack trace）
- ✅ TraceId（用于追踪请求链路）
- ✅ 自动脱敏敏感字段（password, token, secret等）

#### 日志格式示例

**请求日志**:
```json
{
  "type": "REQUEST",
  "traceId": "1730880000000-abc123def",
  "method": "POST",
  "url": "/api/v1/tasks",
  "query": {},
  "params": {},
  "body": { "name": "测试任务" },
  "ip": "::1",
  "userAgent": "Mozilla/5.0...",
  "timestamp": "2025-11-05T10:00:00.000Z"
}
```

**响应日志**:
```json
{
  "type": "RESPONSE",
  "traceId": "1730880000000-abc123def",
  "method": "POST",
  "url": "/api/v1/tasks",
  "statusCode": 201,
  "duration": "125ms",
  "success": true,
  "timestamp": "2025-11-05T10:00:00.125Z"
}
```

### 在Service中使用日志

```typescript
import { Logger } from '@nestjs/common';

export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  async create(dto: CreateTaskDto) {
    this.logger.log(`Creating task: ${dto.name}`);
    // ... 业务逻辑
    this.logger.log(`Task created successfully: ${task.id}`);
  }
}
```

## 🌐 前端日志（React）

### 日志工具

**文件**: `frontend/src/lib/utils/logger.ts`

#### 特性
- ✅ 彩色日志输出
- ✅ 模块化标签
- ✅ 时间戳
- ✅ 支持数据和错误对象
- ✅ 默认启用所有级别（包括DEBUG）

### 使用方法

```typescript
import { logger } from '@/lib/utils/logger';

// DEBUG 日志 - 详细调试信息
logger.debug('Component mounted', {
  module: 'TaskList',
  data: { taskCount: 10 },
});

// INFO 日志 - 一般信息
logger.info('Task created successfully', {
  module: 'TaskCreate',
  data: { taskId: 'uuid-123' },
});

// WARN 日志 - 警告信息
logger.warn('Task load timeout, retrying...', {
  module: 'TaskList',
  data: { retryCount: 3 },
});

// ERROR 日志 - 错误信息
logger.error('Failed to create task', {
  module: 'TaskCreate',
  error: new Error('Network error'),
  data: { taskName: 'Test Task' },
});
```

### API 请求日志

**文件**: `frontend/src/lib/api/client.ts`

所有 API 请求和响应自动记录 DEBUG 日志：

#### 请求日志示例
```
[2025-11-05T10:00:00.000Z] [DEBUG] [API] API请求: POST /tasks
{
  requestId: "1730880000000-xyz789",
  method: "POST",
  url: "/tasks",
  baseURL: "/api/v1",
  params: {},
  data: { name: "测试任务", appVersionId: "..." },
  headers: { ... }
}
```

#### 响应日志示例
```
[2025-11-05T10:00:00.125Z] [DEBUG] [API] API响应: POST /tasks
{
  requestId: "1730880000000-xyz789",
  status: 201,
  statusText: "Created",
  code: 0,
  message: "成功",
  data: { id: "...", name: "测试任务", ... }
}
```

### WebSocket 日志

**文件**: `frontend/src/lib/hooks/useWebSocket.ts`

WebSocket 连接和事件自动记录日志：

```
[DEBUG] [WebSocket] Connecting to WebSocket
  { url: "http://localhost:3000/events", ... }

[INFO] [WebSocket] WebSocket connected
  { socketId: "abc123", url: "..." }

[DEBUG] [WebSocket] WebSocket subscribing to event: task:update

[WARN] [WebSocket] WebSocket disconnected
  { reason: "transport close" }
```

## 🎨 控制台输出效果

### 日志样式
- **DEBUG**: 灰色背景 + 白色文字
- **INFO**: 青色背景 + 白色文字
- **WARN**: 黄色背景 + 黑色文字
- **ERROR**: 红色背景 + 白色文字

### 示例输出
```
[2025-11-05T10:00:00.000Z] [DEBUG] [API] API请求: GET /api/v1/tasks
[2025-11-05T10:00:00.125Z] [DEBUG] [API] API响应: GET /api/v1/tasks
[2025-11-05T10:00:01.000Z] [INFO] [WebSocket] WebSocket connected
[2025-11-05T10:00:02.000Z] [WARN] [TaskList] 任务列表为空
[2025-11-05T10:00:03.000Z] [ERROR] [TaskCreate] 创建任务失败
```

## 🔧 日志控制

### 启用/禁用日志级别

```typescript
import { logger, LogLevel } from '@/lib/utils/logger';

// 禁用 DEBUG 日志
logger.disable(LogLevel.DEBUG);

// 启用 DEBUG 日志
logger.enable(LogLevel.DEBUG);

// 启用所有日志
logger.enableAll();

// 禁用所有日志
logger.disableAll();
```

### 在浏览器控制台中动态控制

```javascript
// 全局 logger 对象可以在控制台直接访问
// 通过在 main.tsx 中添加: window.logger = logger;

// 启用所有日志
logger.enableAll();

// 只显示错误和警告
logger.disable('DEBUG');
logger.disable('INFO');
```

## 📊 日志最佳实践

### 1. 合理使用日志级别

```typescript
// ✅ 正确
logger.debug('详细的变量值', { data: complexObject });
logger.info('用户完成了重要操作', { userId, action });
logger.warn('即将超时，正在重试', { retryCount });
logger.error('操作失败', { error, context });

// ❌ 错误
logger.error('用户点击了按钮'); // 应该用 debug
logger.debug('系统发生严重错误'); // 应该用 error
```

### 2. 提供足够的上下文

```typescript
// ✅ 正确 - 包含关键信息
logger.error('Failed to create task', {
  module: 'TaskCreate',
  data: {
    taskName: 'Test Task',
    appVersionId: '123',
    deviceCount: 5,
  },
  error,
});

// ❌ 错误 - 信息不足
logger.error('Failed', { error });
```

### 3. 使用模块标签

```typescript
// ✅ 正确 - 明确模块来源
logger.info('Task loaded', { module: 'TaskDetail' });
logger.debug('State updated', { module: 'TaskList' });

// ❌ 错误 - 没有模块标签
logger.info('Task loaded');
```

### 4. 避免敏感信息

```typescript
// ✅ 正确 - 脱敏处理
logger.debug('User login', {
  module: 'Auth',
  data: { username: 'user***', tokenLength: token.length },
});

// ❌ 错误 - 暴露敏感信息
logger.debug('User login', {
  data: { username, password, token },
});
```

## 🔍 调试技巧

### 1. 过滤特定模块日志

在浏览器控制台中使用过滤器：
```
[API]     - 只看 API 请求
[WebSocket] - 只看 WebSocket
[TaskList] - 只看任务列表
```

### 2. 追踪请求链路

使用 `requestId` 追踪完整请求：
```
1. 在请求日志中找到 requestId
2. 搜索该 requestId 查看完整链路
3. 对应后端的 traceId
```

### 3. 性能分析

查看 API 响应时间：
```typescript
// 后端日志中的 duration 字段
"duration": "125ms"  // 请求耗时
```

## 📋 常见问题

### Q: 为什么看不到日志？
A: 检查浏览器控制台过滤器设置，确保没有过滤掉 DEBUG 级别。

### Q: 如何在生产环境禁用 DEBUG 日志？
A: 修改 `logger.ts`，根据环境变量控制：
```typescript
const enabledLevels = import.meta.env.PROD
  ? new Set([LogLevel.WARN, LogLevel.ERROR])
  : new Set([LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR]);
```

### Q: 日志太多影响性能怎么办？
A: 临时禁用不需要的日志级别：
```typescript
logger.disable(LogLevel.DEBUG);
```

## 🚀 开始测试

1. **启动后端**:
```bash
cd backend
npm run start:dev
```

2. **启动前端**:
```bash
cd frontend
npm run dev
```

3. **打开浏览器控制台**: `F12` 或 `Ctrl+Shift+I`

4. **执行操作**: 创建任务、查看列表等

5. **查看日志**: 控制台会显示所有 DEBUG、INFO、WARN、ERROR 日志

---

**日志系统配置完成！** 🎉  
现在可以在前端控制台看到所有详细的日志信息，方便开发和调试。

