# Skyforge v1.17 — Five-direction Scheduling Compass · 16 November 2026

Release class: public-safe *presentation, navigation and reproducible QA* milestone.
Owner: `MOD-SCHED-001` (Skyforge). The [Field & Desk Library revision c3eda3d8](https://github.com/FabinGurung/jp-field-desk-library/commit/c3eda3d8bd9c6ec4365d714b374f8c2dc1ca6b7c) is a UI design reference, **not** a scheduling-data source.

## Delivered
- **North:** one shared, accessible `Home / Projects / Studio / Reference` primary header. The original home route remains; no redirect or old URL is removed.
- **West:** searchable populated WBS groups, project context, shortcuts to Gantt and Calendar; selecting a group filters the Gantt and updates the selected source activity.
- **Centre:** the unmodified source-backed shared Gantt, relationship arrows, scheduling calendar, and planning controls.
- **East:** clickable activity predecessor/successor selection, holds, approval warnings, source citations where present, and action shortcuts to existing Resources, Quantities and Constraints tabs. Never invent inaccessible original Drive links.
- **South:** previous/next activity, project listing, work-output and material planners, version history, tagged engine, and source ownership explanations.
- **Responsive:** tablet/mobile stacked regions; no stationary side panels obscuring 390px screens; primary controls remain touch-usable.
- **Consistent:** styling uses the existing Skyforge theme, not a copied Field & Desk theme or duplicated engine instance.

## Preserved independent planning editions
- Narayani 45-activity pilot remains default at `/projects/narayani/desk.html`.
- Narayani v002 remains a separate unapproved preview with **160 activities, 210 links, 156 timed activities, six open holds**.
- Harisharan dated v002 remains **839 activities, 1,321 links**, and V003 BOQ estimates remain separately governed. No M25 mix conversion was invented.
- Saturday holiday, source reference crew assumptions, elapsed concrete waits, permits and structural holds continue to be interpreted from each source model.
- No original Google Drive/Sheets workbook, field resource ledger, invoice, cost estimate, project activity JSON, or authorization status was changed.

## Reproducible verification
- Kernel full suite and site build: [run #43862498994](https://github.com/FabinGurung/jp-scheduling-resources-management/actions/runs/43862498994) successful.
- Authenticated Sheets source read, public-safe import and Pages deployment: [run #43862677548](https://github.com/FabinGurung/jp-scheduling-resources-management/actions/runs/43862677548) successful.
- Live Chromium browser QA: [run #43863288552](https://github.com/FabinGurung/jp-scheduling-resources-management/actions/runs/43863288552) successful on the served Narayani and Harisharan Pages at desktop and 390px mobile; includes saved screenshots, live source count verification and cross-view interaction.
- Existing Harisharan source editions each retained their separate successful QA workflows: #43862789276, #43862789176, #43862789162.
- Git-native controlled PRE/POST pointers: `docs/audit/20261116-compass/manifest.json`; pre-source SHA `ede7ca3744408a5c7abac451e299a146ddc33765`; feature source SHA `9586c9adae5a8a45974896b0c41caf1e39841bee`. Do not confuse these Git history pointers with invented Google Drive PRE/POST archive files.

## Public links
- [Narayani v002](https://fabingurung.github.io/jp-scheduling-resources-management/projects/narayani/schedule-v002.html)
- [Narayani pilot](https://fabingurung.github.io/jp-scheduling-resources-management/projects/narayani/desk.html)
- [Harisharan v002](https://fabingurung.github.io/jp-scheduling-resources-management/projects/fishtail/harisharan-residence/schedule-v002.html)
- [Reusable Studio](https://fabingurung.github.io/jp-scheduling-resources-management/studio/)
- [Project catalog](https://fabingurung.github.io/jp-scheduling-resources-management/projects/)
- [A7 pinned template adoption memory header](https://fabingurung.github.io/jp-a7-system-registry/memory-wall.html#skyforge-standard-schedule-template)

## Scope limits / next improvements
This milestone does not assert that every legacy technical subpage has undergone a new visual-browser review or that an original Drive source file has been reverified. Some historical navigation routes still serve archive/legacy documentation by design. Additional future candidate: improve large-WBS search virtualization, richer direct activity source citations when the authoritative private record is cleared, and a project-specific owner schedule intake gate for Narayani. Approval remains **not granted** until reviewed evidence exists.
