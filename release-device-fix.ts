import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fix() {
  // 释放所有设备
  await prisma.device.updateMany({
    data: { status: 'AVAILABLE' },
  });
  
  // 取消所有运行中的任务
  await prisma.task.updateMany({
    where: { status: { in: ['RUNNING', 'QUEUED'] } },
    data: { status: 'CANCELLED' },
  });
  
  console.log('All devices released and tasks cancelled');
}

fix()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

