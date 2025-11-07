# API 变更日志

## 2025-11-07

- 更新 `Screen` 资源响应体，新增 `screenshotPublicUrl` 字段，用于返回 MinIO 预签名截图访问地址。
- 后端新增 MinIO 预签名配置项（`MINIO_ENABLED`、`MINIO_PRESIGNED_EXPIRY_SECONDS`），请同步更新 `.env`。

