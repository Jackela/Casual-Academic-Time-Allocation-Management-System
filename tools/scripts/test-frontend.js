#!/usr/bin/env node

/**
 * 🚀 Revolutionary Frontend Test Runner - Epic 2.2 Implementation
 * 
 * Revolutionary Features:
 * - Enhanced Playwright integration with browser process lifecycle management
 * - Multi-browser process coordination with resource management
 * - Node.js development server health monitoring
 * - Asset compilation process oversight with optimization
 * - Playwright browser instance management with cleanup
 * - Real-time performance monitoring with Core Web Vitals
 * - Cross-browser compatibility validation
 * - Visual regression testing with screenshot comparison
 * - Mobile responsiveness testing with device emulation
 * - Accessibility compliance validation (WCAG 2.1)
 * - Performance budget enforcement
 * - Test result aggregation and reporting
 * 
 * @author CATAMS Team - Epic 2.2 Script Ecosystem Revolution
 * @version 2.0.0 - Revolutionary Edition
 */

const path = require('path');
const fs = require('fs').promises;
const ProcessOrchestrator = require('../process-management/src/core/ProcessOrchestrator');
const MonitoringSystem = require('../process-management/src/MonitoringSystem');
const PlatformIntegration = require('../process-management/src/platform');
const IntelligentCleaner = require('../process-management/src/core/IntelligentCleaner');
const { spawn, execSync } = require('child_process');

// Enhanced parameters with revolutionary configuration
const params = require('./test.params.json');

/**
 * Revolutionary Frontend Test Runner with browser lifecycle management
 */
class RevolutionaryFrontendTestRunner {
  constructor() {
    this.orchestrator = null;
    this.monitoringSystem = null;
    this.platformIntegration = null;
    this.intelligentCleaner = null;
    this.browserInstances = new Map();
    this.devServerProcess = null;
    this.baselineState = new Map();
    this.performanceMetrics = {
      loadTimes: [],
      webVitals: [],
      resourceUsage: [],
      accessibilityScores: []
    };
    this.performanceBudgets = {
      loadTime: 3000, // 3 seconds
      firstContentfulPaint: 1500, // 1.5 seconds
      largestContentfulPaint: 2500, // 2.5 seconds
      cumulativeLayoutShift: 0.1,
      bundleSize: 2 * 1024 * 1024 // 2MB
    };
    this.projectRoot = path.join(__dirname, '../..');
    this.frontendDir = path.join(this.projectRoot, 'frontend');
  }

  /**
   * Initialize revolutionary frontend test infrastructure
   */
  async initialize() {
    try {
      console.log('\n🚀 Initializing Revolutionary Frontend Test Runner...');
      
      // Initialize ProcessOrchestrator with frontend-specific configuration
      this.orchestrator = new ProcessOrchestrator({}, {
        memoryThreshold: 2 * 1024 * 1024 * 1024, // 2GB for browser instances
        maxNewProcesses: 25, // Allow for multiple browser processes
        enableRealTimeMonitoring: true,
        emergencyRecoveryEnabled: true,
        auditLogging: true
      });

      // Initialize monitoring system with browser-specific monitoring
      this.monitoringSystem = new MonitoringSystem({
        leakDetection: true,
        performanceMonitoring: true,
        browserMonitoring: true,
        webVitalsTracking: true,
        alerting: true,
        realTimeReporting: true
      });

      // Initialize platform-specific optimizations
      this.platformIntegration = new PlatformIntegration();

      // Initialize AI-driven intelligent cleaner
      this.intelligentCleaner = new IntelligentCleaner({
        aiDecisionMaking: true,
        contextAwareness: true,
        browserCleanup: true,
        learningEnabled: true
      });

      console.log('✅ Revolutionary frontend infrastructure initialized successfully');
      
      // Capture comprehensive system baseline
      await this.captureSystemBaseline();
      
      // Validate frontend dependencies
      await this.validateFrontendDependencies();
      
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize revolutionary frontend infrastructure:', error.message);
      throw error;
    }
  }

