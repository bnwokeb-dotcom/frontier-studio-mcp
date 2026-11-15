# SDD ledger — plan: docs/superpowers/plans/2026-11-14-m1-registry-core.md

## Pre-flight scan
| Pair/Task | Produces vs Consumes | Finding | Ruling |
|---|---|---|---|
| T2→T3,4,5,6,7 | fs.ts+paths.ts signatures | none — briefs carry exact signatures | — |
| T3→T4,5,6 | filmCreate/assertId/patchFilmMeta/filmMetaOrThrow | studio.ts↔film.ts circular import risk in plan text | Ruling: setActiveFilm/getActiveFilm live ONLY in studio.ts; film.ts never re-exports them; tests import from studio.js — cost if wrong: runtime circular-init crash |
| T4→T5 | assetRefCheck signature | none | — |
| T5→T6 | FilmMeta.sequences via patchFilmMeta | plan text typo `film.ts?JS` in T6 test import | Ruling: import is `../../src/store/film.js` — cost if wrong: none, cosmetic |
| T7 | consumes all store fns; MCP SDK surface | client-before-connect order bug in plan test snippet; Windows import.meta.url guard | Ruling: construct Client before connect; use pathToFileURL(process.argv[1]).href — cost if wrong: test flake / double-connect on Windows |
| T7 SDK shape | server.tool() overload may differ from plan sketch | flagged in plan | Ruling: intent is binding (8 tools, snake_case args, guard→MCP error map); implementer consults installed SDK types — cost if wrong: minor API-adapter rework |

