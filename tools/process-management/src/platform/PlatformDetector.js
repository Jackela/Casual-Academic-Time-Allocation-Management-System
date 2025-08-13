/**
 * Platform Detection System
 *
 * Comprehensive platform detection with detailed capability analysis:
 * - Operating system identification and version detection
 * - Available tool validation (wmic, taskkill, ps, kill, lsof)
 * - Shell environment detection (cmd, PowerShell, bash, zsh, fish)
 * - Performance characteristics profiling per platform
 * - Feature availability checking for advanced functionality
 *
 * @author CATAMS Team
 * @version 1.0.0
 */

const { exec } = require('child_process')
const { promisify } = require('util')
const os = require('os')
const path = require('path')

const execAsync = promisify(exec)

/**
 * Platform Detection and Capability Analysis System
 */
class PlatformDetector {
  constructor() {
    this.detectionCache = new Map()
    this.capabilityCache = new Map()
    this.performanceProfile = null
    this.lastDetection = null
  }

  /**
   * Detect complete platform information with caching
   * @param {boolean} forceRefresh - Force fresh detection
   * @returns {Promise<Object>} Complete platform information
   */
  async detectPlatform(forceRefresh = false) {
    const cacheKey = 'platform_info'
    
    if (!forceRefresh && this.detectionCache.has(cacheKey)) {
      const cached = this.detectionCache.get(cacheKey)
      if (Date.now() - cached.timestamp < 300000) { // 5 minute cache
        return cached.data
      }
    }

    const detection = await this._performPlatformDetection()
    
    this.detectionCache.set(cacheKey, {
      data: detection,
      timestamp: Date.now()
    })
    
    this.lastDetection = detection
    return detection
  }

  /**
   * Perform comprehensive platform detection
   * @returns {Promise<Object>} Platform detection results
   * @private
   */
  async _performPlatformDetection() {
    const basic = this._detectBasicPlatform()
    const version = await this._detectVersion()
    const arch = this._detectArchitecture()
    const shell = await this._detectShellEnvironment()
    const tools = await this._detectAvailableTools()
    const capabilities = await this._detectCapabilities()
    const performance = await this._profilePerformance()
    
    return {
      // Basic platform info
      platform: basic.platform,
      type: basic.type,
      family: basic.family,
      
      // Version information
      version: version.version,
      release: version.release,
      build: version.build,
      
      // Architecture
      arch: arch.arch,
      bits: arch.bits,
      endianness: arch.endianness,
      
      // Shell environment
      shell: shell.primary,
      availableShells: shell.available,
      terminalType: shell.terminalType,
      
      // Available tools
      tools: tools.available,
      missingTools: tools.missing,
      toolVersions: tools.versions,
      
      // Platform capabilities
      capabilities: capabilities,
      
      // Performance profile
      performance: performance,
      
      // Detection metadata
      detectedAt: new Date().toISOString(),
      detectionId: this._generateDetectionId(),
      confidence: this._calculateConfidence(tools, capabilities)
    }
  }

  /**
   * Detect basic platform information
   * @returns {Object} Basic platform info
   * @private
   */
  _detectBasicPlatform() {
    const platform = process.platform
    
    const platformMap = {
      'win32': {
        platform: 'win32',
        type: 'Windows',
        family: 'NT'
      },
      'darwin': {
        platform: 'darwin',
        type: 'macOS',
        family: 'Unix'
      },
      'linux': {
        platform: 'linux',
        type: 'Linux',
        family: 'Unix'
      },
      'freebsd': {
        platform: 'freebsd',
        type: 'FreeBSD',
        family: 'Unix'
      },
      'openbsd': {
        platform: 'openbsd',
        type: 'OpenBSD',
        family: 'Unix'
      }
    }
    
    return platformMap[platform] || {
      platform,
      type: 'Unknown',
      family: 'Unknown'
    }
  }

  /**
   * Detect operating system version
   * @returns {Promise<Object>} Version information
   * @private
   */
  async _detectVersion() {
    const platform = process.platform
    
    try {
      if (platform === 'win32') {
        return await this._detectWindowsVersion()
      } else if (platform === 'darwin') {
        return await this._detectMacOSVersion()
      } else if (platform === 'linux') {
        return await this._detectLinuxVersion()
      }
    } catch (error) {
      // Fallback to Node.js detection
      return {
        version: os.release(),
        release: os.release(),
        build: 'unknown',
        source: 'nodejs-fallback',
        error: error.message
      }
    }
  }

