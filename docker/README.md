# Maestro Docker开发环境

## 服务清单

| 服务 | 端口 | 用途 |
|------|------|------|
| postgres | 5432 | PostgreSQL数据库 |
| redis | 6379 | Redis缓存 |
| minio | 9000/9001 | MinIO对象存储 |
| backend | 3000 | Maestro后端API |

## 快速开始

### 1. 启动所有服务

```bash
cd docker
docker-compose up -d
```

### 2. 查看服务状态

```bash
docker-compose ps
```

### 3. 查看日志

```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f backend
docker-compose logs -f postgres
```

### 4. 停止服务

```bash
docker-compose down
```

### 5. 清理数据（谨慎操作）

```bash
# 停止并删除容器、网络、卷
docker-compose down -v
```

## 数据库操作

### 运行Prisma迁移

```bash
# 进入backend容器
docker-compose exec backend sh

# 运行迁移
pnpm prisma:migrate

# 查看Prisma Studio
pnpm prisma:studio
```

### 直接连接PostgreSQL

```bash
docker-compose exec postgres psql -U maestro -d maestro
```

## MinIO配置

访问MinIO控制台：http://localhost:9001

- 用户名：`minioadmin`
- 密码：`minioadmin`

首次使用需要创建bucket：`maestro-assets`

## 开发调试

### 热重载

后端代码修改后会自动重启（通过volume映射）

### 查看API文档

启动后访问：http://localhost:3000/api/docs

### 健康检查

```bash
curl http://localhost:3000/api/v1/health
```

## 环境变量

在 `docker-compose.yml` 中配置的环境变量：

- `DATABASE_URL`: PostgreSQL连接字符串
- `REDIS_HOST`: Redis主机地址
- `STORAGE_ENDPOINT`: MinIO端点
- `STORAGE_ACCESS_KEY`: MinIO访问密钥
- `STORAGE_SECRET_KEY`: MinIO密钥

## 常见问题

### 1. 端口占用

如果端口被占用，修改 `docker-compose.yml` 中的端口映射：

```yaml
ports:
  - "15432:5432"  # 使用15432代替5432
```

### 2. 数据库连接失败

检查PostgreSQL是否健康：

```bash
docker-compose exec postgres pg_isready -U maestro
```

### 3. 后端启动失败

查看详细日志：

```bash
docker-compose logs backend
```

检查依赖安装：

```bash
docker-compose exec backend pnpm install
```

### 4. MinIO无法访问

确保MinIO健康检查通过：

```bash
docker-compose exec minio mc admin info local
```

## 生产部署

生产环境建议：

1. **使用独立的数据库集群**，不要使用Docker容器
2. **配置备份策略**，定期备份PostgreSQL和MinIO数据
3. **使用Secrets管理敏感信息**，不要硬编码密码
4. **启用HTTPS**，配置SSL证书
5. **监控和日志**，集成Prometheus和ELK

### 构建生产镜像

```bash
cd backend
docker build -f ../docker/backend.Dockerfile --target production -t maestro-backend:prod .
```

### 推送到镜像仓库

```bash
docker tag maestro-backend:prod your-registry.com/maestro-backend:0.1.0
docker push your-registry.com/maestro-backend:0.1.0
```

## 网络说明

所有服务在 `maestro-network` 桥接网络中互相通信：

- 容器之间可以使用服务名访问（如 `postgres:5432`）
- 宿主机访问使用映射的端口（如 `localhost:5432`）

