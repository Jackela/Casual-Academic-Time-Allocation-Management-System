#!/usr/bin/env node

/**
 * Performance Validation Script
 *
 * Validates all performance requirements for the monitoring system:
 * - Process detection latency: <10ms
 * - Memory leak detection: <50MB threshold
 * - Alert response time: <1 second
 * - Dashboard updates: <100ms
 *
 * @author CATAMS Team
 * @version 1.0.0
 */

const path = require('path')
const { performance } = require('perf_hooks')

const MonitoringSystem = require('../src/MonitoringSystem')

class PerformanceValidator {
  constructor() {
    this.testResults = []
    this.overallStatus = 'unknown'
  }

  /**
   * Run comprehensive performance validation
   */
  async runValidation() {
    console.log('🚀 Starting Performance Validation Suite')
    console.log('=' .repeat(60))

    const startTime = performance.now()
    let monitoringSystem = null

    try {
      // Initialize monitoring system
      console.log('📊 Initializing monitoring system...')
      monitoringSystem = new MonitoringSystem({
        enablePerformanceValidation: true
      })

      // Start monitoring system
      await monitoringSystem.startMonitoring()
      console.log('✅ Monitoring system started\n')

      // Wait for system to stabilize
      console.log('⏳ Waiting for system to stabilize...')
      await this.wait(2000)

      // Run performance tests
      await this.runPerformanceTests(monitoringSystem)

      // Generate final report
      const totalTime = performance.now() - startTime
      this.generateFinalReport(totalTime)

    } catch (error) {
      console.error('❌ Validation failed:', error.message)
      this.overallStatus = 'error'
    } finally {
      // Cleanup
      if (monitoringSystem) {
        try {
          console.log('\n🧹 Cleaning up...')
          await monitoringSystem.stopMonitoring()
          await monitoringSystem.cleanup()
        } catch (error) {
          console.error('⚠️  Cleanup error:', error.message)
        }
      }
    }

    // Exit with appropriate code
    process.exit(this.overallStatus === 'pass' ? 0 : 1)
  }

  /**
   * Run all performance tests
   */
  async runPerformanceTests(monitoringSystem) {
    console.log('🔍 Running Performance Tests')
    console.log('-'.repeat(40))

    // Test 1: Process Detection Latency
    await this.testProcessDetectionLatency(monitoringSystem)

    // Test 2: Memory Leak Detection
    await this.testMemoryLeakDetection(monitoringSystem)

    // Test 3: Alert Response Time
    await this.testAlertResponseTime(monitoringSystem)

    // Test 4: Dashboard Update Latency
    await this.testDashboardUpdateLatency(monitoringSystem)

    // Test 5: System Integration Performance
    await this.testSystemIntegrationPerformance(monitoringSystem)

    // Test 6: Load Testing
    await this.testSystemUnderLoad(monitoringSystem)
  }

