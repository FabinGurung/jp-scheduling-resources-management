# JP Scheduling & Resources Management (Skyforge)

**Current entry point:** [Live schedules](https://fabingurung.github.io/jp-scheduling-resources-management/schedules/). The `main` branch owns publishing workflows; `kernel-v0.2-open-source-engines` owns the executable scheduling engine, tests, and site templates.

## Start here — read only what the task needs

| Task | Relevant files |
| --- | --- |
| Source ownership and live import | `scripts/import-primavera-docsheet-v2.mjs`, `scripts/sync-reference-norms.mjs` |
| Project UI (activities, Gantt, calendar, packages, drawings) | `public-v2/projects/view.html`, `public-v2/assets/app.js`, `public-v2/assets/styles.css` |
| Source modules and resources | `public-v2/resources/`, registered Google Sheets/Docs |
| Scheduling logic | `src/kernel/`, relevant `tests/` only |
| Publication | `scripts/build-site-docsheet-v2.mjs`, `scripts/verify-primavera-docsheet-v2.mjs`, `scripts/qa-primavera-browser.mjs`; on `main`, `.github/workflows/skyforge-reference-sync.yml` |

Google Docs/Sheets are the authoritative editable project and resource records. Resolve the registered sources through the scheduling Drive root and master project register. Do not overwrite working sources, invent approvals or duplicate private records in public outputs. Read-only source imports and validated GitHub Pages are derived views. See the live publishing-code guide in Drive for the Google-first change policy.

## Validation and archive

Run `npm test`, `npm run verify:calendar` and the applicable build/verify targets in `package.json`. Authenticated source import and browser QA run in GitHub Actions. Existing historical routes and their executable dependencies are retained.

Historical reports, obsolete design notes, map exports and the previous long README are preserved in the scheduling Drive root → **99 Archive and Version History → 000003 — 2026-11-24 — PRE Active Repository Cleanup**. The archive contains exact main/kernel snapshots, file trees, SHA-256 checksums and the removal manifest. Kernel PRE commit: `8c0633785ab33b77157813658369a985a3c78d04`. Main PRE commit: `d5a1f2781b90e1d2666edfad76b5a680ce031820`. Retrieve only for explicit historical investigation or restoration. Do not recursively load archive folders or old branches into AI context.

## Foreman and live sources
The shared decorative mascot is installed on interactive public pages by `scripts/install-skyforge-foreman.mjs` using `assets/skyforge-foreman.mjs`. The source register is generated from actual successful source reads by the importer and shown at `schedules/resources/sources.html`. It does not expose restricted file IDs.
