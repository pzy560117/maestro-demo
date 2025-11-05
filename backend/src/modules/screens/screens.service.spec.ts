import { Test, TestingModule } from '@nestjs/testing';
import { ScreensService } from './screens.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { ScreenSignatureService } from './services/screen-signature.service';
import { ScreenStorageService } from './services/screen-storage.service';
import { ScreenOrientation } from '@prisma/client';

describe('ScreensService', () => {
  let service: ScreensService;
  let prisma: PrismaService;
  let signatureService: ScreenSignatureService;
  let storageService: ScreenStorageService;

  const mockPrisma = {
    screen: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      delete: jest.fn(),
    },
    element: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockSignatureService = {
    computeFileHash: jest.fn(),
    computeDomHash: jest.fn(),
    extractPrimaryText: jest.fn(),
    generateSignature: jest.fn(),
    computeElementHash: jest.fn(),
  };

  const mockStorageService = {
    init: jest.fn(),
    saveScreenshot: jest.fn(),
    saveDom: jest.fn(),
    deleteFile: jest.fn(),
    readDom: jest.fn(),
    readScreenshot: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScreensService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ScreenSignatureService, useValue: mockSignatureService },
        { provide: ScreenStorageService, useValue: mockStorageService },
      ],
    }).compile();

    service = module.get<ScreensService>(ScreensService);
    prisma = module.get<PrismaService>(PrismaService);
    signatureService = module.get<ScreenSignatureService>(ScreenSignatureService);
    storageService = module.get<ScreenStorageService>(ScreenStorageService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('应该被定义', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const appVersionId = 'app-version-123';
    const screenshotBuffer = Buffer.from('screenshot-data');
    const domData = { hierarchy: [], timestamp: '2024-01-01T00:00:00Z' };

    const createScreenDto = {
      appVersionId,
      screenshotPath: 'screenshots/2024-01/screen_abc.webp',
      domPath: 'dom/2024-01/dom_abc.json',
      orientation: ScreenOrientation.PORTRAIT,
      width: 1080,
      height: 1920,
    };

    beforeEach(() => {
      mockStorageService.saveScreenshot.mockResolvedValue('screenshots/2024-01/screen_abc.webp');
      mockStorageService.saveDom.mockResolvedValue('dom/2024-01/dom_abc.json');
      mockSignatureService.computeFileHash.mockReturnValue('screenshot-hash');
      mockSignatureService.computeDomHash.mockReturnValue('dom-hash');
      mockSignatureService.extractPrimaryText.mockReturnValue('登录页面');
      mockSignatureService.generateSignature.mockReturnValue('signature-123');
    });

    it('应该成功创建界面记录', async () => {
      mockPrisma.screen.findUnique.mockResolvedValue(null);
      mockPrisma.screen.create.mockResolvedValue({
        id: 'screen-123',
        appVersionId,
        signature: 'signature-123',
        domHash: 'dom-hash',
        primaryText: '登录页面',
        screenshotPath: 'screenshots/2024-01/screen_abc.webp',
        screenshotThumbPath: null,
        domPath: 'dom/2024-01/dom_abc.json',
        orientation: ScreenOrientation.PORTRAIT,
        width: 1080,
        height: 1920,
        capturedAt: new Date(),
        deviceModel: null,
        sourceTaskRunId: null,
        sourceActionId: null,
        metadata: {},
        createdAt: new Date(),
        elements: [],
      });

      const result = await service.create(createScreenDto as any, screenshotBuffer, domData);

      expect(result).toBeDefined();
      expect(result.signature).toBe('signature-123');
      expect(mockStorageService.saveScreenshot).toHaveBeenCalledWith(screenshotBuffer, appVersionId);
      expect(mockStorageService.saveDom).toHaveBeenCalledWith(domData, appVersionId);
      expect(mockPrisma.screen.create).toHaveBeenCalled();
    });

    it('应该返回已存在的界面（基于签名去重）', async () => {
      const existingScreen = {
        id: 'screen-existing',
        appVersionId,
        signature: 'signature-123',
        domHash: 'dom-hash',
        primaryText: '登录页面',
        screenshotPath: 'screenshots/2024-01/screen_abc.webp',
        screenshotThumbPath: null,
        domPath: 'dom/2024-01/dom_abc.json',
        orientation: ScreenOrientation.PORTRAIT,
        width: 1080,
        height: 1920,
        capturedAt: new Date(),
        deviceModel: null,
        sourceTaskRunId: null,
        sourceActionId: null,
        metadata: {},
        createdAt: new Date(),
        elements: [],
      };

      mockPrisma.screen.findUnique.mockResolvedValue(existingScreen);

      const result = await service.create(createScreenDto as any, screenshotBuffer, domData);

      expect(result.id).toBe('screen-existing');
      expect(mockPrisma.screen.create).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('应该成功查询界面', async () => {
      const mockScreen = {
        id: 'screen-123',
        appVersionId: 'app-version-123',
        signature: 'signature-123',
        domHash: 'dom-hash',
        primaryText: '登录页面',
        screenshotPath: 'screenshots/2024-01/screen_abc.webp',
        screenshotThumbPath: null,
        domPath: 'dom/2024-01/dom_abc.json',
        orientation: ScreenOrientation.PORTRAIT,
        width: 1080,
        height: 1920,
        capturedAt: new Date(),
        deviceModel: null,
        sourceTaskRunId: null,
        sourceActionId: null,
        metadata: {},
        createdAt: new Date(),
        elements: [],
      };

      mockPrisma.screen.findUnique.mockResolvedValue(mockScreen);

      const result = await service.findOne('screen-123');

      expect(result).toBeDefined();
      expect(result.id).toBe('screen-123');
    });

    it('应该抛出错误（界面不存在）', async () => {
      mockPrisma.screen.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow();
    });
  });
});

