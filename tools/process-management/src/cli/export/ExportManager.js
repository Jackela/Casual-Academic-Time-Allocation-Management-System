/**
 * Export Manager - Multi-format Data Export
 * 
 * @author CATAMS Team
 * @version 2.0.0
 */

const fs = require('fs').promises
const path = require('path')
const chalk = require('chalk')

class ExportManager {
  constructor(config = {}) {
    this.config = {
      defaultFormat: config.defaultFormat || 'json',
      outputDir: config.outputDir || './exports',
      maxFileSize: config.maxFileSize || 10 * 1024 * 1024,
      compressionEnabled: config.compressionEnabled || false,
      ...config
    }
    
    this.supportedFormats = ['json', 'csv', 'html', 'xlsx']
    this.exportHistory = []
  }
  
  async exportData(data, options = {}) {
    const format = options.format || this.config.defaultFormat
    const outputPath = options.output || this._generateOutputPath(format)
    
    if (!this.supportedFormats.includes(format)) {
      throw new Error(`Unsupported export format: ${format}`)
    }
    
    try {
      const formattedData = await this._formatData(data, format)
      
      // Ensure output directory exists
      const dir = path.dirname(outputPath)
      await fs.mkdir(dir, { recursive: true })
      
      // Write data
      await fs.writeFile(outputPath, formattedData, 'utf8')
      
      // Track export
      this.exportHistory.push({
        timestamp: Date.now(),
        format,
        outputPath,
        size: formattedData.length
      })
      
      console.log(chalk.green(`📁 Data exported to: ${outputPath}`))
      
      return {
        success: true,
        format,
        outputPath,
        size: formattedData.length
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Export failed:'), error.message)
      throw error
    }
  }
  
  async _formatData(data, format) {
    switch (format) {
      case 'json':
        return JSON.stringify(data, null, 2)
      case 'csv':
        return this._convertToCSV(data)
      case 'html':
        return this._convertToHTML(data)
      case 'xlsx':
        return JSON.stringify(data, null, 2) // Simplified
      default:
        throw new Error(`Unknown format: ${format}`)
    }
  }
  
  _convertToCSV(data) {
    // Basic CSV conversion
    if (Array.isArray(data)) {
      if (data.length === 0) return ''
      
      const headers = Object.keys(data[0])
      const rows = [headers.join(',')]
      
      data.forEach(item => {
        const values = headers.map(header => {
          const value = item[header]
          return typeof value === 'string' && value.includes(',') 
            ? `"${value}"` 
            : String(value || '')
        })
        rows.push(values.join(','))
      })
      
      return rows.join('\n')
    }
    
    return 'key,value\n' + Object.entries(data)
      .map(([key, value]) => `${key},${value}`)
      .join('\n')
  }
  
  _convertToHTML(data) {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>CATAMS Export</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        pre { background: #f5f5f5; padding: 15px; border-radius: 5px; }
        .header { background: #007acc; color: white; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 CATAMS Data Export</h1>
        <p>Generated: ${new Date().toLocaleString()}</p>
    </div>
    <pre>${JSON.stringify(data, null, 2)}</pre>
</body>
</html>`
  }
  
  _generateOutputPath(format) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `catams-export-${timestamp}.${format}`
    return path.join(this.config.outputDir, filename)
  }
  
  getExportHistory() {
    return [...this.exportHistory]
  }
}

module.exports = ExportManager