/**
 * Process Registry - Centralized process tracking and management
 *
 * Implements Registry pattern for process management with:
 * - Cross-platform process detection
 * - Real-time process monitoring
 * - Orphaned process identification
 * - Port usage tracking
 * - Process leak detection
 *
 * @author CATAMS Team
 * @version 1.0.0
 */

const { spawn, exec } = require('child_process')
const { promisify } = require('util')
const pidusage = require('pidusage')

const execAsync = promisify(exec)

/**
 * Centralized process registry for tracking and management
 */
class ProcessRegistry {
  constructor () {
    this.trackedProcesses = new Map()
    this.sessionProcesses = new Map()
    this.portMap = new Map()
    this.platform = process.platform
  }

  /**
   * Register a new process for tracking
   * @param {string} sessionId - Session identifier
   * @param {Object} processInfo - Process information
   * @returns {string} Process tracking ID
   */
  registerProcess (sessionId, processInfo) {
    const trackingId = this._generateTrackingId()
    const registeredAt = new Date().toISOString()

    const processRecord = {
      trackingId,
      sessionId,
      pid: processInfo.pid,
      name: processInfo.name || 'unknown',
      command: processInfo.command || '',
      cwd: processInfo.cwd || process.cwd(),
      registeredAt,
      lastSeen: registeredAt,
      ports: processInfo.ports || [],
      status: 'running',
      parentPid: processInfo.parentPid,
      metadata: processInfo.metadata || {}
    }

    this.trackedProcesses.set(trackingId, processRecord)

    // Add to session tracking
    if (!this.sessionProcesses.has(sessionId)) {
      this.sessionProcesses.set(sessionId, new Set())
    }
    this.sessionProcesses.get(sessionId).add(trackingId)

    // Track ports
    if (processInfo.ports) {
      processInfo.ports.forEach(port => {
        this.portMap.set(port, trackingId)
      })
    }

    return trackingId
  }

  /**
   * Unregister a process from tracking
   * @param {string} trackingId - Process tracking ID
   */
  unregisterProcess (trackingId) {
    const processRecord = this.trackedProcesses.get(trackingId)

    if (processRecord) {
      // Remove from session tracking
      const sessionProcesses = this.sessionProcesses.get(processRecord.sessionId)
      if (sessionProcesses) {
        sessionProcesses.delete(trackingId)
      }

      // Remove port mappings
      processRecord.ports.forEach(port => {
        this.portMap.delete(port)
      })

      // Remove from main tracking
      this.trackedProcesses.delete(trackingId)

      return true
    }

    return false
  }

  /**
   * Get all running processes on the system
   * @returns {Promise<Array>} List of running processes
   */
  async getRunningProcesses () {
    try {
      if (this.platform === 'win32') {
        return await this._getWindowsProcesses()
      } else {
        return await this._getUnixProcesses()
      }
    } catch (error) {
      throw new Error(`Failed to get running processes: ${error.message}`)
    }
  }

  /**
   * Get processes for Windows platform
   * @returns {Promise<Array>} Windows processes
   * @private
   */
  async _getWindowsProcesses () {
    // Try WMIC first (deprecated on modern Windows but still present on some systems)
    try {
      const command = 'wmic process get ProcessId,Name,CommandLine,ParentProcessId /format:csv'
      const { stdout } = await execAsync(command)

      const lines = stdout.split('\n').filter(line => line.trim() && !line.startsWith('Node'))
      const processes = []

      for (const line of lines) {
        const parts = line.split(',')
        if (parts.length >= 4) {
          const [, commandLine, name, parentPid, pid] = parts

          if (pid && pid.trim() && !isNaN(parseInt(pid.trim()))) {
            processes.push({
              pid: parseInt(pid.trim()),
              name: name ? name.trim() : 'unknown',
              command: commandLine ? commandLine.trim() : '',
              parentPid: parentPid && !isNaN(parseInt(parentPid.trim())) ? parseInt(parentPid.trim()) : null
            })
          }
        }
      }

      return processes
    } catch (wmicError) {
      // Fallback: Use PowerShell CIM to enumerate processes and output JSON for robust parsing
      const ps = 'powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,Name,CommandLine | ConvertTo-Json -Depth 2"'
      const { stdout } = await execAsync(ps)
      let data
      try {
        data = JSON.parse(stdout)
      } catch (jsonErr) {
        throw new Error(`Failed to get running processes via PowerShell: ${jsonErr.message}`)
      }
      const list = Array.isArray(data) ? data : [data]
      return list
        .filter(p => p && p.ProcessId)
        .map(p => ({
          pid: parseInt(String(p.ProcessId)),
          name: (p.Name || 'unknown').toString(),
          command: (p.CommandLine || '').toString(),
          parentPid: p.ParentProcessId != null ? parseInt(String(p.ParentProcessId)) : null
        }))
    }
  }

