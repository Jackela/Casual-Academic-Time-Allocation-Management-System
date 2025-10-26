CATAMS Test Design Alignment Report – 2025-10-24

Summary
- Total specs reviewed (frontend/e2e/real/specs): 6
- Aligned: 4
- Shallow: 1 (reworked; now anchored to POST endpoints but still minimal)
- Outdated: 0
- Probable product defects: 0 (contract lane now fails fast or skips on missing preconditions)
- Probable test defects: 0 (template skipped; mod/reject strengthened)

Breakdown by Module
- approval-chain.spec.ts – ✅ aligned – workflow correctness – Single sentinel + list anchor added
- lecturer-create-timesheet.spec.ts – ✅ aligned – workflow correctness – Keeps SSOT payload assert; redundant waits reduced
- tutor-restricted.spec.ts – ✅ aligned – UI acceptance – Role restriction deep-link + sentinel
- admin-user-management.spec.ts – ✅ aligned – UI acceptance – whoami warm-up + POST /api/users anchor
- modification-rejection.spec.ts – ✅ aligned – UI acceptance – Added anchors for POST modify/reject and UI outcomes
- _template.spec.ts – ⚠️ shallow – Template only; now skipped to avoid metric skew

Recommendations
- Continue migrating dashboard/list specs to single-sentinel + network-anchors and auth warm-up standard.
- Apply seed→edit factories to EA billing and exception flows to avoid policy-gated create flake.
- Keep CI guardrail to fail on waitForTimeout; refactor any remaining offenders under real/** (non-spec modules) if needed.
