import { Test, TestingModule } from '@nestjs/testing';
import { ScreenDiffService } from './screen-diff.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AlertsService } from '../../alerts/alerts.service';
import { NotFoundException } from '@nestjs/common';

describe('ScreenDiffService', () => {
  let service: ScreenDiffService;
  let prisma: PrismaService;
  let alertsService: AlertsService;

  const mockPrismaService = {
    screen: {
      findUnique: jest.fn(),
    },
    screenDiff: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockAlertsService = {
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScreenDiffService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: AlertsService,
          useValue: mockAlertsService,
        },
      ],
    }).compile();

    service = module.get<ScreenDiffService>(ScreenDiffService);
    prisma = module.get<PrismaService>(PrismaService);
    alertsService = module.get<AlertsService>(AlertsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('compareScreens', () => {
    it('should compare screens and generate diff', async () => {
      const baseScreenId = 'screen-base';
      const targetScreenId = 'screen-target';

      const baseScreen = {
        id: baseScreenId,
        elements: [
          {
            id: 'elem-1',
            elementHash: 'hash-1',
            elementType: 'Button',
            resourceId: 'btn_submit',
            textValue: '提交',
            bounds: { x: 100, y: 200, width: 200, height: 50 },
            visibility: 'VISIBLE',
            interactable: true,
          },
        ],
      };

      const targetScreen = {
        id: targetScreenId,
        elements: [
          {
            id: 'elem-2',
            elementHash: 'hash-2',
            elementType: 'Button',
            resourceId: 'btn_cancel',
            textValue: '取消',
            bounds: { x: 320, y: 200, width: 200, height: 50 },
            visibility: 'VISIBLE',
            interactable: true,
          },
        ],
      };

      const mockDiff = {
        id: 'diff-123',
        baseScreenId,
        targetScreenId,
        diffSummary: {
          added: 1,
          removed: 1,
          modified: 0,
          changeRate: 100,
        },
        diffDetailPath: 'diffs/2024-01/diff_abc.json',
        generatedAt: new Date(),
      };

      mockPrismaService.screen.findUnique
        .mockResolvedValueOnce(baseScreen)
        .mockResolvedValueOnce(targetScreen);
      mockPrismaService.screenDiff.upsert.mockResolvedValue(mockDiff);
      mockAlertsService.create.mockResolvedValue({});

      const result = await service.compareScreens(baseScreenId, targetScreenId);

      expect(result).toEqual(mockDiff);
      expect(prisma.screen.findUnique).toHaveBeenCalledTimes(2);
      expect(prisma.screenDiff.upsert).toHaveBeenCalled();
    });

    it('should throw NotFoundException if base screen not found', async () => {
      mockPrismaService.screen.findUnique.mockResolvedValue(null);

      await expect(
        service.compareScreens('non-existent', 'screen-2'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should trigger alert when change rate exceeds threshold', async () => {
      const baseScreen = {
        id: 'screen-1',
        elements: Array.from({ length: 10 }, (_, i) => ({
          id: `elem-${i}`,
          elementHash: `hash-${i}`,
          elementType: 'Button',
          visibility: 'VISIBLE',
          interactable: true,
        })),
      };

      const targetScreen = {
        id: 'screen-2',
        elements: Array.from({ length: 4 }, (_, i) => ({
          id: `elem-new-${i}`,
          elementHash: `hash-new-${i}`,
          elementType: 'Button',
          visibility: 'VISIBLE',
          interactable: true,
        })),
      };

      mockPrismaService.screen.findUnique
        .mockResolvedValueOnce(baseScreen)
        .mockResolvedValueOnce(targetScreen);
      mockPrismaService.screenDiff.upsert.mockResolvedValue({
        id: 'diff-123',
        baseScreenId: 'screen-1',
        targetScreenId: 'screen-2',
        diffSummary: { changeRate: 60 },
      });
      mockAlertsService.create.mockResolvedValue({});

      await service.compareScreens('screen-1', 'screen-2');

      expect(alertsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          alertType: 'SCREEN_DIFF',
          severity: expect.any(String),
        }),
      );
    });
  });

  describe('findDiff', () => {
    it('should find screen diff', async () => {
      const baseScreenId = 'screen-1';
      const targetScreenId = 'screen-2';

      const mockDiff = {
        id: 'diff-123',
        baseScreenId,
        targetScreenId,
        diffSummary: {},
        baseScreen: { id: baseScreenId },
        targetScreen: { id: targetScreenId },
      };

      mockPrismaService.screenDiff.findUnique.mockResolvedValue(mockDiff);

      const result = await service.findDiff(baseScreenId, targetScreenId);

      expect(result).toEqual(mockDiff);
    });
  });
});

