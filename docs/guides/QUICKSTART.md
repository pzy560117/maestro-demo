# Maestro 快速开始指南

> 5分钟快速启动 Maestro 系统

---

## 🚀 快速启动（3步）

### 1. 启动服务
```bash
cd D:\Project\maestro
docker-compose -f docker/docker-compose.yml up -d
```

### 2. 初始化数据库
```bash
cd backend
npm install
npx prisma generate
npx prisma db push
```

### 3. 启动应用
```bash
# 终端1 - 后端
cd backend
npm run start:dev

# 终端2 - 前端
cd frontend
npm install
npm run dev
```

### 4. 访问应用
- **前端**: http://localhost:5173
- **API文档**: http://localhost:3000/api/docs
- **健康检查**: http://localhost:3000/api/v1/health

---

## 📋 前置要求

### 必需软件
- **Node.js**: 18.x 或更高
- **Docker**: 20.x 或更高
- **PostgreSQL**: 14.x (Docker自动安装)
- **Git**: 最新版本

### 可选软件
- **Android SDK**: 用于真实设备测试
- **Chrome/Edge**: 用于前端开发

---

## 🔧 详细步骤

### Step 1: 克隆项目
```bash
git clone <repository-url>
cd maestro
```

### Step 2: 启动Docker服务
```bash
cd docker
docker-compose up -d

# 验证服务状态
docker ps
# 应该看到：postgres, redis 运行中
```

### Step 3: 配置环境变量
```bash
# backend/.env
DATABASE_URL="postgresql://maestro:maestro123@localhost:5432/maestro"
REDIS_URL="redis://localhost:6379"
DASHSCOPE_API_KEY="your-api-key"  # 可选

# frontend/.env
VITE_API_URL="http://localhost:3000"
```

### Step 4: 安装依赖

#### 后端
```bash
cd backend
npm install
```

#### 前端
```bash
cd frontend
npm install
```

### Step 5: 初始化数据库
```bash
cd backend
npx prisma generate
npx prisma db push
npm run seed  # 可选：导入测试数据
```

### Step 6: 启动开发服务器

#### 后端
```bash
cd backend
npm run start:dev
# 看到: ✅ Maestro Backend Started Successfully!
```

#### 前端
```bash
cd frontend
npm run dev
# 看到: ➜ Local: http://localhost:5173/
```

---

## ✅ 验证安装

### 1. 检查后端
```bash
curl http://localhost:3000/api/v1/health
# 期望: {"status":"ok","timestamp":"..."}
```

### 2. 检查前端
打开浏览器访问: http://localhost:5173
应该看到 Maestro Dashboard

### 3. 检查数据库
```bash
docker exec -it maestro-postgres psql -U maestro
\dt
# 应该看到所有表
```

### 4. 检查API文档
访问: http://localhost:3000/api/docs
应该看到完整的Swagger文档

---

## 🧪 运行测试

### 后端集成测试
```bash
cd backend
npm run test:integration
# 期望: Tests: 24 passed, 24 total
```

### 后端单元测试
```bash
cd backend
npm run test
```

### 前端构建测试
```bash
cd frontend
npm run build
```

---

## 📁 项目结构

```
maestro/
├── backend/              # NestJS后端
│   ├── src/             # 源代码
│   ├── test/            # 测试文件
│   └── prisma/          # 数据库Schema
├── frontend/            # React前端
│   ├── src/             # 源代码
│   └── dist/            # 构建产物
├── docker/              # Docker配置
├── docs/                # 文档
└── poc/                 # 概念验证代码
```

---

## 🐛 常见问题

### 问题1: 端口已被占用
```bash
# 检查端口占用
netstat -ano | findstr :3000
netstat -ano | findstr :5173

# 修改端口
# backend: 修改 .env 中的 PORT
# frontend: 修改 vite.config.ts 中的 server.port
```

### 问题2: 数据库连接失败
```bash
# 检查Docker服务
docker ps | grep postgres

# 重启PostgreSQL
docker restart maestro-postgres

# 检查连接
psql -h localhost -U maestro -d maestro
```

### 问题3: Prisma generate失败
```bash
# 清理并重新生成
cd backend
rm -rf node_modules/@prisma
npm install
npx prisma generate
```

### 问题4: 前端依赖安装失败
```bash
cd frontend
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

---

## 🔄 日常开发流程

### 启动开发环境
```bash
# 1. 启动Docker服务
docker-compose -f docker/docker-compose.yml up -d

# 2. 启动后端（终端1）
cd backend && npm run start:dev

# 3. 启动前端（终端2）
cd frontend && npm run dev
```

### 停止开发环境
```bash
# Ctrl+C 停止前后端服务

# 停止Docker
docker-compose -f docker/docker-compose.yml down
```

### 查看日志
```bash
# 后端日志
cd backend && npm run start:dev

# Docker日志
docker logs maestro-postgres
docker logs maestro-redis
```

---

## 📚 下一步

### 开发者
- 阅读[本地开发指南](./LOCAL-DEV-GUIDE.md)
- 查看[后端README](../../backend/README.md)
- 查看[前端README](../../frontend/README.md)

### 测试Phase 5功能
- 阅读[Phase 5快速验证](./PHASE-5-QUICKSTART.md)
- 运行集成测试
- 访问Swagger文档

### 了解更多
- [产品需求文档](../requirements/PRD.md)
- [系统架构](../requirements/ARCHITECTURE.md)
- [WebSocket实现](../technical/WEBSOCKET.md)

---

## 🆘 获取帮助

- **文档中心**: [docs/README.md](../README.md)
- **API文档**: http://localhost:3000/api/docs
- **Issues**: GitHub Issues
- **Wiki**: 项目Wiki

---

**祝您使用愉快！** 🎉

