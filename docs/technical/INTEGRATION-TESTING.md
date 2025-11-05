# 集成测试指南

> Maestro后端API集成测试完整指南

---

## 📊 测试概览

**当前状态**: ✅ 24/24 通过 (100%)  
**测试框架**: Jest + Supertest  
**测试策略**: 真实服务测试（不使用mock）

---

## 🎯 测试覆盖

### 测试模块

| 模块 | 测试数 | 状态 | 覆盖场景 |
|-----|--------|------|---------|
| 设备管理 | 4 | ✅ | CRUD + 状态管理 |
| 应用版本 | 4 | ✅ | 嵌套路由 + CRUD |
| 任务管理 | 5 | ✅ | 创建/查询/取消/队列 |
| 界面管理 | 4 | ✅ | 采集/查询/元素/版本 |
| 告警管理 | 6 | ✅ | 创建/查询/处理/统计 |
| 健康检查 | 1 | ✅ | 系统状态 |

### 业务流程测试

#### 1. 设备注册流程
```typescript
创建设备 → 更新状态为AVAILABLE → 查询验证 → 更新信息
```

#### 2. 应用管理流程
```typescript
创建应用 → 创建版本 → 嵌套查询版本 → 查询应用列表
```

#### 3. 任务执行流程
```typescript
创建任务 → 检查状态 → 查询详情 → 取消任务 → 查询队列
```

#### 4. 界面采集流程
```typescript
创建界面 → 关联元素 → 查询详情 → 按应用版本查询
```

#### 5. 告警处理流程
```typescript
创建告警 → 查询列表 → 查看详情 → 确认告警 → 解决告警 → 查看统计
```

---

## 🚀 运行测试

### 快速运行
```bash
cd backend
npm run test:integration
```

### 期望输出
```
Test Suites: 1 passed, 1 total
Tests:       24 passed, 24 total
Time:        ~4s
```

### 查看详细日志
```bash
npm run test:integration -- --verbose
```

---

## 📝 测试文件结构

```
backend/test/
├── integration.e2e-spec.ts    # 集成测试主文件
├── jest-e2e.json              # Jest E2E配置
└── app.e2e-spec.ts            # 应用级E2E测试
```

---

## 🔧 测试策略

### 1. 真实服务测试

**不使用mock的原因**:
- 测试真实业务逻辑
- 发现实际部署问题
- 符合真实运维场景

**实现方式**:
```typescript
// 创建设备（ADB返回OFFLINE）
const device = await createDevice({...});

// 模拟设备上线（通过API更新状态）
await updateDevice(device.id, { status: 'AVAILABLE' });

// 继续后续测试
await createTask({ deviceIds: [device.id] });
```

### 2. 数据清理策略

**测试前清理**:
```typescript
beforeAll(async () => {
  // 清理所有测试数据
  await prisma.alert.deleteMany({});
  await prisma.taskRun.deleteMany({});
  await prisma.task.deleteMany({});
  // ...
});
```

**测试后清理**:
```typescript
afterAll(async () => {
  await cleanupTestData();
  await app.close();
});
```

### 3. 测试数据管理

**共享测试数据**:
```typescript
const testData = {
  deviceId: '',
  appId: '',
  appVersionId: '',
  taskId: '',
  // ...
};

// 在测试中传递
testData.deviceId = response.body.data.id;
```

---

## 📋 测试用例示例

### 创建设备测试
```typescript
it('POST /api/v1/devices - 创建设备', async () => {
  const response = await request(app.getHttpServer())
    .post('/api/v1/devices')
    .send({
      serial: 'test-device-001',
      model: 'Pixel 6',
      osVersion: 'Android 13',
      deviceType: 'EMULATOR',
      resolution: '1080x1920'
    })
    .expect(201);

  expect(response.body.code).toBe(0);
  expect(response.body.data).toHaveProperty('id');
  testData.deviceId = response.body.data.id;

  // 模拟设备上线
  await request(app.getHttpServer())
    .patch(`/api/v1/devices/${testData.deviceId}`)
    .send({ status: 'AVAILABLE' })
    .expect(200);
});
```

