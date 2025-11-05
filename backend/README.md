# Maestro Backend

LLM驱动的手机端UI自动化定位系统 - 后端服务

## 技术栈

- **框架**: NestJS 10
- **语言**: TypeScript 5
- **数据库**: PostgreSQL 16 + Prisma ORM
- **缓存**: Redis 7
- **存储**: MinIO
- **文档**: Swagger/OpenAPI 3.1
- **测试**: Jest

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，配置数据库和其他服务
```

### 3. 启动数据库（Docker）

```bash
cd ../docker
docker-compose up -d postgres redis minio
```

### 4. 运行数据库迁移

```bash
pnpm prisma:generate
pnpm prisma:migrate
```

### 5. 启动开发服务器

```bash
pnpm start:dev
```

服务将在 http://localhost:3000 启动

API文档: http://localhost:3000/api/docs

## 项目结构

```
backend/
├── src/
│   ├── modules/
│   │   ├── common/          # 公共模块（Prisma、异常、拦截器）
│   │   ├── devices/         # 设备管理模块
│   │   └── apps/            # 应用版本管理模块
│   ├── app.module.ts        # 根模块
│   └── main.ts              # 应用入口
├── prisma/
│   └── schema.prisma        # 数据库Schema
├── test/                    # 测试文件
├── package.json
└── tsconfig.json
```

## 可用命令

### 开发
```bash
pnpm start:dev          # 开发模式（热重载）
pnpm start:debug        # 调试模式
```

### 构建
```bash
pnpm build              # 构建生产版本
pnpm start:prod         # 运行生产版本
```

### 测试
```bash
pnpm test               # 运行单元测试
pnpm test:watch         # 监听模式
pnpm test:cov           # 生成覆盖率报告
pnpm test:e2e           # 运行E2E测试
pnpm test:llm-api       # 测试LLM API连接（Iteration 1）
```

### 代码质量
```bash
pnpm lint               # ESLint检查并自动修复
pnpm format             # Prettier格式化
```

### 数据库
```bash
pnpm prisma:generate    # 生成Prisma Client
pnpm prisma:migrate     # 运行迁移
pnpm prisma:studio      # 打开Prisma Studio
pnpm prisma:seed        # 运行种子数据
```

## API文档

启动服务后访问 http://localhost:3000/api/docs 查看完整API文档

### 核心API端点

#### 设备管理
- `POST /api/v1/devices` - 创建设备
- `GET /api/v1/devices` - 查询设备列表
- `GET /api/v1/devices/:id` - 查询设备详情
- `PATCH /api/v1/devices/:id` - 更新设备
- `DELETE /api/v1/devices/:id` - 删除设备
- `POST /api/v1/devices/:id/heartbeat` - 更新心跳
- `GET /api/v1/devices/available/list` - 获取可用设备

#### 应用管理
- `POST /api/v1/apps` - 创建应用
- `GET /api/v1/apps` - 查询应用列表
- `GET /api/v1/apps/:id` - 查询应用详情
- `PATCH /api/v1/apps/:id` - 更新应用
- `DELETE /api/v1/apps/:id` - 删除应用

#### 应用版本
- `POST /api/v1/app-versions` - 创建版本
- `GET /api/v1/app-versions?appId=xxx` - 查询版本列表
- `GET /api/v1/app-versions/:id` - 查询版本详情
- `PATCH /api/v1/app-versions/:id` - 更新版本
- `DELETE /api/v1/app-versions/:id` - 删除版本

## 数据库Schema

核心表结构：

- `apps` - 应用信息
- `app_versions` - 应用版本
- `devices` - 设备信息
- `tasks` - 遍历任务（Iteration 1实现）
- `task_runs` - 任务执行记录
- `screens` - 界面资产
- `elements` - UI元素
- `locator_candidates` - 定位候选
- `llm_logs` - LLM日志
- `alerts` - 告警记录

完整Schema见 `prisma/schema.prisma`

## 测试

### 单元测试

```bash
pnpm test
```

测试覆盖主要模块：
- DevicesService - 设备管理逻辑
- AppsService - 应用管理逻辑
- AdbService - ADB集成

目标覆盖率: ≥70%

### E2E测试

```bash
pnpm test:e2e
```

测试完整API流程：
- 设备CRUD操作
- 应用和版本管理
- 参数验证
- 错误处理

## 开发规范

### 代码风格
- 遵循 `.eslintrc.js` 配置
- 使用 Prettier 格式化
- TypeScript 严格模式
- 函数级注释

### 命名规范
- 类/接口: `PascalCase`
- 方法/变量: `camelCase`
- 常量: `UPPER_SNAKE_CASE`
- 文件名: `kebab-case.ts`

### 提交规范
```
feat(module): 新功能说明
fix(module): 修复问题说明
docs: 文档更新
test: 测试相关
refactor: 重构代码
```

## 部署

### Docker部署

```bash
# 构建镜像
docker build -f ../docker/backend.Dockerfile --target production -t maestro-backend:0.1.0 .

# 运行容器
docker run -d \
  -p 3000:3000 \
  -e DATABASE_URL="..." \
  maestro-backend:0.1.0
```

### 使用docker-compose

```bash
cd ../docker
docker-compose up -d
```

## 监控

### 健康检查

```bash
curl http://localhost:3000/api/v1/health
```

返回:
```json
{
  "status": "ok",
  "timestamp": "2025-11-04T10:00:00.000Z",
  "uptime": 123.456
}
```

### 日志

应用日志使用 Winston，包含：
- 请求日志
- 错误日志
- 业务操作日志

生产环境建议配置日志聚合服务（Loki/ELK）

## 常见问题

### 1. Prisma Client未生成

```bash
pnpm prisma:generate
```

### 2. 数据库连接失败

检查 `DATABASE_URL` 环境变量和PostgreSQL服务状态

### 3. 端口占用

修改 `.env` 中的 `PORT` 变量

### 4. ADB验证失败

确保：
- ADB已安装: `adb version`
- 设备已连接: `adb devices`
- 服务器可访问ADB命令

## 开发进度

### ✅ Iteration 1 - 遍历指挥调度核心（已完成）
- ✅ 遍历任务管理模块（TasksModule）
- ✅ Orchestrator状态机
- ✅ LLM指令生成服务（**Qwen-VL-Max** - 通义千问旗舰版多模态模型）
- ✅ 安全检查与白名单
- ✅ 真实API调用已验证

**当前 LLM 模型**:
- 🎯 **qwen-vl-max**: 通义千问视觉语言模型旗舰版
- 📊 **性能**: 最强 UI 理解和推理能力
- ⏱️ **响应**: ~2.2秒/请求
- 🔍 **优势**: 专为复杂界面分析优化

**配置文档**: 
- `QWEN3-SETUP-SUCCESS.md` - LLM配置验证报告
- `docs/qwen-models-comparison.md` - 模型选择和对比指南 ⭐
- `docs/iteration-1-delivery-report.md` - 迭代1交付报告
- `docs/llm-api-setup.md` - LLM API详细配置

**快速验证**:
```bash
npm run test:llm-api  # 验证LLM连接
npm test              # 运行所有测试（46个测试用例）
```

### 下一步：Iteration 2 - 定位生成与验证
- [ ] MidSceneJS视觉解析集成
- [ ] 定位候选生成
- [ ] 自动验证与截图回放
- [ ] 界面签名与存档

见 `迭代开发指南.md` 了解完整开发计划

## 许可证

MIT

## 联系方式

项目仓库: [GitHub链接]

