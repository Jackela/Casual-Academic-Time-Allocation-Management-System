# 根目录清理与防污染完整计划

## 📊 问题分析

### 当前污染文件
```
根目录污染:
- backend.log, backend-dev.log, backend-e2e.log  (3.5MB+)
- frontend-dev.log, frontend-e2e.log
- testci.log
- CON, nul, patch.tmp  (Windows文件系统残留)
```

### 根本原因
1. **构建工具默认行为**: Gradle/npm 默认输出到当前目录
2. **AI工具日志重定向**: Claude/Cursor 执行命令时未指定日志路径
3. **Windows文件系统特性**: 保留文件名(CON/NUL)被意外创建

---

## 🎯 解决方案

### 阶段 1: 立即清理 (5分钟)

#### Windows 用户
```powershell
# 执行迁移脚本
powershell -ExecutionPolicy Bypass -File scripts\migrate-root-logs.ps1

# 验证清理结果
git status --short
```

#### Linux/macOS/Git Bash 用户
```bash
# 执行迁移脚本
bash scripts/migrate-root-logs.sh

# 验证清理结果
git status --short
```

**预期结果**:
```
M  .gitignore
A  scripts/migrate-root-logs.ps1
A  scripts/migrate-root-logs.sh
A  .claude/project-rules.md
A  .cursor/rules/project-constraints.md
```

---

### 阶段 2: 防止未来污染

#### 2.1 Git配置更新
```bash
# 暂存更新的 .gitignore
git add .gitignore

# 暂存AI工具约束文件
git add .claude/project-rules.md
git add .cursor/rules/project-constraints.md

# 暂存迁移脚本
git add scripts/migrate-root-logs.sh
git add scripts/migrate-root-logs.ps1

# 提交更改
git commit -m "chore: implement root directory pollution prevention

- Add comprehensive .gitignore rules for log files
- Prevent Windows reserved filenames (CON, NUL, etc.)
- Create migration scripts for historical cleanup
- Add AI coding tool constraints (.claude, .cursor)
- Establish log routing standards (all logs → logs/)

Closes: root directory cleanup initiative"
```

#### 2.2 AI工具配置验证

**Claude Code (.claude/project-rules.md)**:
- ✅ 禁止根目录创建日志文件
- ✅ 强制日志路由到 `logs/` 目录
- ✅ 禁止 Windows 保留文件名
- ✅ 预提交检查清单

**Cursor (.cursor/rules/project-constraints.md)**:
- ✅ 文件系统约束规则
- ✅ 日志管理强制规范
- ✅ 目录结构合规检查

---

### 阶段 3: 项目工作流更新

#### 3.1 更新package.json脚本 (frontend/)
```bash
cd frontend
```

确保所有npm脚本重定向日志:
```json
{
  "scripts": {
    "dev": "vite 2>&1 | tee ../logs/frontend-dev.log",
    "build": "vite build 2>&1 | tee ../logs/frontend-build.log",
    "test:e2e": "playwright test 2>&1 | tee ../logs/frontend-e2e.log"
  }
}
```

#### 3.2 更新Gradle配置 (build.gradle.kts)

添加日志配置:
```kotlin
tasks.bootRun {
    doFirst {
        project.file("logs").mkdirs()
        standardOutput = FileOutputStream("logs/backend-dev.log")
        errorOutput = FileOutputStream("logs/backend-dev.log")
    }
}
```

#### 3.3 创建日志目录初始化脚本

**scripts/init-logs-dir.sh**:
```bash
#!/usr/bin/env bash
mkdir -p logs/{backend,frontend,test,temp,archived-root-logs}
touch logs/.gitkeep
echo "✅ Logs directory structure initialized"
```

---

## 🔍 验证清单

### 自动化验证脚本

**scripts/verify-root-clean.sh**:
```bash
#!/usr/bin/env bash
set -euo pipefail

echo "🔍 Verifying root directory cleanliness..."

# Check for log files in root
ROOT_LOGS=$(find . -maxdepth 1 -name "*.log" 2>/dev/null | wc -l)
if [ "$ROOT_LOGS" -gt 0 ]; then
  echo "❌ FAIL: Found $ROOT_LOGS log file(s) in root"
  find . -maxdepth 1 -name "*.log"
  exit 1
fi

# Check for Windows reserved names
RESERVED=("CON" "NUL" "PRN" "AUX" "patch.tmp")
for name in "${RESERVED[@]}"; do
  if [ -f "$name" ]; then
    echo "❌ FAIL: Found reserved filename: $name"
    exit 1
  fi
done

echo "✅ PASS: Root directory is clean"
```

### 手动验证步骤

1. **检查根目录**:
   ```bash
   ls -la | grep -E '\.(log|tmp)$|^CON$|^NUL$'
   # 应该无输出
   ```

2. **检查logs目录**:
   ```bash
   ls -lh logs/
   # 应该看到 archived-root-logs/ 和 .gitkeep
   ```

3. **验证.gitignore生效**:
   ```bash
   echo "test" > test.log
   git status --short | grep test.log
   # 应该无输出（被忽略）
   rm test.log
   ```

4. **测试AI工具约束**:
   - 请求Claude创建日志文件，验证是否自动使用 `logs/` 目录
   - 请求创建临时文件，验证是否避免根目录

---

## 📈 持续维护

### 每周检查 (推荐自动化)
```bash
# 添加到 .github/workflows/lint.yml
- name: Verify root directory cleanliness
  run: bash scripts/verify-root-clean.sh
```

### 季度审计
1. 检查 `logs/archived-root-logs/` 大小
2. 清理超过90天的归档日志
3. 审查 `.gitignore` 是否需要新规则

### 开发者入职培训
- 将本文档加入 onboarding checklist
- 强调日志路由标准
- 演示迁移脚本使用

---

## 🚀 执行步骤总结

### 立即执行 (必需)
```bash
# 1. 清理现有污染
powershell -ExecutionPolicy Bypass -File scripts\migrate-root-logs.ps1

# 2. 提交防护更改
git add .gitignore .claude/ .cursor/ scripts/migrate-root-logs.*
git commit -m "chore: implement root directory pollution prevention"

# 3. 验证清理
bash scripts/verify-root-clean.sh
```

### 后续优化 (推荐)
```bash
# 1. 更新构建脚本日志重定向
# 2. 添加CI验证检查
# 3. 团队培训和文档共享
```

---

## 📚 参考文档

- `.gitignore` 最佳实践: https://git-scm.com/docs/gitignore
- Windows 保留文件名列表: https://learn.microsoft.com/en-us/windows/win32/fileio/naming-a-file
- 项目结构文档: `docs/architecture/workspace-structure.md`

---

## ✅ 成功标准

清理计划成功的标志:
1. ✅ 根目录无 `.log` 文件
2. ✅ 无 Windows 保留文件名
3. ✅ 所有日志归档到 `logs/archived-root-logs/`
4. ✅ `.gitignore` 更新并生效
5. ✅ AI工具约束文件就位
6. ✅ 验证脚本通过
7. ✅ 团队成员理解新规范
