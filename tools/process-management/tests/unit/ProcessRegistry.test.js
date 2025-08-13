/**
 * Unit tests for ProcessRegistry
 *
 * Tests centralized process tracking and management:
 * - Process registration and unregistration
 * - Cross-platform process detection
 * - Orphaned process identification
 * - Port tracking and management
 *
 * @author CATAMS Team
 */

const ProcessRegistry = require('../../src/managers/ProcessRegistry')
const { promisify } = require('util')

// Mock child_process for testing
jest.mock('child_process')
jest.mock('pidusage')

const mockExec = jest.fn()
require('child_process').exec = mockExec
const mockPidusage = require('pidusage')

describe('ProcessRegistry', () => {
  let registry

  beforeEach(() => {
    jest.clearAllMocks()
    registry = new ProcessRegistry()

    // Setup default mocks
    mockExec.mockImplementation((command, callback) => {
      callback(null, { stdout: '', stderr: '' })
    })

    mockPidusage.mockResolvedValue({
      cpu: 25.5,
      memory: 1024000,
      elapsed: 60000,
      timestamp: Date.now()
    })
  })

  afterEach(async () => {
    await registry.cleanup()
  })

  describe('Process Registration', () => {
    test('should register a new process successfully', () => {
      const sessionId = 'test-session-123'
      const processInfo = {
        pid: 1234,
        name: 'test-process',
        command: 'node test.js',
        cwd: '/test/dir',
        ports: [8080, 8081],
        metadata: { type: 'test' }
      }

      const trackingId = registry.registerProcess(sessionId, processInfo)

      expect(trackingId).toBeDefined()
      expect(trackingId).toMatch(/^track_\d+_[a-z0-9]{9}$/)
      expect(registry.trackedProcesses.size).toBe(1)
      expect(registry.sessionProcesses.get(sessionId).has(trackingId)).toBe(true)
      expect(registry.portMap.get(8080)).toBe(trackingId)
      expect(registry.portMap.get(8081)).toBe(trackingId)
    })

    test('should handle process registration with minimal info', () => {
      const sessionId = 'test-session-456'
      const processInfo = {
        pid: 5678
      }

      const trackingId = registry.registerProcess(sessionId, processInfo)

      expect(trackingId).toBeDefined()
      const processRecord = registry.trackedProcesses.get(trackingId)
      expect(processRecord.name).toBe('unknown')
      expect(processRecord.command).toBe('')
      expect(processRecord.cwd).toBe(process.cwd())
    })

    test('should unregister process and cleanup resources', () => {
      const sessionId = 'test-session-789'
      const processInfo = {
        pid: 9999,
        name: 'cleanup-test',
        ports: [3000, 3001]
      }

      const trackingId = registry.registerProcess(sessionId, processInfo)
      expect(registry.trackedProcesses.size).toBe(1)
      expect(registry.portMap.size).toBe(2)

      const result = registry.unregisterProcess(trackingId)

      expect(result).toBe(true)
      expect(registry.trackedProcesses.size).toBe(0)
      expect(registry.portMap.size).toBe(0)
      expect(registry.sessionProcesses.get(sessionId).size).toBe(0)
    })

    test('should return false when unregistering non-existent process', () => {
      const result = registry.unregisterProcess('non-existent-id')
      expect(result).toBe(false)
    })
  })

  describe('Process Detection - Windows', () => {
    beforeEach(() => {
      registry.platform = 'win32'
    })

    test('should parse Windows process list correctly', async () => {
      const mockWmicOutput = `Node,CommandLine,Name,ParentProcessId,ProcessId
DESKTOP-123,java -jar app.jar,java.exe,1000,1234
DESKTOP-123,node server.js,node.exe,1000,5678
DESKTOP-123,,chrome.exe,2000,9012`

      mockExec.mockImplementation((command, callback) => {
        callback(null, { stdout: mockWmicOutput })
      })

      const processes = await registry.getRunningProcesses()

      expect(processes).toHaveLength(3)
      expect(processes[0]).toEqual({
        pid: 1234,
        name: 'java.exe',
        command: 'java -jar app.jar',
        parentPid: 1000
      })
      expect(processes[1]).toEqual({
        pid: 5678,
        name: 'node.exe',
        command: 'node server.js',
        parentPid: 1000
      })
    })

    test('should handle Windows process list parsing errors', async () => {
      mockExec.mockImplementation((command, callback) => {
        callback(new Error('WMIC command failed'))
      })

      await expect(registry.getRunningProcesses())
        .rejects.toThrow('Failed to get running processes')
    })

    test('should get Windows ports correctly', async () => {
      const mockNetstatOutput = `
  TCP    0.0.0.0:8080           0.0.0.0:0              LISTENING       1234
  TCP    127.0.0.1:3000         0.0.0.0:0              LISTENING       5678
  TCP    0.0.0.0:443            0.0.0.0:0              LISTENING       9012`

      mockExec.mockImplementation((command, callback) => {
        callback(null, { stdout: mockNetstatOutput })
      })

      const ports = await registry.getOpenPorts()

      expect(ports).toHaveLength(3)
      expect(ports[0]).toEqual({
        port: 8080,
        pid: 1234,
        protocol: 'TCP',
        state: 'LISTENING'
      })
      expect(ports[1]).toEqual({
        port: 3000,
        pid: 5678,
        protocol: 'TCP',
        state: 'LISTENING'
      })
    })
  })

  describe('Process Detection - Unix', () => {
    beforeEach(() => {
      registry.platform = 'linux'
    })

    test('should parse Unix process list correctly', async () => {
      const mockPsOutput = `1234 1000 java java -jar application.jar
5678 1000 node node server.js --port 3000
9012 2000 chrome chrome --no-sandbox`

      mockExec.mockImplementation((command, callback) => {
        callback(null, { stdout: mockPsOutput })
      })

      const processes = await registry.getRunningProcesses()

      expect(processes).toHaveLength(3)
      expect(processes[0]).toEqual({
        pid: 1234,
        parentPid: 1000,
        name: 'java',
        command: 'java -jar application.jar'
      })
      expect(processes[1]).toEqual({
        pid: 5678,
        parentPid: 1000,
        name: 'node',
        command: 'node server.js --port 3000'
      })
    })

    test('should get Unix ports using lsof', async () => {
      const mockLsofOutput = `java      1234 user   10u  IPv4 12345      0t0  TCP *:8080 (LISTEN)
node      5678 user   11u  IPv4 23456      0t0  TCP *:3000 (LISTEN)
nginx     9012 user   12u  IPv4 34567      0t0  TCP *:80 (LISTEN)`

      mockExec.mockImplementation((command, callback) => {
        if (command.includes('lsof')) {
          callback(null, { stdout: mockLsofOutput })
        } else {
          callback(new Error('Command not found'))
        }
      })

      const ports = await registry.getOpenPorts()

      expect(ports).toHaveLength(3)
      expect(ports[0]).toEqual({
        port: 8080,
        pid: 1234,
        command: 'java',
        protocol: 'TCP',
        state: 'LISTENING'
      })
    })

    test('should fallback to netstat when lsof fails', async () => {
      const mockNetstatOutput = `tcp        0      0 0.0.0.0:8080            0.0.0.0:*               LISTEN      1234/java
tcp        0      0 127.0.0.1:3000          0.0.0.0:*               LISTEN      5678/node`

      let callCount = 0
      mockExec.mockImplementation((command, callback) => {
        callCount++
        if (callCount === 1) {
          // First call (lsof) fails
          callback(new Error('lsof not found'))
        } else {
          // Second call (netstat) succeeds
          callback(null, { stdout: mockNetstatOutput })
        }
      })

      const ports = await registry.getOpenPorts()

      expect(ports).toHaveLength(2)
      expect(ports[0]).toEqual({
        port: 8080,
        pid: 1234,
        protocol: 'TCP',
        state: 'LISTEN'
      })
    })
  })

  describe('Orphaned Process Detection', () => {
    test('should identify orphaned processes based on runtime', async () => {
      const sessionId = 'orphan-test-session'

      // Register a process with a past registration time
      const trackingId = registry.registerProcess(sessionId, {
        pid: 1234,
        name: 'long-running-process',
        metadata: { maxRunTime: 1000 } // 1 second max runtime
      })

      // Manually set registration time to past
      const processRecord = registry.trackedProcesses.get(trackingId)
      processRecord.registeredAt = new Date(Date.now() - 2000).toISOString() // 2 seconds ago

      // Mock that process is still running
      registry.getRunningProcesses = jest.fn().mockResolvedValue([
        { pid: 1234, name: 'long-running-process' }
      ])

      const orphaned = await registry.findOrphanedProcesses(sessionId)

      expect(orphaned).toHaveLength(1)
      expect(orphaned[0]).toEqual(
        expect.objectContaining({
          pid: 1234,
          reason: 'exceeded_max_runtime',
          runTime: expect.any(Number)
        })
      )
    })

    test('should update status for terminated processes', async () => {
      const sessionId = 'terminated-test-session'

      const trackingId = registry.registerProcess(sessionId, {
        pid: 9999,
        name: 'terminated-process'
      })

      // Mock that process is not running anymore
      registry.getRunningProcesses = jest.fn().mockResolvedValue([])

      await registry.findOrphanedProcesses(sessionId)

      const processRecord = registry.trackedProcesses.get(trackingId)
      expect(processRecord.status).toBe('terminated')
      expect(processRecord.terminatedAt).toBeDefined()
    })
  })

  describe('Process Information', () => {
    test('should get detailed process information', async () => {
      const mockStats = {
        cpu: 45.2,
        memory: 2048000,
        elapsed: 120000,
        timestamp: Date.now()
      }

      mockPidusage.mockResolvedValue(mockStats)
      registry.getRunningProcesses = jest.fn().mockResolvedValue([
        { pid: 1234, name: 'test-process', command: 'test command' }
      ])

      const processInfo = await registry.getProcessInfo(1234)

      expect(processInfo).toEqual({
        pid: 1234,
        name: 'test-process',
        command: 'test command',
        cpu: 45.2,
        memory: 2048000,
        elapsed: 120000,
        timestamp: expect.any(Number)
      })
    })

    test('should return null for non-existent process', async () => {
      mockPidusage.mockRejectedValue(new Error('No such process'))

      const processInfo = await registry.getProcessInfo(99999)

      expect(processInfo).toBeNull()
    })

    test('should check if port is in use', async () => {
      registry.getOpenPorts = jest.fn().mockResolvedValue([
        { port: 8080, pid: 1234 },
        { port: 3000, pid: 5678 }
      ])

      const inUse8080 = await registry.isPortInUse(8080)
      const inUse9000 = await registry.isPortInUse(9000)

      expect(inUse8080).toBe(true)
      expect(inUse9000).toBe(false)
    })
  })

  describe('Session Management', () => {
    test('should get all tracked processes for a session', async () => {
      const sessionId = 'multi-process-session'

      const trackingId1 = registry.registerProcess(sessionId, { pid: 1111, name: 'process1' })
      const trackingId2 = registry.registerProcess(sessionId, { pid: 2222, name: 'process2' })
      registry.registerProcess('other-session', { pid: 3333, name: 'process3' })

      const sessionProcesses = await registry.getAllTrackedProcesses(sessionId)

      expect(sessionProcesses).toHaveLength(2)
      expect(sessionProcesses.map(p => p.pid)).toEqual(expect.arrayContaining([1111, 2222]))
    })

    test('should cleanup session processes', async () => {
      const sessionId = 'cleanup-session'

      registry.registerProcess(sessionId, { pid: 1111, name: 'process1' })
      registry.registerProcess(sessionId, { pid: 2222, name: 'process2' })

      expect(registry.sessionProcesses.get(sessionId).size).toBe(2)
      expect(registry.trackedProcesses.size).toBe(2)

      await registry.cleanupSession(sessionId)

      expect(registry.sessionProcesses.has(sessionId)).toBe(false)
      expect(registry.trackedProcesses.size).toBe(0)
    })

    test('should update process status correctly', () => {
      const sessionId = 'status-update-session'
      const trackingId = registry.registerProcess(sessionId, { pid: 1234, name: 'test-process' })

      registry.updateProcessStatus(trackingId, 'terminated', { exitCode: 0 })

      const processRecord = registry.trackedProcesses.get(trackingId)
      expect(processRecord.status).toBe('terminated')
      expect(processRecord.terminatedAt).toBeDefined()
      expect(processRecord.metadata.exitCode).toBe(0)
    })
  })

  describe('Statistics and Metrics', () => {
    test('should provide registry statistics', () => {
      const sessionId1 = 'stats-session-1'
      const sessionId2 = 'stats-session-2'

      registry.registerProcess(sessionId1, { pid: 1111, ports: [8080] })
      registry.registerProcess(sessionId1, { pid: 2222, ports: [8081] })
      registry.registerProcess(sessionId2, { pid: 3333, ports: [3000] })

      const stats = registry.getStatistics()

      expect(stats).toEqual({
        totalTrackedProcesses: 3,
        activeSessions: 2,
        trackedPorts: 3,
        platform: registry.platform
      })
    })

    test('should get process count', async () => {
      registry.getRunningProcesses = jest.fn().mockResolvedValue([
        { pid: 1, name: 'init' },
        { pid: 2, name: 'kernel' },
        { pid: 3, name: 'test' }
      ])

      const count = await registry.getProcessCount()
      expect(count).toBe(3)
    })
  })

  describe('Error Handling', () => {
    test('should handle process enumeration errors gracefully', async () => {
      mockExec.mockImplementation((command, callback) => {
        callback(new Error('Permission denied'))
      })

      await expect(registry.getRunningProcesses())
        .rejects.toThrow('Failed to get running processes: Permission denied')
    })

    test('should handle port enumeration errors gracefully', async () => {
      mockExec.mockImplementation((command, callback) => {
        callback(new Error('Network unreachable'))
      })

      await expect(registry.getOpenPorts())
        .rejects.toThrow('Failed to get open ports: Network unreachable')
    })

    test('should handle malformed process list output', async () => {
      registry.platform = 'win32'
      mockExec.mockImplementation((command, callback) => {
        callback(null, { stdout: 'Invalid,Output,Format' })
      })

      const processes = await registry.getRunningProcesses()
      expect(processes).toEqual([])
    })
  })

  describe('Resource Cleanup', () => {
    test('should cleanup all registry data', async () => {
      const sessionId = 'cleanup-test'
      registry.registerProcess(sessionId, { pid: 1234, ports: [8080] })

      expect(registry.trackedProcesses.size).toBe(1)
      expect(registry.sessionProcesses.size).toBe(1)
      expect(registry.portMap.size).toBe(1)

      await registry.cleanup()

      expect(registry.trackedProcesses.size).toBe(0)
      expect(registry.sessionProcesses.size).toBe(0)
      expect(registry.portMap.size).toBe(0)
    })
  })
})
