import { Test, TestingModule } from '@nestjs/testing';
import { OrchestratorService } from './orchestrator.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { StateMachineService } from './services/state-machine.service';
import { TaskRunService } from './services/task-run.service';
import { OrchestratorState, TaskRunContext } from './types/orchestrator.types';

describe('OrchestratorService', () => {
  let service: OrchestratorService;
  let stateMachineMock: { transition: jest.Mock };

  beforeEach(async () => {
    stateMachineMock = {
      transition: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrchestratorService,
        {
          provide: PrismaService,
          useValue: {},
        },
        {
          provide: StateMachineService,
          useValue: stateMachineMock,
        },
        {
          provide: TaskRunService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get(OrchestratorService);
    jest.clearAllMocks();
  });

  describe('executeStateTransitionWithTimeout', () => {
    it('should timeout after specified duration', async () => {
      // Mock transition that takes too long
      stateMachineMock.transition.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  newState: OrchestratorState.INSPECTING,
                  success: true,
                }),
              5000, // 5 seconds
            ),
          ),
      );

      const context: TaskRunContext = {
        taskRunId: 'test-run-1',
        taskId: 'test-task-1',
        deviceId: 'test-device-1',
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
        currentState: OrchestratorState.IDLE,
        stats: {
          totalActions: 0,
          successfulActions: 0,
          failedActions: 0,
          coverageScreens: 0,
          startTime: new Date(),
        },
      };

      const result = await (service as any).executeStateTransitionWithTimeout(
        OrchestratorState.IDLE,
        context,
        100, // 100ms timeout
      );

      expect(result.success).toBe(false);
      expect(result.newState).toBe(OrchestratorState.RECOVERING);
      expect(result.error).toContain('timeout');
    });

    it('should complete successfully if transition finishes in time', async () => {
      stateMachineMock.transition.mockResolvedValue({
        newState: OrchestratorState.INSPECTING,
        success: true,
      });

      const context: TaskRunContext = {
        taskRunId: 'test-run-1',
        taskId: 'test-task-1',
        deviceId: 'test-device-1',
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
        currentState: OrchestratorState.IDLE,
        stats: {
          totalActions: 0,
          successfulActions: 0,
          failedActions: 0,
          coverageScreens: 0,
          startTime: new Date(),
        },
      };

      const result = await (service as any).executeStateTransitionWithTimeout(
        OrchestratorState.IDLE,
        context,
        1000, // 1 second timeout
      );

      expect(result.success).toBe(true);
      expect(result.newState).toBe(OrchestratorState.INSPECTING);
    });
  });
});

