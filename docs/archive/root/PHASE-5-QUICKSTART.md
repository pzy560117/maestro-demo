# Phase 5: API 文档与集成测试 - 快速验证指南

## 🚀 快速开始

### 前置条件
```bash
# 确保服务已启动
docker-compose -f docker/docker-compose.yml up -d

# 确保数据库已初始化
cd backend
npx prisma generate
npx prisma db push
```

---

## 1️⃣ API 文档验证

### 访问 Swagger 文档
```bash
# 启动后端服务
cd backend
npm run start:dev

# 浏览器打开
http://localhost:3000/api/docs
```

### 验证内容
- ✅ 所有API接口都有完整文档
- ✅ 每个接口都有详细的参数说明
- ✅ 响应示例完整
- ✅ 支持在线测试

---

## 2️⃣ 集成测试验证

### 运行完整测试套件
```bash
cd backend

# 运行所有集成测试
npm run test:integration

# 期望输出:
# Test Suites: 1 passed, 1 total
# Tests:       24 passed, 24 total
```

### 测试详情
24个测试覆盖以下模块：
- **设备管理** (4个测试)
- **应用版本管理** (4个测试)
- **任务管理** (5个测试)
- **界面管理** (4个测试)
- **告警管理** (6个测试)
- **健康检查** (1个测试)

---

## 3️⃣ 前端性能验证

### 构建优化验证
```bash
cd frontend

# 构建并分析
npm run build

# 检查输出
# ✅ vendor chunks正确分离
# ✅ 代码已压缩（无console.log）
# ✅ 输出文件带hash
```

### 预期构建产物
```
dist/
  assets/
    js/
      react-vendor-[hash].js      # React核心库
      ui-vendor-[hash].js          # UI组件库
      data-vendor-[hash].js        # 数据管理库
      form-vendor-[hash].js        # 表单库
      utils-vendor-[hash].js       # 工具库
      icons-vendor-[hash].js       # 图标库
      index-[hash].js              # 应用主入口
```

---

## 4️⃣ E2E 测试（使用 Playwright MCP）

### 准备环境
```bash
# 确保前后端都在运行
cd backend && npm run start:dev
cd frontend && npm run dev
```

### 测试核心流程
使用Playwright MCP工具测试以下场景：

#### 场景1: 设备管理流程
1. 访问 http://localhost:5173/devices
2. 点击"添加设备"按钮
3. 填写设备信息
4. 提交并验证设备列表更新

#### 场景2: 创建遍历任务
1. 访问 http://localhost:5173/tasks/create
2. 选择应用版本
3. 选择设备
4. 配置遍历参数
5. 提交并查看任务列表

#### 场景3: 查看界面库
1. 访问 http://localhost:5173/screens
2. 筛选指定应用版本
3. 查看界面详情
4. 对比界面差异

---

## 5️⃣ 核心API测试

### 使用 curl 快速测试

#### 健康检查
```bash
curl http://localhost:3000/api/v1/health
# 期望: {"status":"ok",...}
```

#### 创建设备
```bash
curl -X POST http://localhost:3000/api/v1/devices \
  -H "Content-Type: application/json" \
  -d '{
    "serial": "test-device-001",
    "model": "Pixel 6",
    "osVersion": "Android 13",
    "deviceType": "EMULATOR",
    "resolution": "1080x1920"
  }'
# 期望: {"code":0,"data":{...},"message":"设备创建成功"}
```

#### 查询设备列表
```bash
curl http://localhost:3000/api/v1/devices
# 期望: {"code":0,"data":[...],"message":"查询成功"}
```

#### 创建应用
```bash
curl -X POST http://localhost:3000/api/v1/apps \
  -H "Content-Type: application/json" \
  -d '{
    "name": "测试应用",
    "packageName": "com.test.app",
    "description": "测试应用描述"
  }'
# 保存返回的 appId
```

