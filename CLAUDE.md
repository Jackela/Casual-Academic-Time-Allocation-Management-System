

资源清理原则 (Resource Cleanup Protocol): 任何启动了后台服务的任务，在结束时必须包含清理步骤，确保所有进程被关闭、端口被释放。



金字塔调试法 (Pyramid Debugging Method): 当遇到Bug时，严禁直接用E2E调试。必须遵循从底层到上层的顺序：先用单元测试验证工具函数，再用组件测试（配合Mock API）验证UI组件，最后才用E2E测试验证完整的用户流程。



无阻塞报告 (Non-Blocking Reporter): 所有Playwright指令，必须默认使用--reporter=line或--reporter=null，禁止使用会阻塞Shell的show-report。

