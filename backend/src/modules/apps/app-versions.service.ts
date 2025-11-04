import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { BusinessException } from '../common/exceptions/business.exception';
import { CreateAppVersionDto } from './dto/create-app-version.dto';
import { AppVersionResponseDto } from './dto/app-response.dto';

/**
 * 应用版本管理服务
 */
@Injectable()
export class AppVersionsService {
  private readonly logger = new Logger(AppVersionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建应用版本
   * 验收标准：
   * 1. 同一应用下版本名称唯一
   * 3. 创建成功后，任务创建页面可下拉选择该版本
   */
  async create(createVersionDto: CreateAppVersionDto): Promise<AppVersionResponseDto> {
    const { appId, versionName } = createVersionDto;

    // 检查应用是否存在
    const app = await this.prisma.app.findUnique({
      where: { id: appId },
    });

    if (!app) {
      throw BusinessException.notFound('应用', appId);
    }

    // 检查版本是否已存在
    const existingVersion = await this.prisma.appVersion.findFirst({
      where: {
        appId,
        versionName,
      },
    });

    if (existingVersion) {
      throw BusinessException.alreadyExists('应用版本', `${app.name} ${versionName}`);
    }

    const version = await this.prisma.appVersion.create({
      data: {
        ...createVersionDto,
        releasedAt: createVersionDto.releasedAt
          ? new Date(createVersionDto.releasedAt)
          : null,
      },
      include: {
        app: true,
      },
    });

    this.logger.log(`App version created: ${app.name} ${versionName}`);

    return new AppVersionResponseDto(version);
  }

  /**
   * 查询指定应用的所有版本
   */
  async findByAppId(appId: string): Promise<AppVersionResponseDto[]> {
    const versions = await this.prisma.appVersion.findMany({
      where: { appId },
      include: { app: true },
      orderBy: { createdAt: 'desc' },
    });

    return versions.map((version) => new AppVersionResponseDto(version));
  }

  /**
   * 查询所有应用版本
   */
  async findAll(): Promise<AppVersionResponseDto[]> {
    const versions = await this.prisma.appVersion.findMany({
      include: { app: true },
      orderBy: { createdAt: 'desc' },
    });

    return versions.map((version) => new AppVersionResponseDto(version));
  }

  /**
   * 根据ID查询版本
   */
  async findOne(id: string): Promise<AppVersionResponseDto> {
    const version = await this.prisma.appVersion.findUnique({
      where: { id },
      include: { app: true },
    });

    if (!version) {
      throw BusinessException.notFound('应用版本', id);
    }

    return new AppVersionResponseDto(version);
  }

  /**
   * 更新应用版本
   */
  async update(
    id: string,
    updateVersionDto: Partial<CreateAppVersionDto>,
  ): Promise<AppVersionResponseDto> {
    const existingVersion = await this.prisma.appVersion.findUnique({
      where: { id },
    });

    if (!existingVersion) {
      throw BusinessException.notFound('应用版本', id);
    }

    // 如果更新版本名称，检查新版本名称是否重复
    if (updateVersionDto.versionName && updateVersionDto.versionName !== existingVersion.versionName) {
      const duplicateVersion = await this.prisma.appVersion.findFirst({
        where: {
          appId: existingVersion.appId,
          versionName: updateVersionDto.versionName,
        },
      });

      if (duplicateVersion) {
        throw BusinessException.alreadyExists('应用版本', updateVersionDto.versionName);
      }
    }

    const version = await this.prisma.appVersion.update({
      where: { id },
      data: {
        ...updateVersionDto,
        releasedAt: updateVersionDto.releasedAt
          ? new Date(updateVersionDto.releasedAt)
          : undefined,
      },
      include: { app: true },
    });

    this.logger.log(`App version updated: ${version.versionName}`);

    return new AppVersionResponseDto(version);
  }

  /**
   * 删除应用版本
   */
  async remove(id: string): Promise<void> {
    const version = await this.prisma.appVersion.findUnique({
      where: { id },
    });

    if (!version) {
      throw BusinessException.notFound('应用版本', id);
    }

    await this.prisma.appVersion.delete({
      where: { id },
    });

    this.logger.log(`App version deleted: ${version.versionName}`);
  }
}

