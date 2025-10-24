const { killPid } = require('../../../scripts/lib/port-utils');

/**
 * Minimal lifecycle manager wrapper used by port cleanup utilities.
 * Provides a terminateProcess method compatible with the expected API.
 */
class LifecycleManager {
  async terminateProcess(pid, options = {}) {
    if (!Number.isInteger(pid)) {
      throw new Error(`Invalid PID: ${pid}`);
    }

    const force = options.force !== false;
    const success = await killPid(pid, force);

    if (!success) {
      throw new Error(`Unable to terminate PID ${pid}`);
    }
  }
}

module.exports = LifecycleManager;