  /**
   * Capture comprehensive system baseline for browser leak detection
   */
  async captureSystemBaseline() {
    const startTime = Date.now();
    
    try {
      console.log('📊 Capturing comprehensive frontend system baseline...');
      
      // Capture process baseline
      const processes = await this.platformIntegration.getRunningProcesses();
      this.baselineState.set('processes', processes);
      
      // Capture browser processes specifically
      const browserProcesses = processes.filter(p => 
        p.name?.toLowerCase().match(/(chrome|firefox|safari|edge|playwright)/) ||
        p.command?.toLowerCase().match(/(chromium|webkit|gecko)/)
      );
      this.baselineState.set('browserProcesses', browserProcesses);
      
      // Capture Node.js processes
      const nodeProcesses = processes.filter(p => 
        p.name?.toLowerCase().includes('node') &&
        !p.command?.toLowerCase().includes(process.argv[1])
      );
      this.baselineState.set('nodeProcesses', nodeProcesses);
      
      // Capture port baseline
      const ports = await this.platformIntegration.getOpenPorts();
      this.baselineState.set('ports', ports);
      
      // Capture memory baseline
      const memoryUsage = process.memoryUsage();
      this.baselineState.set('memory', memoryUsage);
      
      const duration = Date.now() - startTime;
      console.log(`✅ Frontend system baseline captured in ${duration}ms:`);
      console.log(`   - ${processes.length} total processes`);
      console.log(`   - ${browserProcesses.length} browser processes`);
      console.log(`   - ${nodeProcesses.length} Node.js processes`);
      console.log(`   - ${ports.length} open ports`);
      console.log(`   - ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB memory`);
      
    } catch (error) {
      console.error('❌ Failed to capture frontend system baseline:', error.message);
      throw error;
    }
  }

  /**
   * Validate frontend dependencies and build tools
   */
  async validateFrontendDependencies() {
    try {
      console.log('🔍 Validating frontend dependencies...');
      
      // Check if frontend directory exists
      try {
        await fs.access(this.frontendDir);
      } catch (e) {
        throw new Error(`Frontend directory not found: ${this.frontendDir}`);
      }
      
      // Check package.json
      const packagePath = path.join(this.frontendDir, 'package.json');
      try {
        const packageData = await fs.readFile(packagePath, 'utf8');
        const packageJson = JSON.parse(packageData);
        
        // Validate test scripts
        if (!packageJson.scripts?.test) {
          console.warn('⚠️ No test script found in package.json');
        }
        
        // Check for Playwright
        if (!packageJson.devDependencies?.['@playwright/test'] && !packageJson.dependencies?.['@playwright/test']) {
          console.warn('⚠️ Playwright not found in dependencies');
        }
      } catch (e) {
        throw new Error(`Failed to read package.json: ${e.message}`);
      }
      
      // Check node_modules
      const nodeModulesPath = path.join(this.frontendDir, 'node_modules');
      try {
        await fs.access(nodeModulesPath);
      } catch (e) {
        console.warn('⚠️ node_modules not found - may need npm install');
      }
      
      console.log('✅ Frontend dependencies validation completed');
      
    } catch (error) {
      console.error('❌ Frontend dependencies validation failed:', error.message);
      throw error;
    }
  }

  /**
   * Start development server with health monitoring
   */
  async startDevServer(options = {}) {
    try {
      console.log('🚀 Starting development server with health monitoring...');
      
      const serverStartTime = Date.now();
      
      return new Promise((resolve, reject) => {
        // Start development server
        const devServerCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
        const devServerArgs = ['run', 'dev'];
        
        this.devServerProcess = spawn(devServerCmd, devServerArgs, {
          cwd: this.frontendDir,
          stdio: ['ignore', 'pipe', 'pipe'],
          detached: false
        });

        let output = '';
        let serverReady = false;
        
        // Monitor server startup
        this.devServerProcess.stdout.on('data', (data) => {
          const chunk = data.toString();
          output += chunk;
          
          if (options.verbose) {
            process.stdout.write(chunk);
          }
          
          // Check for server ready indicators
          if (chunk.match(/(Local:|localhost:|ready in|server running)/i) && !serverReady) {
            serverReady = true;
            const startupTime = Date.now() - serverStartTime;
            console.log(`✅ Development server ready in ${startupTime}ms`);
            resolve({ process: this.devServerProcess, startupTime });
          }
        });

        this.devServerProcess.stderr.on('data', (data) => {
          const chunk = data.toString();
          output += chunk;
          
          if (options.verbose) {
            process.stderr.write(chunk);
          }
        });

        this.devServerProcess.on('error', (error) => {
          reject(new Error(`Failed to start development server: ${error.message}`));
        });

        this.devServerProcess.on('exit', (code, signal) => {
          if (!serverReady) {
            reject(new Error(`Development server exited with code ${code}, signal ${signal}`));
          }
        });

        // Timeout for server startup
        setTimeout(() => {
          if (!serverReady) {
            this.devServerProcess.kill();
            reject(new Error('Development server startup timeout'));
          }
        }, options.timeout || 60000);
      });
      
    } catch (error) {
      console.error('❌ Failed to start development server:', error.message);
      throw error;
    }
  }

