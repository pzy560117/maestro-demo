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

  /**
   * 判断是否为模拟器
   * @param serial 设备序列号
   * @returns 是否为模拟器
   */
  isEmulator(serial: string): boolean {
    return serial.startsWith('emulator-');
  }

  /**
   * 获取设备上已安装的应用列表
   * @param serial 设备序列号
   * @param includeSystem 是否包含系统应用，默认false
   * @returns 应用包名列表
   */
  async getInstalledPackages(serial: string, includeSystem = false): Promise<Array<{
    packageName: string;
    appName: string;
    versionName: string;
    versionCode: number;
    isSystemApp: boolean;
  }>> {
    try {
      // 获取所有包名
      const packagesCmd = includeSystem 
        ? `adb -s ${serial} shell pm list packages`
        : `adb -s ${serial} shell pm list packages -3`; // -3 只列出第三方应用
      
      const { stdout } = await execAsync(packagesCmd);
      const packageNames = stdout
        .split('\n')
        .filter(line => line.trim().startsWith('package:'))
        .map(line => line.replace('package:', '').trim())
        .filter(pkg => pkg.length > 0);

      this.logger.log(`Found ${packageNames.length} packages on device ${serial}`);

      // 并发获取每个包的详细信息
      const appInfoPromises = packageNames.slice(0, 50).map(async (packageName) => { // 限制50个应用，避免太慢
        try {
          // 获取应用信息
          const { stdout: dumpInfo } = await execAsync(
            `adb -s ${serial} shell dumpsys package ${packageName} | grep -E "versionName|versionCode"`
          );

          // 解析版本信息
          const versionNameMatch = dumpInfo.match(/versionName=([^\s]+)/);
          const versionCodeMatch = dumpInfo.match(/versionCode=(\d+)/);

          // 获取应用名称（通过aapt或pm）
          let appName = packageName.split('.').pop() || packageName;
          try {
            const { stdout: labelInfo } = await execAsync(
              `adb -s ${serial} shell pm list packages -f ${packageName}`
            );
            const apkPathMatch = labelInfo.match(/package:(.+\.apk)=/);
            if (apkPathMatch) {
              const { stdout: aaptInfo } = await execAsync(
                `adb -s ${serial} shell aapt dump badging ${apkPathMatch[1]} | grep "application-label:"`
              );
              const appLabelMatch = aaptInfo.match(/application-label:'([^']+)'/);
              if (appLabelMatch) {
                appName = appLabelMatch[1];
              }
            }
          } catch (error) {
            // 获取应用名称失败，使用包名最后一段
            this.logger.debug(`Failed to get app name for ${packageName}, using package name`);
          }

          return {
            packageName,
            appName,
            versionName: versionNameMatch ? versionNameMatch[1] : 'Unknown',
            versionCode: versionCodeMatch ? parseInt(versionCodeMatch[1], 10) : 0,
            isSystemApp: false, // 因为我们用了 -3 参数
          };
        } catch (error) {
          this.logger.debug(`Failed to get info for package ${packageName}`, error);
          return {
            packageName,
            appName: packageName.split('.').pop() || packageName,
            versionName: 'Unknown',
            versionCode: 0,
            isSystemApp: false,
          };
        }
      });

      const apps = await Promise.all(appInfoPromises);
      this.logger.log(`Retrieved info for ${apps.length} apps from device ${serial}`);
      
      return apps;
    } catch (error) {
      this.logger.error(`Failed to get installed packages from device ${serial}`, error);
      return [];
    }
  }

  /**
   * 获取连接的设备详细信息
   * @returns 设备信息列表
   */
  async getConnectedDevicesInfo(): Promise<Array<{
    serial: string;
    model: string;
    androidVersion: string;
    resolution: string | null;
    deviceType: 'REAL' | 'EMULATOR';
    status: string;
    manufacturer: string | null;
  }>> {
    try {
      // 1. 获取所有在线设备
      const serials = await this.getOnlineDevices();
      
      if (serials.length === 0) {
        this.logger.warn('No devices connected');
        return [];
      }

      // 2. 并发获取每个设备的详细信息
      const deviceInfoPromises = serials.map(async (serial) => {
        try {
          // 并发获取设备信息
          const [model, androidVersion, resolution, manufacturer] = await Promise.all([
            this.getDeviceProperty(serial, 'ro.product.model'),
            this.getDeviceProperty(serial, 'ro.build.version.release'),
            this.getDeviceResolution(serial),
            this.getDeviceProperty(serial, 'ro.product.manufacturer'),
          ]);

          return {
            serial,
            model: model || 'Unknown',
            androidVersion: androidVersion || 'Unknown',
            resolution,
            deviceType: this.isEmulator(serial) ? 'EMULATOR' as const : 'REAL' as const,
            status: 'ONLINE',
            manufacturer,
          };
        } catch (error) {
          this.logger.error(`Failed to get info for device ${serial}`, error);
          return {
            serial,
            model: 'Unknown',
            androidVersion: 'Unknown',
            resolution: null,
            deviceType: this.isEmulator(serial) ? 'EMULATOR' as const : 'REAL' as const,
            status: 'ERROR',
            manufacturer: null,
          };
        }
      });

      const devices = await Promise.all(deviceInfoPromises);
      this.logger.log(`Scanned ${devices.length} devices`);
      
      return devices;
    } catch (error) {
      // ADB 不可用或命令执行失败时，返回空数组而不是抛出异常
      this.logger.error('Failed to scan devices (ADB may not be available)', error);
      return [];
    }
  }
}

