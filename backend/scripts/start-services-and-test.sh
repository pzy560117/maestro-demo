#!/bin/bash

# ====================================
# Maestro 启动真实服务并运行测试
# ====================================

set -e  # 遇到错误立即退出

echo "=========================================="
echo "Maestro - 启动真实服务并运行测试"
echo "=========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 步骤 1: 启动 Docker 服务
echo -e "${YELLOW}[1/6] 启动 Docker 服务...${NC}"
cd ../docker
docker-compose up -d

# 等待服务就绪
echo -e "${YELLOW}等待服务启动...${NC}"
sleep 10

# 检查服务状态
echo -e "${YELLOW}检查服务状态...${NC}"
docker-compose ps

echo ""

# 步骤 2: 检查服务健康状态
echo -e "${YELLOW}[2/6] 检查服务健康状态...${NC}"

# PostgreSQL
echo -n "PostgreSQL: "
if docker-compose exec -T postgres pg_isready -U maestro > /dev/null 2>&1; then
    echo -e "${GREEN}✓ 健康${NC}"
else
    echo -e "${RED}✗ 不健康${NC}"
    exit 1
fi

# Redis
echo -n "Redis: "
if docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; then
    echo -e "${GREEN}✓ 健康${NC}"
else
    echo -e "${RED}✗ 不健康${NC}"
    exit 1
fi

# MinIO
echo -n "MinIO: "
if curl -f http://localhost:9000/minio/health/live > /dev/null 2>&1; then
    echo -e "${GREEN}✓ 健康${NC}"
else
    echo -e "${RED}✗ 不健康${NC}"
    exit 1
fi

# Appium
echo -n "Appium: "
if curl -f http://localhost:4723/status > /dev/null 2>&1; then
    echo -e "${GREEN}✓ 健康${NC}"
else
    echo -e "${RED}✗ 不健康${NC}"
    echo -e "${YELLOW}注意：Appium 可能需要更长时间启动${NC}"
fi

echo ""

# 步骤 3: 配置环境变量
echo -e "${YELLOW}[3/6] 配置环境变量...${NC}"
cd ../backend

cat > .env.test << 'EOF'
# 数据库配置
DATABASE_URL=postgresql://maestro:maestro_password@localhost:5432/maestro

# API 配置
PORT=3000
NODE_ENV=test

# LLM 配置（使用 Mock）
LLM_API_ENDPOINT=https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions
LLM_API_KEY=sk-test-key
LLM_MODEL_NAME=qwen-vl-max

# Appium 配置（启用真实 API）
APPIUM_ENABLED=true
APPIUM_SERVER_URL=http://localhost:4723

# MidSceneJS 配置（暂时禁用）
MIDSCENE_ENABLED=false

# MinIO 对象存储配置（启用）
MINIO_ENABLED=true
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin

# 日志配置
LOG_LEVEL=debug
EOF

echo -e "${GREEN}✓ 环境变量已配置${NC}"
echo ""

# 步骤 4: 运行数据库迁移
echo -e "${YELLOW}[4/6] 运行数据库迁移...${NC}"
npm run prisma:generate
npm run prisma:migrate deploy

echo -e "${GREEN}✓ 数据库迁移完成${NC}"
echo ""

# 步骤 5: 运行健康检查
echo -e "${YELLOW}[5/6] 启动应用并检查集成健康...${NC}"

# 启动应用（后台）
npm run start:dev > /tmp/maestro-backend.log 2>&1 &
BACKEND_PID=$!

# 等待应用启动
echo -n "等待应用启动"
for i in {1..30}; do
    if curl -f http://localhost:3000/api/v1/health > /dev/null 2>&1; then
        echo -e " ${GREEN}✓${NC}"
        break
    fi
    echo -n "."
    sleep 1
done

# 检查集成健康
echo ""
echo "集成服务健康检查："
curl -s http://localhost:3000/api/v1/integrations/health | jq '.' || echo "健康检查失败"

echo ""

# 步骤 6: 运行测试
echo -e "${YELLOW}[6/6] 运行测试...${NC}"
echo ""

# 运行单元测试
echo -e "${YELLOW}运行单元测试...${NC}"
npm test

echo ""

# 运行集成测试（如果有）
# echo -e "${YELLOW}运行集成测试...${NC}"
# npm run test:e2e

echo ""
echo "=========================================="
echo -e "${GREEN}✓ 所有测试完成！${NC}"
echo "=========================================="
echo ""
echo "服务状态："
echo "  - PostgreSQL: http://localhost:5432"
echo "  - Redis: http://localhost:6379"
echo "  - MinIO Console: http://localhost:9001"
echo "  - Appium: http://localhost:4723"
echo "  - Backend API: http://localhost:3000"
echo ""
echo "MinIO 访问："
echo "  - 用户名: minioadmin"
echo "  - 密码: minioadmin"
echo ""
echo "停止服务："
echo "  cd docker && docker-compose down"
echo ""

# 停止后台应用
kill $BACKEND_PID 2>/dev/null || true