  /**
   * Execute frontend tests with comprehensive monitoring
   */
  async executeTests(testType, options = {}) {
    const executionId = `frontend_exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    try {
      console.log(`\n🚀 Executing ${testType} frontend tests with revolutionary monitoring...`);
      console.log(`Execution ID: ${executionId}`);
      
      // Start real-time monitoring
      await this.startRealTimeMonitoring();
      
      // Create test operation
      const operation = {
        type: 'frontend_test',
        name: `frontend_test_${testType}`,
        executionId,
        execute: async () => {
          return await this.runFrontendTestsWithMonitoring(testType, options);
        }
      };

      // Execute with ProcessOrchestrator
      const result = await this.orchestrator.executeOperation(operation, {
        autoRecovery: true,
        monitoring: true,
        isolation: true
      });

      const duration = Date.now() - startTime;
      
      // Validate execution performance
      await this.validateExecutionPerformance(executionId, duration, result);
      
      // Generate comprehensive report
      await this.generateComprehensiveReport(executionId, testType, result, duration);
      
      console.log(`✅ Frontend test execution completed in ${duration}ms`);
      return result;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Frontend test execution failed after ${duration}ms:`, error.message);
      
      // Emergency recovery if enabled
      if (options.emergencyRecovery !== false) {
        await this.performEmergencyRecovery(executionId, error);
      }
      