  /**
   * Get processes for Unix-like platforms
   * @returns {Promise<Array>} Unix processes
   * @private
   */
  async _getUnixProcesses () {
    const command = 'ps -eo pid,ppid,comm,args --no-headers'
    const { stdout } = await execAsync(command)

    const lines = stdout.split('\n').filter(line => line.trim())
    const processes = []

    for (const line of lines) {
      const match = line.trim().match(/^(\d+)\s+(\d+)\s+(\S+)\s+(.*)$/)
      if (match) {
        const [, pid, ppid, comm, args] = match
        processes.push({
          pid: parseInt(pid),
          parentPid: parseInt(ppid),
          name: comm,
          command: args
        })
      }
    }

    return processes
  }

  /**
   * Get open ports on the system
   * @returns {Promise<Array>} List of open ports
   */
  async getOpenPorts () {
    try {
      if (this.platform === 'win32') {
        return await this._getWindowsPorts()
      } else {
        return await this._getUnixPorts()
      }
    } catch (error) {
      throw new Error(`Failed to get open ports: ${error.message}`)
    }
  }

  /**
   * Get open ports on Windows
   * @returns {Promise<Array>} Windows ports
   * @private
   */
  async _getWindowsPorts () {
    const command = 'netstat -ano'
    const { stdout } = await execAsync(command)

    const lines = stdout.split('\n')
    const ports = []

    for (const line of lines) {
      const match = line.trim().match(/TCP\s+\S+:(\d+)\s+\S+\s+LISTENING\s+(\d+)/)
      if (match) {
        const [, port, pid] = match
        ports.push({
          port: parseInt(port),
          pid: parseInt(pid),
          protocol: 'TCP',
          state: 'LISTENING'
        })
      }
    }

    return ports
  }

  /**
   * Get open ports on Unix-like systems
   * @returns {Promise<Array>} Unix ports
   * @private
   */
  async _getUnixPorts () {
    try {
      // Try lsof first
      const command = 'lsof -i -P -n | grep LISTEN'
      const { stdout } = await execAsync(command)

      const lines = stdout.split('\n')
      const ports = []

      for (const line of lines) {
        const match = line.trim().match(/(\S+)\s+(\d+)\s+\S+\s+\S+\s+\S+\s+\S+\s+\S+\s+\*:(\d+)/)
        if (match) {
          const [, command, pid, port] = match
          ports.push({
            port: parseInt(port),
            pid: parseInt(pid),
            command,
            protocol: 'TCP',
            state: 'LISTENING'
          })
        }
      }

      return ports
    } catch (error) {
      // Fallback to netstat
      return await this._getUnixPortsNetstat()
    }
  }

