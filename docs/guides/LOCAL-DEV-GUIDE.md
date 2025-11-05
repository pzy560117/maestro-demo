# 🚀 Maestro 本地开发指南

## 📋 开发环境架构

```
┌─────────────────────────────────────────┐
│         本地开发环境                      │
├─────────────────────────────────────────┤
│                                         │
│  🖥️  本地运行                            │
│  ├─ NestJS Backend (localhost:3000)    │
│  └─ 开发工具 (VSCode/Cursor)             │
│                                         │
│  🐳 Docker运行                           │
│  ├─ PostgreSQL (localhost:5432)        │
│  ├─ Redis (localhost:6379)             │
│  └─ MinIO (localhost:9000/9001)        │
│                                         │
└─────────────────────────────────────────┘
```

## 🛠️ 快速启动

### 第一步：启动Docker服务

```powershell
# 进入docker目录
cd D:\Project\maestro\docker

# 启动数据库相关服务
docker-compose up -d

# 查看服务状态
docker-compose ps
```

预期输出：
```
NAME               STATUS
maestro-postgres   Up (healthy)
maestro-redis      Up (healthy)
maestro-minio      Up (healthy)
```

### 第二步：启动后端服务

```powershell
# 进入backend目录
cd D:\Project\maestro\backend

# 启动开发服务器（热重载）
npm run start:dev
```

看到以下输出表示成功：
```
✅ Maestro Backend Started Successfully!
🚀 Server: http://localhost:3000
📚 API Docs: http://localhost:3000/api/docs
💚 Health Check: http://localhost:3000/api/v1/health
```

## 🧪 测试API

### 方法1：使用测试脚本

```powershell
cd D:\Project\maestro\backend
.\test-api.ps1
```

### 方法2：手动测试

```powershell
# 测试Health接口
Invoke-RestMethod -Uri http://localhost:3000/api/v1/health

# 创建设备
$device = @{
    serial = "emulator-5554"
    model = "Pixel 6"
    osVersion = "Android 13"
    deviceType = "EMULATOR"
} | ConvertTo-Json

Invoke-RestMethod -Uri http://localhost:3000/api/v1/devices `
    -Method Post `
    -Body $device `
    -ContentType "application/json"

# 获取设备列表
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/devices?page=1&pageSize=10"
```

### 方法3：使用Swagger UI

浏览器打开：http://localhost:3000/api/docs

## 📦 数据库管理

### 查看数据库

```powershell
# 启动Prisma Studio（数据库可视化工具）
cd D:\Project\maestro\backend
npm run prisma:studio
```

访问：http://localhost:5555

### 数据库迁移

```powershell
# 生成Prisma Client
npm run prisma:generate

# 推送schema变更到数据库
npx prisma db push

# 创建正式迁移（生产环境使用）
npm run prisma:migrate
```

## 🔄 常见操作

### 重启服务

```powershell
# 后端：在运行npm run start:dev的终端按 Ctrl+C，然后重新运行

# Docker服务
cd D:\Project\maestro\docker
docker-compose restart

# 重启单个服务
docker-compose restart postgres
```

### 查看日志

```powershell
# Docker服务日志
cd D:\Project\maestro\docker
docker-compose logs -f postgres
docker-compose logs -f redis
docker-compose logs -f minio

# 后端日志：直接在运行npm run start:dev的终端查看
```

### 清理数据

```powershell
# 停止所有Docker服务
cd D:\Project\maestro\docker
docker-compose down

# 清理数据卷（⚠️ 会删除所有数据！）
docker-compose down -v

# 重新启动
docker-compose up -d
cd ../backend
npx prisma db push
```

## 🐛 故障排查

### 问题1：端口被占用

**症状**：`EADDRINUSE: address already in use :::3000`

**解决**：
```powershell
# 查找占用进程
netstat -ano | findstr ":3000"

