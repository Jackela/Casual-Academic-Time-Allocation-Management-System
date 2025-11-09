CATAMS Test Design Alignment Report – 2025-10-24 14:20

**Summary**
- Total specs reviewed (frontend/e2e/real/specs): 6
- Aligned: 4
- Shallow: 2
- Outdated: 0
- Probable product defects: 1 (contract create SSOT precondition)
- Probable test defects: 1 (banner-only assertions)

**Breakdown by Module**
-  –  –  – 
-  –  –  – 
-  –  –  – 
-  –  –  – 
-  –  –  – 
-  –  –  – 

**Recommendations**
- Replace stacked visibility waits with one route-level sentinel + specific waitForResponse anchors (determinism-over-patience).
- Add auth warm-up helper (whoami + token sync) before the first list request on protected pages (Admin Users, dashboards).
- Enrich modification-rejection.spec.ts with network anchoring and final state verification (status transition / history entry).
- For contract create SSOT: seed or verify lecturer courses/tutors before POST to avoid env artifacts; if still failing, raise product ticket.
- Remove the _template.spec.ts from lanes or mark @skip to avoid skewing coverage metrics.