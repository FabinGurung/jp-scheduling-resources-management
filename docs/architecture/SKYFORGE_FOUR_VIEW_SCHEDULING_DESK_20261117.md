# Skyforge Primavera V1.18 · Four coordinated schedule views (17 November 2026)

## Outcome
The published shared Scheduling Desk now offers four views on the **same source-validated project model**:
1. **Activities + Gantt:** searchable activity table, horizontally aligned bars and source relationships.
2. **Calendar:** dated or relative-week calendar; click a day or activity to populate the persistent EAST inspector, without forcing a return to Gantt.
3. **Work packages:** select an inclusive 1-based activity-position range such as 4–15 (12 activities) or 70–90 (21 activities) and optionally a WBS branch. Display internal, incoming and outgoing source links, dates, open holds and activity buttons. Shareable URL query `pkg=A-B&pkgWbs=ID#packages` rebuilds this read-only snapshot. It is not a new authoritative schedule version.
4. **Working drawings:** fetch public CAD project registries and link original CAD Pages. Validate the original record schema and exact CAD project identity against an allowlisted `SKYFORGE_CAD_DRAWING_REFERENCES_V1` manifest. Click a CAD record to inspect its revision and recorded engineering hold in East. This is project-level access, **not** verified drawing-to-WBS/activity linkage.

The same source renderer covers Narayani's 45-activity pilot, separate Narayani v002 (160 activities, 210 links, 156 timed activities, six holds), Harisharan v002 (839 activities, 1,321 links), and new project models built using the shared v1.16 source-input contract. All baseline and engineering-release claims remain false.

## Interface and behavior

- **North** uses one site shell.
- **West** retains searchable WBS/project navigation with four workspace shortcuts.
- **Centre** shows the selected source-backed scheduling view.
- **East** owns activity selection, date selection, package information, or drawing-register details. Full resource, predecessor, successor, constraints, quantities and steps tab content is hosted in East, not hidden in a Gantt-only SOUTH pane.
- **South** retains history, previous/next activity and related source/action links.
- Project catalog no longer exposes a direct Narayani v002 button. The one project-level Scheduling Desk entry opens the 45-activity pilot; the version dropdown **inside** switches to v002.
- The previous `#activities`, `#calendar` and `#dependencies` deep links remain recognized. `#packages` and `#drawings` are new.
- Mobile 390px Chromium QA confirmed both Narayani and Harisharan East, packages and drawing views.

## CAD provenance and limits

The live CAD source is the independent [drawing coordination repository](https://github.com/FabinGurung/jp-drawing-coordination) and its [published site](https://fabingurung.github.io/jp-drawing-coordination/). Narayani current engineering register explicitly declares `PRJ-000007` with a current engineering HOLD. Harisharan source-axis register declares `INTAKE-20260826-HARISHARAN`, mapped to the existing Skyforge `PORT-000014` project record. Source links are publicly readable but never taken as permission to modify private Drive files. No cross-repository activity-to-drawing relationships are made up. The manifest's `activity_links` arrays remain empty, ready for future independently verified CAD crosswalk data.

## QA evidence and versioning

- Kernel tests and public build: [run 44001950413](https://github.com/FabinGurung/jp-scheduling-resources-management/actions/runs/44001950413), success.
- Sheets-backed GitHub Pages deployment: [run 44002155602](https://github.com/FabinGurung/jp-scheduling-resources-management/actions/runs/44002155602), success.
- Real public Pages Chromium live QA (including cross-origin CAD readback): [run 44002313866](https://github.com/FabinGurung/jp-scheduling-resources-management/actions/runs/44002313866), success, 11 checks; screenshots in uploaded artifact.
- PRE project source commit: `b111b20c065db98728bc07c2a5c5f5c5300c3024`; POST feature code commit: `9f6917fb85bd8d6112803313ef71fbd5793da3a4`; no existing project JSON was modified (verified comparison).
- Git-native PRE/POST audit: `docs/audit/20261117-four-views/manifest.json`. No staged or fabricated Google Drive records.

## Remaining non-fabricable inputs

Original restricted drawings, actual site resource attendance, contract-ready measured quantities and activity-level construction approvals remain governed by their owning sources. They are not unverified software bugs to mark closed. New activity-to-drawing crosswalk requires CAD element/source IDs and explicit reviewed mappings. Older legacy pages may remain preserved but can be subjected to new mobile/browser QA without deleting historical URLs.

## Standard-template adoption

Every project created from `templates/scheduling/standard-schedule-input-v1.example.json` that reaches `SKYFORGE_GENERIC_VIEW_MODEL_V1` automatically receives these four views via one reusable renderer. Do not add demo package quantities or unverifiable CAD links to the canonical source-input JSON. The source manifest and package selection are separate read-only presentation contracts.
