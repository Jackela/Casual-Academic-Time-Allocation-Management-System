# 🚀 CATAMS CLI Revolution

Enterprise-grade Command Line Interface with revolutionary features for the Casual Academic Time Allocation Management System.

## ✨ Features

### 🏗️ Revolutionary Architecture
- **Modular Command Structure**: Plugin-style extensibility with category-based organization
- **Enterprise Performance**: Sub-100ms command response times with intelligent caching
- **Cross-Platform**: Native support for Windows, macOS, and Linux

### 📊 Real-time Monitoring
- **Live Process Monitoring**: Real-time system and process monitoring with configurable intervals
- **Interactive Dashboard**: Web-based dashboard with WebSocket updates and beautiful visualizations
- **Performance Metrics**: Comprehensive system performance tracking and analysis

### 🎯 Enterprise Help System
- **Intelligent Search**: Fuzzy search with command completion and contextual guidance
- **Interactive Help**: Step-by-step guidance with examples and troubleshooting tips
- **Command Validation**: Real-time option validation with helpful error messages

### 🎨 Beautiful User Experience
- **Colored Output**: Theme-aware colored terminal output with status indicators
- **Progress Visualization**: Multiple progress bar styles, spinners, and operation trackers
- **Responsive Design**: Terminal-aware layout with graceful degradation

### 📤 Multi-format Export
- **Multiple Formats**: JSON, CSV, HTML, and Excel export capabilities
- **Beautiful Reports**: Styled HTML reports with charts and professional layouts
- **Scheduled Exports**: Automated data export with configurable intervals

### ⚙️ Configuration Management
- **Hierarchical Config**: Multi-layer configuration (defaults < user < environment < runtime)
- **Hot-reload**: Real-time configuration updates without restart
- **Schema Validation**: JSON schema validation with helpful error messages

## 🚀 Quick Start

### Installation

```bash
# Install dependencies
npm install

# Make CLI globally available (optional)
npm link
```

### Basic Usage

```bash
# Display help
./cli.js --help

# Show system status
./cli.js status

# Start real-time monitoring
./cli.js monitor --dashboard

# Launch interactive dashboard
./cli.js dashboard --port 3001

# Run diagnostics
./cli.js diagnose --scope system --verbose

# Export system data
./cli.js export --type metrics --format html --output report.html
```

## 📋 Command Reference

### Core Operations
- `monitor` - Real-time process monitoring with live updates
- `cleanup` - Intelligent cleanup operations with progress tracking  
- `validate` - System state validation with comprehensive reporting
- `report` - Multi-format reporting with export capabilities
- `status` - Display comprehensive system status

### Diagnostics & Analysis
- `diagnose` - AI-powered problem detection with solutions
- `analyze` - Performance analysis tools with trend visualization
- `audit` - Complete system audit with compliance reporting
- `benchmark` - Performance benchmarking with historical comparison

### Emergency Response
- `emergency-cleanup` - Crisis response mode with safety confirmations
- `force-reset` - System force restart with recovery validation
- `recovery-mode` - Safe mode operations with limited functionality
- `safe-mode` - Conservative operations with enhanced safety checks

### Configuration & Help
- `config` - Configuration management with hot-reload
- `help-system` - Interactive help system with command completion
- `dashboard` - Launch interactive web dashboard
- `export` - Export system data in various formats

## 🎮 Interactive Demo

Experience all CLI features with the interactive demonstration:

```bash
npm run cli:demo
```

The demo showcases:
- Real-time monitoring with beautiful progress bars
- Interactive dashboard with live updates
- Enterprise help system with search and completion
- Multi-format export capabilities
- Configuration hot-reload
- Emergency response system
- Performance validation

## 🧪 Testing

Run comprehensive CLI tests:

```bash
npm run cli:test
```

Tests validate:
- ✅ CLI Core initialization and performance
- ✅ Command registry and execution
- ✅ Configuration management and hot-reload
- ✅ UI components and progress visualization
- ✅ Help system search and completion
- ✅ Export functionality across all formats
- ✅ Cross-platform compatibility
- ✅ Performance requirements (<100ms responses)

## 📊 Dashboard Features

The interactive web dashboard provides:

- **Real-time System Metrics**: CPU, memory, disk, and network monitoring
- **Process Management**: Live process list with filtering and sorting
- **Performance Charts**: Interactive charts with historical data
- **Command Interface**: Execute CLI commands directly from the web UI
- **Alert Management**: Real-time alerts and notifications
- **Responsive Design**: Works on desktop, tablet, and mobile devices

Access the dashboard at: `http://localhost:3001` (default)

## ⚙️ Configuration

### Configuration Hierarchy (highest to lowest priority):
1. **Runtime** - Set via `catams config set` commands
2. **Environment** - Environment variables (e.g., `CATAMS_CLI_THEME`)
3. **Project** - `catams.config.json` in project directory
4. **User** - `~/.catams/config.json` in user home directory
5. **System** - `/etc/catams/config.json` (Linux/macOS)
6. **Defaults** - Built-in default configuration

### Example Configuration

