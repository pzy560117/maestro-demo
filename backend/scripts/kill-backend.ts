#!/usr/bin/env ts-node

/**
 * 清理后端服务脚本
 * 强制终止占用 8360 端口的进程
 */

import { exec, execSync } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const PORT = 8360;
const RETRY_DELAY = 1000; // 1秒
const SKIP_PIDS = new Set<number>(
  [process.pid, typeof process.ppid === 'number' ? process.ppid : undefined].filter(
    (pid): pid is number => typeof pid === 'number' && pid > 0,
  ),
);
const PROJECT_KEYWORD = process.cwd().toLowerCase();
const SKIP_KEYWORDS = ['npm-cli.js', 'kill-backend.ts'];
const TARGET_KEYWORDS = ['\\maestro\\backend', '/maestro/backend', '\\maestro\\dist', '/maestro/dist'];

/**
 * 获取占用指定端口的进程 PID
 */
async function getProcessByPort(port: number): Promise<number[]> {
  try {
    const { stdout } = await execAsync(`netstat -aon | findstr ":${port}" | findstr "LISTENING"`);
    const lines = stdout.split('\n').filter(line => line.trim());
    
    const pids = new Set<number>();
    lines.forEach(line => {
      const match = line.match(/\s+(\d+)\s*$/);
      if (match) {
        const pid = parseInt(match[1], 10);
        if (!isNaN(pid) && pid > 0) {
          pids.add(pid);
        }
      }
    });
    
    return Array.from(pids);
  } catch (error) {
    return [];
  }
}

/**
 * 获取所有 Node.js 进程
 */
async function getAllNodeProcesses(): Promise<number[]> {
  try {
    const { stdout } = await execAsync('tasklist /FI "IMAGENAME eq node.exe" /FO CSV /NH');
    const lines = stdout.split('\n').filter(line => line.includes('node.exe'));
    
    const pids: number[] = [];
    lines.forEach(line => {
      const match = line.match(/"(\d+)"/);
      if (match) {
        const pid = parseInt(match[1], 10);
        if (!isNaN(pid) && pid > 0) {
          pids.push(pid);
        }
      }
    });
    
    return pids;
  } catch (error) {
    return [];
  }
}

/**
 * 获取进程命令行
 */
async function getProcessCommandLine(pid: number): Promise<string> {
  try {
    const { stdout } = await execAsync(
      `wmic process where processid=${pid} get CommandLine /value`,
    );
    const match = stdout.match(/CommandLine=(.*)/s);
    return match ? match[1].trim() : '';
  } catch (error) {
    return '';
  }
}

/**
 * 强制终止进程
 */
async function killProcess(pid: number): Promise<boolean> {
  try {
    execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
    console.log(`[✓] 已终止进程 PID: ${pid}`);
    return true;
  } catch (error) {
    console.log(`[✗] 无法终止进程 PID: ${pid}`);
    return false;
  }
}

/**
 * 等待指定时间
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 检查端口是否被占用
 */
async function isPortInUse(port: number): Promise<boolean> {
  const pids = await getProcessByPort(port);
  return pids.length > 0;
}

/**
 * 主清理流程
 */
async function main() {
  console.log('\n============================================');
  console.log('清理后端服务');
  console.log('============================================\n');

  let attempt = 1;
  const maxAttempts = 3;

  while (attempt <= maxAttempts) {
    console.log(`[尝试 ${attempt}/${maxAttempts}] 清理端口 ${PORT}...`);

    // 1. 查找占用端口的进程
    const portPids = await getProcessByPort(PORT);
    
    if (portPids.length > 0) {
      console.log(`[发现] 端口 ${PORT} 被 ${portPids.length} 个进程占用: ${portPids.join(', ')}`);
      
      // 终止占用端口的进程
      for (const pid of portPids) {
        if (SKIP_PIDS.has(pid)) {
          console.log(`[跳过] 进程 PID: ${pid}（当前脚本或父进程）`);
          continue;
        }
        await killProcess(pid);
      }
      
      await sleep(RETRY_DELAY);
    }

    // 2. 清理所有 Node.js 进程（确保彻底清理）
    const nodePids = await getAllNodeProcesses();
    if (nodePids.length > 0) {
      console.log(`[发现] ${nodePids.length} 个 Node.js 进程运行中`);

      const targetNodePids: number[] = [];

      for (const pid of nodePids) {
        if (SKIP_PIDS.has(pid)) {
          console.log(`[跳过] 进程 PID: ${pid}（当前脚本或父进程）`);
          continue;
        }

        const commandLine = (await getProcessCommandLine(pid)).toLowerCase();

        if (!commandLine) {
          continue;
        }

        if (SKIP_KEYWORDS.some(keyword => commandLine.includes(keyword))) {
          console.log(`[跳过] 进程 PID: ${pid}（命令行: ${commandLine.trim() || '未知'})`);
          continue;
        }

        if (commandLine.includes(PROJECT_KEYWORD) || TARGET_KEYWORDS.some(keyword => commandLine.includes(keyword))) {
          targetNodePids.push(pid);
        }
      }

      if (targetNodePids.length === 0) {
        console.log('[提示] 未检测到需要清理的 Node 进程');
      } else {
        for (const pid of targetNodePids) {
          await killProcess(pid);
        }

        await sleep(RETRY_DELAY);
      }
    }

    // 3. 验证端口是否释放
    const stillInUse = await isPortInUse(PORT);
    
    if (!stillInUse) {
      console.log(`\n[成功] 端口 ${PORT} 已释放\n`);
      console.log('============================================');
      console.log('清理完成');
      console.log('============================================\n');
      process.exit(0);
    }

    console.log(`[警告] 端口 ${PORT} 仍被占用，${attempt < maxAttempts ? '重试中...' : '放弃'}\n`);
    attempt++;
    
    if (attempt <= maxAttempts) {
      await sleep(RETRY_DELAY);
    }
  }

  console.log('\n[失败] 无法清理端口，请手动检查或重启计算机\n');
  process.exit(1);
}

// 执行清理
main().catch(error => {
  console.error('\n[错误]', error.message);
  process.exit(1);
});

