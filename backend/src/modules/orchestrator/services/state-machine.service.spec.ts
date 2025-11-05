import { Test, TestingModule } from '@nestjs/testing';
import { StateMachineService } from './state-machine.service';
import {
  OrchestratorState,
  TaskRunContext,
  QueuePriority,
} from '../types/orchestrator.types';

/**
 * 状态机服务单元测试
 * 测试功能 C：遍历调度状态机（FR-02）
 */
describe('StateMachineService', () => {
  let service: StateMachineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StateMachineService],
    }).compile();

    service = module.get<StateMachineService>(StateMachineService);
  });

  const createMockContext = (): TaskRunContext => ({
    taskRunId: 'test-task-run-id',
    taskId: 'test-task-id',
    deviceId: 'test-device-id',
    packageName: 'com.test.app',
    versionName: '1.0.0',
    coverageConfig: {
      maxDepth: 10,
      timeout: 1800,
    },
    visitedGraph: {
      visitedSignatures: new Set(),
      edges: new Map(),
      visitCounts: new Map(),
    },
    actionQueues: {
      [QueuePriority.PRIMARY]: [],
      [QueuePriority.FALLBACK]: [],
      [QueuePriority.REVISIT]: [],
    },
    currentState: OrchestratorState.IDLE,
    stats: {
      totalActions: 0,
      successfulActions: 0,
      failedActions: 0,
      coverageScreens: 0,
      startTime: new Date(),
    },
  });

  describe('transition', () => {
    it('应从 IDLE 转换到 BOOTSTRAPPING', async () => {
      const context = createMockContext();
      const result = await service.transition(OrchestratorState.IDLE, context);

      expect(result.success).toBe(true);
      expect(result.newState).toBe(OrchestratorState.BOOTSTRAPPING);
    });

    it('应从 BOOTSTRAPPING 转换到 INSPECTING', async () => {
      const context = createMockContext();
      const result = await service.transition(
        OrchestratorState.BOOTSTRAPPING,
        context,
      );

      expect(result.success).toBe(true);
      expect(result.newState).toBe(OrchestratorState.INSPECTING);
    });

    it('队列为空时应从 TRAVERSING 转换到 TERMINATED', async () => {
      const context = createMockContext();
      const result = await service.transition(
        OrchestratorState.TRAVERSING,
        context,
      );

      expect(result.success).toBe(true);
      expect(result.newState).toBe(OrchestratorState.TERMINATED);
      expect(result.data?.reason).toBe('queue_empty');
    });

    it('应从 INSPECTING 转换到 EXECUTING', async () => {
      const context = createMockContext();
      const result = await service.transition(
        OrchestratorState.INSPECTING,
        context,
      );

      expect(result.success).toBe(true);
      expect(result.newState).toBe(OrchestratorState.EXECUTING);
    });

    it('应从 EXECUTING 转换到 VERIFYING', async () => {
      const context = createMockContext();
      const result = await service.transition(
        OrchestratorState.EXECUTING,
        context,
      );

      expect(result.success).toBe(true);
      expect(result.newState).toBe(OrchestratorState.VERIFYING);
      expect(context.stats.totalActions).toBe(1);
      expect(context.stats.successfulActions).toBe(1);
    });

    it('应从 VERIFYING 转换到 TRAVERSING', async () => {
      const context = createMockContext();
      const result = await service.transition(
        OrchestratorState.VERIFYING,
        context,
      );

      expect(result.success).toBe(true);
      expect(result.newState).toBe(OrchestratorState.TRAVERSING);
      expect(context.stats.coverageScreens).toBe(1);
    });

    it('应从 RECOVERING 转换到 TRAVERSING', async () => {
      const context = createMockContext();
      const result = await service.transition(
        OrchestratorState.RECOVERING,
        context,
      );

      expect(result.success).toBe(true);
      expect(result.newState).toBe(OrchestratorState.TRAVERSING);
    });
  });
});

