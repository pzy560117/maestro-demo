import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function releaseDevice(deviceSerial: string) {
  console.log(`Releasing device: ${deviceSerial}`);
  
  // 更新设备状态为 AVAILABLE
  await prisma.device.updateMany({
    where: { serial: deviceSerial },
    data: { status: 'AVAILABLE' },
  });
  
  console.log('Device released');
}

// 释放设备 66J5T18919000260
releaseDevice('66J5T18919000260')
  .then(() => {
    console.log('Done');
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

