# 15_Narayani Parajuli — v002 owner-source-to-Gantt QA (14 November 2026)

**Project:** PRJ-000007 · Narayani Parajuli Residence · Pokhara, Nepal  
**Status:** PROJECT-SPECIFIC AUDIT / OPEN REVIEW. **NOT** a construction baseline, approved design, permit, actual-progress projection, BOQ, or engineer's release.  
**Scope:** Read-only comparison of controlled owner Nepali v001, English v001, owner schedule v002 and its existing public-safe derived schedule. No controlled source was replaced. Original 45-activity pilot and v002 planning preview are preserved.

## Authority and reproducibility

- Enterprise designation: `15_Narayani Parajuli`; scheduling identity: `PRJ-000007`. The controlled project file index and G02–G08 gate register identify the same project.
- Owner's verbatim mixed-language Nepali v001 and separate English working transcript v001 were recovered from the *existing controlled Drive schedule source folder*. The English translation has 21 indexed passages, `EN-01.01`–`EN-05.01`, with explicit editorial uncertainty. Original texts remain private and were **not** republished.
- Source v002 JSON SHA-256: `463bfae5039df78ff1fb1da697bbb225298f1fdd07c4c91738b5fe21863005d0`. Same digest is recorded in the public derived model's `input_sha256` field.
- Controlled v002 source: **160 activities / 194 dependencies / 16 conditional rules / 3 milestones / 66 candidate-measurement activities**. The existing public preview: **160 activities / 210 displayed links / 156 timed / 4 untimed / six open hold groups**. The 16 additional displayed links are selected/overridden preview conditions, **not new owner-authored source edges**.
- Independent source JSON checks: no duplicate IDs or edges, no missing activity endpoints, no missing English passage references; all 21 English passages used by one or more activities; exactly one root (`D010`); topological traversal covers all 160 activities (acyclic). Independent derived-view check likewise finds no directed cycle.
- The preview's `2000-01-02` epoch and 524 relative calendar-day span are an **illustrative planning axis**, not historic starts/finishes or an approved Narayani completion forecast. Saturday is off for work activities; concrete-age comparators and the provisional timber lead are elapsed time.
- The visible base crew of two skilled + three helpers and eight working hours is an unapproved reference scenario, not site attendance or resource-levelled availability.

## Estimate/source-grade QA

The public schedule's 160 rows are categorized as follows:

| Type | Rows | Interpretation |
|---|---:|---|
| Planning allowances | 84 | Unmeasured placeholder work durations |
| Planner samples | 62 | Rate-catalog illustrations with sample quantities, NOT site takeoff |
| Partial planner samples | 3 | Incomplete footing-family coverage plus explicit additional allowance |
| Elapsed concrete-age references | 3 | One per modelled structural lift; engineer release still required |
| Other elapsed allowance | 1 | Provisional timber readiness lead |
| Zero-duration milestones | 3 | Planning milestones only |
| Pending / untimed | 4 | `U015`, `U020`, `U030`, `M070` |

**No task has been promoted to a measured, signed Narayani BOQ quantity or approved production rate.** The 65 sample/partial-sample durations must not be rebranded as measured quantities. Distinguish concrete volume, steel mass and formwork contact area; no cross-unit substitution. The 66 *source* candidate-measurement activities and 65 *preview* sample/partial estimates refer to different review scopes and should not be conflated.

## Direct drawing/report source cross-check (additional independent read)

The actual Drive architectural, structural and revised-analysis PDF text was reopened after the first audit commit; this goes beyond relying on prior review prose. **This is source-text consistency QA, not visual sheet validation or structural design certification.**

- The July 2026 architectural drawing states proposed Block B ground `205.16 m²`, first `200.67 m²`, second `175.62 m²`, totaling `581.45 m²` for Block B. It also identifies a separate existing Block A. Floor areas are **not** structural slab/net formwork takeoff or a measured BOQ.
- The July 2026 structural footing schedule identifies `IF1` through `IF4` plus `CF1`; source-declared nominal footing dimensions in millimetres are IF1 `1500×1500`, IF2 `1800×1800`, IF3 `2100×2100`, IF4 `2400×2400`, CF1 `4000×1500`. It labels concrete `M20` and reinforcement `Fe500`. No material demand or safe pour/fabrication quantity is inferred from these nominal schedule entries.
- The revised structural-analysis report calls the building `G+1.5`, while the architectural drawing explicitly lists ground, first and second-floor areas. The effective model/roof scope remains **unreconciled**; a floor must not be deleted or invented merely to match either label.
- A Narayani-specific geotechnical report was independently located and text-read in the governed warehouse. This supersedes any older *availability* assertion that the report was missing. The actual soil-class interpretation and bearing design remain matters for the responsible engineer and the latest structural review, not an automatic scheduling hold release.
- The 15 October G02–G08 gate document records limited work-item DONE observations (foundations, columns, masonry) separately from unresolved statutory, WBS, masonry-column, plumbing, tank and foundation quality gates. There is no basis to move those observations into all-activity actual starts/finishes.

## Findings and project-specific correction queue

