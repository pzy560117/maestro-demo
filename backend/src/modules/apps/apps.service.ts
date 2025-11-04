import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { BusinessException } from '../common/exceptions/business.exception';
import { CreateAppDto } from './dto/create-app.dto';
import { AppResponseDto } from './dto/app-response.dto';

/**
 * 应用管理服务
 */
@Injectable()
export class AppsService {
  private readonly logger = new Logger(AppsService.name);

  constructor(private readonly prisma: PrismaService) {}

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
   * 查询所有应用
   */
  async findAll(): Promise<AppResponseDto[]> {
    const apps = await this.prisma.app.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return apps.map((app) => new AppResponseDto(app));
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
}

