import detect from "detect-port";
import { spawn } from "cross-spawn";
import treeKill from "tree-kill";
import { promisify } from "node:util";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import http from "node:http";

const kill = promisify(treeKill);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "..");

const FRONTEND_PORT = Number(process.env.E2E_FRONTEND_PORT || 5174);
const BACKEND_PORT = Number(process.env.E2E_BACKEND_PORT || 8084);
const FRONTEND_HOST = process.env.E2E_FRONTEND_HOST || 'localhost';
const BACKEND_HOST = process.env.E2E_BACKEND_HOST || '127.0.0.1';
const BACKEND_HEALTH_PATH = process.env.E2E_BACKEND_HEALTH || "/actuator/health";
const FRONTEND_HEALTH_PATH = process.env.E2E_FRONTEND_HEALTH || "/";
const PLAYWRIGHT_CMD = process.env.PLAYWRIGHT_CMD || "npx";
const PLAYWRIGHT_ARGS = process.env.PLAYWRIGHT_ARGS ? process.env.PLAYWRIGHT_ARGS.split(" ") : ["playwright", "test"];

let backendProcess;
let frontendProcess;
let shuttingDown = false;

function log(prefix, message, color = "\x1b[0m") {
  const reset = "\x1b[0m";
  console.log(`${color}[${prefix}]${reset} ${message}`);
}

async function portInUse(port) {
  const available = await detect(port);
  return available !== port;
}

function spawnBackend() {
  log("backend", "Starting backend server (gradlew bootRun --profile e2e)", "\x1b[36m");
  const command = process.platform === "win32" ? "cmd" : "./gradlew";
  const args = process.platform === "win32"
    ? ["/c", "gradlew.bat", "bootRun", "--args=--spring.profiles.active=e2e"]
    : ["bootRun", "--args=--spring.profiles.active=e2e"];
  const child = spawn(command, args, {
    cwd: join(projectRoot, ".."),
    stdio: "inherit"
  });
  return child;
}

function spawnFrontend() {
  log("frontend", "Starting Vite dev server in e2e mode", "\x1b[36m");
  const command = process.platform === "win32" ? "npm.cmd" : "npm";
  const args = ["run", "dev:e2e"];
  const child = spawn(command, args, {
    cwd: projectRoot,
    stdio: "inherit"
  });
  return child;
}

async function waitForHttpReady({ host, port, path, label, timeoutMs = 120000 }) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.request(
          {
            hostname: host,
            port,
            path,
            method: "GET"
          },
          (res) => {
            if (res.statusCode && res.statusCode < 500) {
              res.resume();
              resolve();
            } else {
              reject(new Error(`Status ${res.statusCode}`));
            }
          }
        );
        req.on("error", reject);
        req.end();
      });
      log(label, "Service is healthy", "\x1b[32m");
      return;
    } catch (error) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  throw new Error(`${label} did not become ready on port ${port}`);
}

async function runPlaywright() {
  log("playwright", "Launching Playwright test suite", "\x1b[34m");
  const env = {
    ...process.env,
    E2E_EXTERNAL_WEBSERVER: "1",
    E2E_FRONTEND_PORT: String(FRONTEND_PORT),
  };
  const child = spawn(PLAYWRIGHT_CMD, PLAYWRIGHT_ARGS, {
    cwd: projectRoot,
    stdio: "inherit",
    env,
  });
  const [code] = await once(child, "close");
  return code;
}

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  log("runner", `Received ${signal}, cleaning up`, "\x1b[33m");
  const kills = [];
  
  // HARDENED: Enhanced cross-platform process cleanup following orchestrator pattern
  if (frontendProcess) {
    kills.push(
      kill(frontendProcess.pid, "SIGTERM").catch((error) => {
        // Git Bash compatibility fallback
        if (process.platform === 'win32' && error.message?.includes('Invalid argument')) {
          log("frontend", "Using fallback process termination for Git Bash compatibility", "\x1b[33m");
          try {
            process.kill(frontendProcess.pid, 'SIGTERM');
          } catch (fallbackErr) {
            log("frontend", `Fallback termination warning: ${fallbackErr.message}`, "\x1b[31m");
          }
        } else {
          log("frontend", `Failed to terminate frontend process: ${error}`, "\x1b[31m");
        }
      })
    );
  }
  
  if (backendProcess) {
    kills.push(
      kill(backendProcess.pid, "SIGTERM").catch((error) => {
        // Git Bash compatibility fallback
        if (process.platform === 'win32' && error.message?.includes('Invalid argument')) {
          log("backend", "Using fallback process termination for Git Bash compatibility", "\x1b[33m");
          try {
            process.kill(backendProcess.pid, 'SIGTERM');
          } catch (fallbackErr) {
            log("backend", `Fallback termination warning: ${fallbackErr.message}`, "\x1b[31m");
          }
        } else {
          log("backend", `Failed to terminate backend process: ${error}`, "\x1b[31m");
        }
      })
    );
  }
  
  await Promise.all(kills);
}

async function main() {
  process.on("SIGINT", () => shutdown("SIGINT").then(() => process.exit(130)));
  process.on("SIGTERM", () => shutdown("SIGTERM").then(() => process.exit(143)));

  const backendBusy = await portInUse(BACKEND_PORT);
  if (backendBusy) {
    log("backend", `Port ${BACKEND_PORT} already in use. Assuming backend is running`, "\x1b[33m");
  } else {
    backendProcess = spawnBackend();
    await waitForHttpReady({ host: BACKEND_HOST, port: BACKEND_PORT, path: BACKEND_HEALTH_PATH, label: "backend" });
  }

  const frontendBusy = await portInUse(FRONTEND_PORT);
  if (frontendBusy) {
    log("frontend", `Port ${FRONTEND_PORT} already in use. Will reuse existing server`, "\x1b[33m");
  } else {
    frontendProcess = spawnFrontend();
    await waitForHttpReady({ host: FRONTEND_HOST, port: FRONTEND_PORT, path: FRONTEND_HEALTH_PATH, label: "frontend" });
  }

  const exitCode = await runPlaywright();
  await shutdown("exit");
  process.exit(exitCode ?? 0);
}

main().catch(async (error) => {
  log("runner", `Unhandled error: ${error}`, "\x1b[31m");
  await shutdown("error");
  process.exit(1);
});
