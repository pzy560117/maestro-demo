-- Maestro数据库初始化脚本
-- 创建必要的扩展和初始化数据

-- 创建UUID扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 创建pg_trgm扩展（用于文本模糊搜索）
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 创建pgcrypto扩展（用于加密）
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 打印初始化完成信息
DO $$
BEGIN
  RAISE NOTICE 'Maestro database initialized successfully';
  RAISE NOTICE 'Extensions installed: uuid-ossp, pg_trgm, pgcrypto';
END
$$;

