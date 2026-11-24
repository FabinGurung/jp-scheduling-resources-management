import {readFile,stat} from "node:fs/promises";
import {join,resolve} from "node:path";
import assert from "node:assert/strict";
const dir=resolve("dist-v2"),data=join(dir,"data");
const verifyMigration=process.argv.includes("--check-migration-baseline");
const json=async f=>JSON.parse(await readFile(f,"utf8"));
const index=await json(join(data,"project-index.json"));
assert.equal(index.projects.length,22,"All registered projects must be available");
const ids=new Set(index.projects.map(x=>x.id));assert.equal(ids.size,22);
const legacy=await json(resolve("projects","registry.json"));
const legacyById=new Map(legacy.projects.map(p=>[p.id,p]));
assert.equal(legacyById.size,ids.size,"Legacy and shared project inventories differ");
const crosswalk=[];
for(const p of index.projects){
 const old=legacyById.get(p.id);
 assert.ok(old,"No retained project route for "+p.id);
 assert.equal(p.title,old.title,"Project title changed across publication routes");
 assert.equal(p.company_key,old.company,"Company changed across publication routes");
 assert.equal(p.slug,old.slug,"Project slug changed across publication routes");
 const route=join("projects",old.company,old.slug,"index.html");
 await stat(resolve("dist",route));
 if(old.legacy_portfolio_slug)await stat(resolve("dist","projects","portfolio",old.legacy_portfolio_slug,"index.html"));
 crosswalk.push({id:p.id,shared:"schedules/projects/activities.html?project="+p.id,retained:route});
}
console.log("PRIMAVERA_V2_ROUTE_CROSSWALK_PASS",JSON.stringify({projects:crosswalk.length,retained_aliases:legacy.projects.filter(p=>p.legacy_portfolio_slug).length}));

let complete=0,totalActs=0,totalLinks=0;
const privateSourcePattern=/docs\.google\.com\/|drive\.google\.com\/|@|access_token|ya29\.|PRIVATE KEY/i;
for(const p of index.projects){
 const filename=join(data,"projects",p.id+".json"),text=await readFile(filename,"utf8");
 if(privateSourcePattern.test(text))throw Error("Private source reference leaked: "+p.id);
 const x=JSON.parse(text);
 assert.equal(x.id,p.id);assert.equal(x.title,p.title);
 assert.equal(x.baseline_approved,false);assert.equal(x.engineering_release,false);
 assert.equal(x.site_progress_verified,false);
 const names=new Map(x.activities.map(a=>[a.id,a.title]));
 assert.equal(names.size,x.activities.length,"Duplicate source activities in "+p.id);
 for(const link of x.relationships){
  assert.ok(names.has(link.from)&&names.has(link.to),"Dangling link in "+p.id);
  assert.equal(link.from_name,names.get(link.from),"Predecessor wording changed in "+p.id);
  assert.equal(link.to_name,names.get(link.to),"Successor wording changed in "+p.id);
 }
 if(x.activities.length)complete++;
 totalActs+=x.activities.length;totalLinks+=x.relationships.length;
 if(verifyMigration&&p.id==="PORT-000001"){assert.equal(x.activities.length,160);assert.equal(x.relationships.length,210);assert.ok(x.public_narrative.length);}
 if(verifyMigration&&p.id==="PORT-000014"){assert.equal(x.activities.length,839);assert.equal(x.relationships.length,1321);assert.ok(x.public_narrative.length);}
}
if(verifyMigration){
 assert.equal(totalActs,999,"The two original planning schedules must fully import for migration");
 assert.equal(totalLinks,1531,"Named relationship register mismatch");
 assert.equal(complete,2);
}
for(const file of ["index.html","projects/index.html","projects/view.html","resources/index.html","assets/styles.css","assets/app.js"]){
 await stat(join(dir,file));
}
const sourceText=await readFile(join(data,"source-register.json"),"utf8");
assert.ok(!privateSourcePattern.test(sourceText),"Private locator in source register");
const sourceRegister=JSON.parse(sourceText);assert.equal(sourceRegister.inputs.length,48);assert.equal(sourceRegister.inputs.filter(x=>x.kind==="Doc").length,22);assert.equal(sourceRegister.inputs.filter(x=>x.kind==="Sheet").length,26);
for(const p of index.projects){assert.equal(sourceRegister.inputs.filter(x=>x.project===p.title&&x.company===p.company).length,2);}
await stat(join(dir,"resources","sources.html"));await stat(join(dir,"assets","skyforge-foreman.mjs"));
const core=await Promise.all(["index.html","projects/index.html","projects/view.html","resources/index.html"].map(f=>readFile(join(dir,f),"utf8")));
for(const [i,html] of core.entries()){
 assert.match(html,/Skyforge|SKYFORGE/);
 if(/\bmachine\b|\bdatabase\b|\bA[Ii] protocol\b|\bdeveloper\b/.test(html))
  throw Error("Developer or machine terminology leaked into customer UI "+i);
 assert.match(html,/Home/);assert.match(html,/Projects/);assert.match(html,/Resources/);
}
for(const route of ["activities","gantt","calendar","milestones","packages","drawings","history"]){const html=await readFile(join(dir,"projects",route+".html"),"utf8");assert.ok(html.includes('data-view="'+route+'"'),"Missing independent route "+route);}
const modulesText=await readFile(join(data,"resources","site-modules.json"),"utf8");assert.ok(!privateSourcePattern.test(modulesText),"Private source reference leaked in site modules");const modules=JSON.parse(modulesText);assert.equal(modules.construction_release,false);assert.ok(modules.modules.some(m=>m.id==="WP-001"&&m.checklist.length));assert.ok(modules.modules.some(m=>m.id==="R02-SLB"&&m.links.length));await stat(join(dir,"resources","modules.html"));
const resources=await Promise.all(["productivity-norms.v1.json","material-references.v1.json"].map(f=>json(join(data,"resources",f))));
assert.equal(resources[0].items.length,88);assert.equal(resources[1].recipes.length,36);
assert.ok(resources[0].items.some(item=>item.rate?.hours_per_day>0),"Published work rates are missing");
assert.ok(resources[1].recipes.every(recipe=>recipe.lines.every(line=>line.material)),"A material name is missing");
for(const file of ["src/kernel/ai-source-revision.mjs","machine/index.html","more/legacy-home.html"])
 {try{await stat(join(dir,file));throw Error("Old developer page was not removed: "+file);}
 catch(e){if(e.code!=="ENOENT")throw e;}}
try{await stat(join(data,"site-qa.json"));throw Error("Internal QA leaked into public Pages");}
catch(e){if(e.code!=="ENOENT")throw e;}
console.log("PRIMAVERA_V2_PUBLIC_QA_PASS",JSON.stringify({projects:22,
  planning_drafts:complete,activities:totalActs,relations:totalLinks,
  resources:{work:88,materials:36},private_ids_leaked:0}));
