import { Test, TestingModule } from '@nestjs/testing';
import { StateMachineService } from './state-machine.service';
import { ScreenCaptureService } from './screen-capture.service';
import { ActionExecutorService } from './action-executor.service';
import { AppiumService } from '../../integrations/appium/appium.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { OrchestratorState, TaskRunContext } from '../types/orchestrator.types';

describe('StateMachineService', () => {
  let service: StateMachineService;
  let appiumMock: { createSession: jest.Mock };
  let prismaMock: { device: { findUnique: jest.Mock } };

  beforeEach(async () => {
    appiumMock = {
      createSession: jest.fn(),
    };

    prismaMock = {
      device: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StateMachineService,
        {
          provide: ScreenCaptureService,
          useValue: {},
        },
        {
          provide: ActionExecutorService,
          useValue: {},
        },
        {
          provide: AppiumService,
          useValue: appiumMock,
        },
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get(StateMachineService);
    jest.clearAllMocks();
  });

  describe('createAppiumSessionWithRetry', () => {
    it('should succeed on first attempt', async () => {
      prismaMock.device.findUnique.mockResolvedValue({
        id: 'device-1',
        serial: '66J5T18919000260',
      });

      appiumMock.createSession.mockResolvedValue('session-123');

      const context: TaskRunContext = {
        taskRunId: 'test-run-1',
        taskId: 'test-task-1',
        deviceId: 'device-1',
        appVersionId: 'test-app-version-1',
        packageName: 'com.test.app',
        versionName: '1.0.0',
        coverageConfig: {},
        visitedGraph: {
          visitedSignatures: new Set(),
          edges: new Map(),
          visitCounts: new Map(),
        },
        actionQueues: {
          PRIMARY: [],
          FALLBACK: [],
          REVISIT: [],
        },
        currentState: OrchestratorState.BOOTSTRAPPING,
        stats: {
          totalActions: 0,
          successfulActions: 0,
          failedActions: 0,
          coverageScreens: 0,
          startTime: new Date(),
        },
      };

      const result = await (service as any).createAppiumSessionWithRetry(
        '66J5T18919000260',
        'com.test.app',
        3,
      );

      expect(result).toBe('session-123');
      expect(appiumMock.createSession).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and succeed on second attempt', async () => {
      appiumMock.createSession
        .mockRejectedValueOnce(new Error('Connection refused'))
        .mockResolvedValueOnce('session-456');

      const result = await (service as any).createAppiumSessionWithRetry(
        '66J5T18919000260',
        'com.test.app',
        3,
      );

      expect(result).toBe('session-456');
      expect(appiumMock.createSession).toHaveBeenCalledTimes(2);
    });

    it('should fail after max retries', async () => {
      appiumMock.createSession.mockRejectedValue(
        new Error('Connection refused'),
      );

      await expect(
        (service as any).createAppiumSessionWithRetry(
          '66J5T18919000260',
          'com.test.app',
          3,
        ),
      ).rejects.toThrow('Failed to create Appium session after 3 attempts');

      expect(appiumMock.createSession).toHaveBeenCalledTimes(3);
    });
  });
});
