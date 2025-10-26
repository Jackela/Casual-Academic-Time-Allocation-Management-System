import path from 'path';
import http from 'node:http';
import https from 'node:https';
import os from 'node:os';

const requireEnv = (name) => {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable "${name}"`);
  }
  return value.trim();
};

const parseUrl = (name) => {
  try {
    return new URL(requireEnv(name));
  } catch (error) {
    throw new Error(`Invalid URL specified for "${name}": ${error.message}`);
  }
};

export function resolveBackendUrl() {
  const raw = requireEnv('E2E_BACKEND_URL');
  if (isWsl()) {
    try {
      const u = new URL(raw);
      if (u.hostname === '127.0.0.1') {
        u.hostname = 'localhost';
        return u.toString();
      }
    } catch {}
  }
  return raw;
}

export function resolveFrontendUrl() {
  return requireEnv('E2E_FRONTEND_URL');
}

export function resolveBackendPort() {
  const explicit = process.env.E2E_BACKEND_PORT ?? process.env.BACKEND_PORT;
  if (explicit) {
    const parsed = Number(explicit);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new Error(`Invalid numeric value for E2E_BACKEND_PORT: ${explicit}`);
    }
    return parsed;
  }

  const url = new URL(resolveBackendUrl());
  if (!url.port) {
    throw new Error('E2E_BACKEND_URL must include an explicit port or set E2E_BACKEND_PORT');
  }
  return Number(url.port);
}

export function resolveFrontendPort() {
  const explicit = process.env.E2E_FRONTEND_PORT ?? process.env.FRONTEND_PORT;
  if (explicit) {
    const parsed = Number(explicit);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new Error(`Invalid numeric value for E2E_FRONTEND_PORT: ${explicit}`);
    }
    return parsed;
  }

  const url = parseUrl('E2E_FRONTEND_URL');
  if (!url.port) {
    throw new Error('E2E_FRONTEND_URL must include an explicit port or set E2E_FRONTEND_PORT');
  }
  return Number(url.port);
}

export function resolveBackendHost() {
  const explicit = process.env.E2E_BACKEND_HOST ?? process.env.BACKEND_HOST;
  if (explicit && explicit.trim()) {
    return explicit.trim();
  }
  const url = new URL(resolveBackendUrl());
  return url.hostname;
}

export function resolveFrontendHost() {
  const explicit = process.env.E2E_FRONTEND_HOST ?? process.env.FRONTEND_HOST;
  if (explicit && explicit.trim()) {
    return explicit.trim();
  }
  const url = parseUrl('E2E_FRONTEND_URL');
  return url.hostname;
}

export function sanitizeEnv(overrides = {}) {
  const env = { ...process.env, ...overrides };
  delete env.npm_config_script_shell;
  delete env.npm_config_shell;
  delete env.npm_lifecycle_script;
  return env;
}

export function isWindows() {
  return process.platform === 'win32';
}

export function isWsl() {
  // Heuristics to detect WSL when Node reports linux
  if (process.platform !== 'linux') return false;
  if (process.env.WSL_DISTRO_NAME) return true;
  const release = os.release().toLowerCase();
  if (release.includes('microsoft')) return true;
  return false;
}

export function resolveNpmCommand() {
  return isWindows() ? 'npm.cmd' : 'npm';
}

export function resolveNpxCommand() {
  return isWindows() ? 'npx.cmd' : 'npx';
}

export function resolveGradleCommand(cwd = process.cwd()) {
  // Prefer system Gradle in CI or when explicitly requested
  if (process.env.CI === '1' || process.env.USE_SYSTEM_GRADLE === '1') {
    return 'gradle';
  }
  if (isWsl()) {
    // Convert POSIX path (/mnt/d/dir) to Windows path (D:\dir) for cmd.exe
    const winGradle = toWindowsPath(path.join(cwd, 'gradlew.bat'));
    return winGradle;
  }
  const wrapperName = isWindows() ? 'gradlew.bat' : 'gradlew';
  return path.join(cwd, wrapperName);
}

export function resolveCmdShim(command) {
  if (!(isWindows() || isWsl())) {
    return { command, args: [] };
  }
  // Use cmd to execute the .bat file; arguments will follow in the spawn call
  return { command: 'cmd.exe', args: ['/d', '/s', '/c', command] };
}

export function toPlatformCommand(binary, args = []) {
  if (!(isWindows() || isWsl())) {
    return { command: binary, args: [...args] };
  }

  const lower = binary.toLowerCase();
  const needsCmd = lower.endsWith('.bat') || lower.endsWith('.cmd');

  if (needsCmd) {
    return {
      command: 'cmd.exe',
      args: ['/d', '/s', '/c', binary, ...args],
    };
  }

  return { command: binary, args: [...args] };
}

export function toWindowsPath(posixPath) {
  // Minimal WSL path translator: /mnt/<drive>/<path> -> <DRIVE>:\<path>
  if (!posixPath || typeof posixPath !== 'string') return posixPath;
  if (!posixPath.startsWith('/mnt/')) return posixPath;
  const parts = posixPath.split('/');
  // [ '', 'mnt', 'd', 'Code', ... ]
  if (parts.length < 4) return posixPath;
  const drive = parts[2].toUpperCase();
  const rest = parts.slice(3).join('\\');
  return `${drive}:\\${rest}`;
}

function coerceAttemptConfig(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function createHealthConfig(prefix, overrides = {}) {
  const envRetries = process.env[`${prefix}_HEALTH_RETRIES`];
  const envInterval = process.env[`${prefix}_HEALTH_INTERVAL_MS`];
  const envTimeout = process.env[`${prefix}_HEALTH_REQUEST_TIMEOUT_MS`];

  const retries = overrides.retries ?? coerceAttemptConfig(envRetries, 60);
  const interval = overrides.interval ?? coerceAttemptConfig(envInterval, 2000);
  const requestTimeout = overrides.requestTimeout ?? coerceAttemptConfig(envTimeout, 5000);

  return {
    retries,
    interval,
    requestTimeout,
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitForHttpHealth({
  url,
  label = 'service',
  config = createHealthConfig('SERVICE'),
  acceptStatus,
}) {
  const { retries, interval, requestTimeout } = config;
  const target = new URL(url);
  const client = target.protocol === 'https:' ? https : http;
  const shouldAccept = acceptStatus || ((status) => status >= 200 && status < 500);

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await new Promise((resolve, reject) => {
        const request = client.get(target, (response) => {
          const status = response.statusCode ?? 500;
          response.resume();
          if (shouldAccept(status)) {
            resolve(true);
          } else {
            reject(new Error(`HTTP ${status}`));
          }
        });

        request.setTimeout(requestTimeout, () => {
          request.destroy(new Error('timeout'));
        });

        request.on('error', reject);
      });
      return true;
    } catch (error) {
      if (attempt === retries) {
        throw new Error(`${label} did not become ready: ${error.message}`);
      }
      await sleep(interval);
    }
  }

  return false;
}

export function buildUrl({ protocol = 'http', host, port, path = '/' }) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${protocol}://${host}:${port}${normalizedPath}`;
}