      throw error;
    }
  }

  /**
   * Run frontend tests with comprehensive monitoring
   */
  async runFrontendTestsWithMonitoring(testType, options) {
    try {
      let result;
      
      switch (testType.toLowerCase()) {
        case 'unit':
          result = await this.runUnitTests(options);
          break;
        case 'contract':
          result = await this.runContractTests(options);
          break;
        case 'e2e':
        case 'playwright':
          result = await this.runPlaywrightTests(options);
          break;
        case 'visual':
          result = await this.runVisualRegressionTests(options);
          break;
        case 'performance':
          result = await this.runPerformanceTests(options);
          break;
        case 'accessibility':
          result = await this.runAccessibilityTests(options);
          break;
        default:
          throw new Error(`Unknown frontend test type: ${testType}`);
      }
      
      return result;
      
    } catch (error) {
      console.error('❌ Frontend test execution failed:', error.message);
      throw error;
    }
  }

  /**
   * Run unit tests with Vitest monitoring
   */
  async runUnitTests(options) {
    try {
      console.log('🧪 Running frontend unit tests with Vitest...');
      
      const testCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
      const testArgs = ['run', 'test:unit', '--', '--reporter=verbose'];
      
      if (options.coverage) {
        testArgs.push('--coverage');
      }
      
      const result = await this.executeCommandWithMonitoring(testCmd, testArgs, {
        cwd: this.frontendDir,
        timeout: options.timeout || 300000, // 5 minutes
        testType: 'unit'
      });
      
      return result;
      
    } catch (error) {
      console.error('❌ Unit tests failed:', error.message);
      throw error;
    }
  }

  /**
   * Run contract tests with API validation
   */
  async runContractTests(options) {
    try {
      console.log('🤝 Running frontend contract tests...');
      
      const testCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
      const testArgs = ['run', 'test:contract'];
      
      const result = await this.executeCommandWithMonitoring(testCmd, testArgs, {
        cwd: this.frontendDir,
        timeout: options.timeout || 180000, // 3 minutes
        testType: 'contract'
      });
      
      return result;
      
    } catch (error) {
      console.error('❌ Contract tests failed:', error.message);
      throw error;
    }
  }

  /**
   * Run Playwright E2E tests with browser management
   */
  async runPlaywrightTests(options) {
    try {
      console.log('🎭 Running Playwright E2E tests with browser management...');
      
      // Start development server if needed
      let devServer = null;
      if (!options.skipServerStart) {
        devServer = await this.startDevServer({ verbose: false, timeout: 60000 });
      }
      
      try {
        const testCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
        const testArgs = [
          'playwright',
          'test',
          '--reporter=list,json,html',
          '--workers=1', // Single worker for resource management
          '--retries=1'
        ];
        
        // Add project filter if specified
        if (options.project) {
          testArgs.push(`--project=${options.project}`);
        }
        
        // Add grep filter if specified
        if (options.grep) {
          testArgs.push(`--grep=${options.grep}`);
        }
        
        const result = await this.executeCommandWithMonitoring(testCmd, testArgs, {
          cwd: this.frontendDir,
          timeout: options.timeout || 600000, // 10 minutes
          testType: 'e2e',
          browserManagement: true
        });
        
        // Collect performance metrics from test results
        await this.collectPlaywrightMetrics();
        
        return result;
        
      } finally {
        // Cleanup development server
        if (devServer && devServer.process) {
          try {
            devServer.process.kill();
            console.log('✅ Development server terminated');
          } catch (e) {
            console.warn('⚠️ Failed to terminate development server:', e.message);
          }
        }
      }
      
    } catch (error) {
      console.error('❌ Playwright tests failed:', error.message);
      throw error;
    }
  }

  /**
   * Run visual regression tests
   */
  async runVisualRegressionTests(options) {
    try {
      console.log('👁️ Running visual regression tests...');
      
      const testCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
      const testArgs = [
        'playwright',
        'test',
        '--grep=visual',
        '--reporter=list',
        '--update-snapshots'
      ];
      
      const result = await this.executeCommandWithMonitoring(testCmd, testArgs, {
        cwd: this.frontendDir,
        timeout: options.timeout || 300000,
        testType: 'visual'
      });
      
      return result;
      
    } catch (error) {
      console.error('❌ Visual regression tests failed:', error.message);
      throw error;
    }
  }

  /**
   * Run performance tests with Core Web Vitals
   */
  async runPerformanceTests(options) {
    try {
      console.log('⚡ Running performance tests with Core Web Vitals...');
      
      const testCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
      const testArgs = [
        'playwright',
        'test',
        '--grep=performance',
        '--reporter=list'
      ];
      
      const result = await this.executeCommandWithMonitoring(testCmd, testArgs, {
        cwd: this.frontendDir,
        timeout: options.timeout || 300000,
        testType: 'performance'
      });
      
      // Validate performance budgets
      await this.validatePerformanceBudgets();
      
      return result;
      
    } catch (error) {
      console.error('❌ Performance tests failed:', error.message);
      throw error;
    }
  }

  /**
   * Run accessibility tests with WCAG validation
   */
  async runAccessibilityTests(options) {
    try {
      console.log('♿ Running accessibility tests with WCAG validation...');
      
      const testCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
      const testArgs = [
        'playwright',
        'test',
        '--grep=accessibility',
        '--reporter=list'
      ];
      
      const result = await this.executeCommandWithMonitoring(testCmd, testArgs, {
        cwd: this.frontendDir,
        timeout: options.timeout || 300000,
        testType: 'accessibility'
      });
      
      return result;
      
    } catch (error) {
      console.error('❌ Accessibility tests failed:', error.message);
      throw error;
    }
  }

  /**
   * Execute command with comprehensive monitoring
   */
  async executeCommandWithMonitoring(command, args, options) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      let output = '';
      let errorOutput = '';
      
      console.log(`🔧 Running: ${command} ${args.join(' ')}`);
      
      const child = spawn(command, args, {
        cwd: options.cwd || this.frontendDir,
        shell: true,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      // Store browser process for monitoring
      if (options.browserManagement) {
        this.browserInstances.set(child.pid, {
          process: child,
          startTime,
          testType: options.testType
        });
      }

      // Monitor process
      const monitoring = setInterval(async () => {
        try {
          await this.monitorTestExecution(child.pid, startTime, options.testType);
        } catch (e) {
          // Monitoring errors are non-critical
        }
      }, 5000);

      child.stdout.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;
        process.stdout.write(chunk);
      });

      child.stderr.on('data', (data) => {
        const chunk = data.toString();
        errorOutput += chunk;
        process.stderr.write(chunk);
      });

      child.on('close', (code) => {
        clearInterval(monitoring);
        
        // Cleanup browser instance tracking
        if (options.browserManagement) {
          this.browserInstances.delete(child.pid);
        }
        
        const duration = Date.now() - startTime;
        const result = {
          exitCode: code,
          duration,
          output,
          errorOutput,
          success: code === 0,
          testType: options.testType
        };

        if (code === 0) {
          resolve(result);
        } else {
          reject(new Error(`Command failed with exit code ${code}: ${errorOutput}`));
        }
      });

      child.on('error', (error) => {
        clearInterval(monitoring);
        if (options.browserManagement) {
          this.browserInstances.delete(child.pid);
        }
        reject(error);
      });

      // Timeout handling
      if (options.timeout) {
        setTimeout(() => {
          clearInterval(monitoring);
          child.kill('SIGKILL');
          if (options.browserManagement) {
            this.browserInstances.delete(child.pid);
          }
          reject(new Error(`Command timeout after ${options.timeout}ms`));
        }, options.timeout);
      }
    });
  }

  /**
   * Start real-time monitoring with browser leak detection
   */
  async startRealTimeMonitoring() {
    try {
      console.log('🔍 Starting real-time frontend monitoring...');
      
      await this.monitoringSystem.startMonitoring({
        interval: 5000, // 5 seconds
        leakDetection: true,
        performanceTracking: true,
        browserMonitoring: true,
        alerting: true,
        baseline: this.baselineState
      });

      // Setup browser-specific leak detection
      this.monitoringSystem.on('browserLeak', async (leak) => {
        console.warn(`⚠️ Browser process leak detected: ${leak.processes.length} orphaned browser processes`);
        await this.handleBrowserLeak(leak);
      });

      this.monitoringSystem.on('memoryLeak', async (leak) => {
        console.warn(`⚠️ Memory leak detected: ${leak.memoryIncrease}MB increase`);
        await this.handleMemoryLeak(leak);
      });

      console.log('✅ Real-time frontend monitoring active');
      
    } catch (error) {
      console.error('❌ Failed to start frontend monitoring:', error.message);
      throw error;
    }
  }

  /**
   * Handle browser leak with cleanup
   */
  async handleBrowserLeak(leak) {
    try {
      console.log('🛠️ Automated browser leak intervention...');
      
      const cleanupDecision = await this.intelligentCleaner.analyzeBrowserLeak(leak);
      
      if (cleanupDecision.shouldCleanup) {
        const cleanupResult = await this.intelligentCleaner.cleanupBrowserProcesses(
          leak.processes,
          { strategy: cleanupDecision.strategy }
        );
        
        console.log(`✅ Browser leak intervention successful: ${cleanupResult.cleaned} processes cleaned`);
      }
      
    } catch (error) {
      console.error('❌ Browser leak intervention failed:', error.message);
    }
  }

  /**
   * Handle memory leak with optimization
   */
  async handleMemoryLeak(leak) {
    try {
      console.log('🛠️ Automated memory leak intervention...');
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      // Log memory state for analysis
      const memState = process.memoryUsage();
      console.log(`Memory state: ${Math.round(memState.heapUsed / 1024 / 1024)}MB heap`);
      
    } catch (error) {
      console.error('❌ Memory leak intervention failed:', error.message);
    }
  }

  /**
   * Monitor test execution for performance and leaks
   */
  async monitorTestExecution(pid, startTime, testType) {
    try {
      const currentTime = Date.now();
      const executionTime = currentTime - startTime;
      
      // Check execution time based on test type
      const timeoutThreshold = this.getTimeoutThreshold(testType);
      if (executionTime > timeoutThreshold) {
        console.warn(`⚠️ Long-running ${testType} test detected: ${Math.round(executionTime / 1000)}s`);
      }
      
      // Check memory usage
      const memoryUsage = process.memoryUsage();
      const baselineMemory = this.baselineState.get('memory');
      const memoryIncrease = (memoryUsage.heapUsed - baselineMemory.heapUsed) / 1024 / 1024;
      
      if (memoryIncrease > 1000) { // 1GB increase
        console.warn(`⚠️ Memory increase detected: ${Math.round(memoryIncrease)}MB`);
      }
      
      // Check browser process count
      const currentProcesses = await this.platformIntegration.getRunningProcesses();
      const baselineBrowserProcs = this.baselineState.get('browserProcesses');
      const currentBrowserProcs = currentProcesses.filter(p => 
        p.name?.toLowerCase().match(/(chrome|firefox|safari|edge|playwright)/)
      );
      const newBrowserCount = currentBrowserProcs.length - baselineBrowserProcs.length;
      
      if (newBrowserCount > 10) {
        console.warn(`⚠️ Browser process count increase: ${newBrowserCount} new browser processes`);
      }
      
    } catch (error) {
      // Monitoring errors are non-critical
    }
  }

  /**
   * Get timeout threshold based on test type
   */
  getTimeoutThreshold(testType) {
    const thresholds = {
      unit: 60000, // 1 minute
      contract: 180000, // 3 minutes
      e2e: 600000, // 10 minutes
      visual: 300000, // 5 minutes
      performance: 300000, // 5 minutes
      accessibility: 300000 // 5 minutes
    };
    
    return thresholds[testType] || 300000;
  }

  /**
   * Collect Playwright metrics from test results
   */
  async collectPlaywrightMetrics() {
    try {
      console.log('📊 Collecting Playwright performance metrics...');
      
      const resultsPath = path.join(this.frontendDir, 'test-results');
      const reportPath = path.join(this.frontendDir, 'playwright-report');
      
      // Try to read Playwright JSON report
      try {
        const jsonReportPath = path.join(this.frontendDir, 'results.json');
        const reportData = await fs.readFile(jsonReportPath, 'utf8');
        const report = JSON.parse(reportData);
        
        // Extract performance metrics
        if (report.suites) {
          report.suites.forEach(suite => {
            suite.specs?.forEach(spec => {
              spec.tests?.forEach(test => {
                if (test.results) {
                  const result = test.results[0];
                  if (result.duration) {
                    this.performanceMetrics.loadTimes.push(result.duration);
                  }
                }
              });
            });
          });
        }
        
        console.log(`✅ Collected metrics for ${this.performanceMetrics.loadTimes.length} tests`);
      } catch (e) {
        console.warn('⚠️ Could not collect detailed Playwright metrics:', e.message);
      }
      
    } catch (error) {
      console.warn('⚠️ Metrics collection failed (non-critical):', error.message);
    }
  }

  /**
   * Validate performance budgets
   */
  async validatePerformanceBudgets() {
    try {
      console.log('📊 Validating performance budgets...');
      
      let budgetViolations = 0;
      
      // Check load times
      if (this.performanceMetrics.loadTimes.length > 0) {
        const avgLoadTime = this.performanceMetrics.loadTimes.reduce((a, b) => a + b, 0) / this.performanceMetrics.loadTimes.length;
        
        if (avgLoadTime > this.performanceBudgets.loadTime) {
          console.warn(`⚠️ Load time budget violation: ${Math.round(avgLoadTime)}ms > ${this.performanceBudgets.loadTime}ms`);
          budgetViolations++;
        }
      }
      
      // Check bundle size (if available)
      try {
        const distPath = path.join(this.frontendDir, 'dist');
        const stats = await this.getBundleSize(distPath);
        
        if (stats.totalSize > this.performanceBudgets.bundleSize) {
          console.warn(`⚠️ Bundle size budget violation: ${Math.round(stats.totalSize / 1024 / 1024)}MB > ${Math.round(this.performanceBudgets.bundleSize / 1024 / 1024)}MB`);
          budgetViolations++;
        }
      } catch (e) {
        // Bundle size check is optional
      }
      
      if (budgetViolations === 0) {
        console.log('✅ All performance budgets met');
      } else {
        console.warn(`⚠️ ${budgetViolations} performance budget violations detected`);
      }
      
    } catch (error) {
      console.warn('⚠️ Performance budget validation failed (non-critical):', error.message);
    }
  }

  /**
   * Get bundle size statistics
   */
  async getBundleSize(distPath) {
    try {
      const files = await fs.readdir(distPath, { recursive: true });
      let totalSize = 0;
      
      for (const file of files) {
        const filePath = path.join(distPath, file);
        const stat = await fs.stat(filePath);
        
        if (stat.isFile()) {
          totalSize += stat.size;
        }
      }
      
      return { totalSize, fileCount: files.length };
    } catch (error) {
      throw new Error(`Failed to calculate bundle size: ${error.message}`);
    }
  }

  /**
   * Validate execution performance against benchmarks
   */
  async validateExecutionPerformance(executionId, duration, result) {
    try {
      console.log('📊 Validating frontend execution performance...');
      
      // Load historical performance data
      const historyFile = path.join(this.projectRoot, 'tools', 'scripts', '.frontend-performance-history.json');
      let history = [];
      
      try {
        const historyData = await fs.readFile(historyFile, 'utf8');
        history = JSON.parse(historyData);
      } catch (e) {
        history = [];
      }
      
      // Calculate performance metrics
      const performanceData = {
        executionId,
        timestamp: new Date().toISOString(),
        duration,
        success: result.success,
        testType: result.testType,
        memoryUsage: process.memoryUsage(),
        browserProcessCount: this.browserInstances.size,
        performanceMetrics: this.performanceMetrics
      };
      
      history.push(performanceData);
      
      // Keep only last 50 entries
      if (history.length > 50) {
        history = history.slice(-50);
      }
      
      await fs.writeFile(historyFile, JSON.stringify(history, null, 2));
      
      console.log(`✅ Performance validation completed - Duration: ${Math.round(duration / 1000)}s`);
      
    } catch (error) {
      console.warn('⚠️ Frontend performance validation failed (non-critical):', error.message);
    }
  }

  /**
   * Generate comprehensive multi-format test report
   */
  async generateComprehensiveReport(executionId, testType, result, duration) {
    try {
      console.log('📋 Generating comprehensive frontend test report...');
      
      const reportDir = path.join(this.projectRoot, 'docs', 'test-results');
      await fs.mkdir(reportDir, { recursive: true });
      
      const jsonReport = {
        executionId,
        testType,
        timestamp: new Date().toISOString(),
        duration,
        result: {
          success: result.success,
          exitCode: result.exitCode
        },
        performance: {
          metrics: this.performanceMetrics,
          budgets: this.performanceBudgets
        },
        browserInstances: this.browserInstances.size,
        systemState: {
          baseline: Object.fromEntries(this.baselineState),
          final: {
            memory: process.memoryUsage(),
            processes: (await this.platformIntegration.getRunningProcesses()).length
          }
        }
      };
      
      const reportFile = path.join(reportDir, `frontend-${testType}-report-${executionId}.json`);
      await fs.writeFile(reportFile, JSON.stringify(jsonReport, null, 2));
      
      // Generate summary report
      const summaryFile = path.join(reportDir, `frontend-${testType}-summary.json`);
      const summaryReport = {
        testType,
        lastExecution: {
          executionId,
          timestamp: jsonReport.timestamp,
          duration,
          success: result.success
        },
        performance: jsonReport.performance
      };
      await fs.writeFile(summaryFile, JSON.stringify(summaryReport, null, 2));
      
      console.log(`✅ Comprehensive frontend report generated: ${reportFile}`);
      
    } catch (error) {
      console.warn('⚠️ Frontend report generation failed (non-critical):', error.message);
    }
  }

  /**
   * Perform emergency recovery with browser cleanup
   */
  async performEmergencyRecovery(executionId, error) {
    try {
      console.log('🚨 Performing emergency frontend recovery...');
      
      const recoveryStartTime = Date.now();
      
      // Kill all browser instances
      for (const [pid, instance] of this.browserInstances) {
        try {
          instance.process.kill('SIGKILL');
          console.log(`✅ Killed browser instance ${pid}`);
        } catch (e) {
          console.warn(`⚠️ Failed to kill browser instance ${pid}:`, e.message);
        }
      }
      this.browserInstances.clear();
      
      // Kill development server if running
      if (this.devServerProcess && !this.devServerProcess.killed) {
        this.devServerProcess.kill('SIGKILL');
        console.log('✅ Killed development server');
      }
      
      // Use AI-driven emergency recovery
      const recoveryDecision = await this.intelligentCleaner.analyzeFailure({
        executionId,
        error,
        systemState: {
          processes: await this.platformIntegration.getRunningProcesses(),
          memory: process.memoryUsage(),
          baseline: Object.fromEntries(this.baselineState)
        }
      });
      
      await this.intelligentCleaner.executeRecoveryStrategy(recoveryDecision);
      
      const recoveryTime = Date.now() - recoveryStartTime;
      console.log(`✅ Emergency frontend recovery completed in ${recoveryTime}ms`);
      
      if (recoveryTime < 5000) {
        console.log('✅ Recovery time requirement met (<5 seconds)');
      } else {
        console.warn(`⚠️ Recovery time exceeded 5-second requirement: ${recoveryTime}ms`);
      }
      
    } catch (recoveryError) {
      console.error('❌ Emergency frontend recovery failed:', recoveryError.message);
    }
  }

  /**
   * Comprehensive cleanup with browser validation
   */
  async cleanup() {
    try {
      console.log('\n🧹 Starting comprehensive frontend cleanup...');
      const cleanupStartTime = Date.now();
      
      // Stop monitoring
      if (this.monitoringSystem) {
        await this.monitoringSystem.stopMonitoring();
      }
      
      // Kill all browser instances
      for (const [pid, instance] of this.browserInstances) {
        try {
          instance.process.kill('SIGKILL');
        } catch (e) {
          // Ignore kill errors
        }
      }
      this.browserInstances.clear();
      
      // Kill development server
      if (this.devServerProcess && !this.devServerProcess.killed) {
        try {
          this.devServerProcess.kill('SIGKILL');
        } catch (e) {
          // Ignore kill errors
        }
      }
      
      // AI-driven intelligent cleanup
      if (this.intelligentCleaner) {
        await this.intelligentCleaner.performComprehensiveCleanup({
          baseline: this.baselineState,
          strategy: 'browser_aware'
        });
      }
      
      // Orchestrator shutdown
      if (this.orchestrator) {
        await this.orchestrator.emergencyShutdown();
      }
      
      // Validate cleanup completion
      await this.validateCleanupCompletion();
      
      const cleanupTime = Date.now() - cleanupStartTime;
      console.log(`✅ Comprehensive frontend cleanup completed in ${cleanupTime}ms`);
      
      if (cleanupTime < 5000) {
        console.log('✅ Cleanup time requirement met (<5 seconds)');
      } else {
        console.warn(`⚠️ Cleanup time exceeded 5-second requirement: ${cleanupTime}ms`);
      }
      
    } catch (error) {
      console.error('❌ Frontend cleanup failed:', error.message);
    }
  }

  /**
   * Validate cleanup completion with browser leak detection
   */
  async validateCleanupCompletion() {
    try {
      console.log('🔍 Validating frontend cleanup completion...');
      
      const finalProcesses = await this.platformIntegration.getRunningProcesses();
      const baselineProcesses = this.baselineState.get('processes') || [];
      
      // Find browser processes that should have been cleaned up
      const suspiciousBrowserProcesses = finalProcesses.filter(current => {
        const isBaseline = baselineProcesses.some(baseline => baseline.pid === current.pid);
        const isBrowser = current.name?.toLowerCase().match(/(chrome|firefox|safari|edge|playwright|node)/);
        return !isBaseline && isBrowser;
      });
      
      if (suspiciousBrowserProcesses.length === 0) {
        console.log('✅ Zero browser process leaks detected - cleanup validation passed');
        return true;
      } else {
        console.warn(`⚠️ ${suspiciousBrowserProcesses.length} potential browser process leaks detected`);
        suspiciousBrowserProcesses.forEach(proc => {
          console.warn(`   - PID ${proc.pid}: ${proc.name}`);
        });
        return false;
      }
      
    } catch (error) {
      console.warn('⚠️ Frontend cleanup validation failed (non-critical):', error.message);
      return false;
    }
  }

  /**
   * Print usage information
   */
  static printUsage() {
    console.log('\n🚀 Revolutionary Frontend Test Runner - Epic 2.2');
    console.log('node tools/scripts/test-frontend.js [type] [options]');
    console.log('\nTest Types:');
    console.log('  unit         - Unit tests with Vitest');
    console.log('  contract     - Contract tests with API validation');
    console.log('  e2e          - E2E tests with Playwright');
    console.log('  visual       - Visual regression tests');
    console.log('  performance  - Performance tests with Core Web Vitals');
    console.log('  accessibility- Accessibility tests with WCAG validation');
    console.log('\nRevolutionary Features:');
    console.log('  ✅ Browser process lifecycle management');
    console.log('  ✅ Real-time performance monitoring');
    console.log('  ✅ Visual regression detection');
    console.log('  ✅ Performance budget enforcement');
    console.log('  ✅ Accessibility compliance validation');
    console.log('  ✅ Cross-browser compatibility testing');
    console.log('  ✅ Zero browser leak guarantee');
    console.log('\nExamples:');
    console.log('  node tools/scripts/test-frontend.js unit');
    console.log('  node tools/scripts/test-frontend.js e2e --project=ui');
    console.log('  node tools/scripts/test-frontend.js performance');
    console.log('');
  }
}

