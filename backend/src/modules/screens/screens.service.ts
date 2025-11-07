import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { BusinessException } from '../common/exceptions/business.exception';
import { ScreenSignatureService } from './services/screen-signature.service';
import { ScreenStorageService } from './services/screen-storage.service';
import { CreateScreenDto, ElementInfoDto } from './dto/create-screen.dto';
import { ScreenResponseDto, ElementResponseDto } from './dto/screen-response.dto';
import { ElementVisibility, Screen, Element } from '@prisma/client';

/**
 * 界面管理服务
 * 功能 G：界面签名与存档（FR-09）
 *
 * 职责：
 * 1. 创建界面记录并生成签名
 * 2. 存储截图、DOM 和元素
 * 3. 查询界面库
 * 4. 管理元素版本
 *
 * 验收标准：
 * 1. 同一界面多次访问生成相同签名
 * 2. 新界面存档后，可在界面库查看缩略图
 * 3. screens 表 signature 唯一
 */
@Injectable()
export class ScreensService {
  private readonly logger = new Logger(ScreensService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly signatureService: ScreenSignatureService,
    private readonly storageService: ScreenStorageService,
  ) {}

  /**
   * 初始化存储
   */
  async onModuleInit() {
    await this.storageService.init();
  }

  /**
   * 创建界面记录
   *
   * 流程：
   * 1. 保存截图、DOM 文件
   * 2. 计算哈希和签名
   * 3. 检查是否已存在（基于签名）
   * 4. 创建/更新界面记录
   * 5. 创建元素记录
   */
  async create(
    createScreenDto: CreateScreenDto,
    screenshotBuffer: Buffer,
    domData: any,
  ): Promise<ScreenResponseDto> {
    const { appVersionId, elements: elementInfos } = createScreenDto;

    // 1. 保存文件到存储
    const screenshotAsset = await this.storageService.saveScreenshot(
      screenshotBuffer,
      appVersionId,
    );
    const domAsset = await this.storageService.saveDom(domData, appVersionId);

    // 2. 计算哈希
    const screenshotHash = this.signatureService.computeFileHash(screenshotBuffer);
    const domHash = this.signatureService.computeDomHash(domData);

    // 3. 提取主要文案（如果未提供）
    const primaryText =
      createScreenDto.primaryText || this.signatureService.extractPrimaryText(domData);

    // 4. 生成签名
    const signature = this.signatureService.generateSignature(
      screenshotHash,
      domHash,
      primaryText || undefined,
    );

    this.logger.log(`Generated screen signature: ${signature}`);

    // 5. 检查界面是否已存在
    const existingScreen = await this.prisma.screen.findUnique({
      where: {
        appVersionId_signature: {
          appVersionId,
          signature,
        },
      },
      include: {
        elements: true,
      },
    });

    if (existingScreen) {
      this.logger.debug(`Screen already exists: ${existingScreen.id}`);
      return new ScreenResponseDto(existingScreen);
    }

    // 6. 创建界面记录
    const screen = await this.prisma.screen.create({
      data: {
        appVersionId,
        signature,
        domHash,
        primaryText,
        screenshotPath: screenshotAsset.relativePath,
        screenshotPublicUrl: screenshotAsset.publicUrl ?? null,
        screenshotThumbPath: createScreenDto.screenshotThumbPath || null,
        domPath: domAsset.relativePath,
        orientation: createScreenDto.orientation,
        width: createScreenDto.width,
        height: createScreenDto.height,
        capturedAt: new Date(),
        deviceModel: createScreenDto.deviceModel || null,
        sourceTaskRunId: createScreenDto.sourceTaskRunId || null,
        sourceActionId: createScreenDto.sourceActionId || null,
        metadata: (createScreenDto.metadata || {}) as any,
      },
      include: {
        elements: true,
      },
    });

    this.logger.log(`Screen created: ${screen.id}, signature: ${signature}`);

    // 7. 创建元素记录
    if (elementInfos && elementInfos.length > 0) {
      await this.createElements(screen.id, elementInfos);

      // 重新查询以包含元素
      const screenWithElements = await this.prisma.screen.findUnique({
        where: { id: screen.id },
        include: { elements: true },
      });

      return new ScreenResponseDto(screenWithElements!);
    }

    return new ScreenResponseDto(screen);
  }

