# Skyforge navigation convergence — 16 November 2026

## Reference contract
The [Field & Desk revision c3eda3d8](https://github.com/FabinGurung/jp-field-desk-library/commit/c3eda3d8bd9c6ec4365d714b374f8c2dc1ca6b7c) is **UI/UX inspiration only**; its resource data, original invoices and procurement records are neither imported nor read by Skyforge. Field & Desk publisher QA run: 43856634512.

North is the existing single global header, **Home / Projects / Studio / Reference**. “Overview” remains a valid historic home-page role, not an extra primary destination.

West is a searchable source-model WBS selector and direct Gantt/calendar section navigation; the selected branch filters the existing Gantt while the activity selected in east details moves consistently.

Centre retains the one validated Gantt/calendar engine, 45-activity Narayani pilot, 160-activity Narayani v002, Harisharan v002 and reusable demo models; the 156 timed v002 bars, 210 dependencies and six holds remain untouched.

East is a persistent, clickable, context-aware activity panel: current WBS/title, open holds, actual predecessor/successor activity jump buttons, source citations when published, resource/quantity/constraint detail tabs, explicit unapproved status.

South includes previous/next activity navigation, project/catalog/rates/materials links, shared engine history and milestone URLs, and an explicit source/data ownership reminder.

## Governance and QA
- PRE commit: `ede7ca3744408a5c7abac451e299a146ddc33765`; source files and original project JSON preserved by Git.
- POST candidate commit: `9586c9adae5a8a45974896b0c41caf1e39841bee`; shared page code changed, not the project's source data.
- The existing Gantt table, calendar, detail tabs, hash navigation and version selector remain functional.
- A7 native PRE/POST pointers are linked by the manifest, with no replacement of canonical live Git paths, no raw Drive IDs copied and no Drive records fabricated.
- Checked full kernel suite: [run 43862128265](https://github.com/FabinGurung/jp-scheduling-resources-management/actions/runs/43862128265) passed; Pages deployment and independent browser QA must be verified before marking live UX final.
- No engineering release, verified actuals, BOQ procurement order, crew assignment or source data edits.

## Reuse and remaining work
Apply the navigation through `src/presentation/scheduling-desk.mjs` + `scheduling-compass.mjs`, not by cloning per-project Gantt pages. Core site header `assets/site-shell.mjs` is shared across the allowlisted Pages site. No page deletion or redirect mutation was needed: historical URLs survive.

Next QA should inspect 390px mobile, wider desktop, the WBS group filter, east prerequisites/successors, calendar selection, activity previous/next, and source link targeting; compare published source JSON with the frozen pre-UX commit before accepting. Visual consistency of legacy/non-desk research sections is a separately scoped review, not evidence of new source authority.