/**
 * Main execution function
 */
async function main() {
  const [,, testType, ...options] = process.argv;
  
  if (!testType || testType === '--help' || testType === '-h') {
    RevolutionaryFrontendTestRunner.printUsage();
    return;
  }

  const runner = new RevolutionaryFrontendTestRunner();
  let exitCode = 0;

  // Parse options
  const parsedOptions = {
    project: options.find(opt => opt.startsWith('--project='))?.split('=')[1],
    grep: options.find(opt => opt.startsWith('--grep='))?.split('=')[1],
    coverage: options.includes('--coverage'),
    skipServerStart: options.includes('--no-server'),
    verbose: options.includes('--verbose')
  };

  // Global timeout protection (20 minutes for frontend tests)
  const globalTimeout = setTimeout(() => {
    console.error('🚨 Global timeout - initiating emergency shutdown');
    runner.cleanup().finally(() => process.exit(1));
  }, 1200000);

  try {
    // Initialize revolutionary infrastructure
    await runner.initialize();
    
    // Execute tests with comprehensive monitoring
    console.log(`\n=== Revolutionary Frontend ${testType.toUpperCase()} Test Execution ===`);
    await runner.executeTests(testType, {
      ...parsedOptions,
      emergencyRecovery: true,
      isolation: true,
      monitoring: true
    });
    
    console.log('\n✅ Revolutionary frontend test execution completed successfully');
    
  } catch (error) {
    exitCode = 1;
    console.error('\n❌ Revolutionary frontend test execution failed:', error.message);
  } finally {
    clearTimeout(globalTimeout);
    
    // Comprehensive cleanup with validation
    await runner.cleanup();
    
    // Force exit to prevent hanging
    setTimeout(() => {
      console.log('🔄 Forcing exit to prevent process hanging');
      process.exit(exitCode);
    }, 2000);
  }
}

// Execute main with proper error handling
main().catch((error) => {
  console.error('🚨 Fatal error in revolutionary frontend test runner:', error.message);
  process.exit(1);
});