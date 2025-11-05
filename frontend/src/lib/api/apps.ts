import { ApiClient } from './client';
import type { App, AppVersion, CreateAppDto, CreateAppVersionDto } from '@/types/app';
import type { PaginatedResponse, PaginationParams } from '@/types/api';

/**
 * 应用 API 服务
 */
export class AppsApi {
  /**
   * 获取应用列表
   */
  static async getApps(params?: PaginationParams): Promise<PaginatedResponse<App>> {
    return ApiClient.get('/apps', { params });
  }

  /**
   * 获取应用详情
   */
  static async getApp(id: string): Promise<App> {
    return ApiClient.get(`/apps/${id}`);
  }

  /**
   * 创建应用
   */
  static async createApp(data: CreateAppDto): Promise<App> {
    return ApiClient.post('/apps', data);
  }

  /**
   * 更新应用
   */
  static async updateApp(id: string, data: Partial<CreateAppDto>): Promise<App> {
    return ApiClient.patch(`/apps/${id}`, data);
  }

  /**
   * 删除应用
   */
  static async deleteApp(id: string): Promise<void> {
    return ApiClient.delete(`/apps/${id}`);
  }
}

/**
 * 应用版本 API 服务
 */
export class AppVersionsApi {
  /**
   * 获取应用版本列表
   */
  static async getAppVersions(
    appId: string,
    params?: PaginationParams
  ): Promise<PaginatedResponse<AppVersion>> {
    return ApiClient.get('/app-versions', { params: { appId, ...params } });
  }

  /**
   * 获取应用版本详情
   */
  static async getAppVersion(id: string): Promise<AppVersion> {
    return ApiClient.get(`/app-versions/${id}`);
  }

  /**
   * 创建应用版本
   */
  static async createAppVersion(data: CreateAppVersionDto): Promise<AppVersion> {
    return ApiClient.post('/app-versions', data);
  }

  /**
   * 更新应用版本
   */
  static async updateAppVersion(
    id: string,
    data: Partial<CreateAppVersionDto>
  ): Promise<AppVersion> {
    return ApiClient.patch(`/app-versions/${id}`, data);
  }

  /**
   * 删除应用版本
   */
  static async deleteAppVersion(id: string): Promise<void> {
    return ApiClient.delete(`/app-versions/${id}`);
  }
}

