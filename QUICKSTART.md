# Maestro 快速启动指南

> 5分钟快速体验 Maestro LLM 驱动的 UI 自动化定位系统

## 前置要求

- ✅ Node.js 20+
- ✅ pnpm 8+
- ✅ Docker Desktop
- ✅ Git

## 快速启动步骤

### 1. 克隆项目

```bash
git clone <repository-url>
cd maestro
```

### 2. 检查环境

```bash
cd backend
pnpm install
pnpm setup:check
```

如果检查失败，根据提示安装缺失的依赖。

### 3. 启动基础服务

```bash
# 启动 PostgreSQL + Redis + MinIO
cd ../docker
docker-compose up -d postgres redis minio

# 等待服务启动（约15秒）
docker-compose ps
```

### 4. 初始化数据库

```bash
cd ../backend

# 生成 Prisma Client
pnpm prisma:generate

# 运行数据库迁移
pnpm prisma:migrate

# 导入种子数据
pnpm prisma:seed
```

### 5. 启动后端服务

```bash
pnpm start:dev
```

看到以下输出表示启动成功：

```
✅ Maestro Backend Started Successfully!
🚀 Server: http://localhost:3000
📚 API Docs: http://localhost:3000/api/docs
💚 Health Check: http://localhost:3000/api/v1/health
```

### 6. 验证服务

打开浏览器访问：

- **API 文档**: http://localhost:3000/api/docs
- **健康检查**: http://localhost:3000/api/v1/health

## 测试 API

### 方式1: 使用 Swagger UI

访问 http://localhost:3000/api/docs，直接在页面上测试 API。

### 方式2: 使用 curl

```bash
# 健康检查
curl http://localhost:3000/api/v1/health

# 查询设备列表
curl http://localhost:3000/api/v1/devices

# 查询应用列表
curl http://localhost:3000/api/v1/apps

# 查询应用版本
curl http://localhost:3000/api/v1/app-versions
```

### 方式3: 运行测试

```bash
cd backend

# 运行单元测试
pnpm test

# 运行 E2E 测试
pnpm test:e2e

# 生成覆盖率报告
pnpm test:cov
```

## 验证 Appium 环境（可选）

如果需要测试设备自动化功能：

### 1. 安装 Appium

```bash
npm install -g appium
appium driver install uiautomator2
```

### 2. 连接 Android 设备/模拟器

```bash
# 检查设备
adb devices

# 如果没有设备，启动模拟器
# 或使用 Android Studio 创建虚拟设备
```

### 3. 启动 Appium Server

```bash
appium
```

### 4. 运行 PoC 测试

```bash
cd poc/appium-test
pnpm install
pnpm test
```

## 下一步

### 查看数据

使用 Prisma Studio 可视化查看数据库：

```bash
cd backend
pnpm prisma:studio
```

访问 http://localhost:5555

### 创建设备

```bash
curl -X POST http://localhost:3000/api/v1/devices \
  -H "Content-Type: application/json" \
  -d '{
    "serial": "test-device-001",
    "model": "Test Device",
    "osVersion": "Android 13",
    "deviceType": "EMULATOR",
    "resolution": "1080x1920"
  }'
```

### 创建应用

```bash
curl -X POST http://localhost:3000/api/v1/apps \
  -H "Content-Type: application/json" \
  -d '{
    "name": "测试应用",
    "packageName": "com.test.myapp",
    "description": "这是一个测试应用"
  }'
```

## 常见问题

### Q: 端口被占用

**解决方案**：修改 `backend/.env` 中的端口配置：

```env
PORT=3001  # 改为其他端口
```

### Q: 数据库连接失败

**解决方案**：

1. 确保 Docker 服务已启动
2. 检查 PostgreSQL 容器状态：`docker-compose ps postgres`
3. 查看日志：`docker-compose logs postgres`
4. 重启服务：`docker-compose restart postgres`

### Q: Prisma 迁移失败

**解决方案**：

```bash
# 重置数据库
pnpm prisma:reset

# 重新迁移
pnpm prisma:migrate
```

### Q: ADB 设备未找到

**解决方案**：

1. 确保 ADB 已安装并在 PATH 中
2. 检查设备连接：`adb devices`
3. 重启 ADB：`adb kill-server && adb start-server`

### Q: 依赖安装失败

**解决方案**：

```bash
# 清理缓存
pnpm store prune

# 重新安装
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

## 停止服务

```bash
# 停止后端
# 按 Ctrl+C

# 停止 Docker 服务
cd docker
docker-compose down

# 如需清理数据
docker-compose down -v
```

## 获取帮助

- 📚 查看完整文档：`README.md`
- 🐛 问题反馈：[GitHub Issues]
- 💬 技术讨论：[Discussions]

---

**恭喜！** 🎉 

您已成功启动 Maestro 系统。现在可以：

1. 📖 阅读完整文档了解更多功能
2. 🧪 运行测试验证系统功能
3. 🚀 开始 Iteration 1 开发

查看 `docs/迭代开发指南.md` 了解开发计划。

