
Resource Cleanup Protocol: Any task that starts background services must include cleanup steps when finished, ensuring all processes are closed and ports are released.

Pyramid Debugging Method: When encountering bugs, direct E2E debugging is prohibited. Must follow bottom-up order: first verify utility functions with unit tests, then verify UI components with component tests (using Mock API), finally verify complete user flows with E2E tests.

Non-Blocking Reporter: All Playwright commands must default to using --reporter=line or --reporter=null, blocking shell show-report is prohibited.

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.