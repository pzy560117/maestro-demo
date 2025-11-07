import { Test, TestingModule } from '@nestjs/testing';
import { TaskRunService } from './task-run.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { BusinessException } from '../../common/exceptions/business.exception';

describe('TaskRunService', () => {
  let service: TaskRunService;

  const prismaMock: { taskRun: { findUnique: jest.Mock } } = {
    taskRun: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskRunService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get(TaskRunService);
    jest.clearAllMocks();
  });

  it('should convert BigInt event id to string', async () => {
    const now = new Date();

    (prismaMock.taskRun.findUnique as jest.Mock).mockResolvedValue({
      id: 'task-run-1',
      taskId: 'task-1',
      deviceId: 'device-1',
      orchestratorVersion: '1.0.0',
      status: 'RUNNING',
      startAt: now,
      totalActions: 0,
      successfulActions: 0,
      coverageScreens: 0,
      failureReason: null,
      metrics: {},
      createdAt: now,
      task: {},
      device: {},
      events: [
        {
          id: BigInt(9),
          taskRunId: 'task-run-1',
          eventType: 'STATE_CHANGE',
          detail: {},
          occurredAt: now,
        },
      ],
    });

    const result = await service.getTaskRun('task-run-1');

    expect(result.events[0].id).toBe('9');
    expect(typeof result.events[0].id).toBe('string');
  });

  it('should throw BusinessException when task run not found', async () => {
    (prismaMock.taskRun.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(service.getTaskRun('missing-id')).rejects.toThrow(BusinessException);
  });
});

