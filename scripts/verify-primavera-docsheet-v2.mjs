import {readFile,readdir,stat} from "node:fs/promises";
import {join,resolve} from "node:path";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
const dir=resolve("dist-v2"),data=join(dir,"data");
const json=async f=>JSON.parse(await readFile(f,"utf8"));
const index=await json(join(data,"project-index.json"));
assert.equal(index.projects.length,22,"All registered projects must be available");
const ids=new Set(index.projects.map(x=>x.id));assert.equal(ids.size,22);
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
 if(p.id==="PORT-000001"){assert.equal(x.activities.length,160);assert.equal(x.relationships.length,210);}
 if(p.id==="PORT-000014"){assert.equal(x.activities.length,839);assert.equal(x.relationships.length,1321);}
}
assert.equal(totalActs,999,"Do not publish until the two preserved planning schedules fully import");
assert.equal(totalLinks,1531,"Named relationship register mismatch");
assert.equal(complete,2);
for(const file of ["index.html","projects/index.html","projects/view.html","resources/index.html","assets/styles.css","assets/app.js"]){
 await stat(join(dir,file));
}
const core=await Promise.all(["index.html","projects/index.html","projects/view.html","resources/index.html"].map(f=>readFile(join(dir,f),"utf8")));
for(const [i,html] of core.entries()){
 assert.match(html,/Skyforge|SKYFORGE/);
 if(/\bmachine\b|\bdatabase\b|\bA[Ii] protocol\b|\bdeveloper\b/.test(html))
  throw Error("Developer or machine terminology leaked into customer UI "+i);
 assert.match(html,/Home/);assert.match(html,/Projects/);assert.match(html,/Resources/);
}
const routes=await json(join("build","primavera-v2","site-qa-private.json"));
assert.ok(routes.historical_redirects>=70,"Old links would be broken");
const resources=await Promise.all(["productivity-norms.v1.json","material-references.v1.json"].map(f=>json(join(data,"resources",f))));
assert.equal(resources[0].items.length,88);assert.equal(resources[1].recipes.length,36);
for(const file of ["src/kernel/ai-source-revision.mjs","machine/index.html","more/legacy-home.html"])
 {try{await stat(join(dir,file));throw Error("Old developer page was not removed: "+file);}
 catch(e){if(e.code!=="ENOENT")throw e;}}
try{await stat(join(data,"site-qa.json"));throw Error("Internal QA leaked into public Pages");}
catch(e){if(e.code!=="ENOENT")throw e;}
console.log("PRIMAVERA_V2_PUBLIC_QA_PASS",JSON.stringify({projects:22,
  planning_drafts:complete,activities:totalActs,relations:totalLinks,
  redirects:routes.historical_redirects,resources:{work:88,materials:36},private_ids_leaked:0}));
