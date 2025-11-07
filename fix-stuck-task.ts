import { PrismaClient } from './backend/node_modules/.prisma/client';

const prisma = new PrismaClient();

async function fix() {
  console.log('Fixing stuck tasks and devices...');
  
  // 1. 找到所有运行中的任务
  const runningTasks = await prisma.task.findMany({
    where: { status: 'RUNNING' },
  });
  
  console.log(`Found ${runningTasks.length} running tasks`);
  
  // 2. 检查是否有对应的 running task_run
  for (const task of runningTasks) {
    const runningTaskRuns = await prisma.taskRun.count({
      where: {
        taskId: task.id,
        status: 'RUNNING',
      },
    });
    
    if (runningTaskRuns === 0) {
      console.log(`Task ${task.id} has no running task_run, cancelling...`);
      await prisma.task.update({
        where: { id: task.id },
        data: { status: 'CANCELLED' },
      });
    }
  }
  
  // 3. 释放所有设备
  const updated = await prisma.device.updateMany({
    data: { status: 'AVAILABLE' },
  });
  
  console.log(`Released ${updated.count} devices`);
}

fix()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


