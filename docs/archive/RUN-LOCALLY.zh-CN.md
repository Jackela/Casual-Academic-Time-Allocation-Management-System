# 本地运行指南

这个文档的目标是让一个第一次接触 CATAMS 的读者，从克隆仓库到打开关键页面，尽量少走弯路。

## 1. 环境前置

请先准备：

- Java 21
- Node.js 20+
- Docker Desktop
- Git

说明：当前最稳的上手路径是直接使用 `docker compose` 拉起仓库自带的 PostgreSQL 和 API，所以 Docker Desktop 必须先启动。

## 2. 克隆与安装

```bash
git clone <repo-url>
cd Casual-Academic-Time-Allocation-Management-System
npm --prefix frontend install
```

## 3. 默认路径：启动数据库和 API

在第一个终端执行：

```bash
docker compose up -d db api
```

启动成功后：

- PostgreSQL 映射端口：`localhost:55433`
- API 地址：`http://127.0.0.1:8084`

## 4. 可选路径：本地源码调试后端

如果你需要断点调试 Spring Boot，而不是直接使用容器里的 API，请只启动数据库容器，再运行本地 `bootRun`：

```bash
docker compose up -d db
./gradlew --no-configuration-cache bootRun --args="--spring.profiles.active=e2e-local --server.port=8084"
```

当前默认配置已经和 `docker compose.yml` 的 `55433:5432` 映射对齐，所以不需要再手工覆盖 datasource。

## 5. 启动前端

在第二个终端执行：

```bash
npm --prefix frontend run dev:e2e
```

启动成功后，前端地址应为：`http://localhost:5174`

## 6. 重置并写入测试数据

在第三个终端执行：

```bash
node scripts/e2e-reset-seed.js --url http://127.0.0.1:8084 --token local-e2e-reset
```

这一步会把本地基线重置到文档和 E2E 使用的状态。

## 7. 登录账号

可直接使用以下种子账号：

- Admin: `admin@example.com`
- Lecturer: `lecturer@example.com`
- Tutor: `tutor@example.com`

如果登录页已经打开，访问：`http://localhost:5174/login`

## 8. 推荐验证路径

按下面顺序验证最省时间：

1. 未登录访问 `/dashboard`，确认会跳回 `/login`
2. 用 `tutor@example.com` 登录，打开 `/dashboard`
3. 切换 `All / Drafts / In Progress / Needs Attention`
4. 注销后用 `lecturer@example.com` 登录，确认 lecturer 仪表盘可见
5. 注销后用 `admin@example.com` 登录，打开 `/admin/users`

## 9. 一条 E2E 命令

```bash
node scripts/e2e-runner.js --project=real
```

PowerShell 按标签过滤时，记得给 `--grep` 加引号：

```bash
node scripts/e2e-runner.js --project=real --grep "@p0"
```

## 10. 常见问题

### 前端连不上后端

先确认你启动的是 `8084`，不是 `8080`，并且数据库容器已经映射到 `localhost:55433`。

### 后端起不来

先确认 Docker Desktop 正在运行，再看日志里是否是数据库容器未起来或端口被占用。

### 页面空白或数据不对

通常先重跑一次：

```bash
node scripts/e2e-reset-seed.js --url http://127.0.0.1:8084 --token local-e2e-reset
```

### Playwright 浏览器未安装

```bash
npm --prefix frontend exec playwright install chromium
```

## 11. 跑通之后看什么

- 架构：[`../architecture/overview.md`](../architecture/overview.md)
- 角色说明：[`../product/user-guide.md`](../product/user-guide.md)
- 测试说明：[`../testing/README.md`](../testing/README.md)
- 离线手册：[`archive-handbook.zh-CN.pdf`](archive-handbook.zh-CN.pdf)
