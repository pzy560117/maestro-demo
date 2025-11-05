import { Test, TestingModule } from '@nestjs/testing';
import { AlertsService } from './alerts.service';
import { NotificationService } from './services/notification.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { AlertType, AlertSeverity, AlertStatus, NotificationChannel } from '@prisma/client';

describe('AlertsService', () => {
  let service: AlertsService;
  let prisma: PrismaService;
  let notificationService: NotificationService;

  const mockPrismaService = {
    alert: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      groupBy: jest.fn(),
    },
    alertNotification: {
      create: jest.fn(),
    },
    integrationConfig: {
      findMany: jest.fn(),
    },
  };

  const mockNotificationService = {
    sendNotification: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
      ],
    }).compile();

    service = module.get<AlertsService>(AlertsService);
    prisma = module.get<PrismaService>(PrismaService);
    notificationService = module.get<NotificationService>(NotificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create alert successfully', async () => {
      const createAlertDto = {
        taskRunId: 'task-run-123',
        alertType: AlertType.LOCATOR_FAILURE,
        severity: AlertSeverity.P2,
        message: '定位验证失败',
        payload: { failureCount: 3 },
      };

      const mockAlert = {
        id: 'alert-123',
        ...createAlertDto,
        status: AlertStatus.OPEN,
        triggeredAt: new Date(),
        taskRun: null,
        screen: null,
        element: null,
      };

      mockPrismaService.alert.create.mockResolvedValue(mockAlert);
      mockPrismaService.integrationConfig.findMany.mockResolvedValue([]);

      const result = await service.create(createAlertDto);

      expect(result).toEqual(mockAlert);
      expect(prisma.alert.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          alertType: createAlertDto.alertType,
          severity: createAlertDto.severity,
          message: createAlertDto.message,
          status: AlertStatus.OPEN,
        }),
        include: expect.any(Object),
      });
    });
  });

  describe('acknowledge', () => {
    it('should acknowledge alert successfully', async () => {
      const alertId = 'alert-123';
      const ackDto = { ackBy: 'user-123' };

      const mockAlert = {
        id: alertId,
        status: AlertStatus.ACKED,
        ackBy: ackDto.ackBy,
        ackAt: expect.any(Date),
      };

      mockPrismaService.alert.update.mockResolvedValue(mockAlert);

      const result = await service.acknowledge(alertId, ackDto);

      expect(result.status).toBe(AlertStatus.ACKED);
      expect(result.ackBy).toBe(ackDto.ackBy);
      expect(prisma.alert.update).toHaveBeenCalledWith({
        where: { id: alertId },
        data: expect.objectContaining({
          status: AlertStatus.ACKED,
          ackBy: ackDto.ackBy,
        }),
      });
    });
  });

  describe('sendNotification', () => {
    it('should send notification successfully', async () => {
      const sendDto = {
        alertId: 'alert-123',
        channel: NotificationChannel.FEISHU,
        target: 'https://webhook.url',
      };

      const mockAlert = {
        id: sendDto.alertId,
        message: '测试告警',
        alertType: AlertType.SYSTEM,
        severity: AlertSeverity.P2,
        taskRunId: null,
        payload: {},
      };

      mockPrismaService.alert.findUnique.mockResolvedValue(mockAlert);
      mockNotificationService.sendNotification.mockResolvedValue({
        status: 'SENT',
        response: { code: 0 },
      });
      mockPrismaService.alertNotification.create.mockResolvedValue({
        id: 'notification-123',
      });

      const result = await service.sendNotification(sendDto);

      expect(result.success).toBe(true);
      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        sendDto.channel,
        sendDto.target,
        mockAlert.message,
        expect.any(Object),
      );
    });
  });

  describe('getStatistics', () => {
    it('should return alert statistics', async () => {
      mockPrismaService.alert.count.mockResolvedValue(100);
      mockPrismaService.alert.groupBy.mockResolvedValueOnce([
        { severity: 'P1', _count: { severity: 10 } },
        { severity: 'P2', _count: { severity: 30 } },
      ]);
      mockPrismaService.alert.groupBy.mockResolvedValueOnce([
        { alertType: 'LOCATOR_FAILURE', _count: { alertType: 40 } },
      ]);
      mockPrismaService.alert.groupBy.mockResolvedValueOnce([
        { status: 'OPEN', _count: { status: 50 } },
      ]);

      const result = await service.getStatistics();

      expect(result.total).toBe(100);
      expect(result.bySeverity).toHaveProperty('P1');
      expect(result.byType).toHaveProperty('LOCATOR_FAILURE');
      expect(result.byStatus).toHaveProperty('OPEN');
    });
  });
});