```json
{
  "cli": {
    "theme": "modern",
    "enableColors": true,
    "enableAnimations": true,
    "updateInterval": 1000,
    "verbosity": "normal"
  },
  "dashboard": {
    "port": 3001,
    "host": "localhost",
    "enableAuth": false,
    "updateInterval": 1000
  },
  "monitoring": {
    "processDetectionLatency": 10,
    "memoryLeakThreshold": 52428800,
    "alertResponseTime": 1000,
    "enableRealTimeMonitor": true,
    "enableLeakDetector": true
  },
  "export": {
    "defaultFormat": "json",
    "outputDir": "./exports",
    "maxFileSize": 10485760,
    "compressionEnabled": false
  }
}
```

### Environment Variables

```bash
# CLI settings
export CATAMS_CLI_THEME=modern
export CATAMS_CLI_COLORS=true
export CATAMS_CLI_VERBOSITY=verbose

# Dashboard settings  
export CATAMS_DASHBOARD_PORT=3001
export CATAMS_DASHBOARD_HOST=localhost

# Monitoring settings
export CATAMS_MONITORING_INTERVAL=10
export CATAMS_EXPORT_FORMAT=json
```

## 🎨 Themes

Choose from multiple UI themes:

- **modern** (default) - Contemporary design with gradients and animations
- **classic** - Traditional terminal appearance with solid colors
- **minimal** - Clean, distraction-free interface

```bash
# Change theme
catams config set cli.theme minimal

# Theme persists across sessions with hot-reload
```

## 📈 Performance

The CLI is optimized for enterprise performance:

- **Command Response**: <100ms for most operations
- **Memory Usage**: <50MB typical usage
- **Dashboard Updates**: <100ms real-time updates
- **Hot-reload**: <200ms configuration updates
- **Cross-platform**: Consistent performance across operating systems

Performance is continuously validated with automated tests.

## 🚨 Emergency Features

Designed for production crisis management:

### Safety Features
- **Confirmation Prompts**: Required for destructive operations
- **Backup Creation**: Automatic backups before major changes  
- **Recovery Validation**: Verify system state after recovery
- **Audit Logging**: Complete audit trail of all actions

### Emergency Commands
- `emergency-cleanup` - Force cleanup with safety checks
- `force-reset` - System restart with validation
- `recovery-mode` - Limited safe mode operations
- `safe-mode` - Conservative operations only

## 🔧 Development

### Architecture

```
cli.js (main entry point)
├── src/cli/core/
│   ├── CLICore.js (main controller)
│   └── CommandRegistry.js (command management)
├── src/cli/commands/ (command implementations)
├── src/cli/dashboard/ (web dashboard)
├── src/cli/help/ (help system)
├── src/cli/ui/ (progress bars, styling)
├── src/cli/config/ (configuration management)
├── src/cli/export/ (data export)
└── src/cli/validation/ (input validation)
```

### Adding New Commands

1. Create command class in appropriate category file
2. Implement `execute(options)` method
3. Define `description`, `usage`, `options`, and `examples`
4. Register in command category's `getCommands()` method
5. Add help documentation and validation rules

### Integration Points

The CLI integrates with existing CATAMS components:
- **MonitoringSystem** - Real-time system monitoring
- **ProcessOrchestrator** - Process lifecycle management
- **IntelligentCleaner** - Smart cleanup operations
- **AuditLogger** - Comprehensive audit logging

## 📚 Examples

### Basic Monitoring
```bash
# Start basic monitoring
catams monitor --interval 2000 --format table

# Monitor with dashboard
catams monitor --dashboard --port 3001

# Save monitoring data
catams monitor --save monitoring-$(date +%Y%m%d).json --duration 10
```

### System Diagnostics
```bash  
# Quick system check
catams diagnose --scope system

# Comprehensive analysis with auto-fix
catams diagnose --scope all --auto-fix --verbose

# Performance benchmarking
catams benchmark --tests all --save baseline.json
```

### Data Export
```bash
# Export current metrics
catams export --type metrics --format json --output metrics.json

# Generate HTML report
catams export --type all --format html --output system-report.html

# Weekly CSV export
catams export --type logs --format csv --period 1w --output weekly-logs.csv
```

### Configuration Management
```bash
# View current config
catams config

# Update settings
catams config set dashboard.port 3002
catams config set cli.theme minimal

# Validate configuration
catams config --validate

# Reset to defaults
catams config --reset
```

### Emergency Operations
```bash
# Enter safe mode
catams safe-mode

# Emergency cleanup (with confirmation)
catams emergency-cleanup

# Force system reset (careful!)
catams force-reset --confirm
```

## 🤝 Integration

The CLI is designed to integrate seamlessly with:

- **CI/CD Pipelines**: Automated monitoring and reporting
- **Docker Containers**: Containerized deployment monitoring  
- **Kubernetes**: Pod and service monitoring
- **Monitoring Systems**: Prometheus, Grafana integration
- **Alerting**: PagerDuty, Slack notifications

## 📄 License

MIT License - see LICENSE file for details.

## 🙋 Support

- **Documentation**: Run `catams help-system --interactive`
- **Demo**: Run `npm run cli:demo` for interactive demonstration
- **Testing**: Run `npm run cli:test` for comprehensive validation
- **Issues**: Report issues in the project repository

---

**Ready for production use!** 🎉

Experience the future of command-line interfaces with CATAMS CLI Revolution.