# Enterprise Monitoring System

A comprehensive real-time monitoring system for the Casual Academic Time Allocation Management System (CATAMS) with enterprise-grade performance requirements and ML-based anomaly detection.

## ✨ Features

### Real-Time Monitoring
- **Process Detection**: <10ms latency process scanning
- **Memory Leak Detection**: ML-based anomaly detection with <50MB threshold
- **Performance Profiling**: Comprehensive system metrics collection
- **Alert Management**: Sub-second alert response with escalation protocols
- **Live Dashboard**: <100ms update intervals with WebSocket support

### Enterprise Features
- **Zero-Tolerance Process Management**: Automatic leak detection and cleanup
- **Comprehensive Audit Logging**: 100% operation trail with structured logging
- **Cross-Platform Support**: Windows, Linux, and macOS compatibility
- **Diagnostic Integration**: why-is-node-running tool integration
- **Emergency Recovery**: <5 second recovery mechanisms

## 🏗️ Architecture

### Core Components

1. **RealTimeMonitor** - High-frequency process monitoring
2. **LeakDetector** - ML-based memory leak detection
3. **PerformanceProfiler** - System metrics collection
4. **AlertManager** - Multi-level alert escalation
5. **NodeDiagnostics** - Handle and timer leak detection
6. **MonitoringDashboard** - Real-time web interface

### Integration Points

```
ProcessOrchestrator (Existing)
├── ProcessRegistry (Existing)
├── AuditLogger (Existing)
└── MonitoringSystem (New)
    ├── RealTimeMonitor
    ├── LeakDetector
    ├── PerformanceProfiler
    ├── AlertManager
    ├── NodeDiagnostics
    └── MonitoringDashboard
```

## 🚀 Quick Start

### Installation

```bash
cd tools/process-management
npm install
```

### Basic Usage

```javascript
const MonitoringSystem = require('./src/MonitoringSystem')

const system = new MonitoringSystem({
  enableRealTimeMonitor: true,
  enableLeakDetector: true,
  enablePerformanceProfiler: true,
  enableAlertManager: true,
  enableDashboard: true
})

await system.startMonitoring()
```

### CLI Commands

```bash
# Start monitoring system
npm run start:monitoring

# Run performance validation
npm run validate:performance

# Run simple performance test
node scripts/simple-performance-test.js
```

## 📊 Performance Requirements

| Component | Requirement | Status |
|-----------|-------------|--------|
| Process Detection | <10ms latency | ✅ Implemented |
| Memory Leak Detection | <50MB threshold | ✅ Implemented |
| Alert Response | <1 second | ✅ Implemented |
| Dashboard Updates | <100ms | ✅ Implemented |
| Emergency Recovery | <5 seconds | ✅ Implemented |

## 🔍 Components Detail

### RealTimeMonitor

High-performance process monitoring with millisecond precision.

**Features:**
- Sub-10ms process detection
- Cross-platform process scanning
- Memory-efficient caching
- Real-time change detection
- Performance metrics tracking

**Configuration:**
```javascript
const monitor = new RealTimeMonitor(dependencies, {
  scanInterval: 5, // 5ms scanning
  maxScanLatency: 10, // 10ms requirement
  batchSize: 50,
  enableMemoryTracking: true,
  enableCpuTracking: true
})
```

### LeakDetector

ML-based memory leak detection with multiple algorithms.

**Detection Algorithms:**
- Statistical Outlier Detection
- Memory Trend Analysis  
- Pattern Matching
- Predictive Analysis

**Configuration:**
```javascript
const detector = new LeakDetector(dependencies, {
  memoryThreshold: 50 * 1024 * 1024, // 50MB
  anomalyThreshold: 0.8, // 80% confidence
  enablePredictiveDetection: true
})
```

### PerformanceProfiler

Comprehensive system performance monitoring.

**Metrics Collected:**
- CPU usage and load average
- Memory utilization
- Disk usage and I/O
- Network interfaces
- Process statistics
- Performance trends

### AlertManager

Enterprise-grade alert management with escalation.

**Features:**
- Multi-level escalation (3 levels)
- Alert deduplication
- Rate limiting
- Smart aggregation
- Multiple notification channels

**Escalation Levels:**
1. **Level 1**: 30 seconds → Console
2. **Level 2**: 2 minutes → Console + Email
3. **Level 3**: 5 minutes → Console + Email + SMS

### NodeDiagnostics

Node.js specific diagnostic capabilities.

**Features:**
- Handle leak detection
- Timer tracking
- Event loop monitoring
- Memory dump analysis
- why-is-node-running integration

### MonitoringDashboard

Real-time web interface for monitoring.

**Features:**
- WebSocket-based live updates
- REST API endpoints
- Interactive monitoring interface
- Performance visualization
- Alert status monitoring

**Access:**
- Web Interface: `http://localhost:3001`
- API Endpoints: `http://localhost:3001/api/v1/*`

## 🔧 Configuration

### System Configuration

```javascript
const config = {
  // Performance requirements
  processDetectionLatency: 10,
  memoryLeakThreshold: 50 * 1024 * 1024,
  alertResponseTime: 1000,
  dashboardUpdateInterval: 100,
  
  // Component enablement
  enableRealTimeMonitor: true,
  enableLeakDetector: true,
  enablePerformanceProfiler: true,
  enableAlertManager: true,
  enableNodeDiagnostics: true,
  enableDashboard: true,
  
  // Recovery options
  enableAutoRecovery: true,
  enablePerformanceValidation: true
}
```

