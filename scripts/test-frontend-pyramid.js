#!/usr/bin/env node
/**
 * 前端金字塔测试编排器
 * 按照测试金字塔顺序执行：单元 → 组件 → E2E
 * 
 * 符合User Rules中的分层测试策略：
 * - 先小后大
 * - 上一层不绿不进入下一层
 * - 自动健康检查与超时
 * - 失败时输出足够上下文
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function cleanExit(code) {
  try {
    process.stdout.write('\n\n[TASK_DONE]\n\n');
  } catch (e) {
    // ignore
  }
  process.exit(code);
}

// 处理信号
process.on('SIGINT', () => cleanExit(130));
process.on('SIGTERM', () => cleanExit(143));

/**
 * 执行npm命令
 */
function runNpmCommand(command, cwd = path.join(__dirname, '../frontend')) {
  return new Promise((resolve, reject) => {
    log(`\n${'='.repeat(60)}`, 'blue');
    log(`Running: npm run ${command}`, 'bright');
    log('='.repeat(60), 'blue');

    const isWindows = process.platform === 'win32';
    const npmCmd = isWindows ? 'npm.cmd' : 'npm';
    
    const child = spawn(npmCmd, ['run', command], {
      cwd,
      stdio: 'inherit',
      shell: isWindows,
      env: { ...process.env, FORCE_COLOR: '1' }
    });

    child.on('close', (code) => {
      if (code === 0) {
        log(`✓ ${command} passed`, 'green');
        resolve();
      } else {
        log(`✗ ${command} failed with code ${code}`, 'red');
        reject(new Error(`${command} failed`));
      }
    });

    child.on('error', (err) => {
      log(`✗ Failed to start ${command}: ${err.message}`, 'red');
      reject(err);
    });
  });
}

/**
 * 主测试流程
 */
async function runTestPyramid() {
  const startTime = Date.now();
  let exitCode = 0;

  try {
    log('\n🧪 Starting Frontend Test Pyramid', 'bright');
    log('Strategy: Unit → Component → E2E\n', 'blue');

    // Step 1: 单元测试
    log('📊 Phase 1/3: Unit Tests', 'yellow');
    await runNpmCommand('test:unit');

    // Step 2: 组件测试
    log('\n📦 Phase 2/3: Component Tests', 'yellow');
    await runNpmCommand('test:component');

    // Step 3: E2E测试（自动启动后端）
    log('\n🎭 Phase 3/3: E2E Tests (with backend)', 'yellow');
    await runNpmCommand('test:e2e:full');

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    log('\n' + '='.repeat(60), 'green');
    log('✓ All tests passed!', 'green');
    log(`Total time: ${duration}s`, 'green');
    log('='.repeat(60), 'green');

  } catch (error) {
    exitCode = 1;
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    log('\n' + '='.repeat(60), 'red');
    log('✗ Test pyramid failed', 'red');
    log(`Error: ${error.message}`, 'red');
    log(`Time elapsed: ${duration}s`, 'red');
    log('='.repeat(60), 'red');
    
    log('\n💡 Tip: Fix the failing layer before proceeding to the next', 'yellow');
  }

  cleanExit(exitCode);
}

// 执行
runTestPyramid();

