#!/usr/bin/env node

const { getGradleCommand, runCommand } = require('./lib/test-runner');

const steps = [
  {
    label: 'Gradle unit tests',
    run: () => runCommand(getGradleCommand(), ['test'])
  },
  {
    label: 'Gradle integration tests',
    run: () => runCommand(getGradleCommand(), ['integrationTest'])
  },
  {
    label: 'Frontend npm tests',
    run: () => runCommand('npm', ['test', '--prefix', 'frontend'])
  }
];

async function main() {
  for (const step of steps) {
    console.log(`\n=== ${step.label} ===`);
    await step.run();
    console.log(`✅ ${step.label} completed successfully.`);
  }

  console.log('\n✅ All CI checks completed successfully.');
}

main().catch((error) => {
  console.error(`\n❌ CI checks failed: ${error.message || error}`);
  process.exitCode = 1;
});