| ID | Finding | Severity / action | Source trace |
|---|---|---|---|
| NP-QA-01 | Proposed Block B and existing Block A remain separate; roof/top-floor naming conflicts with a G+1.5 report description. | **OPEN SCOPE HOLD**: obtain effective approved drawing/permit issue and reconcile GF/FF/SF/roof before dated baseline. | Architectural/structural drawing register; gate G03/G04 |
| NP-QA-02 | In the *public view model*, WBS `4.1 Repeatable structural level` has `parent_id:null` although source group `4 Superstructure interfaces` is its logical parent. | **CONFIRMED MODEL-HIERARCHY DEFECT**: in a new project revision, set parent `4` and add project-level regression coverage; do not overwrite historical v002 artifact. | Source v002 WBS groups / derived model |
| NP-QA-03 | Conditional branches need per-zone adoption: early vs late floor soling/PCC; alternative early `M020` vs later `M070` waste line; strap-beam scope; timber frame option; ceiling and UPVC options. | **OPEN SCENARIO DECISIONS**: require source-backed selections; don't interpret unselected or untimed options as completed. | English EN-02.02, EN-03.01/02, source conditions C02/C04/C07/C08/C13/C14 |
| NP-QA-04 | Project-level stage and onsite reported work already exist in separate operational registers; derived preview says every activity `CALCULATED_DRAFT_NOT_ACTUAL`. | **OPEN ACTUALIZATION**: map each dated grid/zone source to the matching work item without inferring entire phase completion, progress percent or baseline approval. | Gate G02; field progress register |
| NP-QA-05 | The public network has intentional independent or currently unlinked outputs (e.g. `S040` floor PCC, `M090` railing embeds, finishing alternatives). The original source also contains conditional handoffs not all adopted as fixed edges. | **LINK AUDIT**: inspect per-zone accessibility and releases before connecting. Don't auto-add blanket FS links; some work is parallel or optional. | English EN-02.02, EN-03.02, EN-04.02–05.01, conditions C04/C09–C16 |
| NP-QA-06 | Nominal 10-day curing, 7/21-day formwork-related elapsed links and 15-day-to-one-month owner wait have different provenance and acceptance conditions. | **OPEN ENGINEERING/TEMPORARY WORKS HOLD**: verify loads, spans, mix/strength, supports, sequence and approved specification before using dates onsite. | EN-02.03 / source review |
| NP-QA-07 | Plinth level; fill compaction/lifts; CF1 detailing and material discrepancies; M80 tank bottom/four walls/top; concealed plumbing routes still require technical verification. | **OPEN MEASUREMENT / ENGINEERING HOLDS**: preserve all original uncertainties, inspection points and gate authority. | EN-01.05–08, EN-02.01, G05–G08 |
| NP-QA-08 | The source uses ambiguous terms such as “bottom”, “perfect nuclear”, “compensation”, the 2–3 ft fill reference, the 100 ft boundary reference, the 15 days–one month wait and the meaning of some material/MEP terms. | **ORIGINAL-PRESERVATION RULE**: retain owner text verbatim and translator's brackets. No silent interpretation as surveyed dimensions or signed construction criteria. | Nepali v001 / English v001 |

### Open, non-automatically-releasable gate groups

1. `NAR-HOLD-001 / F250`: masonry-to-column interface (G05).
2. `NAR-HOLD-002 / F255`: plumbing before beam closure (G06).
3. `NAR-HOLD-003 / D085,F020`: permit/effective drawing issue (G03).
4. `NAR-HOLD-004 / U015,U020,U030`: underground M80 tank design (G07).
5. `NAR-HOLD-005 / F010,S050`: project scope and baseline adoption (G04).
6. `NAR-HOLD-006 / F160`: foundation quality/rebar/details (G08).

Operational stage `Construction` or reported dated individual DONE items **do not close these gates**.

## Next controlled project-specific revision

**Candidate** `Narayani v003 source reconciliation` (**not issued or approved**):

1. Carry forward v002 by reference and preserve its same LIVE Drive source IDs, original Nepali/English transcripts and PRE/POST lineage. Changes belong in a separate reviewed project source revision, with line/passage-level lineage and audit log.
2. Reconcile approved Block B zones, floor/roof nomenclature, footing families and tank/plumbing routes with the latest drawing/structural sources and field gate register. Distinguish signed decisions from analysis assumptions.
3. Correct WBS `4.1` parent mapping in the new project model; compare all 16 conditional scenario decisions against the source; add reviewed zone-specific predecessors/successors, including service tests before closure and construction access/temporary-works releases.
4. For each duration/quantity, store `source_code`, measurement reference, unit, quantity basis (MEASURED / CALCULATED / PLANNER_SAMPLE / PROVISIONAL / UNKNOWN), version and authority. Only independently measured Narayani quantities may drive a dated or costed update.
5. Schedule from one validated project model using existing shared Skyforge kernel/renderer; validate dependencies, cycles, elapsed vs workday lag, calendar/crew, quantities and device rendering. Keep all six hold groups open until signed source evidence exists.
6. Publish **separately** with a new version and passing CI; preserve v002 and the 45-activity pilot without overwriting them. Any reusable engine issue is escalated to Primevera/Skyforge, not patched here.

## Change record

2026-11-14: Additive **public-safe QA document only** under the scheduling repository's project audit records. Source v001/v002 in controlled Drive, the historical 45-activity pilot, the v002 JSON/HTML renderer, the shared scheduling engine, approved design records, and all holds are unchanged by this audit.