  /**
   * Detect Windows version details
   * @returns {Promise<Object>} Windows version info
   * @private
   */
  async _detectWindowsVersion() {
    try {
      const { stdout } = await execAsync('wmic os get Caption,Version,BuildNumber /format:csv')
      const lines = stdout.split('\n').filter(line => line.trim() && !line.startsWith('Node'))
      
      if (lines.length > 0) {
        const parts = lines[0].split(',')
        if (parts.length >= 4) {
          return {
            version: parts[3] ? parts[3].trim() : os.release(),
            release: parts[1] ? parts[1].trim() : 'Unknown Windows',
            build: parts[2] ? parts[2].trim() : 'unknown',
            source: 'wmic'
          }
        }
      }
    } catch (error) {
      // Fallback to registry or systeminfo
      try {
        const { stdout } = await execAsync('systeminfo | findstr /C:"OS Name" /C:"OS Version"')
        const lines = stdout.split('\n')
        const osName = lines[0] ? lines[0].split(':')[1].trim() : 'Unknown Windows'
        const osVersion = lines[1] ? lines[1].split(':')[1].trim() : os.release()
        
        return {
          version: osVersion,
          release: osName,
          build: 'unknown',
          source: 'systeminfo'
        }
      } catch (fallbackError) {
        throw new Error(`Windows version detection failed: ${error.message}`)
      }
    }
  }

  /**
   * Detect macOS version details
   * @returns {Promise<Object>} macOS version info
   * @private
   */
  async _detectMacOSVersion() {
    try {
      const { stdout } = await execAsync('sw_vers')
      const lines = stdout.split('\n')
      const version = lines.find(l => l.startsWith('ProductVersion:'))?.split(':')[1].trim()
      const build = lines.find(l => l.startsWith('BuildVersion:'))?.split(':')[1].trim()
      const name = lines.find(l => l.startsWith('ProductName:'))?.split(':')[1].trim()
      
      return {
        version: version || os.release(),
        release: name || 'macOS',
        build: build || 'unknown',
        source: 'sw_vers'
      }
    } catch (error) {
      throw new Error(`macOS version detection failed: ${error.message}`)
    }
  }

