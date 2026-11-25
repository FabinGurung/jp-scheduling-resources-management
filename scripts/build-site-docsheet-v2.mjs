// Skyforge v2 public artifact: one template, 22 independently governed Docs/Sheets projects.
// This workspace is mounted under /schedules/ alongside the existing tools and editions.
import {mkdir,readFile,writeFile,copyFile,rm} from "node:fs/promises";
import {resolve,join,dirname} from "node:path";
import {installForeman} from "./install-skyforge-foreman.mjs";
import {execFileSync} from "node:child_process";
import {scheduleNetwork} from "../src/kernel/cpm.mjs";
const base=resolve("."),src=join(base,"public-v2"),input=join(base,"build/primavera-v2"),
 out=join(base,"dist-v2"),oldDist=join(base,"dist");
await rm(out,{recursive:true,force:true});
const cp=async(a,b)=>{await mkdir(dirname(b),{recursive:true});await copyFile(a,b);};
for(const file of ["index.html","projects/index.html","projects/view.html","resources/index.html",
                   "assets/styles.css","assets/app.js","resources/modules.html","resources/sources.html"])await cp(join(src,file),join(out,file));
const template=await readFile(join(src,"projects","view.html"),"utf8");
for(const route of ["activities","gantt","calendar","milestones","packages","drawings","history","control"]){
 await writeFile(join(out,"projects",route+".html"),template.replace('data-page="project"','data-page="project" data-view="'+route+'"'));
}
const index=JSON.parse(await readFile(join(input,"project-index.json"),"utf8"));
if(index.format!=="PRIMAVERA_V2_PUBLIC_PROJECT_INDEX"||index.projects?.length!==22||
  new Set(index.projects.map(p=>p.id)).size!==22)throw Error("Cannot publish incomplete 22-project source index");
await mkdir(join(out,"data","projects"),{recursive:true});
await cp(join(input,"project-index.json"),join(out,"data/project-index.json"));
for(const p of index.projects){
 const model=JSON.parse(await readFile(join(input,"projects",p.id+".json"),"utf8"));
 const control=JSON.parse(execFileSync("python3",[join(base,"scripts","planning-control.py")],{input:JSON.stringify(model),encoding:"utf8",maxBuffer:8*1024*1024,timeout:30000}));
 if(model.planning_settings.mode!=="AUTO_DIAGNOSTIC"){control.scenario={state:"HELD",reasons:["Network scenario disabled in source register"],finish:null,activities:[]};}
 if(control.scenario.state==="WORK_SLOT_DIAGNOSTIC"){
  const cross=scheduleNetwork({activities:model.activities.map(a=>({id:a.id,duration:a.duration})),relationships:model.relationships.map(r=>({predecessor:r.from,successor:r.to,type:r.type,lag:r.lag}))});
  const crossMap=new Map(cross.activities.map(a=>[a.id,a]));
  if(cross.project.early_finish!==control.scenario.finish||control.scenario.activities.length!==crossMap.size||control.scenario.activities.some(a=>{const b=crossMap.get(a.id);return !b||Math.abs(a.early_start-b.es)>1e-9||Math.abs(a.early_finish-b.ef)>1e-9||Math.abs(a.late_start-b.ls)>1e-9||Math.abs(a.total_float-b.total_float)>1e-9;}))throw Error("Independent CPM diagnostic mismatch");
  control.scenario.independent_kernel_check=true;
 }
 model.planning_control=control;
 await writeFile(join(out,"data","projects",p.id+".json"),JSON.stringify(model,null,2)+"\n");
 console.log("SKYFORGE_CONTROL_PROJECT",JSON.stringify({project:p.id,scenario:control.scenario.state,relative_span_mismatches:control.relative_span_mismatches,non_workday_nonzero_lags:control.non_workday_nonzero_lags,finish:control.scenario.finish,zero_float:control.scenario.activities.filter(a=>a.zero_float).length}));
}
await mkdir(join(out,"data","resources"),{recursive:true});
await cp(join(input,"site-modules.json"),join(out,"data","resources","site-modules.json"));
const syncStatus=JSON.parse(await readFile(join(oldDist,"work-items","norms-source-status.json"),"utf8"));
if(syncStatus.status!=="GOOGLE_SHEETS_V000001_IMPORTED"||!syncStatus.sync_completed)throw Error("Source register requires authenticated rate and material imports");
await cp(join(input,"source-register.json"),join(out,"data","source-register.json"));
await installForeman(out,join(base,"assets","skyforge-foreman.mjs"),"resources/sources.html");
const origWork=JSON.parse(await readFile(join(oldDist,"work-items","productivity-norms.v1.json"),"utf8"));
const rates=JSON.parse(await readFile(join(oldDist,"work-items","productivity-starters.v2.json"),"utf8"));
const mat=JSON.parse(await readFile(join(oldDist,"work-items","material-references.v1.json"),"utf8"));
if(origWork.items?.length!==88||rates.profiles?.length!==46||mat.recipes?.length!==36||
   mat.recipes.flatMap(x=>x.lines).length!==65)throw Error("Incomplete source-backed reference rates/materials");
const profiles=new Map(rates.profiles.map(x=>[x.id,x]));
const workItems=origWork.items.map(x=>{
 const match=profiles.get(rates.items?.find(y=>y.key===x.key)?.reference_profile);
 return {title:x.title,unit:x.unit,rate:match?{
  skilled_days_per_unit:match.skilled_days_per_unit,helper_days_per_unit:match.helper_days_per_unit,
  crew_skilled:rates.crew_policy.skilled_people,crew_helpers:rates.crew_policy.unskilled_helpers,
  hours_per_day:rates.crew_policy.labour_hours_per_day,plant_required:!!match.machine_type
 }:null};
});
const materialNames=new Map(mat.materials.map(row=>[row.id,row.name]));
const publicMaterials=mat.recipes.map(x=>({title:x.title,work_unit:x.work_unit,
 lines:x.lines.map(v=>({material:materialNames.get(v.material_id),quantity_per_unit:v.quantity_per_unit,unit:v.unit}))}));
await writeFile(join(out,"data/resources/productivity-norms.v1.json"),JSON.stringify({items:workItems},null,2)+"\n");
await writeFile(join(out,"data/resources/material-references.v1.json"),JSON.stringify({recipes:publicMaterials},null,2)+"\n");
const manifest={format:"PRIMAVERA_DOCSHEET_PUBLIC_SITE_V2",projects:22,core_pages:14,
  only_template_files:["index.html","projects/index.html","projects/view.html","resources/index.html","resources/modules.html","resources/sources.html"],
  project_source:"GOOGLE_DOCS_AND_SHEETS_READ_ONLY",
  work_rate_source:"EXISTING_AUTHORIZED_LIVE_SHEETS",
  no_construction_release:true};
await writeFile(join(input,"site-qa-private.json"),JSON.stringify(manifest,null,2)+"\n");
console.log("PRIMAVERA_V2_SITE_BUILD_PASS",JSON.stringify(manifest));