# 终止进程（替换PID为实际进程ID）
Stop-Process -Id <PID> -Force
```

### 问题2：数据库连接失败

**症状**：`Can't reach database server at localhost:5432`

**解决**：
```powershell
# 检查PostgreSQL容器状态
cd D:\Project\maestro\docker
docker-compose ps postgres

# 检查容器日志
docker-compose logs postgres

# 重启PostgreSQL
docker-compose restart postgres
```

### 问题3：Docker服务无法启动

**症状**：容器一直重启或unhealthy

**解决**：
```powershell
# 查看详细日志
docker-compose logs --tail=100 <service-name>

# 完全重建
docker-compose down
docker-compose up -d --build
```

## 📝 开发工作流

### 日常开发流程

1. **启动环境**
   ```powershell
   # Terminal 1 - Docker服务（保持运行）
   cd D:\Project\maestro\docker
   docker-compose up -d
   
   # Terminal 2 - 后端开发（热重载）
   cd D:\Project\maestro\backend
   npm run start:dev
   ```

2. **修改代码**
   - 编辑 `src/` 下的文件
   - NestJS会自动热重载
   - 查看Terminal 2的编译输出

3. **测试API**
   - 使用Swagger UI：http://localhost:3000/api/docs
   - 或运行测试脚本：`.\test-api.ps1`

4. **提交代码**
   ```powershell
   # 格式化代码
   npm run format
   
   # 检查Lint
   npm run lint
   
   # 运行测试
   npm test
   
   # 提交
   git add .
   git commit -m "feat: 添加新功能"
   ```

### 修改数据库Schema

1. 编辑 `backend/prisma/schema.prisma`
2. 推送到数据库：
   ```powershell
   npx prisma db push
   ```
3. 重新生成Prisma Client：
   ```powershell
   npm run prisma:generate
   ```

### 添加新模块

```powershell
cd D:\Project\maestro\backend

# 生成新模块
npx nest generate module modules/my-feature
npx nest generate controller modules/my-feature
npx nest generate service modules/my-feature
```

## 🔗 服务访问地址

| 服务 | 地址 | 说明 |
|------|------|------|
| 后端API | http://localhost:3000 | NestJS应用 |
| Swagger文档 | http://localhost:3000/api/docs | API文档 |
| Health检查 | http://localhost:3000/api/v1/health | 健康检查 |
| PostgreSQL | localhost:5432 | 数据库 |
| Redis | localhost:6379 | 缓存 |
| MinIO API | http://localhost:9000 | 对象存储 |
| MinIO Console | http://localhost:9001 | MinIO管理界面 |
| Prisma Studio | http://localhost:5555 | 数据库管理 |

## 📚 环境变量

后端环境变量位于 `backend/.env`：

```env
# 数据库（本地访问Docker）
DATABASE_URL=postgresql://maestro:maestro_password@127.0.0.1:5432/maestro?schema=public

# Redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379

# MinIO
STORAGE_ENDPOINT=127.0.0.1:9000
STORAGE_ACCESS_KEY=minioadmin
STORAGE_SECRET_KEY=minioadmin
STORAGE_BUCKET=maestro-assets
STORAGE_USE_SSL=false

# 应用
NODE_ENV=development
PORT=3000
```

## 💡 提示

1. **后端热重载**：修改TypeScript文件后自动编译，无需重启
2. **数据库可视化**：使用Prisma Studio查看和编辑数据
3. **API测试**：Swagger UI提供交互式API测试界面
4. **日志查看**：后端日志直接输出到终端，带颜色高亮
5. **Docker数据持久化**：数据存储在Docker volumes中，重启不丢失

## 🆘 获取帮助

- 查看后端README：`backend/README.md`
- 查看Docker配置：`docker/README.md`
- 查看数据库设计：`docs/数据库设计.md`
- 查看迭代计划：`docs/迭代开发指南.md`

---

**最后更新**：2025-11-04  
**当前迭代**：Iteration 0（基础设施搭建）

