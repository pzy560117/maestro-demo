/**
 * 应用信息
 */
export interface App {
  id: string;
  name: string;
  packageName: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 应用版本信息
 */
export interface AppVersion {
  id: string;
  appId: string;
  version: string;
  apkHash: string;
  releaseNotes?: string;
  createdAt: Date;
  updatedAt: Date;
  app?: App;
}

/**
 * 创建应用 DTO
 */
export interface CreateAppDto {
  name: string;
  packageName: string;
  description?: string;
}

/**
 * 创建应用版本 DTO
 */
export interface CreateAppVersionDto {
  appId: string;
  version: string;
  apkHash: string;
  releaseNotes?: string;
}

