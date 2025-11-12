#!/usr/bin/env bash
set -euo pipefail

echo "[backend] install repo tooling deps (npm ci --ignore-scripts)"
if [ -f package.json ]; then
  npm ci --ignore-scripts
fi

dump_test_failures() {
  if [ ! -d build/test-results ]; then
    echo "[backend] test results directory missing; nothing to dump" >&2
    return
  fi

  python - <<'PY' || true
import pathlib
import xml.etree.ElementTree as ET

root = pathlib.Path('build/test-results')
failures = []
for xml_file in root.rglob('TEST-*.xml'):
  try:
    tree = ET.parse(xml_file)
  except ET.ParseError:
    continue
  for case in tree.findall('.//testcase'):
    failure = case.find('failure') or case.find('error')
    if failure is None:
      continue
    classname = case.get('classname', '<unknown>')
    name = case.get('name', '<unnamed>')
    snippet = (failure.text or '').strip().replace('\r', '')
    if len(snippet) > 2000:
      snippet = snippet[:2000] + '\n…'
    failures.append((xml_file.name, classname, name, snippet))

if not failures:
  print("[backend] No failing testcases found in XML reports.")
else:
  print(f"[backend] Detected {len(failures)} failing test case(s):")
  for idx, (xml_name, classname, name, snippet) in enumerate(failures, 1):
    print(f"  {idx}. [{xml_name}] {classname}.{name}")
    if snippet:
      print(snippet)
PY
}

run_backend_checks() {
  echo "[backend] gradle check"
  export JWT_SECRET="${JWT_SECRET:-test-secret}"
  # act executes inside Docker without Ryuk callback support; disable it to allow Testcontainers to run
  if [ -n "${ACT_TOOLSDIRECTORY:-}" ]; then
    export TESTCONTAINERS_RYUK_DISABLED="${TESTCONTAINERS_RYUK_DISABLED:-true}"
    export TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE="${TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE:-/var/run/docker.sock}"
    export TESTCONTAINERS_HOST_OVERRIDE="${TESTCONTAINERS_HOST_OVERRIDE:-host.docker.internal}"
    export DOCKER_HOST="${DOCKER_HOST:-unix:///var/run/docker.sock}"
  fi
  # Use system gradle in CI/act environments to avoid wrapper jar permission issues
  if [ -n "${CI:-}" ] || [ -n "${ACT:-}" ]; then
    gradle --no-configuration-cache check
  elif [ -x ./gradlew ]; then
    ./gradlew --no-configuration-cache check
  else
    gradle --no-configuration-cache check
  fi
}

set +e
run_backend_checks
status=$?
set -e
if [ $status -ne 0 ]; then
  echo "[backend] Gradle checks failed (exit code $status). Dumping test diagnostics…" >&2
  dump_test_failures
  exit $status
fi
