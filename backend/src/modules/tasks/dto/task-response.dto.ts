import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Task, TaskStatus, CoverageProfile, AppVersion } from '@prisma/client';

/**
 * 任务响应 DTO
 * 返回任务详细信息
 */
export class TaskResponseDto {
  @ApiProperty({
    description: '任务ID',
    example: 't1234567-89ab-cdef-0123-456789abcdef',
  })
  id: string;

  @ApiProperty({
    description: '任务名称',
    example: '审批核心流程遍历',
  })
  name: string;

  @ApiProperty({
    description: '应用版本ID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  appVersionId: string;

  @ApiPropertyOptional({
    description: '应用版本信息（关联查询时返回）',
  })
  appVersion?: {
    id: string;
    versionName: string;
    app: {
      name: string;
      packageName: string;
    };
  };

  @ApiProperty({
    description: '覆盖策略',
    enum: TaskStatus,
    example: CoverageProfile.SMOKE,
  })
  coverageProfile: CoverageProfile;

  @ApiPropertyOptional({
    description: '覆盖配置',
    example: {
      blacklistPaths: ['/settings'],
      maxDepth: 10,
    },
  })
  coverageConfig?: any;

  @ApiProperty({
    description: '任务优先级（1-5）',
    example: 3,
  })
  priority: number;

  @ApiProperty({
    description: '任务状态',
    enum: TaskStatus,
    example: TaskStatus.QUEUED,
  })
  status: TaskStatus;

  @ApiPropertyOptional({
    description: '创建人ID',
    example: 'u1234567-89ab-cdef-0123-456789abcdef',
  })
  createdBy?: string;

  @ApiPropertyOptional({
    description: '计划执行时间',
    example: '2025-11-05T10:00:00Z',
  })
  scheduleAt?: Date;

  @ApiProperty({
    description: '创建时间',
    example: '2025-11-04T12:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: '更新时间',
    example: '2025-11-04T12:00:00Z',
  })
  updatedAt: Date;

  @ApiPropertyOptional({
    description: '任务运行记录统计',
  })
  runStats?: {
    total: number;
    running: number;
    succeeded: number;
    failed: number;
  };

  constructor(
    task: Task & {
      appVersion?: AppVersion & { app?: { name: string; packageName: string } };
      _count?: any;
    },
  ) {
    this.id = task.id;
    this.name = task.name;
    this.appVersionId = task.appVersionId;
    this.coverageProfile = task.coverageProfile;
    this.coverageConfig = task.coverageConfig || undefined;
    this.priority = task.priority;
    this.status = task.status;
    this.createdBy = task.createdBy || undefined;
    this.scheduleAt = task.scheduleAt || undefined;
    this.createdAt = task.createdAt;
    this.updatedAt = task.updatedAt;

    // 关联数据
    if (task.appVersion) {
      this.appVersion = {
        id: task.appVersion.id,
        versionName: task.appVersion.versionName,
        app: task.appVersion.app
          ? {
              name: task.appVersion.app.name,
              packageName: task.appVersion.app.packageName,
            }
          : ({ name: '', packageName: '' } as any),
      };
    }
  }
}

