# 归档声明与使用边界

## 1. 仓库目的

这个仓库现在作为 CATAMS 毕业设计 / 课程项目的归档快照保留，主要服务于以下场景：

- 作品展示
- 架构学习
- 本地复现
- 测试与交付方式参考
- 课程项目研究

它不是“可以直接当作原创作业提交”的现成材料包。

## 2. 当前许可状态

当前仓库的 [LICENSE](../../LICENSE) 仍然写明为 University of Sydney 专有许可。

这意味着：

- 仓库可以公开浏览，不等于代码自动变成开源。
- 在没有进一步确认授权之前，不应默认认为你可以复制、修改、再分发其中的代码、截图、文档或其他资产。
- 如果你需要在自己的项目中直接复用源码或资产，请先确认自己拥有相应权利。

## 3. 署名与引用建议

如果你将这个仓库作为学习参考，请至少保留以下信息：

- 原项目名称：CATAMS
- 原仓库链接
- 原项目背景：Casual Academic Time Allocation Management System
- 你自己的改造范围和新增内容说明

建议在你自己的文档里明确写出：

> 本项目参考了 CATAMS 的系统结构、测试组织或文档组织方式；与原仓库不同之处已在本文档中单独说明。

## 4. 学术诚信说明

请不要：

- 直接把本仓库代码、截图、文档改个名字后当作自己的完整原创毕业设计提交。
- 删除原始来源痕迹后宣称“完全独立完成”。
- 在没有权限的前提下复制和再分发其中的专有材料。

如果你希望基于它完成自己的课程项目，更合适的做法是：

- 学习其结构和验证方式。
- 自己重写需求背景、命名、数据模型、界面文案和说明材料。
- 用你自己的数据、截图、图表和测试结果替换原始证据。
- 在必要时保留参考来源与致谢。

更具体的改造建议见 [`ADAPTATION-GUIDE.zh-CN.md`](ADAPTATION-GUIDE.zh-CN.md)。

## 5. 当前支持范围

当前文档记录并验证的有效基线是：

- Frontend: `http://localhost:5174`
- Backend: `http://127.0.0.1:8084`
- Seed accounts: `admin@example.com`, `lecturer@example.com`, `tutor@example.com`
- Full E2E command: `node scripts/e2e-runner.js --project=real`

## 6. 推荐入口

1. [`../../README.zh-CN.md`](../../README.zh-CN.md)
2. [`START-HERE.zh-CN.md`](START-HERE.zh-CN.md)
3. [`RUN-LOCALLY.zh-CN.md`](RUN-LOCALLY.zh-CN.md)
4. [`archive-handbook.zh-CN.pdf`](archive-handbook.zh-CN.pdf)
