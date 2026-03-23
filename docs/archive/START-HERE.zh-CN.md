# START HERE（中文）

如果你第一次打开这个仓库，不要先钻进历史报告或零散文档，按下面顺序读。

## 你可能是哪一类读者

### 1. 只想快速了解项目

按这个顺序：

1. [`../../README.zh-CN.md`](../../README.zh-CN.md)
2. [`../architecture/overview.md`](../architecture/overview.md)
3. [`../product/user-guide.md`](../product/user-guide.md)

### 2. 只想把项目本地跑起来

按这个顺序：

1. [`../../README.zh-CN.md`](../../README.zh-CN.md) 里的“3 分钟快速运行”
2. [`RUN-LOCALLY.zh-CN.md`](RUN-LOCALLY.zh-CN.md)
3. [`../testing/README.md`](../testing/README.md)

### 3. 想看完整的离线交付材料

直接打开：

- [`archive-handbook.zh-CN.pdf`](archive-handbook.zh-CN.pdf)

### 4. 想把它当成参考案例再做一个自己的课题

先看：

1. [`ARCHIVE-NOTICE.zh-CN.md`](ARCHIVE-NOTICE.zh-CN.md)
2. [`ADAPTATION-GUIDE.zh-CN.md`](ADAPTATION-GUIDE.zh-CN.md)

## 当前有效基线

当前文档与测试统一按这个基线描述：

- Frontend: `http://localhost:5174`
- Backend: `http://127.0.0.1:8084`
- Reset/seed: `node scripts/e2e-reset-seed.js --url http://127.0.0.1:8084 --token local-e2e-reset`
- Seed accounts: `admin@example.com`, `lecturer@example.com`, `tutor@example.com`

## 如果你只有 15 分钟

优先完成这三件事：

1. 按 [`RUN-LOCALLY.zh-CN.md`](RUN-LOCALLY.zh-CN.md) 跑到登录页。
2. 用 `tutor@example.com` 登录，打开 `/dashboard`。
3. 执行 `node scripts/e2e-runner.js --project=real`，确认报告生成到 `frontend/playwright-report/`。

## 不要从哪里开始

不建议第一次就从这些目录开始：

- `docs/archive/2025-11/`
- `docs/archive/2026-03/process-reports/`

它们是历史过程证据，不是当前上手入口。