  /**
   * Fallback method using netstat for Unix ports
   * @returns {Promise<Array>} Unix ports via netstat
   * @private
   */
  async _getUnixPortsNetstat () {
    const command = 'netstat -tlnp 2>/dev/null'
    const { stdout } = await execAsync(command)

    const lines = stdout.split('\n')
    const ports = []

    for (const line of lines) {
      const match = line.trim().match(/tcp\s+\d+\s+\d+\s+\S+:(\d+)\s+\S+\s+LISTEN\s+(\d+)\//)
      if (match) {
        const [, port, pid] = match
        ports.push({
          port: parseInt(port),
          pid: parseInt(pid),
          protocol: 'TCP',
          state: 'LISTEN'
        })
      }
    }

    return ports
  }

  /**
   * Find orphaned processes for a session
   * @param {string} sessionId - Session identifier
   * @returns {Promise<Array>} Orphaned processes
   */
  async findOrphanedProcesses (sessionId) {
    const sessionProcessIds = this.sessionProcesses.get(sessionId)
    if (!sessionProcessIds) {
      return []
    }

    const orphaned = []
    const runningProcesses = await this.getRunningProcesses()
    const runningPids = new Set(runningProcesses.map(p => p.pid))

    for (const trackingId of sessionProcessIds) {
      const processRecord = this.trackedProcesses.get(trackingId)

      if (processRecord) {
        // Check if process is still running
        if (runningPids.has(processRecord.pid)) {
          // Check if it should have been cleaned up
          const runTime = Date.now() - new Date(processRecord.registeredAt).getTime()
          const maxRunTime = processRecord.metadata.maxRunTime || 300000 // 5 minutes default

          if (runTime > maxRunTime && processRecord.status === 'running') {
            orphaned.push({
              ...processRecord,
              reason: 'exceeded_max_runtime',
              runTime
            })
          }
        } else {
          // Process is no longer running, update status
          processRecord.status = 'terminated'
          processRecord.terminatedAt = new Date().toISOString()
        }
      }
    }

    return orphaned
  }

  /**
   * Get all tracked processes for a session
   * @param {string} sessionId - Session identifier
   * @returns {Promise<Array>} Tracked processes
   */
  async getAllTrackedProcesses (sessionId) {
    const sessionProcessIds = this.sessionProcesses.get(sessionId) || new Set()
    const processes = []

    for (const trackingId of sessionProcessIds) {
      const processRecord = this.trackedProcesses.get(trackingId)
      if (processRecord) {
        processes.push(processRecord)
      }
    }

    return processes
  }

  /**
   * Get process count
   * @returns {Promise<number>} Total process count
   */
  async getProcessCount () {
    const runningProcesses = await this.getRunningProcesses()
    return runningProcesses.length
  }

  /**
   * Check if a port is in use
   * @param {number} port - Port number to check
   * @returns {Promise<boolean>} True if port is in use
   */
  async isPortInUse (port) {
    const openPorts = await this.getOpenPorts()
    return openPorts.some(p => p.port === port)
  }

  /**
   * Get process information by PID
   * @param {number} pid - Process ID
   * @returns {Promise<Object|null>} Process information
   */
  async getProcessInfo (pid) {
    try {
      const stats = await pidusage(pid)
      const runningProcesses = await this.getRunningProcesses()
      const processInfo = runningProcesses.find(p => p.pid === pid)

      if (processInfo) {
        return {
          ...processInfo,
          cpu: stats.cpu,
          memory: stats.memory,
          elapsed: stats.elapsed,
          timestamp: stats.timestamp
        }
      }

      return null
    } catch (error) {
      // Process doesn't exist or permission denied
      return null
    }
  }

  /**
   * Update process status
   * @param {string} trackingId - Process tracking ID
   * @param {string} status - New status
   * @param {Object} metadata - Additional metadata
   */
  updateProcessStatus (trackingId, status, metadata = {}) {
    const processRecord = this.trackedProcesses.get(trackingId)

    if (processRecord) {
      processRecord.status = status
      processRecord.lastSeen = new Date().toISOString()
      processRecord.metadata = { ...processRecord.metadata, ...metadata }

      if (status === 'terminated') {
        processRecord.terminatedAt = new Date().toISOString()
      }
    }
  }

  /**
   * Cleanup session processes
   * @param {string} sessionId - Session identifier
   */
  async cleanupSession (sessionId) {
    const sessionProcessIds = this.sessionProcesses.get(sessionId)

    if (sessionProcessIds) {
      for (const trackingId of sessionProcessIds) {
        this.unregisterProcess(trackingId)
      }

      this.sessionProcesses.delete(sessionId)
    }
  }

  /**
   * Get registry statistics
   * @returns {Object} Registry statistics
   */
  getStatistics () {
    return {
      totalTrackedProcesses: this.trackedProcesses.size,
      activeSessions: this.sessionProcesses.size,
      trackedPorts: this.portMap.size,
      platform: this.platform
    }
  }

  /**
   * Cleanup registry resources
   */
  async cleanup () {
    this.trackedProcesses.clear()
    this.sessionProcesses.clear()
    this.portMap.clear()
  }

  /**
   * Generate unique tracking ID
   * @returns {string} Tracking ID
   * @private
   */
  _generateTrackingId () {
    return `track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

module.exports = ProcessRegistry
