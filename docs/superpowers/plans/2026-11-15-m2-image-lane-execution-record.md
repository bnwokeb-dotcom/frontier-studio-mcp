# SDD ledger — plan: docs/superpowers/plans/2026-11-15-m2-image-lane.md

## Pre-flight scan
| Pair/Task | Produces vs Consumes | Finding | Ruling |
|---|---|---|---|
| T1→T3,4,5,6 | ImageLane/LaneInteraction/ImageArtifact/FetchLike signatures | none — briefs carry exact shapes | — |
| T2→T3,4,5 | ensureBudget/recordSpend; FilmMeta.spentUsd | none | — |
| T3→T4,5 | registerImageTools pattern; attachImage | none | — |
| T1 ruling | spec §4 GenerationLane vs images being synchronous | status() returns done; result() from cached submit body; no invented GET endpoint (spec §12 bring-up item) | Ruling: ImageLane is the M2 realization; VideoLane (M3) gets async submit/status/result. Cost if wrong: none — interface documented in types.ts |
| T2 ruling | budget brought forward from M4 | enforcement from first billed call; M4 keeps budget_set/budget_show/log_take/ledger_read tools | Ruling: budget enforcement is M2; budget TOOLS remain M4. Cost if wrong: none — user locked budget-caps decision |
| T4/T5 | prompts.ts pure functions carry Hell Grind doctrine verbatim | doctrine text must be exact | Ruling: prompt-law strings are binding test assertions (descriptor verbatim, HEADLESS, #e8e8e8, light law). Cost if wrong: sheet/keyframe quality drift |

## Progress
Task 1: dispatched (BASE 8cd5d50) → DONE, commit 6e5856a, 14 new lane tests, 57/57
Task 1: judgment calls adjudicated consistent-with-intent (steps[].output[] pinning; both id branches; NEXT fills; fetch-throw message)
Task 1: minor (deferred): Record<'1K'|'2K'|'4K'> inline union vs Record<ImageSize,number> alias (compile-time self-surfaces)
Task 1: minor (deferred): lastPrice ?? 0 could mask cache desync (throw would surface bugs)
Task 1: minor (deferred): errLaneDown NEXT string repeated 3x (hoist module const)
Task 1: minor (deferred): unbounded body cache holds full base64 (session-scoped; M2 branch review to consider eviction)
Task 1: fix round 1/5 (in progress — 3 Important: body-read outside try; JSON null body TypeError; non-array steps/output crash → 4 covering tests)
Task 1: fix round 1/5 (3 addressed, 0 open — body-read inside try; null-body guard; Array.isArray steps/output; commits 6e5856a..bd64a82)
Task 1: complete (commits 8cd5d50..bd64a82, review clean after fix round; 61/61)
Task 2: complete (commits bd64a82..2aa81ee, review clean; interpretations 1+2 adjudicated ACCEPTED)
Task 2: minor (deferred): float drift at exact-boundary spend (0.166+0.134 vs 0.3) — fail-closed only; epsilon/cents polish
Task 2: minor (deferred): report nit (false IEEE-754 claim in rationale; harmless)
Task 2: minor (deferred): no exact-boundary pass test; negative/NaN costUsd guard belongs in tool layer (Task 3 carries it)
Task 3: complete (commits 2aa81ee..0efdc56, review clean; adjudications: collision Minor→M2 review, aspect_ratio free-string acceptable, spent_usd wire → M4)
Task 3: minor (deferred): same-second generated/ filename collision can overwrite a paid artifact (ledger keeps 2 lines→1 file) — ESCALATED to M2 branch review for spec amendment (ms/counter)
Task 3: minor (deferred): non-transactional tail (writeFile/recordSpend/appendLine failure windows; negligible local-FS probability)
Task 3: minor (deferred): whitespace-only previous_interaction_id passes validation; EISDIR raw error on directory ref path
Task 3: minor (deferred): untested branches (explicit film_id, prev-interaction passthrough, non-default ratio/size)
Task 4: complete (commits 0efdc56..cceab9e, review clean — template byte-for-byte verified, staging audit-safe; adjudications ACCEPTED)
Task 4: minor (deferred): copyFile non-atomic (tmp+rename pattern exists in repo); widened paid-but-unrecorded window (~4 I/O steps between submit and recordSpend; harden = recordSpend right after lane.result); same-second stagedPath collision (randomBytes suffix closes it); billed-call orchestration duplicated 2x (extract helper if a 3rd lands); asset_image no source-format check
Task 5: complete (commits cceab9e..f41562f, review clean; disclosures adjudicated — prop pre-quote refusal = correct doctrine, 11 tests justified, asset_image style default out of scope)
Task 5: minor (deferred→branch review): prop-refusal NEXT dead-end (kind-conditional NEXT + full-string pin); stale adjacent strings under extended name law (asset.ts:107, image.ts:415-416); money-law sequence now 3rd copy — extraction REQUIRED at M2 branch review before a 4th billed tool; .mcp.json ownership confirm at branch review
Final review (whole-branch, 8cd5d50..56a5684): With-fixes — 4 Important (STUDIO_LIVE dead switch; same-second collision; stale doctrine strings; prop-refusal dead-end); ruling: live-unverified fixture contract acceptable, live run gates M3 (Task 0); money-law extraction DEFERRED to M3 plan as binding Task 0 rule
Final fix wave: commit a86ee63 (113/113 + 1 skipped; tag force-moved) — re-review: all 4 ADDRESSED, nuances adjudicated (hex4 slice coherent; tmp+rename Windows-safe via MoveFileEx REPLACE_EXISTING)
M2 COMPLETE: merged to main below
