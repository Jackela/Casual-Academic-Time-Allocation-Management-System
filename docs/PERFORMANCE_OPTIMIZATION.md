# 测试性能优化指南

## CPU占用问题根源

### 主要问题
1. **TestContainers重启开销**: 每次测试都启动新PostgreSQL容器
2. **Spring Boot上下文重建**: 每个测试类都创建新应用上下文  
3. **Gradle守护进程**: 多个JVM进程并行运行
4. **Docker在Windows开销**: Docker Desktop在Windows上资源消耗大

### 性能对比
- **优化前**: ~60秒, CPU 80-100%
- **优化后**: ~20秒, CPU 30-50%

## 优化策略

### 1. 容器重用 (立即生效)
```bash
# 启用容器重用
set TESTCONTAINERS_REUSE_ENABLE=true
node tools/scripts/test-backend-integration-optimized.js
```

### 2. 选择性测试 (开发时使用)
```bash
# 只运行特定测试
node tools/scripts/test-selective.js TimesheetUpdateDeleteIntegrationTest
```

### 3. 测试配置优化
- 使用 `@Testcontainers` 注解的单例模式
- Spring Boot 测试切片 (`@WebMvcTest`, `@DataJpaTest`)
- 内存数据库 (H2) 替代PostgreSQL (非CI环境)

### 4. Gradle优化
- JVM内存限制: `-Xmx2g`
- 并行构建限制: `--max-workers=2`
- 禁用守护进程: `--no-daemon`

## 推荐的测试策略

### 开发阶段
```bash
# 快速测试 (单个测试类)
node tools/scripts/test-selective.js *YourTest*

# 容器重用集成测试
node tools/scripts/test-backend-integration-optimized.js
```

### CI/CD阶段
```bash
# 完整测试套件 (接受较高资源使用)
node tools/scripts/test-backend-integration.js
```

## 监控和诊断

### 资源使用监控
```bash
# Windows任务管理器监控:
# - java.exe 进程 (Gradle/Spring Boot)
# - node.exe 进程 (测试脚本)
# - com.docker.backend.exe (Docker)

# 容器状态检查
docker ps
docker stats
```

### 故障排除
1. **高内存使用**: 检查Gradle JVM设置
2. **容器启动失败**: 重启Docker Desktop
3. **端口占用**: 运行 `node tools/scripts/emergency-cleanup.js`
4. **测试卡住**: 检查TestContainers超时设置

## 最佳实践

### 开发者工作流
1. **单元测试优先**: 快速反馈，低资源消耗
2. **集成测试按需**: 只在关键更改后运行
3. **容器重用**: 开发期间保持容器运行
4. **定期清理**: 使用cleanup脚本释放资源

### 系统资源管理
- 开发时关闭非必要应用
- 定期重启Docker Desktop
- 监控磁盘空间 (Docker镜像占用)
- 使用SSD提升I/O性能