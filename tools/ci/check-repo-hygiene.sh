#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

declare -a blocked_regexes=(
  '^bin/'
  '^frontend/vitest-report\.json$'
  '^frontend/vitest-report-escaped\.txt$'
  '^E2E_FIXES_SUMMARY\.md$'
  '^E2E_TEST_ANALYSIS\.md$'
  '^FINAL_TEST_REPORT\.md$'
  '^FRONTEND_TEST_FIX_COMPREHENSIVE_PLAN\.md$'
  '^FRONTEND_TEST_FIX_PLAN\.md$'
  '^FRONTEND_TEST_FIX_PROGRESS\.md$'
  '^REMAINING_3_TESTS_INVESTIGATION\.md$'
  '^TEST_STATUS\.md$'
  '^UAT_TASK_TYPE_FIX_SUMMARY\.md$'
  '^VALIDATION_REPORT\.md$'
  '.*\.disabled$'
)

violations=()
while IFS= read -r tracked_path; do
  for regex in "${blocked_regexes[@]}"; do
    if [[ "$tracked_path" =~ $regex ]]; then
      violations+=("$tracked_path")
      break
    fi
  done
done < <(git ls-files)

if ((${#violations[@]} > 0)); then
  echo "[repo-hygiene] FAIL: blocked tracked artifacts detected:" >&2
  printf '  - %s\n' "${violations[@]}" >&2
  echo "[repo-hygiene] Remove, archive, or untrack these files before pushing." >&2
  exit 1
fi

echo "[repo-hygiene] PASS: tracked repository content is clean."
