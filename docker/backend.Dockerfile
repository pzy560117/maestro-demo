# Maestro后端Docker镜像
# 基于Node.js 20 LTS (Debian slim - 兼容Prisma)

FROM node:20-slim AS base

# 安装OpenSSL和其他必要的系统库（Prisma和NestJS需要）
RUN apt-get update && apt-get install -y \
    openssl \
    libssl-dev \
    ca-certificates \
    procps \
    && rm -rf /var/lib/apt/lists/*

# 设置工作目录
WORKDIR /app

# ============================================
# 依赖安装阶段
# ============================================
FROM base AS dependencies

# 复制package文件
COPY package.json package-lock.json* ./

# 安装依赖
RUN npm ci --only=production=false

# ============================================
# 构建阶段
# ============================================
FROM base AS build

# 复制依赖
COPY --from=dependencies /app/node_modules ./node_modules

# 复制源代码
COPY . .

# 生成Prisma Client
RUN npm run prisma:generate

# 构建应用
RUN npm run build

# ============================================
# 生产环境镜像
# ============================================
FROM base AS production

# 复制依赖（仅生产依赖）
COPY --from=dependencies /app/node_modules ./node_modules

# 复制构建产物
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma

# 复制Prisma Schema（用于运行时迁移）
COPY prisma ./prisma

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/v1/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 启动应用
CMD ["node", "dist/main.js"]

# ============================================
# 开发环境镜像
# ============================================
FROM base AS development

# 复制依赖
COPY --from=dependencies /app/node_modules ./node_modules

# 复制所有配置文件和源代码
COPY . .

# 生成Prisma Client
RUN npm run prisma:generate

# 暴露端口
EXPOSE 3000

# 开发模式启动
CMD ["npm", "run", "start:dev"]