  /**
   * Detect Linux distribution and version
   * @returns {Promise<Object>} Linux version info
   * @private
   */
  async _detectLinuxVersion() {
    try {
      // Try /etc/os-release first
      const { stdout } = await execAsync('cat /etc/os-release')
      const lines = stdout.split('\n')
      const name = lines.find(l => l.startsWith('PRETTY_NAME='))?.split('=')[1].replace(/"/g, '')
      const version = lines.find(l => l.startsWith('VERSION_ID='))?.split('=')[1].replace(/"/g, '')
      const id = lines.find(l => l.startsWith('ID='))?.split('=')[1].replace(/"/g, '')
      
      return {
        version: version || os.release(),
        release: name || id || 'Linux',
        build: 'unknown',
        source: 'os-release'
      }
    } catch (error) {
      // Fallback to lsb_release
      try {
        const { stdout } = await execAsync('lsb_release -a')
        const lines = stdout.split('\n')
        const description = lines.find(l => l.includes('Description:'))?.split(':')[1].trim()
        const release = lines.find(l => l.includes('Release:'))?.split(':')[1].trim()
        
        return {
          version: release || os.release(),
          release: description || 'Linux',
          build: 'unknown',
          source: 'lsb_release'
        }
      } catch (fallbackError) {
        throw new Error(`Linux version detection failed: ${error.message}`)
      }
    }
  }

  /**
   * Detect system architecture
   * @returns {Object} Architecture information
   * @private
   */
  _detectArchitecture() {
    return {
      arch: os.arch(),
      bits: os.arch().includes('64') ? 64 : 32,
      endianness: os.endianness(),
      cpuCount: os.cpus().length,
      cpuModel: os.cpus()[0]?.model || 'unknown'
    }
  }

  /**
   * Detect shell environment
   * @returns {Promise<Object>} Shell environment info
   * @private
   */
  async _detectShellEnvironment() {
    const platform = process.platform
    
    if (platform === 'win32') {
      return await this._detectWindowsShells()
    } else {
      return await this._detectUnixShells()
    }
  }

  /**
   * Detect Windows shells
   * @returns {Promise<Object>} Windows shell info
   * @private
   */
  async _detectWindowsShells() {
    const shells = []
    const terminalType = process.env.TERM || 'windows-console'
    
    // Check for PowerShell
    try {
      await execAsync('powershell -Command "Get-Host | Select-Object Version"')
      shells.push('PowerShell')
    } catch (error) {
      // PowerShell not available
    }
    
    // Check for cmd.exe (always available on Windows)
    shells.push('cmd')
    
    // Check for Git Bash
    try {
      await execAsync('bash --version')
      shells.push('bash')
    } catch (error) {
      // Git Bash not available
    }
    
    // Detect current shell
    let primary = 'cmd'
    if (process.env.SHELL && process.env.SHELL.includes('bash')) {
      primary = 'bash'
    } else if (process.env.PSModulePath) {
      primary = 'PowerShell'
    }
    
    return {
      primary,
      available: shells,
      terminalType,
      environment: process.env.COMSPEC || 'cmd.exe'
    }
  }

  /**
   * Detect Unix shells
   * @returns {Promise<Object>} Unix shell info
   * @private
   */
  async _detectUnixShells() {
    const shells = []
    const terminalType = process.env.TERM || 'unknown'
    
    // Common shells to check
    const shellsToCheck = ['bash', 'zsh', 'fish', 'sh', 'csh', 'tcsh']
    
    for (const shell of shellsToCheck) {
      try {
        await execAsync(`which ${shell}`)
        shells.push(shell)
      } catch (error) {
        // Shell not available
      }
    }
    
    const currentShell = path.basename(process.env.SHELL || '/bin/sh')
    
    return {
      primary: currentShell,
      available: shells,
      terminalType,
      environment: process.env.SHELL || '/bin/sh'
    }
  }

  /**
   * Detect available system tools
   * @returns {Promise<Object>} Tool availability info
   * @private
   */
  async _detectAvailableTools() {
    const platform = process.platform
    
    if (platform === 'win32') {
      return await this._detectWindowsTools()
    } else {
      return await this._detectUnixTools()
    }
  }

  /**
   * Detect Windows tools
   * @returns {Promise<Object>} Windows tool availability
   * @private
   */
  async _detectWindowsTools() {
    const tools = {
      required: ['taskkill', 'wmic', 'netstat'],
      optional: ['powershell', 'tasklist', 'sc'],
      process: ['taskkill', 'wmic', 'tasklist'],
      network: ['netstat', 'netsh'],
      service: ['sc', 'net']
    }
    
    const available = []
    const missing = []
    const versions = {}
    
    // Check required tools
    for (const tool of [...tools.required, ...tools.optional]) {
      try {
        let command = `${tool} /? 2>nul || ${tool} -? 2>nul || ${tool} --version 2>nul`
        if (tool === 'powershell') {
          command = 'powershell -Command "Get-Host | Select-Object Version"'
        }
        
        const { stdout } = await execAsync(command)
        available.push(tool)
        
        // Try to extract version
        if (stdout) {
          const versionMatch = stdout.match(/version\s+(\d+\.\d+(?:\.\d+)?)/i) ||
                              stdout.match(/(\d+\.\d+(?:\.\d+)?)/i)
          if (versionMatch) {
            versions[tool] = versionMatch[1]
          }
        }
      } catch (error) {
        missing.push(tool)
      }
    }
    
    return {
      available,
      missing,
      versions,
      categories: {
        process: available.filter(t => tools.process.includes(t)),
        network: available.filter(t => tools.network.includes(t)),
        service: available.filter(t => tools.service.includes(t))
      }
    }
  }

  /**
   * Detect Unix tools
   * @returns {Promise<Object>} Unix tool availability
   * @private
   */
  async _detectUnixTools() {
    const tools = {
      required: ['ps', 'kill', 'killall'],
      optional: ['pkill', 'pgrep', 'lsof', 'netstat', 'ss'],
      process: ['ps', 'kill', 'killall', 'pkill', 'pgrep'],
      network: ['lsof', 'netstat', 'ss'],
      system: ['systemctl', 'service']
    }
    
    const available = []
    const missing = []
    const versions = {}
    
    // Check all tools
    for (const tool of [...tools.required, ...tools.optional]) {
      try {
        // First check if tool exists
        await execAsync(`which ${tool}`)
        available.push(tool)
        
        // Try to get version
        try {
          let versionCommand = `${tool} --version 2>/dev/null`
          if (tool === 'ps') {
            versionCommand = 'ps --version 2>/dev/null || ps -V 2>/dev/null || echo "ps available"'
          } else if (tool === 'kill') {
            versionCommand = 'kill -V 2>/dev/null || echo "kill available"'
          }
          
          const { stdout } = await execAsync(versionCommand)
          if (stdout) {
            const versionMatch = stdout.match(/version\s+(\d+\.\d+(?:\.\d+)?)/i) ||
                                stdout.match(/(\d+\.\d+(?:\.\d+)?)/i)
            if (versionMatch) {
              versions[tool] = versionMatch[1]
            } else {
              versions[tool] = 'available'
            }
          }
        } catch (versionError) {
          versions[tool] = 'unknown'
        }
      } catch (error) {
        missing.push(tool)
      }
    }
    
    return {
      available,
      missing,
      versions,
      categories: {
        process: available.filter(t => tools.process.includes(t)),
        network: available.filter(t => tools.network.includes(t)),
        system: available.filter(t => tools.system.includes(t))
      }
    }
  }

  /**
   * Detect platform capabilities
   * @returns {Promise<Object>} Platform capabilities
   * @private
   */
  async _detectCapabilities() {
    const platform = process.platform
    const capabilities = {
      processManagement: await this._detectProcessCapabilities(),
      networkMonitoring: await this._detectNetworkCapabilities(),
      systemIntegration: await this._detectSystemCapabilities(),
      securityFeatures: await this._detectSecurityCapabilities(),
      performanceFeatures: await this._detectPerformanceCapabilities()
    }
    
    return capabilities
  }

  /**
   * Detect process management capabilities
   * @returns {Promise<Object>} Process capabilities
   * @private
   */
  async _detectProcessCapabilities() {
    const platform = process.platform
    
    if (platform === 'win32') {
      return {
        killByPid: true,
        killByName: true,
        killProcessTree: true,
        killByService: true,
        queryProcesses: true,
        queryServices: true,
        processMonitoring: true,
        signalSupport: false,
        privilegedOperations: true
      }
    } else {
      const tools = await this._detectAvailableTools()
      
      return {
        killByPid: tools.available.includes('kill'),
        killByName: tools.available.includes('killall') || tools.available.includes('pkill'),
        killProcessTree: tools.available.includes('pkill'),
        killByService: tools.available.includes('systemctl') || tools.available.includes('service'),
        queryProcesses: tools.available.includes('ps'),
        queryServices: tools.available.includes('systemctl'),
        processMonitoring: tools.available.includes('ps'),
        signalSupport: true,
        privilegedOperations: process.getuid ? process.getuid() === 0 : false
      }
    }
  }

  /**
   * Detect network monitoring capabilities
   * @returns {Promise<Object>} Network capabilities
   * @private
   */
  async _detectNetworkCapabilities() {
    const tools = await this._detectAvailableTools()
    const platform = process.platform
    
    return {
      portScanning: tools.available.includes('netstat') || tools.available.includes('ss'),
      processPortMapping: tools.available.includes('lsof') || tools.available.includes('netstat'),
      networkStatistics: tools.available.includes('netstat') || tools.available.includes('ss'),
      connectionTracking: tools.available.includes('lsof') || platform === 'win32',
      firewallIntegration: platform === 'win32' || tools.available.includes('iptables'),
      dnsResolution: true
    }
  }

  /**
   * Detect system integration capabilities
   * @returns {Promise<Object>} System capabilities
   * @private
   */
  async _detectSystemCapabilities() {
    const platform = process.platform
    const tools = await this._detectAvailableTools()
    
    return {
      serviceManagement: platform === 'win32' || tools.available.includes('systemctl'),
      registryAccess: platform === 'win32',
      environmentManagement: true,
      fileSystemMonitoring: true,
      systemEventLogging: true,
      crashDumpAnalysis: platform === 'win32',
      containerSupport: tools.available.includes('docker') || tools.available.includes('podman'),
      virtualizationSupport: platform === 'win32' || tools.available.includes('virsh')
    }
  }

  /**
   * Detect security capabilities
   * @returns {Promise<Object>} Security capabilities
   * @private
   */
  async _detectSecurityCapabilities() {
    const platform = process.platform
    
    return {
      privilegeEscalation: platform !== 'win32', // sudo/su on Unix
      accessControlLists: true,
      auditLogging: platform !== 'win32' || true, // Windows Event Log or Unix audit
      encryptionSupport: true,
      certificateManagement: platform === 'win32',
      sandboxing: platform === 'darwin', // macOS sandbox
      selinuxSupport: platform === 'linux',
      appArmorSupport: platform === 'linux'
    }
  }

  /**
   * Detect performance monitoring capabilities
   * @returns {Promise<Object>} Performance capabilities
   * @private
   */
  async _detectPerformanceCapabilities() {
    const tools = await this._detectAvailableTools()
    const platform = process.platform
    
    return {
      cpuMonitoring: true,
      memoryMonitoring: true,
      diskMonitoring: true,
      networkMonitoring: true,
      processPerformance: tools.available.includes('ps') || platform === 'win32',
      systemPerformance: platform === 'win32' || tools.available.includes('top'),
      realTimeMonitoring: true,
      historicalData: platform === 'win32',
      alerting: true,
      benchmarking: true
    }
  }

  /**
   * Profile platform performance characteristics
   * @returns {Promise<Object>} Performance profile
   * @private
   */
  async _profilePerformance() {
    const start = Date.now()
    
    // Test basic operations
    const operations = {
      processQuery: await this._benchmarkProcessQuery(),
      networkQuery: await this._benchmarkNetworkQuery(),
      fileSystem: await this._benchmarkFileSystem(),
      commandExecution: await this._benchmarkCommandExecution()
    }
    
    const totalTime = Date.now() - start
    
    return {
      operations,
      overallLatency: totalTime,
      platformOptimizations: this._determinePlatformOptimizations(operations),
      recommendedSettings: this._generateRecommendedSettings(operations)
    }
  }

  /**
   * Benchmark process query operations
   * @returns {Promise<Object>} Process query benchmarks
   * @private
   */
  async _benchmarkProcessQuery() {
    const iterations = 3
    const times = []
    
    for (let i = 0; i < iterations; i++) {
      const start = Date.now()
      try {
        if (process.platform === 'win32') {
          await execAsync('wmic process get ProcessId,Name /format:csv', { timeout: 5000 })
        } else {
          await execAsync('ps -eo pid,comm --no-headers', { timeout: 5000 })
        }
        times.push(Date.now() - start)
      } catch (error) {
        times.push(5000) // Timeout value
      }
    }
    
    return {
      averageTime: times.reduce((a, b) => a + b, 0) / times.length,
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
      reliability: times.filter(t => t < 5000).length / times.length
    }
  }

  /**
   * Benchmark network query operations
   * @returns {Promise<Object>} Network query benchmarks
   * @private
   */
  async _benchmarkNetworkQuery() {
    const iterations = 3
    const times = []
    
    for (let i = 0; i < iterations; i++) {
      const start = Date.now()
      try {
        if (process.platform === 'win32') {
          await execAsync('netstat -ano', { timeout: 5000 })
        } else {
          await execAsync('netstat -tlnp 2>/dev/null || ss -tlnp 2>/dev/null', { timeout: 5000 })
        }
        times.push(Date.now() - start)
      } catch (error) {
        times.push(5000) // Timeout value
      }
    }
    
    return {
      averageTime: times.reduce((a, b) => a + b, 0) / times.length,
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
      reliability: times.filter(t => t < 5000).length / times.length
    }
  }

  /**
   * Benchmark file system operations
   * @returns {Promise<Object>} File system benchmarks
   * @private
   */
  async _benchmarkFileSystem() {
    const start = Date.now()
    try {
      const fs = require('fs').promises
      const testFile = path.join(os.tmpdir(), 'platform_test.tmp')
      
      await fs.writeFile(testFile, 'test data')
      await fs.readFile(testFile)
      await fs.unlink(testFile)
      
      return {
        averageTime: Date.now() - start,
        reliability: 1.0
      }
    } catch (error) {
      return {
        averageTime: 1000,
        reliability: 0.0,
        error: error.message
      }
    }
  }

  /**
   * Benchmark command execution
   * @returns {Promise<Object>} Command execution benchmarks
   * @private
   */
  async _benchmarkCommandExecution() {
    const start = Date.now()
    try {
      const command = process.platform === 'win32' ? 'echo test' : 'echo test'
      await execAsync(command)
      
      return {
        averageTime: Date.now() - start,
        reliability: 1.0
      }
    } catch (error) {
      return {
        averageTime: 1000,
        reliability: 0.0,
        error: error.message
      }
    }
  }

  /**
   * Determine platform-specific optimizations
   * @param {Object} operations - Benchmark results
   * @returns {Array} Optimization recommendations
   * @private
   */
  _determinePlatformOptimizations(operations) {
    const optimizations = []
    const platform = process.platform
    
    // Process query optimizations
    if (operations.processQuery.averageTime > 1000) {
      if (platform === 'win32') {
        optimizations.push({
          type: 'process_query',
          recommendation: 'Use tasklist instead of wmic for faster queries',
          expectedImprovement: '50-70% faster'
        })
      } else {
        optimizations.push({
          type: 'process_query',
          recommendation: 'Use ps with minimal columns for faster queries',
          expectedImprovement: '30-50% faster'
        })
      }
    }
    
    // Network query optimizations
    if (operations.networkQuery.averageTime > 1500) {
      if (platform !== 'win32') {
        optimizations.push({
          type: 'network_query',
          recommendation: 'Prefer ss over netstat for better performance',
          expectedImprovement: '40-60% faster'
        })
      }
    }
    
    // General optimizations
    optimizations.push({
      type: 'caching',
      recommendation: 'Implement result caching for frequently accessed data',
      expectedImprovement: '80-95% faster for cached queries'
    })
    
    return optimizations
  }

  /**
   * Generate recommended settings based on benchmarks
   * @param {Object} operations - Benchmark results
   * @returns {Object} Recommended settings
   * @private
   */
  _generateRecommendedSettings(operations) {
    const settings = {
      queryTimeout: Math.max(operations.processQuery.maxTime * 2, 5000),
      cacheTimeout: 30000, // 30 seconds default
      retryAttempts: operations.processQuery.reliability > 0.8 ? 2 : 3,
      parallelQueries: true,
      batchSize: 50
    }
    
    // Adjust based on performance
    if (operations.processQuery.averageTime > 2000) {
      settings.cacheTimeout = 60000 // Longer cache for slow systems
      settings.batchSize = 25 // Smaller batches
    }
    
    if (operations.processQuery.reliability < 0.7) {
      settings.retryAttempts = 5
      settings.retryDelay = 1000
    }
    
    return settings
  }

  /**
   * Calculate detection confidence score
   * @param {Object} tools - Available tools
   * @param {Object} capabilities - Detected capabilities
   * @returns {number} Confidence score (0-1)
   * @private
   */
  _calculateConfidence(tools, capabilities) {
    let score = 0.5 // Base score
    
    // Tool availability affects confidence
    const requiredTools = process.platform === 'win32' 
      ? ['taskkill', 'wmic'] 
      : ['ps', 'kill']
    
    const availableRequired = requiredTools.filter(t => tools.available.includes(t))
    score += (availableRequired.length / requiredTools.length) * 0.3
    
    // Capability detection affects confidence
    const capabilityCount = Object.values(capabilities).reduce((count, category) => {
      return count + Object.values(category).filter(cap => cap === true).length
    }, 0)
    
    const totalCapabilities = Object.values(capabilities).reduce((count, category) => {
      return count + Object.values(category).length
    }, 0)
    
    score += (capabilityCount / totalCapabilities) * 0.2
    
    return Math.min(score, 1.0)
  }

  /**
   * Generate unique detection ID
   * @returns {string} Detection ID
   * @private
   */
  _generateDetectionId() {
    return `detect_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Check if platform supports specific feature
   * @param {string} feature - Feature to check
   * @returns {Promise<boolean>} Feature support status
   */
  async supportsFeature(feature) {
    if (!this.lastDetection) {
      await this.detectPlatform()
    }
    
    const capabilities = this.lastDetection.capabilities
    
    // Flatten capabilities for easy lookup
    const allCapabilities = {}
    Object.values(capabilities).forEach(category => {
      Object.assign(allCapabilities, category)
    })
    
    return allCapabilities[feature] || false
  }

  /**
   * Get recommended provider for current platform
   * @returns {Promise<string>} Provider name
   */
  async getRecommendedProvider() {
    if (!this.lastDetection) {
      await this.detectPlatform()
    }
    
    const platform = this.lastDetection.platform
    
    if (platform === 'win32') {
      return 'WindowsProvider'
    } else if (['darwin', 'linux', 'freebsd', 'openbsd'].includes(platform)) {
      return 'UnixProvider'
    } else {
      return 'GenericProvider'
    }
  }

  /**
   * Clear detection cache
   */
  clearCache() {
    this.detectionCache.clear()
    this.capabilityCache.clear()
    this.performanceProfile = null
    this.lastDetection = null
  }

  /**
   * Get cached detection results
   * @returns {Object|null} Cached detection results
   */
  getCachedDetection() {
    return this.lastDetection
  }
}

module.exports = PlatformDetector