### 嵌套路由测试
```typescript
it('POST /api/v1/apps/:id/versions - 创建应用版本', () => {
  return request(app.getHttpServer())
    .post(`/api/v1/apps/${testData.appId}/versions`)
    .send({
      versionName: '1.0.0',
      versionCode: 100
    })
    .expect(201)
    .expect((res) => {
      expect(res.body.code).toBe(0);
      expect(res.body.data).toHaveProperty('id');
      testData.appVersionId = res.body.data.id;
    });
});
```

### 告警处理流程测试
```typescript
it('PATCH /api/v1/alerts/:id/acknowledge - 确认告警', () => {
  return request(app.getHttpServer())
    .patch(`/api/v1/alerts/${testData.alertId}/acknowledge`)
    .send({
      ackBy: testData.deviceId,
      note: '已确认，正在处理'
    })
    .expect(200)
    .expect((res) => {
      expect(res.body.code).toBe(0);
      expect(res.body.data.status).toBe('ACKED');
    });
});
```

---

## ⚙️ 配置说明

### Jest E2E 配置
```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": {
    "^.+\\.(t|j)s$": "ts-jest"
  }
}
```

### ValidationPipe 配置
```typescript
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,  // 重要：启用类型转换
    },
  }),
);
```

---

## 🐛 常见问题

### 问题1: 设备状态OFFLINE导致任务创建失败

**原因**: ADB服务在测试环境返回false

**解决方案**:
```typescript
// 创建设备后立即更新状态
await request(app).patch(`/devices/${id}`)
  .send({ status: 'AVAILABLE' });
```

### 问题2: 400 Bad Request

**原因**: 
- DTO字段名不匹配
- 枚举值错误
- ValidationPipe配置不一致

**解决方案**:
- 检查DTO定义
- 确保枚举值正确
- 启用`enableImplicitConversion`

### 问题3: 404 Not Found

**原因**:
- API路径配置错误
- Controller前缀重复

**解决方案**:
```typescript
// ❌ 错误
@Controller('api/v1/tasks')

// ✅ 正确
@Controller('tasks')
// 在main.ts中统一配置: app.setGlobalPrefix('/api/v1')
```

### 问题4: 测试数据污染

**原因**: 测试数据未清理

**解决方案**:
```typescript
beforeAll(async () => {
  // 清理所有数据
  await prisma.$transaction([
    prisma.alert.deleteMany(),
    prisma.taskRun.deleteMany(),
    // ...
  ]);
});
```

---

## 📈 性能基准

### 响应时间
- 健康检查: < 10ms
- 简单查询: < 50ms
- 复杂查询: < 200ms
- 创建操作: < 100ms

### 测试执行时间
- 单个测试: 3-20ms
- 完整测试套件: ~4秒
- 数据库操作: 占70%时间

---

## 🔍 调试测试

### 启用详细日志
```typescript
it('test name', async () => {
  const response = await request(app).get('/api/v1/tasks');
  
  // 调试输出
  if (response.status !== 200) {
    console.log('Failed response:', response.status, response.body);
  }
  
  expect(response.status).toBe(200);
});
```

### 使用VSCode调试
```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest E2E",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": [
    "--config",
    "./test/jest-e2e.json",
    "--runInBand"
  ],
  "console": "integratedTerminal"
}
```

---

## ✅ 测试检查清单

### 运行测试前
- [ ] Docker服务运行中
- [ ] 数据库连接正常
- [ ] 环境变量已配置
- [ ] 依赖已安装

### 测试通过标准
- [ ] 所有24个测试通过
- [ ] 无ESLint错误
- [ ] 无TypeScript错误
- [ ] 响应时间达标

### 测试后
- [ ] 测试数据已清理
- [ ] 服务正常关闭
- [ ] 无残留进程

---

## 📚 相关资源

- **Jest文档**: https://jestjs.io/
- **Supertest文档**: https://github.com/visionmedia/supertest
- **NestJS测试**: https://docs.nestjs.com/fundamentals/testing
- **Phase 5报告**: [phase-5-delivery-report.md](../iterations/phase-5-delivery-report.md)

---

**最后更新**: 2025-11-05  
**维护者**: Maestro测试团队