#### 创建应用版本
```bash
APP_ID="<刚创建的appId>"
curl -X POST http://localhost:3000/api/v1/apps/$APP_ID/versions \
  -H "Content-Type: application/json" \
  -d '{
    "versionName": "1.0.0",
    "versionCode": 100
  }'
# 保存返回的 appVersionId
```

#### 创建遍历任务
```bash
DEVICE_ID="<设备ID>"
APP_VERSION_ID="<应用版本ID>"

curl -X POST http://localhost:3000/api/v1/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "name": "测试任务",
    "appVersionId": "'$APP_VERSION_ID'",
    "deviceIds": ["'$DEVICE_ID'"],
    "coverageProfile": "SMOKE",
    "priority": 3
  }'
```

---

## 6️⃣ WebSocket 实时更新测试

### 使用浏览器测试
```javascript
// 在浏览器控制台执行
const socket = io('http://localhost:3000/events', {
  reconnection: true
});

socket.on('connect', () => {
  console.log('✅ WebSocket连接成功');
});

socket.on('task:update', (data) => {
  console.log('📝 任务更新:', data);
});

socket.on('alert:new', (data) => {
  console.log('🚨 新告警:', data);
});
```

### 验证事件
1. 创建一个新任务
2. 观察控制台是否收到 `task:update` 事件
3. 创建一个告警
4. 观察控制台是否收到 `alert:new` 事件

---

## 7️⃣ 前端路由懒加载验证

### 打开开发者工具
1. 打开 Chrome DevTools → Network
2. 访问 http://localhost:5173
3. 观察加载的 JS 文件

### 验证点
- ✅ 首页只加载必需的 vendor chunks
- ✅ 访问 `/devices` 时动态加载设备模块
- ✅ 访问 `/tasks` 时动态加载任务模块
- ✅ 每个路由都有独立的 chunk

---

## 8️⃣ 常见问题排查

### 问题1: 集成测试失败
```bash
# 清理数据库
cd backend
npx prisma db push --force-reset

# 重新生成客户端
npx prisma generate

# 再次运行测试
npm run test:integration
```

### 问题2: Swagger无法访问
```bash
# 检查端口
netstat -ano | findstr :3000

# 重启后端
cd backend
npm run start:dev
```

### 问题3: 前端构建失败
```bash
# 清理依赖
cd frontend
rm -rf node_modules
npm install

# 重新构建
npm run build
```

### 问题4: WebSocket连接失败
```bash
# 检查CORS配置
# backend/src/main.ts
app.enableCors({
  origin: 'http://localhost:5173',
  credentials: true,
});
```

---

## 9️⃣ 性能基准

### 后端API响应时间
- 健康检查: < 10ms
- 简单查询: < 50ms
- 复杂查询(带关联): < 200ms
- 创建操作: < 100ms

### 前端加载时间
- 首屏加载: < 2s
- 路由切换: < 500ms
- 懒加载模块: < 300ms

### 构建产物大小
- react-vendor: ~150KB (gzipped)
- 主应用代码: ~100KB (gzipped)
- 其他vendor: ~200KB (gzipped)

---

## 🎯 验证清单

### Phase 5 完成验证
- [ ] Swagger文档可访问且完整
- [ ] 24个集成测试全部通过
- [ ] 前端构建成功且优化生效
- [ ] 核心API可通过curl测试
- [ ] WebSocket实时更新正常
- [ ] 前端路由懒加载生效
- [ ] 性能指标达标

### 全部通过后
✅ Phase 5 完成，系统可进入生产环境部署准备阶段

---

## 📚 相关文档

- [完整测试报告](./backend/PHASE-5-INTEGRATION-COMPLETE.md)
- [API文档](http://localhost:3000/api/docs)
- [前端优化指南](./frontend/README.md)
- [部署指南](./QUICKSTART.md)

---

## 🆘 获取帮助

如遇到问题，请检查：
1. Docker容器是否运行: `docker ps`
2. 数据库连接是否正常: `psql -h localhost -U maestro -d maestro`
3. 日志文件: `backend/logs/`, `frontend/dist/`
4. 端口占用: `netstat -ano | findstr :3000`