  /**
   * Test process detection latency
   */
  async testProcessDetectionLatency(monitoringSystem) {
    console.log('📈 Testing Process Detection Latency...')
    
    try {
      const realTimeMonitor = monitoringSystem.components.get('realTimeMonitor')
      
      if (!realTimeMonitor) {
        this.addTestResult('Process Detection Latency', 'skipped', 'Component not available')
        return
      }

      const latencies = []
      const iterations = 20

      for (let i = 0; i < iterations; i++) {
        const start = performance.now()
        await realTimeMonitor.scanProcesses()
        const latency = performance.now() - start
        latencies.push(latency)
        
        // Small delay between tests
        await this.wait(10)
      }

      const avgLatency = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length
      const maxLatency = Math.max(...latencies)
      const minLatency = Math.min(...latencies)

      const requirement = 10 // 10ms
      const status = avgLatency < requirement ? 'pass' : 'fail'

      console.log(`  Average: ${avgLatency.toFixed(3)}ms`)
      console.log(`  Min: ${minLatency.toFixed(3)}ms, Max: ${maxLatency.toFixed(3)}ms`)
      console.log(`  Requirement: <${requirement}ms`)
      console.log(`  Status: ${status.toUpperCase()}`)

      this.addTestResult('Process Detection Latency', status, {
        requirement: `<${requirement}ms`,
        actual: `${avgLatency.toFixed(3)}ms`,
        min: `${minLatency.toFixed(3)}ms`,
        max: `${maxLatency.toFixed(3)}ms`,
        iterations
      })

    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`)
      this.addTestResult('Process Detection Latency', 'error', error.message)
    }

    console.log()
  }

  /**
   * Test memory leak detection
   */
  async testMemoryLeakDetection(monitoringSystem) {
    console.log('🧠 Testing Memory Leak Detection...')
    
    try {
      const leakDetector = monitoringSystem.components.get('leakDetector')
      
      if (!leakDetector) {
        this.addTestResult('Memory Leak Detection', 'skipped', 'Component not available')
        return
      }

      // Test detection time
      const start = performance.now()
      const scanResult = await leakDetector.performScan()
      const detectionTime = performance.now() - start

      // Test threshold configuration
      const metrics = leakDetector.getMetrics()
      const threshold = metrics.config?.memoryThreshold || 50 * 1024 * 1024 // 50MB

      const requirement = 50 * 1024 * 1024 // 50MB
      const thresholdCorrect = threshold <= requirement
      const detectionFast = detectionTime < 1000 // Should detect within 1 second

      const status = thresholdCorrect && detectionFast ? 'pass' : 'fail'

      console.log(`  Detection time: ${detectionTime.toFixed(3)}ms`)
      console.log(`  Threshold: ${Math.round(threshold / 1024 / 1024)}MB`)
      console.log(`  Requirement: ≤${Math.round(requirement / 1024 / 1024)}MB`)
      console.log(`  Status: ${status.toUpperCase()}`)

      this.addTestResult('Memory Leak Detection', status, {
        requirement: `≤${Math.round(requirement / 1024 / 1024)}MB threshold`,
        actual: `${Math.round(threshold / 1024 / 1024)}MB`,
        detectionTime: `${detectionTime.toFixed(3)}ms`,
        algorithms: scanResult?.algorithms ? Object.keys(scanResult.algorithms).length : 0
      })

    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`)
      this.addTestResult('Memory Leak Detection', 'error', error.message)
    }

