# Primavera / Skyforge

[Open the live project schedule directory](https://fabingurung.github.io/jp-scheduling-resources-management/schedules/projects/).

Each registered project has an editable scheduling Sheet and a companion Google Doc. Use the Sheet for activities, durations, dates and dependencies. Use the Doc for scope, decisions and notes. Begin a reviewed paragraph with `[PUBLIC] ` to include it in the public project notes. Keep confidential details in the private source.

[The publishing workflow](https://github.com/FabinGurung/jp-scheduling-resources-management/actions/workflows/skyforge-reference-sync.yml) reads the registered inputs and tests the public projection before updating Pages. It can run manually and is scheduled hourly. The source files are filed under the repository's folder in `01_JP / 09 GitHub Repositories`.

## Federated repository boundary — A7 is an index, not this product's template owner

**This repository owns** its domain-specific source, templates, workflows, documentation, tests and release history: Primavera-like task/activity schemas, schedule logic, calendars, milestones, dependencies, resource and 4D status. The catalogue at [A7](https://github.com/FabinGurung/JP_A7_System_Registry_and_Knowledge_Graph) is only the **federated service directory / metadata index** of where repositories, websites, version pointers, statuses and cross-module relationships are found. A7 is **not** a parent codebase, shared template writer, or administrator of this module's content.

**Agent and automation rule:** Never create, update, synchronize or “repair” A7 code, policy, templates, catalogue records, READMEs, website or history as a side effect of work in this repository. An A7 modification requires a **separate task explicitly authorized by the user for A7**, with its own versioning and review. If an A7 listing appears stale, leave A7 unchanged and note a pending pointer correction **locally**. Resolve this repository's own live sources and approvals; do not duplicate its canonical domain files into A7. The CAD/AAD design-and-drawing template is owned by [CAD/AAD](https://github.com/FabinGurung/JP_Computer-Aided-Drawings/tree/main/governance/aad), never by A7. Existing independent domain and private-provider authorities still apply.


## Active publication boundary (24 November 2026)
The only scheduled complete-site publisher on main is `skyforge-reference-sync.yml`. The obsolete Narayani scheduler and five completed one-shot release definitions are preserved in Drive Archive and Version History / 000004, with the original Git commit and release tags retained. Read-only historical QA remains available. Do not invoke a legacy partial-site deployment; reconcile optional field-evidence import into the complete publisher first. Current source register: https://fabingurung.github.io/jp-scheduling-resources-management/schedules/resources/sources.html .