  /**
   * 批量创建元素
   */
  private async createElements(
    screenId: string,
    elementInfos: ElementInfoDto[],
  ): Promise<Element[]> {
    const elements: Element[] = [];

    for (const info of elementInfos) {
      // 计算元素哈希
      const elementHash = this.signatureService.computeElementHash({
        elementType: info.elementType,
        resourceId: info.resourceId,
        contentDesc: info.contentDesc,
        textValue: info.textValue,
        bounds: info.bounds,
      });

      // 检查元素是否已存在
      const existing = await this.prisma.element.findFirst({
        where: {
          screenId,
          elementHash,
        },
      });

      if (existing) {
        elements.push(existing);
        continue;
      }

      // 创建新元素
      const element = await this.prisma.element.create({
        data: {
          screenId,
          elementHash,
          elementType: info.elementType,
          resourceId: info.resourceId || null,
          contentDesc: info.contentDesc || null,
          textValue: info.textValue || null,
          accessibilityLabel: info.accessibilityLabel || null,
          xpath: info.xpath || null,
          bounds: info.bounds as any,
          visibility: info.visibility as ElementVisibility,
          interactable: info.interactable,
          version: 1,
        },
      });

      elements.push(element);
      this.logger.debug(`Element created: ${element.id}, hash: ${elementHash}`);
    }

    return elements;
  }

  /**
   * 根据签名查询界面
   */
  async findBySignature(
    appVersionId: string,
    signature: string,
  ): Promise<ScreenResponseDto | null> {
    const screen = await this.prisma.screen.findUnique({
      where: {
        appVersionId_signature: {
          appVersionId,
          signature,
        },
      },
      include: {
        elements: true,
      },
    });

    return screen ? new ScreenResponseDto(screen) : null;
  }

  /**
   * 根据 ID 查询界面
   */
  async findOne(id: string): Promise<ScreenResponseDto> {
    const screen = await this.prisma.screen.findUnique({
      where: { id },
      include: {
        elements: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!screen) {
      throw BusinessException.notFound('界面', id);
    }

    return new ScreenResponseDto(screen);
  }

  /**
   * 查询应用版本的所有界面
   */
  async findByAppVersion(
    appVersionId: string,
    options?: {
      skip?: number;
      take?: number;
    },
  ): Promise<{ screens: ScreenResponseDto[]; total: number }> {
    const [screens, total] = await Promise.all([
      this.prisma.screen.findMany({
        where: { appVersionId },
        include: {
          elements: {
            take: 10, // 限制元素数量，避免数据过大
          },
        },
        orderBy: { capturedAt: 'desc' },
        skip: options?.skip || 0,
        take: options?.take || 20,
      }),
      this.prisma.screen.count({
        where: { appVersionId },
      }),
    ]);

    return {
      screens: screens.map((s) => new ScreenResponseDto(s)),
      total,
    };
  }

  /**
   * 查询界面的所有元素
   */
  async findElements(screenId: string): Promise<ElementResponseDto[]> {
    const elements = await this.prisma.element.findMany({
      where: { screenId },
      orderBy: { createdAt: 'asc' },
    });

    return elements.map((el) => new ElementResponseDto(el));
  }

  /**
   * 删除界面（同时删除关联的元素和文件）
   */
  async remove(id: string): Promise<void> {
    const screen = await this.prisma.screen.findUnique({
      where: { id },
    });

    if (!screen) {
      throw BusinessException.notFound('界面', id);
    }

    // 删除数据库记录（级联删除元素）
    await this.prisma.screen.delete({
      where: { id },
    });

    // 删除文件
    await this.storageService.deleteFile(screen.screenshotPath);
    if (screen.screenshotThumbPath) {
      await this.storageService.deleteFile(screen.screenshotThumbPath);
    }
    await this.storageService.deleteFile(screen.domPath);

    this.logger.log(`Screen deleted: ${id}`);
  }

  /**
   * 获取界面的 DOM 数据
   */
  async getDom(screenId: string): Promise<any> {
    const screen = await this.prisma.screen.findUnique({
      where: { id: screenId },
      select: { domPath: true },
    });

    if (!screen) {
      throw BusinessException.notFound('界面', screenId);
    }

    return await this.storageService.readDom(screen.domPath);
  }

  /**
   * 获取界面截图
   */
  async getScreenshot(screenId: string): Promise<Buffer> {
    const screen = await this.prisma.screen.findUnique({
      where: { id: screenId },
      select: { screenshotPath: true },
    });

    if (!screen) {
      throw BusinessException.notFound('界面', screenId);
    }

    return await this.storageService.readScreenshot(screen.screenshotPath);
  }
}
