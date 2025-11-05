import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { BusinessException } from '../common/exceptions/business.exception';
import { CreateAppDto } from './dto/create-app.dto';
import { AppResponseDto } from './dto/app-response.dto';
import { AdbService } from '../devices/services/adb.service';

/**
 * 应用管理服务
 */
@Injectable()
export class AppsService {
  private readonly logger = new Logger(AppsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly adbService: AdbService,
  ) {}

  /**
   * 创建应用
   * 验收标准：包名唯一性校验，重复提示"应用已存在"
   */
  async create(createAppDto: CreateAppDto): Promise<AppResponseDto> {
    const { name, packageName } = createAppDto;

    // 检查包名是否已存在
    const existingApp = await this.prisma.app.findUnique({
      where: { packageName },
    });

    if (existingApp) {
      throw BusinessException.alreadyExists('应用包名', packageName);
    }

    // 检查应用名称是否已存在
    const existingName = await this.prisma.app.findUnique({
      where: { name },
    });

    if (existingName) {
      throw BusinessException.alreadyExists('应用名称', name);
    }

    const app = await this.prisma.app.create({
      data: createAppDto,
    });

    this.logger.log(`App created: ${name} (${packageName})`);

    return new AppResponseDto(app);
  }

  /**
   * 查询所有应用（支持分页）
   */
  async findAll(params?: { page?: number; limit?: number }): Promise<{
    items: AppResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = params?.page || 1;
    const limit = params?.limit || 20;
    const skip = (page - 1) * limit;

    const [apps, total] = await Promise.all([
      this.prisma.app.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.app.count(),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      items: apps.map((app) => new AppResponseDto(app)),
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * 根据ID查询应用
   */
  async findOne(id: string): Promise<AppResponseDto> {
    const app = await this.prisma.app.findUnique({
      where: { id },
    });

    if (!app) {
      throw BusinessException.notFound('应用', id);
    }

    return new AppResponseDto(app);
  }

  /**
   * 根据包名查询应用
   */
  async findByPackageName(packageName: string): Promise<AppResponseDto> {
    const app = await this.prisma.app.findUnique({
      where: { packageName },
    });

    if (!app) {
      throw BusinessException.notFound('应用', packageName);
    }

    return new AppResponseDto(app);
  }

  /**
   * 更新应用信息
   */
  async update(id: string, updateAppDto: Partial<CreateAppDto>): Promise<AppResponseDto> {
    const existingApp = await this.prisma.app.findUnique({
      where: { id },
    });

    if (!existingApp) {
      throw BusinessException.notFound('应用', id);
    }

    // 如果更新包名，检查新包名是否重复
    if (updateAppDto.packageName && updateAppDto.packageName !== existingApp.packageName) {
      const duplicateApp = await this.prisma.app.findUnique({
        where: { packageName: updateAppDto.packageName },
      });

      if (duplicateApp) {
        throw BusinessException.alreadyExists('应用包名', updateAppDto.packageName);
      }
    }

    // 如果更新名称，检查新名称是否重复
    if (updateAppDto.name && updateAppDto.name !== existingApp.name) {
      const duplicateName = await this.prisma.app.findUnique({
        where: { name: updateAppDto.name },
      });

      if (duplicateName) {
        throw BusinessException.alreadyExists('应用名称', updateAppDto.name);
      }
    }

    const app = await this.prisma.app.update({
      where: { id },
      data: updateAppDto,
    });

    this.logger.log(`App updated: ${app.name}`);

    return new AppResponseDto(app);
  }

  /**
   * 删除应用
   */
  async remove(id: string): Promise<void> {
    const app = await this.prisma.app.findUnique({
      where: { id },
    });

    if (!app) {
      throw BusinessException.notFound('应用', id);
    }

    await this.prisma.app.delete({
      where: { id },
    });

    this.logger.log(`App deleted: ${app.name}`);
  }

  /**
   * 扫描设备上的已安装应用
   * @param deviceId 设备ID（可选，如果不提供则使用第一个在线设备）
   * @returns 扫描到的应用列表，标记是否已存在于数据库中
   */
  async scanApps(deviceId?: string): Promise<Array<{
    packageName: string;
    appName: string;
    versionName: string;
    versionCode: number;
    isExisting: boolean;
  }>> {
    // 1. 获取设备序列号
    let serial: string;

    if (deviceId) {
      const device = await this.prisma.device.findUnique({
        where: { id: deviceId },
      });
      if (!device) {
        throw BusinessException.notFound('设备', deviceId);
      }
      serial = device.serial;
    } else {
      // 使用第一个在线设备
      const onlineDevices = await this.adbService.getOnlineDevices();
      if (onlineDevices.length === 0) {
        throw BusinessException.badRequest('没有在线设备');
      }
      serial = onlineDevices[0];
    }

    this.logger.log(`Scanning apps on device: ${serial}`);

    // 2. 获取设备上的应用列表（排除系统应用）
    const installedApps = await this.adbService.getInstalledPackages(serial, false);

    // 3. 检查哪些应用已经在数据库中
    const existingApps = await this.prisma.app.findMany({
      where: {
        packageName: {
          in: installedApps.map(app => app.packageName),
        },
      },
      select: {
        packageName: true,
      },
    });

    const existingPackageNames = new Set(existingApps.map(app => app.packageName));

    // 4. 返回扫描结果，标记是否已存在
    const scanResults = installedApps.map(app => ({
      packageName: app.packageName,
      appName: app.appName,
      versionName: app.versionName,
      versionCode: app.versionCode,
      isExisting: existingPackageNames.has(app.packageName),
    }));

    this.logger.log(`Found ${scanResults.length} apps, ${existingPackageNames.size} already in database`);

    return scanResults;
  }

  /**
   * 批量创建应用
   * @param apps 应用列表
   * @returns 批量创建结果
   */
  async batchCreate(apps: CreateAppDto[]): Promise<{
    success: Array<{ id: string; packageName: string; message: string }>;
    failed: Array<{ packageName: string; error: string; code: string }>;
    total: number;
    successCount: number;
    failedCount: number;
  }> {
    const success: Array<{ id: string; packageName: string; message: string }> = [];
    const failed: Array<{ packageName: string; error: string; code: string }> = [];

    for (const appDto of apps) {
      try {
        // 检查是否已存在
        const existingApp = await this.prisma.app.findUnique({
          where: { packageName: appDto.packageName },
        });

        if (existingApp) {
          failed.push({
            packageName: appDto.packageName,
            error: '应用已存在',
            code: 'DUPLICATE',
          });
          continue;
        }

        // 创建应用
        const app = await this.create(appDto);
        success.push({
          id: app.id,
          packageName: app.packageName,
          message: '添加成功',
        });
      } catch (error) {
        this.logger.error(`Failed to create app ${appDto.packageName}`, error);
        const errorMessage = error instanceof Error ? error.message : '创建失败';
        failed.push({
          packageName: appDto.packageName,
          error: errorMessage,
          code: 'CREATE_FAILED',
        });
      }
    }

    this.logger.log(`Batch create completed: ${success.length} success, ${failed.length} failed`);

    return {
      success,
      failed,
      total: apps.length,
      successCount: success.length,
      failedCount: failed.length,
    };
  }
}

