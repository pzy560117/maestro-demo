import { Test, TestingModule } from '@nestjs/testing';
import { LocatorGeneratorService } from './locator-generator.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { LocatorStrategy, LocatorSource } from '@prisma/client';

describe('LocatorGeneratorService', () => {
  let service: LocatorGeneratorService;

  const mockPrisma = {
    locatorCandidate: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocatorGeneratorService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<LocatorGeneratorService>(LocatorGeneratorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('应该被定义', () => {
    expect(service).toBeDefined();
  });

  describe('generateCandidates', () => {
    it('应该为有 resourceId 的元素生成定位候选', async () => {
      const elementData = {
        elementType: 'Button',
        resourceId: 'com.example:id/submit_button',
        textValue: '提交',
        contentDesc: '提交按钮',
        bounds: { x: 100, y: 200, width: 300, height: 60 },
      };

      const candidates = await service.generateCandidates('element-123', elementData);

      expect(candidates.length).toBeGreaterThan(0);
      expect(candidates[0].strategy).toBe(LocatorStrategy.ID);
      expect(candidates[0].locatorValue).toBe('com.example:id/submit_button');
      expect(candidates[0].score).toBeGreaterThanOrEqual(0.9);
      expect(candidates[0].isPrimary).toBe(true);
    });

    it('应该为无 resourceId 的元素生成文本定位候选', async () => {
      const elementData = {
        elementType: 'TextView',
        textValue: '登录',
        bounds: { x: 50, y: 100, width: 200, height: 40 },
      };

      const candidates = await service.generateCandidates('element-123', elementData);

      expect(candidates.length).toBeGreaterThan(0);
      const textCandidate = candidates.find((c) => c.strategy === LocatorStrategy.TEXT);
      expect(textCandidate).toBeDefined();
      expect(textCandidate?.locatorValue).toBe('登录');
    });

    it('应该标记动态属性（时间戳）', async () => {
      const elementData = {
        elementType: 'TextView',
        textValue: '2024-01-01 12:00:00',
        bounds: { x: 50, y: 100, width: 200, height: 40 },
      };

      const candidates = await service.generateCandidates('element-123', elementData);

      const textCandidate = candidates.find((c) => c.strategy === LocatorStrategy.TEXT);
      expect(textCandidate?.dynamicFlags).toBeDefined();
      expect(textCandidate?.dynamicFlags?.hasTimestamp).toBe(true);
      expect(textCandidate?.dynamicFlags?.isDynamic).toBe(true);
      expect(textCandidate?.score).toBeLessThan(0.8); // 动态内容置信度较低
    });

    it('应该标记动态属性（UUID）', async () => {
      const elementData = {
        elementType: 'TextView',
        textValue: 'user-123e4567-e89b-12d3-a456-426614174000',
        bounds: { x: 50, y: 100, width: 200, height: 40 },
      };

      const candidates = await service.generateCandidates('element-123', elementData);

      const textCandidate = candidates.find((c) => c.strategy === LocatorStrategy.TEXT);
      expect(textCandidate?.dynamicFlags?.hasUUID).toBe(true);
      expect(textCandidate?.dynamicFlags?.isDynamic).toBe(true);
    });

    it('应该基于视觉数据生成定位候选', async () => {
      const elementData = {
        elementType: 'Button',
        textValue: '提交',
        bounds: { x: 100, y: 200, width: 300, height: 60 },
      };

      const visionData = {
        text: '提交',
        bbox: { x: 100, y: 200, width: 300, height: 60 },
        confidence: 0.95,
      };

      const candidates = await service.generateCandidates('element-123', elementData, visionData);

      const visionCandidate = candidates.find((c) => c.source === LocatorSource.VISION);
      expect(visionCandidate).toBeDefined();
      expect(visionCandidate?.score).toBeGreaterThanOrEqual(0.9);
    });

    it('应该限制候选数量不超过 5 个', async () => {
      const elementData = {
        elementType: 'Button',
        resourceId: 'com.example:id/submit',
        textValue: '提交',
        contentDesc: '提交按钮',
        xpath: '//android.widget.Button[@text="提交"]',
        bounds: { x: 100, y: 200, width: 300, height: 60 },
      };

      const candidates = await service.generateCandidates('element-123', elementData);

      expect(candidates.length).toBeLessThanOrEqual(5);
    });
  });
});

