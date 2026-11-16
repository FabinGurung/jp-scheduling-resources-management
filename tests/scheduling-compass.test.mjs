import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {buildHarisharanV002} from "../src/reference/harisharan-v002.mjs";
import {validateGenericViewModel} from "../src/presentation/generic-views.mjs";
import {inspectDeskModel} from "../src/presentation/scheduling-desk.mjs";
import {buildSchedulingCompass} from "../src/presentation/scheduling-compass.mjs";

const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const json=p=>JSON.parse(read(p));
const n=json("projects/narayani/schedule-v002.json");
const h=buildHarisharanV002(json("machine/project-mappings/harisharan-detailed-wbs-v000001.json"),
 json("work-items/productivity-starters.v2.json"),json("work-items/material-references.v1.json"));

test("one source-safe compass module is shared by Narayani and Harisharan with no private field-library ingestion",()=>{
 assert.equal(typeof buildSchedulingCompass,"function");
 const comp=read("src/presentation/scheduling-compass.mjs");
 const desk=read("src/presentation/scheduling-desk.mjs");
 assert.match(desk,/import \{buildSchedulingCompass\}/);
 assert.match(desk,/compass=buildSchedulingCompass\(/);
 assert.match(desk,/const frame=put\(mount,"div","desk-compass-grid"\)/);
 for(const part of ["WEST · PROJECT & WBS","EAST · ACTIONABLE CONTEXT",
  "SOUTH · Continue / source history","Search WBS navigation","Searchable WBS and project navigation",
  "Projects","Work output rates","Material calculator"])
  assert.ok(comp.includes(part),part);
 assert.doesNotMatch(comp,/jp-field-desk-library|\/api\/|drive\.google\.com\/file/);
 for(const klass of ["desk-compass-grid","desk-compass-west","desk-compass-east","desk-compass-south"])
  assert.match(read("assets/scheduling-desk.css"),new RegExp("\\."+klass+"\\b"));
 assert.match(read("assets/scheduling-desk.css"),/@media\(max-width:720px\)/);
 assert.match(comp,/onSelect\(linked\.id\)/);
 assert.match(comp,/onDetails\(name\)/);
});

test("unchanged published Narayani and Harisharan scenarios continue to pass the common desk validation",()=>{
 assert.equal(validateGenericViewModel(n),true);assert.equal(validateGenericViewModel(h),true);
 assert.equal(inspectDeskModel(n),true);assert.equal(inspectDeskModel(h),true);
 assert.deepEqual([n.activities.length,n.links.length,n.holds.length],[160,210,6]);
 assert.deepEqual([h.activities.length,h.links.length],[839,1321]);
 assert.equal(n.baseline_approved,false);assert.equal(h.baseline_approved,false);
 assert.ok(n.activities.some(a=>a.hold?.length));
 assert.ok(n.activities.some(a=>a.start_date===null));
 assert.equal(h.planner_integration.m25_recipe_applied,false);
});

test("north global header is concise and historical entrypoints remain linked",()=>{
 const shell=read("assets/site-shell.mjs");
 assert.match(shell,/const tabs=\[\["Home","index\.html"\],\["Projects","projects\/index\.html"\],\["Studio","studio\/index\.html"\],\["Reference","more\/index\.html"\]\]/);
 assert.doesNotMatch(shell,/\["Overview","index\.html"\]/);
 assert.match(read("projects/narayani/desk.html"),/data-schedule-project="narayani"/);
 assert.match(read("projects/narayani/schedule-v002.html"),/data-schedule-project="narayani-v002"/);
 assert.match(read("projects/fishtail/harisharan-residence/schedule-v002.html"),/data-schedule-project="harisharan-v002"/);
});

test("original project data ownership and approved-source labels remain unchanged",()=>{
 const component=read("src/presentation/scheduling-compass.mjs");
 assert.match(component,/Google Drive\/Sheets: governed source originals/);
 assert.match(component,/Field & Desk owns actual site resource records/);
 assert.match(component,/Cost Estimation owns forecast and commercial estimates/);
 assert.match(component,/Approved baseline: NO/);
 assert.match(component,/engineering release: NO/);
 assert.match(component,/No directly linked public citation is available/);
});
