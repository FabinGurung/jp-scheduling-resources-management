// Skyforge v2 public artifact: one template, 22 independently governed Docs/Sheets projects.
// Old static pages are RETIRED from the live site and replaced only with compatibility redirects.
import {mkdir,readFile,writeFile,copyFile,readdir,rm,stat} from "node:fs/promises";
import {resolve,join,dirname,relative} from "node:path";
const base=resolve("."),src=join(base,"public-v2"),input=join(base,"build/primavera-v2"),
 out=join(base,"dist-v2"),oldDist=join(base,"dist");
await rm(out,{recursive:true,force:true});
const cp=async(a,b)=>{await mkdir(dirname(b),{recursive:true});await copyFile(a,b);};
for(const file of ["index.html","projects/index.html","projects/view.html","resources/index.html",
                   "assets/styles.css","assets/app.js"])await cp(join(src,file),join(out,file));
const index=JSON.parse(await readFile(join(input,"project-index.json"),"utf8"));
if(index.format!=="PRIMAVERA_V2_PUBLIC_PROJECT_INDEX"||index.projects?.length!==22||
  new Set(index.projects.map(p=>p.id)).size!==22)throw Error("Cannot publish incomplete 22-project source index");
await mkdir(join(out,"data","projects"),{recursive:true});
await cp(join(input,"project-index.json"),join(out,"data/project-index.json"));
for(const p of index.projects)await cp(join(input,"projects",p.id+".json"),join(out,"data","projects",p.id+".json"));
await mkdir(join(out,"data","resources"),{recursive:true});
const resourcePaths=["productivity-norms.v1.json","productivity-starters.v2.json","material-references.v1.json"];
for(const file of resourcePaths)await cp(join(oldDist,"work-items",file),join(out,"data","resources",file));
const rates=JSON.parse(await readFile(join(out,"data/resources/productivity-starters.v2.json"),"utf8"));
const mat=JSON.parse(await readFile(join(out,"data/resources/material-references.v1.json"),"utf8"));
if(rates.profiles?.length!==46||mat.recipes?.length!==36||
   mat.recipes.flatMap(x=>x.lines).length!==65)throw Error("The source-backed rates/material reference registers are incomplete");
// Discover historic public .html routes in the pinned old repository source and retain URLs.
async function walk(folder,pre=""){let files=[];for(const e of await readdir(folder,{withFileTypes:true})){
 const r=pre?pre+"/"+e.name:e.name,p=join(folder,e.name);
 if(e.isDirectory()){if(![".git","node_modules","dist","dist-v2","build"].includes(e.name))files.push(...await walk(p,r));}
 else if(e.isFile()&&r.endsWith(".html"))files.push(r);
 }return files;}
const oldRoutes=await walk(base);
const current=new Set(["index.html","projects/index.html","projects/view.html","resources/index.html"]);
const legacy=JSON.parse(await readFile(join(base,"projects/registry.json"),"utf8"));
const uriProject=id=>"projects/view.html?project="+encodeURIComponent(id);
const pick=route=>{
 const name=route.toLowerCase();
 if(name.startsWith("work-items/")||name.startsWith("knowledge/"))return "resources/index.html";
 if(name.startsWith("projects/narayani/")||name.startsWith("projects/narayani-record/"))return uriProject("PORT-000001");
 for(const p of legacy.projects){
  if(name.startsWith("projects/"+p.company+"/"+p.slug.toLowerCase()+"/"))return uriProject(p.id);
  if(p.legacy_portfolio_slug&&name.startsWith("projects/portfolio/"+p.legacy_portfolio_slug.toLowerCase()+"/"))return uriProject(p.id);
 }
 if(name.startsWith("projects/"))return "projects/index.html";
 return "index.html";
};
const prefix="https://fabingurung.github.io/jp-scheduling-resources-management/";
let redirects=0;
for(const path of oldRoutes){
 if(current.has(path))continue;
 const target=prefix+pick(path),dest=join(out,path);
 await mkdir(dirname(dest),{recursive:true});
 const safe=target.replaceAll("&","&amp;").replaceAll('"',"&quot;");
 const page='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url='+safe+'"><meta name="robots" content="noindex"><title>Page moved · Skyforge</title></head><body><p>This page has moved to the shared project workspace. <a href="'+safe+'">Open the current page</a>.</p></body></html>';
 await writeFile(dest,page);redirects++;
}
await writeFile(join(out,"404.html"),'<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Skyforge — Page not found</title><meta http-equiv="refresh" content="0;url='+prefix+'projects/index.html"></head><body><p>Find the current <a href="'+prefix+'projects/index.html">project directory</a>.</p></body></html>');
const manifest={format:"PRIMAVERA_DOCSHEET_PUBLIC_SITE_V2",projects:22,core_pages:4,
  historical_redirects:redirects,legacy_source_removed_from_public_dist:true,
  only_template_files:["index.html","projects/index.html","projects/view.html","resources/index.html"],
  project_source:"GOOGLE_DOCS_AND_SHEETS_READ_ONLY",
  work_rate_source:"EXISTING_AUTHORIZED_LIVE_SHEETS",
  no_construction_release:true};
await writeFile(join(out,"data/site-qa.json"),JSON.stringify(manifest,null,2)+"\n");
console.log("PRIMAVERA_V2_SITE_BUILD_PASS",JSON.stringify(manifest));