### Component-Specific Configuration

Each component supports detailed configuration options. See individual component files for complete configuration options.

## 📈 Performance Validation

### Automated Testing

```bash
# Run comprehensive performance validation
npm run validate:performance

# Run simple mock-based tests
node scripts/simple-performance-test.js
```

### Manual Testing

```javascript
const system = new MonitoringSystem()
await system.startMonitoring()

// Run performance validation
const results = await system.performanceValidation()
console.log(results)
```

### Performance Metrics

The system continuously tracks:
- Process detection latency
- Memory leak detection time
- Alert response time
- Dashboard update latency
- System integration performance

## 🚨 Alert Types

### System Alerts
- `memory_leak` - Memory leak detected
- `process_threshold` - Process count exceeded
- `performance_threshold` - Performance degraded
- `diagnostic_issue` - Node.js diagnostic problem
- `resource_exhaustion` - System resources low

### Alert Severity Levels
- **LOW**: Informational alerts
- **MEDIUM**: Performance degradation
- **HIGH**: Resource issues
- **CRITICAL**: System failure imminent

## 🛠️ API Reference

### REST API Endpoints

```
GET /api/v1/status          - System status
GET /api/v1/metrics         - Performance metrics
GET /api/v1/alerts          - Active alerts
GET /api/v1/processes       - Process information
GET /api/v1/diagnostics     - Diagnostic data
GET /api/v1/history         - Historical data
POST /api/v1/alerts/acknowledge - Acknowledge alert
POST /api/v1/alerts/resolve - Resolve alert
```

### WebSocket Events

```javascript
// Dashboard updates
{
  type: 'dashboard_update',
  timestamp: 1703721600000,
  data: { /* monitoring data */ }
}

// Real-time alerts
{
  type: 'alert_update',
  alert: { /* alert details */ }
}
```

## 🔍 Troubleshooting

### Common Issues

**Process scanning fails on Windows:**
- Ensure `wmic` command is available
- Check Windows management instrumentation service
- Verify user permissions

**Memory leak detection false positives:**
- Adjust `anomalyThreshold` (default: 0.8)
- Extend `baselinePeriod` for better learning
- Review `memoryThreshold` setting

**Dashboard not accessible:**
- Check port 3001 availability
- Verify firewall settings
- Enable dashboard in configuration

### Debug Logging

Enable detailed logging:
```javascript
const auditLogger = new AuditLogger({
  logLevel: 'debug',
  enableConsole: true
})
```

### Performance Issues

Monitor system performance:
```javascript
const metrics = system.getSystemStatus()
console.log('Performance:', metrics.performance)
```

## 📁 Project Structure

```
src/
├── core/                    # Core orchestration
│   ├── ProcessOrchestrator.js
│   └── AuditLogger.js
├── managers/                # Process management
│   └── ProcessRegistry.js
├── monitoring/              # Real-time monitoring
│   ├── RealTimeMonitor.js
│   ├── LeakDetector.js
│   ├── PerformanceProfiler.js
│   └── AlertManager.js
├── diagnostics/             # Node.js diagnostics
│   └── NodeDiagnostics.js
├── dashboard/               # Web interface
│   └── MonitoringDashboard.js
└── MonitoringSystem.js      # Main orchestrator

scripts/
├── validate-performance.js  # Performance validation
└── simple-performance-test.js # Simple testing

tests/
├── unit/                    # Unit tests
└── integration/             # Integration tests
```

## 🧪 Testing

### Test Categories

1. **Unit Tests**: Component-specific testing
2. **Integration Tests**: Component interaction testing
3. **Performance Tests**: Requirement validation
4. **End-to-End Tests**: Full system testing

### Running Tests

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# Performance validation
npm run validate:performance
```

## 🔒 Security Considerations

### Process Access
- Minimal required permissions
- Process isolation
- Secure command execution

### Data Protection
- No sensitive data logging
- Audit trail encryption
- Access control validation

### Network Security
- Dashboard access controls
- WebSocket security
- API authentication (optional)

## 📋 Development Guidelines

### Code Quality
- ESLint configuration
- 90% test coverage requirement
- TypeScript-style JSDoc
- Enterprise design patterns

### Performance Standards
- All operations under performance requirements
- Memory-efficient algorithms
- Minimal system resource usage
- Graceful degradation

### Error Handling
- Comprehensive error recovery
- Audit trail for all failures
- Emergency shutdown procedures
- Component isolation

## 🤝 Contributing

1. Follow existing code patterns
2. Maintain test coverage >90%
3. Document all performance impacts
4. Test across platforms
5. Update performance benchmarks

## 📄 License

MIT License - See LICENSE file for details.

---

## 📞 Support

For issues and questions:
1. Check troubleshooting section
2. Review performance validation output
3. Enable debug logging
4. Check system requirements

**Performance Requirements Summary:**
- ✅ Process Detection: <10ms
- ✅ Memory Leak Detection: <50MB threshold  
- ✅ Alert Response: <1 second
- ✅ Dashboard Updates: <100ms
- ✅ Emergency Recovery: <5 seconds
- ✅ Cross-platform compatibility
- ✅ Enterprise audit logging
- ✅ ML-based anomaly detection