    console.log()
  }

  /**
   * Test alert response time
   */
  async testAlertResponseTime(monitoringSystem) {
    console.log('🚨 Testing Alert Response Time...')
    
    try {
      const alertManager = monitoringSystem.components.get('alertManager')
      
      if (!alertManager) {
        this.addTestResult('Alert Response Time', 'skipped', 'Component not available')
        return
      }

      const responseTimes = []
      const iterations = 10

      for (let i = 0; i < iterations; i++) {
        const start = performance.now()
        
        await alertManager.processAlert({
          type: 'performance_test',
          severity: 'low',
          message: `Performance test alert ${i + 1}`,
          source: 'PerformanceValidator',
          metadata: { testId: i + 1 }
        })
        
        const responseTime = performance.now() - start
        responseTimes.push(responseTime)
        
        await this.wait(100) // Small delay between alerts
      }

      const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      const maxResponseTime = Math.max(...responseTimes)

      const requirement = 1000 // 1 second
      const status = avgResponseTime < requirement ? 'pass' : 'fail'

      console.log(`  Average: ${avgResponseTime.toFixed(3)}ms`)
      console.log(`  Max: ${maxResponseTime.toFixed(3)}ms`)
      console.log(`  Requirement: <${requirement}ms`)
      console.log(`  Status: ${status.toUpperCase()}`)

      this.addTestResult('Alert Response Time', status, {
        requirement: `<${requirement}ms`,
        actual: `${avgResponseTime.toFixed(3)}ms`,
        max: `${maxResponseTime.toFixed(3)}ms`,
        iterations
      })

    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`)
      this.addTestResult('Alert Response Time', 'error', error.message)
    }

    console.log()
  }

  /**
   * Test dashboard update latency
   */
  async testDashboardUpdateLatency(monitoringSystem) {
    console.log('📊 Testing Dashboard Update Latency...')
    
    try {
      const dashboard = monitoringSystem.components.get('dashboard')
      
      if (!dashboard) {
        this.addTestResult('Dashboard Update Latency', 'skipped', 'Component not available')
        return
      }

      const updateTimes = []
      const iterations = 15

      for (let i = 0; i < iterations; i++) {
        if (typeof dashboard._aggregateData === 'function') {
          const start = performance.now()
          await dashboard._aggregateData()
          const updateTime = performance.now() - start
          updateTimes.push(updateTime)
        } else {
          // Fallback: measure dashboard data retrieval
          const start = performance.now()
          dashboard.getDashboardData()
          const updateTime = performance.now() - start
          updateTimes.push(updateTime)
        }
        
        await this.wait(50) // Small delay between updates
      }

      const avgUpdateTime = updateTimes.reduce((sum, time) => sum + time, 0) / updateTimes.length
      const maxUpdateTime = Math.max(...updateTimes)

      const requirement = 100 // 100ms
      const status = avgUpdateTime < requirement ? 'pass' : 'fail'

      console.log(`  Average: ${avgUpdateTime.toFixed(3)}ms`)
      console.log(`  Max: ${maxUpdateTime.toFixed(3)}ms`)
      console.log(`  Requirement: <${requirement}ms`)
      console.log(`  Status: ${status.toUpperCase()}`)

      this.addTestResult('Dashboard Update Latency', status, {
        requirement: `<${requirement}ms`,
        actual: `${avgUpdateTime.toFixed(3)}ms`,
        max: `${maxUpdateTime.toFixed(3)}ms`,
        iterations
      })

    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`)
      this.addTestResult('Dashboard Update Latency', 'error', error.message)
    }

    console.log()
  }

  /**
   * Test system integration performance
   */
  async testSystemIntegrationPerformance(monitoringSystem) {
    console.log('🔗 Testing System Integration Performance...')
    
    try {
      const start = performance.now()
      
      // Get system status (tests component integration)
      const systemStatus = monitoringSystem.getSystemStatus()
      
      const integrationTime = performance.now() - start
      const componentCount = Object.keys(systemStatus.components).length
      const activeComponents = Object.values(systemStatus.components)
        .filter(comp => comp && !comp.error).length

      const requirement = 200 // 200ms for system status
      const status = integrationTime < requirement ? 'pass' : 'fail'

      console.log(`  Integration time: ${integrationTime.toFixed(3)}ms`)
      console.log(`  Components: ${activeComponents}/${componentCount} active`)
      console.log(`  Requirement: <${requirement}ms`)
      console.log(`  Status: ${status.toUpperCase()}`)

      this.addTestResult('System Integration Performance', status, {
        requirement: `<${requirement}ms`,
        actual: `${integrationTime.toFixed(3)}ms`,
        components: `${activeComponents}/${componentCount}`,
        isRunning: systemStatus.isRunning
      })

    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`)
      this.addTestResult('System Integration Performance', 'error', error.message)
    }

    console.log()
  }

  /**
   * Test system under load
   */
  async testSystemUnderLoad(monitoringSystem) {
    console.log('⚡ Testing System Under Load...')
    
    try {
      const concurrentOperations = 5
      const operationsPerTest = 10
      const loadTests = []

      // Create multiple concurrent operations
      for (let i = 0; i < concurrentOperations; i++) {
        loadTests.push(this.runLoadTest(monitoringSystem, operationsPerTest, i))
      }

      const start = performance.now()
      const results = await Promise.all(loadTests)
      const loadTestTime = performance.now() - start

      // Analyze results
      const allLatencies = results.flat()
      const avgLatency = allLatencies.reduce((sum, lat) => sum + lat, 0) / allLatencies.length
      const maxLatency = Math.max(...allLatencies)
      const throughput = (concurrentOperations * operationsPerTest) / (loadTestTime / 1000)

      const requirement = 50 // 50ms average under load
      const status = avgLatency < requirement ? 'pass' : 'fail'

      console.log(`  Concurrent operations: ${concurrentOperations}`)
      console.log(`  Total operations: ${concurrentOperations * operationsPerTest}`)
      console.log(`  Average latency: ${avgLatency.toFixed(3)}ms`)
      console.log(`  Max latency: ${maxLatency.toFixed(3)}ms`)
      console.log(`  Throughput: ${throughput.toFixed(1)} ops/sec`)
      console.log(`  Requirement: <${requirement}ms average`)
      console.log(`  Status: ${status.toUpperCase()}`)

      this.addTestResult('System Under Load', status, {
        requirement: `<${requirement}ms average under load`,
        actual: `${avgLatency.toFixed(3)}ms`,
        max: `${maxLatency.toFixed(3)}ms`,
        throughput: `${throughput.toFixed(1)} ops/sec`,
        operations: concurrentOperations * operationsPerTest
      })

    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`)
      this.addTestResult('System Under Load', 'error', error.message)
    }

    console.log()
  }

  /**
   * Run load test
   */
  async runLoadTest(monitoringSystem, operations, testId) {
    const latencies = []
    const realTimeMonitor = monitoringSystem.components.get('realTimeMonitor')
    
    if (!realTimeMonitor) {
      return latencies
    }

    for (let i = 0; i < operations; i++) {
      const start = performance.now()
      
      try {
        await realTimeMonitor.scanProcesses()
        const latency = performance.now() - start
        latencies.push(latency)
      } catch (error) {
        // Record error as high latency
        latencies.push(1000)
      }
      
      // Small random delay to simulate real usage
      await this.wait(Math.random() * 20)
    }

    return latencies
  }

  /**
   * Add test result
   */
  addTestResult(testName, status, details) {
    this.testResults.push({
      test: testName,
      status,
      details,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Generate final report
   */
  generateFinalReport(totalTime) {
    console.log('📋 Performance Validation Report')
    console.log('=' .repeat(60))

    const passedTests = this.testResults.filter(r => r.status === 'pass').length
    const failedTests = this.testResults.filter(r => r.status === 'fail').length
    const errorTests = this.testResults.filter(r => r.status === 'error').length
    const skippedTests = this.testResults.filter(r => r.status === 'skipped').length
    const totalTests = this.testResults.length

    // Determine overall status
    if (errorTests > 0) {
      this.overallStatus = 'error'
    } else if (failedTests > 0) {
      this.overallStatus = 'fail'
    } else if (passedTests > 0) {
      this.overallStatus = 'pass'
    } else {
      this.overallStatus = 'unknown'
    }

    // Print summary
    console.log(`Total Tests: ${totalTests}`)
    console.log(`Passed: ${passedTests} ✅`)
    console.log(`Failed: ${failedTests} ❌`)
    console.log(`Errors: ${errorTests} 💥`)
    console.log(`Skipped: ${skippedTests} ⏭️`)
    console.log(`Total Time: ${(totalTime / 1000).toFixed(3)}s`)
    console.log()

    // Print detailed results
    for (const result of this.testResults) {
      const icon = this.getStatusIcon(result.status)
      console.log(`${icon} ${result.test}: ${result.status.toUpperCase()}`)
      
      if (typeof result.details === 'object' && result.details !== null) {
        Object.entries(result.details).forEach(([key, value]) => {
          console.log(`    ${key}: ${value}`)
        })
      } else if (result.details) {
        console.log(`    ${result.details}`)
      }
      console.log()
    }

    // Final verdict
    const overallIcon = this.getStatusIcon(this.overallStatus)
    console.log(`${overallIcon} OVERALL STATUS: ${this.overallStatus.toUpperCase()}`)
    
    if (this.overallStatus === 'pass') {
      console.log('🎉 All performance requirements validated successfully!')
    } else if (this.overallStatus === 'fail') {
      console.log('⚠️  Some performance requirements not met. Review failed tests above.')
    } else {
      console.log('💥 Validation encountered errors. Check error messages above.')
    }
  }

  /**
   * Get status icon
   */
  getStatusIcon(status) {
    const icons = {
      pass: '✅',
      fail: '❌',
      error: '💥',
      skipped: '⏭️',
      unknown: '❓'
    }
    return icons[status] || '❓'
  }

  /**
   * Wait for specified milliseconds
   */
  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new PerformanceValidator()
  validator.runValidation().catch(console.error)
}

module.exports = PerformanceValidator