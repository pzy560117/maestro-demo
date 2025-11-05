import { ApiClient } from './client';
import type { Device, CreateDeviceDto, UpdateDeviceDto } from '@/types/device';
import type { PaginatedResponse, PaginationParams } from '@/types/api';

/**
 * 设备 API 服务
 */
export class DevicesApi {
  /**
   * 获取设备列表
   */
  static async getDevices(params?: PaginationParams): Promise<PaginatedResponse<Device>> {
    return ApiClient.get('/devices', { params });
  }

  /**
   * 获取设备详情
   */
  static async getDevice(id: string): Promise<Device> {
    return ApiClient.get(`/devices/${id}`);
  }

  /**
   * 创建设备
   */
  static async createDevice(data: CreateDeviceDto): Promise<Device> {
    return ApiClient.post('/devices', data);
  }

  /**
   * 更新设备
   */
  static async updateDevice(id: string, data: UpdateDeviceDto): Promise<Device> {
    return ApiClient.patch(`/devices/${id}`, data);
  }

  /**
   * 删除设备
   */
  static async deleteDevice(id: string): Promise<void> {
    return ApiClient.delete(`/devices/${id}`);
  }

  /**
   * 更新设备心跳
   */
  static async heartbeat(id: string): Promise<void> {
    return ApiClient.post(`/devices/${id}/heartbeat`);
  }

  /**
   * 获取可用设备列表
   */
  static async getAvailableDevices(): Promise<Device[]> {
    return ApiClient.get('/devices/available/list');
  }

  /**
   * 扫描连接的设备
   */
  static async scanDevices(): Promise<{
    devices: Array<{
      serialNumber: string;
      model: string;
      androidVersion: string;
      resolution: string | null;
      type: string;
      status: string;
      manufacturer: string | null;
      isExisting: boolean;
    }>;
    total: number;
    scannedAt: string;
  }> {
    return ApiClient.get('/devices/scan');
  }

  /**
   * 批量添加设备
   */
  static async batchCreateDevices(devices: CreateDeviceDto[]): Promise<{
    success: Array<{ id: string; serialNumber: string; message: string }>;
    failed: Array<{ serialNumber: string; error: string; code: string }>;
    total: number;
    successCount: number;
    failedCount: number;
  }> {
    return ApiClient.post('/devices/batch', { devices });
  }
}

