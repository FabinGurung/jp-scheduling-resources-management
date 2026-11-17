import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {buildHarisharanV002} from "../src/reference/harisharan-v002.mjs";
import {inspectDeskModel} from "../src/presentation/scheduling-desk.mjs";
import {buildActivityPackage,parseActivityPackageQuery,packageUrl} from "../src/presentation/scheduling-packages.mjs";
import {validateDrawingIndex,verifyCADSource} from "../src/presentation/scheduling-drawings.mjs";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const json=path=>JSON.parse(read(path));
const n=json("projects/narayani/schedule-v002.json");
const h=buildHarisharanV002(json("machine/project-mappings/harisharan-detailed-wbs-v000001.json"),
 json("work-items/productivity-starters.v2.json"),json("work-items/material-references.v1.json"));
const manifest=json("work-items/scheduling-drawing-references.v1.json");

test("4-15 Narayani and 70-90 Harisharan packages are bounded, order-preserving source snapshots",()=>{
 assert.equal(inspectDeskModel(n),true);
 assert.equal(inspectDeskModel(h),true);
 const beforeN=JSON.stringify(n),beforeH=JSON.stringify(h);
 const a=buildActivityPackage(n,{start:4,end:15});
 const b=buildActivityPackage(h,{start:70,end:90});
 assert.equal(a.format,"SKYFORGE_ACTIVITY_PACKAGE_VIEW_V1");
 assert.equal(a.counts.included,12);
 assert.equal(b.counts.included,21);
 assert.deepEqual(a.activities.map(x=>x.id),n.activities.slice(3,15).map(x=>x.id));
 assert.deepEqual(b.activities.map(x=>x.id),h.activities.slice(69,90).map(x=>x.id));
 for(const out of [a,b]){
  assert.equal(out.engineering_release,false);assert.equal(out.baseline_approved,false);
  assert.equal(out.site_progress_verified,false);
  assert.equal(out.counts.internal_dependencies,out.links.internal.length);
  assert.equal(out.counts.incoming_dependencies,out.links.incoming.length);
  assert.equal(out.counts.outgoing_dependencies,out.links.outgoing.length);
 }
 assert.equal(JSON.stringify(n),beforeN);assert.equal(JSON.stringify(h),beforeH);
});
test("WBS selection narrows package without creating fabricated relationships",()=>{
 const wbs=n.activities[4].wbs_id;
 const p=buildActivityPackage(n,{start:4,end:15,wbs});
 assert.ok(p.activities.every(a=>a.wbs_id===wbs));
 assert.equal(p.counts.included,p.activities.length);
 assert.ok(p.links.internal.every(e=>p.activities.some(a=>a.id===e.from)&&p.activities.some(a=>a.id===e.to)));
 assert.throws(()=>buildActivityPackage(n,{start:1,end:151}),/150/);
 assert.throws(()=>buildActivityPackage(n,{start:0,end:10}),/1-based/);
 assert.throws(()=>buildActivityPackage(n,{start:50,end:20}),/ordered/);
 assert.throws(()=>buildActivityPackage(n,{start:1,end:1000}),/range/);
 assert.throws(()=>buildActivityPackage(n,{start:4,end:15,wbs:"FAKE-WBS"}),/Unknown source WBS/);
});
test("shareable links keep bounded ranges and recognized WBS; invalid params use safe defaults",()=>{
 const url=packageUrl("https://example.org/schedule-v002.html#activities",{start:4,end:15,wbs:"2"});
 assert.equal(new URL(url).hash,"#packages");
 assert.deepEqual(parseActivityPackageQuery(new URL(url).search,160,["1","2"]),{start:4,end:15,wbs:"2"});
 assert.deepEqual(parseActivityPackageQuery("?pkg=1-100000&pkgWbs=evil",160,["1"]),{start:1,end:15,wbs:"ALL"});
});
test("CAD source registry exposes only verified public project pages and no activity joins",()=>{
 assert.equal(validateDrawingIndex(manifest),true);
 assert.deepEqual(manifest.project_links.map(x=>x.project_id),["PRJ-000007","PORT-000014"]);
 assert.ok(manifest.project_links.every(p=>p.activity_links.length===0));
 assert.ok(manifest.project_links.every(p=>p.registers.every(r=>r.url.startsWith("https://fabingurung.github.io/jp-drawing-coordination/"))));
 for(const project of manifest.project_links){
  assert.equal(typeof project.cad_project_id,"string");
  assert.ok(project.registers.length>=1);
 }
 const forged=structuredClone(manifest);forged.project_links[0].routes[0].url="https://drive.google.com/file/d/private";
 assert.throws(()=>validateDrawingIndex(forged),/outside the approved/);
 const bad=structuredClone(manifest);bad.project_links[0].activity_links.push({activity_id:"D010",record_id:"N-CAD-CURRENT",status:"SOURCE_ACCEPTED"});
 assert.throws(()=>validateDrawingIndex(bad),/accepted evidence/);
});
test("CAD register project identity and schema guard rejects wrong sources; no IFC approvals",()=>{
 const nar=manifest.project_links[0].registers[0],har=manifest.project_links[1].registers[0];
 const a=verifyCADSource({schema:nar.schema,projectId:"PRJ-000007",constructionStatus:"ENGINEERING_HOLD_NOT_FOR_CONSTRUCTION",currentVersion:"M34"},nar);
 assert.equal(a.approval_status,"NOT VERIFIED FOR CONSTRUCTION");
 assert.match(a.status,/HOLD/);
 const b=verifyCADSource({schema:har.schema,projectLogicalId:"INTAKE-20260826-HARISHARAN",revision:"R000001",fileAuthority:"READ_ONLY"},har);
 assert.equal(b.verified_project,"INTAKE-20260826-HARISHARAN");
 assert.throws(()=>verifyCADSource({schema:har.schema,projectLogicalId:"WRONG"},har),/project ID/);
 assert.throws(()=>verifyCADSource({schema:"wrong",projectId:"PRJ-000007"},nar),/schema/);
});
test("four desk tabs share east inspector and pilot/v002 project landing has no external preview link",()=>{
 const desk=read("src/presentation/scheduling-desk.mjs"),compass=read("src/presentation/scheduling-compass.mjs");
 for(const x of ['"activities","calendar","packages","drawings"',"onDay?.(date,snap)",
  "renderActivityPackages","renderDrawingReferences","state.inspector","const details=put(east"])
  assert.ok(desk.includes(x),x);
 for(const k of ['focus?.kind==="day"','focus?.kind==="package"','focus?.kind==="drawing"'])
  assert.ok(compass.includes(k),k);
 const project=read("src/presentation/project-catalog.mjs");
 assert.match(project,/Open the scheduling desk/);
 assert.doesNotMatch(project,/anchor\(links,"v002 Block B planning preview/);
 assert.match(desk,/Schedule version/);
 const template=read("templates/scheduling/standard-schedule-input-v1.example.json");
 assert.match(template,/SKYFORGE_STANDARD_SCHEDULE_INPUT_V1/);
});
