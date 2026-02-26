# Test Performance Optimization Guide

## Root Causes of High CPU Usage

### Key Issues
1. TestContainers restart overhead: a new PostgreSQL container for every test run
2. Spring Boot context rebuilds: a fresh application context per test class
3. Gradle daemon and parallel JVMs: multiple JVMs competing for resources
4. Docker on Windows overhead: Docker Desktop is resource‑intensive on Windows

### Before vs After
- Before optimization: ~60s total, CPU 80–100%
- After optimization: ~20s total, CPU 30–50%

## Optimization Strategies

### 1) Reuse Containers (immediate impact)
```bash
# Enable container reuse
set TESTCONTAINERS_REUSE_ENABLE=true
node tools/scripts/test-backend-integration-optimized.js
```

### 2) Selective Tests (during development)
```bash
# Run a specific test class only
node tools/scripts/test-selective.js TimesheetUpdateDeleteIntegrationTest
```

### 3) Test Configuration Tuning
- Use singleton Testcontainers via `@Testcontainers`
- Apply Spring Boot test slices (`@WebMvcTest`, `@DataJpaTest`) where applicable
- Prefer in‑memory DB (H2) for local/dev where CI parity is not required

### 4) Gradle Tuning
- JVM memory limit: `-Xmx2g`
- Parallel workers: `--max-workers=2`
- Disable daemon when necessary: `--no-daemon`

## Recommended Test Workflows

### Development
```bash
# Fast cycles (single class)
node tools/scripts/test-selective.js *YourTest*

# Integration with container reuse
node tools/scripts/test-backend-integration-optimized.js
```

### CI/CD
```bash
# Full suite (accept higher resource use)
node tools/scripts/test-backend-integration.js
```

## Monitoring & Diagnostics

### Resource Monitoring
```bash
# Windows Task Manager focus:
# - java.exe (Gradle/Spring Boot)
# - node.exe (test scripts)
# - com.docker.backend.exe (Docker)

# Container status checks
docker ps
docker stats
```

### Troubleshooting
1. High memory usage: review Gradle JVM settings
2. Container start failures: restart Docker Desktop
3. Port in use: run `node tools/scripts/emergency-cleanup.js`
4. Hung tests: review TestContainers timeouts

## Best Practices

### Developer Workflow
1. Unit tests first: fast feedback, lower resource use
2. Integration tests as needed: run after critical changes
3. Reuse containers during development
4. Clean up periodically with helper scripts

### System Resource Management
- Close non‑essential apps during development
- Periodically restart Docker Desktop
- Monitor disk usage (Docker images)
- Prefer SSD for faster I/O
