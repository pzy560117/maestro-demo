/**
 * 设备状态枚举
 */
export enum DeviceStatus {
  AVAILABLE = 'AVAILABLE',
  BUSY = 'BUSY',
  OFFLINE = 'OFFLINE',
  MAINTENANCE = 'MAINTENANCE',
}

/**
 * 设备类型枚举
 */
export enum DeviceType {
  REAL = 'REAL',
  EMULATOR = 'EMULATOR',
}

/**
 * 设备信息
 */
export interface Device {
  id: string;
  serialNumber: string;
  model: string;
  androidVersion: string;
  type: DeviceType;
  status: DeviceStatus;
  tags: string[];
  mdmStatus?: string;
  lastHeartbeat?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 创建设备 DTO
 */
export interface CreateDeviceDto {
  serialNumber: string;
  model: string;
  androidVersion: string;
  type: DeviceType;
  tags?: string[];
  mdmStatus?: string;
}

/**
 * 更新设备 DTO
 */
export interface UpdateDeviceDto {
  model?: string;
  androidVersion?: string;
  status?: DeviceStatus;
  tags?: string[];
  mdmStatus?: string;
}

