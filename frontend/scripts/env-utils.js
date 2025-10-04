import path from 'path';
import http from 'node:http';
import https from 'node:https';

export const DEFAULT_BACKEND_PORT = 8084;
export const DEFAULT_FRONTEND_PORT = 5174;
export const DEFAULT_BACKEND_HOST = '127.0.0.1';
export const DEFAULT_FRONTEND_HOST = 'localhost';

function coerceNumber(value, fallback) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function extractFromUrl(value, extractor, fallback) {
  if (!value) {
    return fallback;
  }
  try {
    const parsed = new URL(value);
    return extractor(parsed);
  } catch {
    return fallback;
  }
}

export function resolveBackendPort() {
  const explicit = process.env.E2E_BACKEND_PORT ?? process.env.BACKEND_PORT;
  if (explicit) {
    return coerceNumber(explicit, DEFAULT_BACKEND_PORT);
  }
  const url = process.env.E2E_BACKEND_URL ?? process.env.BACKEND_URL;
  const portFromUrl = extractFromUrl(url, (parsed) => parsed.port ? Number(parsed.port) : (parsed.protocol === 'https:' ? 443 : 80), undefined);
  return portFromUrl ? coerceNumber(portFromUrl, DEFAULT_BACKEND_PORT) : DEFAULT_BACKEND_PORT;
}

export function resolveFrontendPort() {
  const explicit = process.env.E2E_FRONTEND_PORT ?? process.env.FRONTEND_PORT;
  if (explicit) {
    return coerceNumber(explicit, DEFAULT_FRONTEND_PORT);
  }
  const url = process.env.E2E_FRONTEND_URL ?? process.env.FRONTEND_URL;
  const portFromUrl = extractFromUrl(url, (parsed) => parsed.port ? Number(parsed.port) : (parsed.protocol === 'https:' ? 443 : 80), undefined);
  return portFromUrl ? coerceNumber(portFromUrl, DEFAULT_FRONTEND_PORT) : DEFAULT_FRONTEND_PORT;
}

export function resolveBackendHost() {
  const explicit = process.env.E2E_BACKEND_HOST ?? process.env.BACKEND_HOST;
  if (explicit) {
    return explicit;
  }
  const url = process.env.E2E_BACKEND_URL ?? process.env.BACKEND_URL;
  return extractFromUrl(url, (parsed) => parsed.hostname, DEFAULT_BACKEND_HOST);
}

export function resolveFrontendHost() {
  const explicit = process.env.E2E_FRONTEND_HOST ?? process.env.FRONTEND_HOST;
  if (explicit) {
    return explicit;
  }
  const url = process.env.E2E_FRONTEND_URL ?? process.env.FRONTEND_URL;
  return extractFromUrl(url, (parsed) => parsed.hostname, DEFAULT_FRONTEND_HOST);
}

export function resolveBackendUrl() {
  const explicitUrl = process.env.E2E_BACKEND_URL ?? process.env.BACKEND_URL;
  if (explicitUrl) {
    return explicitUrl;
  }
  const protocol = process.env.E2E_BACKEND_PROTOCOL ?? 'http';
  const host = resolveBackendHost();
  const port = resolveBackendPort();
  return `${protocol}://${host}:${port}`;
}

export function resolveFrontendUrl() {
  const explicitUrl = process.env.E2E_FRONTEND_URL ?? process.env.FRONTEND_URL;
  if (explicitUrl) {
    return explicitUrl;
  }
  const protocol = process.env.E2E_FRONTEND_PROTOCOL ?? 'http';
  const host = resolveFrontendHost();
  const port = resolveFrontendPort();
  return `${protocol}://${host}:${port}`;
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

export function resolveNpmCommand() {
  return isWindows() ? 'npm.cmd' : 'npm';
}

export function resolveNpxCommand() {
  return isWindows() ? 'npx.cmd' : 'npx';
}

export function resolveGradleCommand(cwd = process.cwd()) {
  const wrapperName = isWindows() ? 'gradlew.bat' : 'gradlew';
  return path.join(cwd, wrapperName);
}

export function resolveCmdShim(command) {
  if (!isWindows()) {
    return { command, args: [] };
  }
  return { command: 'cmd.exe', args: ['/d', '/s', '/c', command] };
}

export function toPlatformCommand(binary, args = []) {
  if (!isWindows()) {
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
