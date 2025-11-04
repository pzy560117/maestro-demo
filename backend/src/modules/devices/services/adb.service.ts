import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * ADB服务
 * 封装ADB命令，用于设备验证和操作
 */
@Injectable()
export class AdbService {
  private readonly logger = new Logger(AdbService.name);

  /**
   * 检查设备是否在线
   * @param serial 设备序列号
   * @returns 是否在线
   */
  async isDeviceOnline(serial: string): Promise<boolean> {
    try {
      const { stdout } = await execAsync('adb devices');
      const lines = stdout.split('\n');
      
      // 查找包含序列号且状态为device的行
      const deviceLine = lines.find(
        (line) => line.trim().startsWith(serial) && line.includes('device'),
      );
      
      const isOnline = !!deviceLine;
      this.logger.debug(`Device ${serial} online status: ${isOnline}`);
      
      return isOnline;
    } catch (error) {
      this.logger.error(`Failed to check device ${serial}`, error);
      return false;
    }
  }

  /**
   * 获取设备属性
   * @param serial 设备序列号
   * @param property 属性名
   * @returns 属性值
   */
  async getDeviceProperty(serial: string, property: string): Promise<string | null> {
    try {
      const { stdout } = await execAsync(`adb -s ${serial} shell getprop ${property}`);
      return stdout.trim();
    } catch (error) {
      this.logger.error(`Failed to get property ${property} from device ${serial}`, error);
      return null;
    }
  }

  /**
   * 获取设备屏幕分辨率
   * @param serial 设备序列号
   * @returns 分辨率字符串 (如 "1080x1920")
   */
  async getDeviceResolution(serial: string): Promise<string | null> {
    try {
      const { stdout } = await execAsync(
        `adb -s ${serial} shell wm size`,
      );
      
      // 解析输出: "Physical size: 1080x1920"
      const match = stdout.match(/(\d+)x(\d+)/);
      return match ? match[0] : null;
    } catch (error) {
      this.logger.error(`Failed to get resolution from device ${serial}`, error);
      return null;
    }
  }

  /**
   * 批量获取设备列表
   * @returns 在线设备序列号列表
   */
  async getOnlineDevices(): Promise<string[]> {
    try {
      const { stdout } = await execAsync('adb devices');
      const lines = stdout.split('\n').slice(1); // 跳过标题行
      
      return lines
        .filter((line) => line.trim() && line.includes('device'))
        .map((line) => line.split('\t')[0].trim());
    } catch (error) {
      this.logger.error('Failed to get online devices', error);
      return [];
    }
  }
}

