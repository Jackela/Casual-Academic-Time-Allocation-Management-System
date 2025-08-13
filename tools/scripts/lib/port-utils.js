const { spawn } = require('child_process');
const os = require('os');
const path = require('path');

function execCapture(command, args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { shell: true, stdio: ['ignore', 'pipe', 'pipe'], ...options });
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => (out += d.toString()));
    child.stderr.on('data', (d) => (err += d.toString()));
    child.on('close', (code) => resolve({ code, out, err }));
    child.on('error', (e) => resolve({ code: -1, out, err: String(e) }));
  });
}

async function isPortListening(port) {
  if (process.platform === 'win32') {
    const r = await execCapture('netstat', ['-ano']);
    if (r.code !== 0) return false;
    return r.out.split(/\r?\n/).some((l) => l.includes(`:${port}`) && /LISTENING/i.test(l));
  }
  // Unix-like
  let r = await execCapture('lsof', ['-i', `:${port}`, '-sTCP:LISTEN', '-t']);
  if (r.code === 0 && r.out.trim()) return true;
  r = await execCapture('ss', ['-lptn']);
  if (r.code === 0) return r.out.split(/\n/).some((l) => l.includes(`:${port}`));
  return false;
}

async function findPidsByPort(port) {
  if (process.platform === 'win32') {
    const r = await execCapture('netstat', ['-ano']);
    if (r.code !== 0) return [];
    const pids = new Set();
    r.out.split(/\r?\n/).forEach((l) => {
      if (l.includes(`:${port}`) && /LISTENING|ESTABLISHED/i.test(l)) {
        const parts = l.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && /^\d+$/.test(pid)) pids.add(Number(pid));
      }
    });
    return Array.from(pids);
  }
  // Unix-like
  let r = await execCapture('lsof', ['-i', `:${port}`, '-t']);
  if (r.code === 0 && r.out.trim()) {
    return r.out.split(/\s+/).filter(Boolean).map((s) => Number(s)).filter((n) => !Number.isNaN(n));
  }
  r = await execCapture('fuser', [`${port}/tcp`]);
  if (r.code === 0 && r.out.trim()) {
    return r.out.split(/\s+/).filter(Boolean).map((s) => Number(s)).filter((n) => !Number.isNaN(n));
  }
  return [];
}

async function getCmdline(pid) {
  if (process.platform === 'win32') {
    const r = await execCapture('wmic', ['process', 'where', `processid=${pid}`, 'get', 'CommandLine', '/FORMAT:LIST']);
    if (r.code !== 0) return '';
    const m = r.out.match(/CommandLine=(.*)/i);
    return m ? m[1].trim() : '';
  }
  const r = await execCapture('ps', ['-p', String(pid), '-o', 'cmd=']);
  if (r.code !== 0) return '';
  return r.out.trim();
}

async function killPid(pid, force = true) {
  if (process.platform === 'win32') {
    // /T flag kills the process tree (children processes too)
    const r = await execCapture('taskkill', ['/PID', String(pid), '/T', force ? '/F' : '']);
    return r.code === 0;
  }
  // Unix-like: try to kill process group first, then individual process
  try {
    // Kill process group (negative PID)
    const r1 = await execCapture('kill', [force ? '-9' : '-15', `-${pid}`]);
    if (r1.code === 0) return true;
  } catch {}
  
  // Fallback to individual process
  const r = await execCapture('kill', [force ? '-9' : '-15', String(pid)]);
  return r.code === 0;
}

module.exports = {
  isPortListening,
  findPidsByPort,
  getCmdline,
  killPid,
  execCapture
};


