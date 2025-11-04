import { PrismaClient, DeviceType, DeviceStatus, CoverageProfile } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 数据库种子数据
 * 用于初始化测试和开发环境
 */
async function main() {
  console.log('🌱 Starting database seeding...\n');

  // 清理现有数据（仅开发环境）
  if (process.env.NODE_ENV === 'development') {
    console.log('🧹 Cleaning existing data...');
    await prisma.alert.deleteMany();
    await prisma.elementValidation.deleteMany();
    await prisma.locatorCandidate.deleteMany();
    await prisma.element.deleteMany();
    await prisma.screen.deleteMany();
    await prisma.taskAction.deleteMany();
    await prisma.llmLog.deleteMany();
    await prisma.taskRunEvent.deleteMany();
    await prisma.taskRun.deleteMany();
    await prisma.task.deleteMany();
    await prisma.appVersion.deleteMany();
    await prisma.app.deleteMany();
    await prisma.device.deleteMany();
    await prisma.user.deleteMany();
    console.log('✅ Data cleaned\n');
  }

  // 创建测试用户
  console.log('👤 Creating users...');
  const testUser = await prisma.user.create({
    data: {
      account: 'admin@maestro.com',
      displayName: '系统管理员',
      roles: ['ADMIN', 'QA'],
    },
  });
  console.log(`  ✓ Created user: ${testUser.displayName}\n`);

  // 创建测试设备
  console.log('📱 Creating devices...');
  const devices = await Promise.all([
    prisma.device.create({
      data: {
        serial: 'emulator-5554',
        model: 'Android Emulator',
        osVersion: 'Android 13',
        deviceType: DeviceType.EMULATOR,
        resolution: '1080x1920',
        status: DeviceStatus.AVAILABLE,
        tags: {
          location: 'development',
          environment: 'local',
        },
      },
    }),
    prisma.device.create({
      data: {
        serial: 'pixel6-test-001',
        model: 'Google Pixel 6',
        osVersion: 'Android 13',
        deviceType: DeviceType.REAL,
        resolution: '1080x2400',
        status: DeviceStatus.AVAILABLE,
        tags: {
          location: 'lab-01',
          mdm: 'enabled',
        },
      },
    }),
  ]);
  console.log(`  ✓ Created ${devices.length} devices\n`);

  // 创建测试应用
  console.log('📦 Creating applications...');
  const approvalApp = await prisma.app.create({
    data: {
      name: '企业审批中心',
      packageName: 'com.company.approval',
      description: '企业内部审批流程管理应用',
    },
  });
  console.log(`  ✓ Created app: ${approvalApp.name}`);

  const meetingApp = await prisma.app.create({
    data: {
      name: '会议室预订',
      packageName: 'com.company.meeting',
      description: '会议室预订和管理系统',
    },
  });
  console.log(`  ✓ Created app: ${meetingApp.name}\n`);

  // 创建应用版本
  console.log('📝 Creating app versions...');
  const versions = await Promise.all([
    prisma.appVersion.create({
      data: {
        appId: approvalApp.id,
        versionName: '6.3.1',
        versionCode: 631,
        changelog: '修复已知问题，优化审批流程',
        releasedAt: new Date('2025-10-15'),
      },
    }),
    prisma.appVersion.create({
      data: {
        appId: approvalApp.id,
        versionName: '6.3.0',
        versionCode: 630,
        changelog: '新增批量审批功能',
        releasedAt: new Date('2025-09-01'),
      },
    }),
    prisma.appVersion.create({
      data: {
        appId: meetingApp.id,
        versionName: '2.1.0',
        versionCode: 210,
        changelog: '支持循环会议预订',
        releasedAt: new Date('2025-10-20'),
      },
    }),
  ]);
  console.log(`  ✓ Created ${versions.length} versions\n`);

  // 创建示例任务
  console.log('🎯 Creating sample tasks...');
  const task = await prisma.task.create({
    data: {
      appVersionId: versions[0].id,
      name: '审批中心6.3.1核心流程遍历',
      coverageProfile: CoverageProfile.SMOKE,
      coverageConfig: {
        blacklist: ['/system/settings', '/about'],
        priority: 5,
      },
      priority: 1,
      createdBy: testUser.id,
    },
  });
  console.log(`  ✓ Created task: ${task.name}\n`);

  // 创建集成配置示例
  console.log('⚙️  Creating integration configs...');
  const configs = await Promise.all([
    prisma.integrationConfig.create({
      data: {
        configType: 'LLM',
        name: 'Qwen3-VL Production',
        secretRef: 'vault://llm/qwen3-vl-prod',
        config: {
          endpoint: 'https://api.qwen.com/v1',
          model: 'qwen3-vl',
          maxTokens: 6000,
          temperature: 0.7,
        },
        enabled: true,
      },
    }),
    prisma.integrationConfig.create({
      data: {
        configType: 'STORAGE',
        name: 'MinIO Local',
        secretRef: 'local://minio',
        config: {
          endpoint: 'localhost:9000',
          bucket: 'maestro-assets',
          useSSL: false,
        },
        enabled: true,
      },
    }),
    prisma.integrationConfig.create({
      data: {
        configType: 'ALERT_CHANNEL',
        name: 'Feishu Webhook',
        secretRef: 'vault://alert/feishu',
        config: {
          channel: 'feishu',
          webhook: 'https://open.feishu.cn/open-apis/bot/v2/hook/xxx',
          severity: ['P1', 'P2'],
        },
        enabled: true,
      },
    }),
  ]);
  console.log(`  ✓ Created ${configs.length} integration configs\n`);

  console.log('✅ Database seeding completed successfully!\n');
  console.log('📊 Summary:');
  console.log(`  - Users: 1`);
  console.log(`  - Devices: ${devices.length}`);
  console.log(`  - Apps: 2`);
  console.log(`  - Versions: ${versions.length}`);
  console.log(`  - Tasks: 1`);
  console.log(`  - Configs: ${configs.length}`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

