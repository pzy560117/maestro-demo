import { PrismaClient } from './backend/node_modules/.prisma/client';

const prisma = new PrismaClient();

async function fix() {
  console.log('Fixing device status...');
  
  // 设置 TEST-DEVICE-001 为 OFFLINE
  await prisma.device.update({
    where: { serial: 'TEST-DEVICE-001' },
    data: { status: 'OFFLINE' },
  });
  
  // 设置真实设备为 AVAILABLE  
  await prisma.device.update({
    where: { serial: '66J5T18919000260' },
    data: { status: 'AVAILABLE' },
  });
  
  // 取消当前运行的任务
  await prisma.task.updateMany({
    where: { status: 'RUNNING' },
    data: { status: 'CANCELLED' },
  });
  
  await prisma.taskRun.updateMany({
    where: { status: 'RUNNING' },
    data: { status: 'FAILED', failureReason: 'Device offline, task cancelled' },
  });
  
  console.log('Done!');
}

fix()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


