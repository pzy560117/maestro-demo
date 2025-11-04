/**
 * 环境检查脚本
 * 验证所有必要的配置和依赖是否就绪
 */

import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface CheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
}

const results: CheckResult[] = [];

/**
 * 检查文件是否存在
 */
function checkFile(filePath: string, description: string): boolean {
  const fullPath = path.join(__dirname, '..', filePath);
  const exists = fs.existsSync(fullPath);
  
  results.push({
    name: description,
    status: exists ? 'pass' : 'fail',
    message: exists ? `Found: ${filePath}` : `Missing: ${filePath}`,
  });
  
  return exists;
}

/**
 * 检查环境变量
 */
function checkEnvVar(varName: string, required: boolean = true): boolean {
  const value = process.env[varName];
  const exists = !!value;
  
  results.push({
    name: `Environment Variable: ${varName}`,
    status: exists ? 'pass' : (required ? 'fail' : 'warn'),
    message: exists ? `Set: ${value.substring(0, 20)}...` : `Not set: ${varName}`,
  });
  
  return exists;
}

/**
 * 检查命令是否可用
 */
async function checkCommand(command: string, description: string): Promise<boolean> {
  try {
    await execAsync(`${command} --version`);
    results.push({
      name: description,
      status: 'pass',
      message: `Command available: ${command}`,
    });
    return true;
  } catch {
    results.push({
      name: description,
      status: 'fail',
      message: `Command not found: ${command}`,
    });
    return false;
  }
}

/**
 * 检查端口是否可用
 */
async function checkPort(port: number, service: string): Promise<boolean> {
  try {
    const { stdout } = await execAsync(`netstat -an | findstr :${port}`);
    const inUse = stdout.includes('LISTENING');
    
    results.push({
      name: `Port ${port} (${service})`,
      status: inUse ? 'warn' : 'pass',
      message: inUse ? `Port ${port} is in use` : `Port ${port} is available`,
    });
    
    return !inUse;
  } catch {
    results.push({
      name: `Port ${port} (${service})`,
      status: 'pass',
      message: `Port ${port} is available`,
    });
    return true;
  }
}

/**
 * 主检查流程
 */
async function main() {
  console.log('🔍 Checking Maestro Backend Setup...\n');

  // 1. 检查关键文件
  console.log('📁 Checking Files...');
  checkFile('.env', 'Environment File');
  checkFile('prisma/schema.prisma', 'Prisma Schema');
  checkFile('tsconfig.json', 'TypeScript Config');
  checkFile('package.json', 'Package Config');
  
  // 2. 检查环境变量
  console.log('\n🔧 Checking Environment Variables...');
  checkEnvVar('DATABASE_URL');
  checkEnvVar('NODE_ENV', false);
  checkEnvVar('PORT', false);
  
  // 3. 检查必要命令
  console.log('\n⚙️  Checking System Commands...');
  await checkCommand('node', 'Node.js');
  await checkCommand('pnpm', 'pnpm Package Manager');
  await checkCommand('docker', 'Docker');
  await checkCommand('adb', 'Android Debug Bridge');
  
  // 4. 检查端口
  console.log('\n🔌 Checking Ports...');
  await checkPort(3000, 'Backend API');
  await checkPort(5432, 'PostgreSQL');
  await checkPort(6379, 'Redis');
  await checkPort(9000, 'MinIO');
  
  // 5. 输出结果
  console.log('\n📊 Results Summary:\n');
  
  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const warned = results.filter(r => r.status === 'warn').length;
  
  results.forEach(result => {
    const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️';
    console.log(`${icon} ${result.name}: ${result.message}`);
  });
  
  console.log(`\n📈 Total: ${results.length} checks`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⚠️  Warnings: ${warned}\n`);
  
  // 6. 提供建议
  if (failed > 0) {
    console.log('💡 Suggestions:');
    
    const failedResults = results.filter(r => r.status === 'fail');
    
    if (failedResults.some(r => r.message.includes('.env'))) {
      console.log('  - Copy .env.example to .env and configure it');
    }
    
    if (failedResults.some(r => r.message.includes('adb'))) {
      console.log('  - Install Android SDK and add adb to PATH');
    }
    
    if (failedResults.some(r => r.message.includes('docker'))) {
      console.log('  - Install Docker Desktop: https://www.docker.com/products/docker-desktop');
    }
    
    if (failedResults.some(r => r.message.includes('DATABASE_URL'))) {
      console.log('  - Set DATABASE_URL in .env file');
      console.log('  - Or run: cd ../docker && docker-compose up -d postgres');
    }
    
    console.log();
  }
  
  // 7. 退出码
  process.exit(failed > 0 ? 1 : 0);
}

// 运行检查
main().catch(error => {
  console.error('❌ Setup check failed:', error);
  process.exit(1);
});

