import { ApiClient } from './client';
import type { Alert, AlertStats, CreateAlertDto, UpdateAlertDto } from '@/types/alert';
import type { PaginatedResponse, PaginationParams } from '@/types/api';

/**
 * 告警 API 服务
 */
export class AlertsApi {
  /**
   * 获取告警列表
   */
  static async getAlerts(params?: PaginationParams): Promise<PaginatedResponse<Alert>> {
    return ApiClient.get('/alerts', { params });
  }

  /**
   * 获取告警详情
   */
  static async getAlert(id: string): Promise<Alert> {
    return ApiClient.get(`/alerts/${id}`);
  }

  /**
   * 创建告警
   */
  static async createAlert(data: CreateAlertDto): Promise<Alert> {
    return ApiClient.post('/alerts', data);
  }

  /**
   * 更新告警
   */
  static async updateAlert(id: string, data: UpdateAlertDto): Promise<Alert> {
    return ApiClient.patch(`/alerts/${id}`, data);
  }

  /**
   * 确认告警
   */
  static async acknowledgeAlert(id: string, acknowledgedBy: string): Promise<Alert> {
    return ApiClient.post(`/alerts/${id}/acknowledge`, { acknowledgedBy });
  }

  /**
   * 解决告警
   */
  static async resolveAlert(id: string, resolvedBy: string): Promise<Alert> {
    return ApiClient.post(`/alerts/${id}/resolve`, { resolvedBy });
  }

  /**
   * 忽略告警
   */
  static async ignoreAlert(id: string): Promise<Alert> {
    return ApiClient.post(`/alerts/${id}/ignore`);
  }

  /**
   * 获取告警统计信息
   */
  static async getAlertStats(): Promise<AlertStats> {
    return ApiClient.get('/alerts/stats');
  }
}