## Progress
Task 1: dispatched (BASE cbadafc) → DONE_WITH_CONCERNS, commit 57d2d41
Ruling: plan Interfaces-line helper assertStudioRoot(cfg) is dropped — stray mention never defined/used; loadConfig test covers the refusal (cost if wrong: none — YAGNI)
Ruling (harness): Agent tool has no per-dispatch model param in this client; model selection per skill is approximated by brief completeness (plan carries full code = transcription-tier work). Cost if wrong: slower/cheaper tradeoff only.
Task 1: minor (deferred): config tests lack STUDIO_LIVE='0'/unset and empty-string-key branch coverage (brief-level gap)
Task 1: minor (deferred): loadConfig({}) called twice in throw-path test (brief's own redundancy, harmless)
Task 1: fix round 1/5 (in progress — Important: undisclosed allowScripts block in package.json; ruling = keep block, disclose in report; no code change)
Task 1: fix round 1/5 (1 addressed, 0 open — allowScripts disclosed in report; commits 57d2d41 unchanged)
Task 1: complete (commits cbadafc..57d2d41, review clean)
Task 2: complete (commits 57d2d41..e7de86d, review clean)
Task 2: minor (deferred): unused writeFile import in test (brief-verbatim)
Task 2: minor (deferred): corrupt-JSON surfaces as raw SyntaxError not StudioError (schema validation owns later)
Task 2: minor (deferred): joinPath no traversal sanitization (upstream ID validation owns it)
Task 2: minor (deferred): orphaned tmp file if writeFile throws (negligible)
Task 3: complete (commits e7de86d..883b7f2, review clean)
Task 3: minor (deferred): unused StudioError import in film.test (drop in a later touch)
Task 3: minor (deferred): corrupt film.json treated as NOT_FOUND / initStudio resets corrupt studio.json silently (M2 hardening note)
Task 3: minor (deferred): no direct test for title/logline VALIDATION path; patchFilmMeta gets coverage via Task 6
Task 4: complete (commits 883b7f2..61a7e87, review clean)
Ruling: spec 'atomic writes' constraint binds JSON state files (writeJsonAtomic ✓); .md content files use plain writeText — partial-write risk backstopped by assetRefCheck disk re-verification; M2 hardening note. Cost if wrong: a mid-crash could leave a partial character dir — recovery is re-register advice; acceptable at M1.
Task 4: minor (deferred): untested disk-incompleteness branch (plan-mandated test set)
Task 4: minor (deferred): non-ENOENT read errors conflated with 'missing' (M2 hardening)
Task 4: minor (deferred): registration not transactional across the 3 md writes (backstop exists)
Task 4: minor (deferred): duplicate-probe message precedes completeness message (cosmetic)
Task 5: dispatched (BASE 61a7e87) → DONE, commit 6bfbf35, review verdict Approved w/ 2 Important (plan-mandated holes)
Ruling: spec §8 binding — shotUpdate MUST re-enforce sequence geo lock on the MERGED record (covers geoBlock patches and sequence patches; matching another sequence's lock is a legal move). Cost if wrong: silent geo drift = teleported characters, the exact failure the lock exists to prevent.
Ruling: shot id is immutable through patch; id in patch → VALIDATION; patch.id stripped before merge so file stays path-true. Cost if wrong: id/path invariant corruption, mislabeled records.
Task 5: minor (deferred): shallow audioBlock merge replaces whole block (store semantic; tool layer must resend dialogue)
Task 5: minor (deferred): durationS NaN passes range check (typed API marginal)
Task 5: minor (deferred): shotCreate reads film.json twice; shotShow maps all read errors to NOT_FOUND (established store pattern)
Task 5: minor (deferred): setStatus has no dedicated test (delegation covered indirectly)
Task 5: fix round 1/5 (in progress — 2 Important: geo-lock re-enforcement + id immutability; ruling text sent to implementer)
Task 5: fix round 1/5 (2 addressed, 0 open — geo lock re-enforced on merged record, id immutable; commits 6bfbf35..5ae6724)
Task 5: minor (deferred): id-guard precedes shotShow so rename-on-missing yields VALIDATION not NOT_FOUND (ruling-literal, cheap-check-first pattern)
Task 5: complete (commits 61a7e87..5ae6724, review clean after fix round)
Task 6: complete (commits 5ae6724..b2bb7df, review clean)
Task 6: minor (deferred): lock check-then-act window across concurrent lockers (sequential semantics correct; shot.ts independently enforces)
Task 6: minor (deferred): empty-geoBlock VALIDATION path unasserted (brief mandated 1 test)
Task 7: dispatched (BASE b2bb7df) → DONE, commit df4b02d, review Needs-fixes (1 Important) + 5 adaptations ruled intent-consistent
Task 7: minor (deferred): status values unvalidated through wire patch (M2 deep-patch-validation note)
Task 7: minor (deferred): -32602/-32000 codes assigned but not wire-observable (SDK 1.32.2 isError conversion; later tasks may embed class in result data)
Task 7: minor (deferred): toMcpError returns unknown; out(undefined) theoretical (polish)
Task 7: fix round 1/5 (in progress — Important: partial audio_block patch deletes existing dialogue/sfx; R3 emit-only-present-keys + R4 covering test)
Task 7: fix round 1/5 (1 addressed, 0 open — audio preservation via present-keys-only + deep-merge adjudication verified; commits df4b02d..9328ea4)
Task 7: minor (deferred): dialogue:null on wire now throws raw TypeError (improvement over silent wipe; M2 malformed-field hardening)
Task 7: minor (deferred): no wire syntax to delete sfx key once set (present-keys-only consequence; moot in M1)
Task 7: complete (commits b2bb7df..9328ea4, review clean after fix round)
Task 8: complete (commits 9328ea4..5f9f82b, review clean; E2E 10/10 PASS, tag m1-registry-core)
Task 8: minor (deferred): LICENSE file missing (README says MIT) — add before publish
Task 8: minor (deferred): S10 shutdown rests on script marker (add on('exit') echo in future smokes)
Task 8: minor (deferred): E2E covers subset of doctrine refusals (unit suites backstop)
Task 8: minor (deferred): mixed path separators in asset_register result (cosmetic win32)
Task 8: ROUTED-TO-FINAL: shot OUTPUT wire is camelCase (geoBlock/assetId/durationS/voiceRef) vs plan invariant 'snake_case at MCP boundary' — adjudicate against spec §6
Final review (whole-branch, cbadafc..5f9f82b): With-fixes — 3 Important (camelCase output wire/silent no-op patches; sequence ids bypass ID law; status unvalidated) + 2 README corrections + spec §6 errata; deferred-minors triaged (1 elevated = status, rest DEFER)
Final fix wave: 1 commit c9fe773 (43/43, tag force-moved) — re-review: all 5 ADDRESSED, nuances (a)(b)(c) ACCEPT, no new breakage
M1 COMPLETE: branch m1-registry-core == tag m1-registry-core == c9fe773, ready to merge
