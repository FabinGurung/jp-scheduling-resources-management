// Skyforge v2 source importer. The editable data lives ONLY in controlled Google Docs/Sheets.
// This file contains no Google file IDs, source records or project-specific page code.
import {mkdir,writeFile,readFile} from "node:fs/promises";
import {createHash} from "node:crypto";
import {resolve,join} from "node:path";

const token=process.env.GOOGLE_OAUTH_ACCESS_TOKEN;
const registryName="PRIMAVERA__ALL_PROJECTS__LIVE_SOURCE_INDEX__V000001";
const out=resolve("build","primavera-v2");
const digest=v=>createHash("sha256").update(JSON.stringify(v)).digest("hex");
const isId=x=>typeof x==="string"&&/^[a-zA-Z0-9_-]{20,160}$/.test(x);
const endpoint=path=>path.startsWith("/sheets/v4/")?"https://sheets.googleapis.com"+path.slice(7):
 "https://www.googleapis.com"+path;
async function request(path,{text=false}={}){
 if(!token)throw Error("A read-only Google OAuth token is required");
 let response;for(let n=0;n<3;n++){
  response=await fetch(endpoint(path),{headers:{Authorization:"Bearer "+token},signal:AbortSignal.timeout(60000)});
  if(response.ok)break;
  if(![429,500,502,503,504].includes(response.status)||n===2)break;
  await new Promise(r=>setTimeout(r,(n+1)*1500));
 }
 if(!response.ok){
  const reply=await response.json().catch(()=>({}));
  const label=text?"Google Doc export":path.startsWith("/sheets/")?"Sheets":"Drive";
  const raw=[reply?.error?.status,reply?.error?.errors?.[0]?.reason,...(reply?.error?.details||[]).map(x=>x.reason)].filter(Boolean);
  const reason=raw.map(x=>String(x).replace(/[^A-Za-z0-9_-]/g,"").slice(0,60)).join(",")||"UNCLASSIFIED";
  throw Error("Source read failed HTTP "+response.status+"; service="+label+"; reason="+reason+"; no private locator emitted");
 }
 return text?response.text():response.json();
}
const safe=s=>String(s??"").trim();
const rows=(v)=>{const headers=(v?.[0]||[]).map(safe);return(v||[]).slice(1).filter(r=>r.some(x=>safe(x)!=="")).map(r=>Object.fromEntries(headers.map((h,i)=>[h,safe(r[i])])));};
async function sheet(id,range){
 if(!isId(id))throw Error("Invalid registered Sheet identity");
 const path="/sheets/v4/spreadsheets/"+encodeURIComponent(id)+"/values/"+encodeURIComponent(range)+"?valueRenderOption=UNFORMATTED_VALUE";
 const data=await request(path);return data.values||[];
}
async function schedule(id){
 if(!isId(id))throw Error("Invalid registered Sheet identity");
 // Open-ended row ranges allow projects to grow without silently clipping rows.
 const ranges=["PROJECT!A:C","WBS!A:E","ACTIVITIES!A:M","RELATIONSHIPS!A:J","PACKAGES!A:F","DRAWINGS!A:G","HOLDS!A:F","CALENDAR!A:E","RESOURCES!A:G"];
 const query=new URLSearchParams({valueRenderOption:"UNFORMATTED_VALUE",dateTimeRenderOption:"FORMATTED_STRING"});
 for(const range of ranges)query.append("ranges",range);
 const data=await request("/sheets/v4/spreadsheets/"+id+"/values:batchGet?"+query);
 if(data.valueRanges?.length!==ranges.length)throw Error("Incomplete registered schedule tabs");
 return data.valueRanges.map(range=>range.values||[]);
}
async function doc(id){
 if(!isId(id))throw Error("Invalid registered Doc identity");
 // Export the already shared native Doc through the enabled Drive API. Only
 // complete paragraphs explicitly approved for public display can leave this job.
 const body=await request("/drive/v3/files/"+id+"/export?mimeType=text%2Fplain",{text:true});
 const publicLines=body.replace(/^\uFEFF/,"").split(/\r?\n/).map(safe)
  .filter(line=>line.startsWith("[PUBLIC] ")).map(line=>safe(line.slice(9)));
 if(publicLines.some(line=>!line||line.length>400||forbidden(line)||/https?:\/\//i.test(line)))
  throw Error("A public narrative paragraph failed the publication checks");
 return [...new Set(publicLines)];
}
const forbidden=t=>/(docs\.google\.com|drive\.google\.com|ya29\.|BEGIN PRIVATE KEY|access_token|@)/i.test(t);
const asText=x=>{const s=safe(x);if(forbidden(s)||s.length>600)throw Error("Nonpublic text entered in a publishable field");return s;};
function sourceDate(value){
 const text=asText(value);
 if(!text||/^R\+\d+$/.test(text))return text;
 if(/^\d{4}-\d{2}-\d{2}$/.test(text))return text;
 const parts=text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
 if(!parts)throw Error("Use a calendar date or R+day in a publishable schedule row");
 return [parts[3],parts[1].padStart(2,"0"),parts[2].padStart(2,"0")].join("-");
}
async function identifyRegistry(){
 const p=new URLSearchParams({q:"name = '"+registryName+"' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false",fields:"nextPageToken,files(id,name,mimeType)",pageSize:"100"});
 const d=await request("/drive/v3/files?"+p.toString());
 if(d.nextPageToken||d.files?.length!==1||d.files[0]?.name!==registryName)throw Error("Expected exactly one authorized LIVE project index");
 return d.files[0].id;
}
async function sourceName(id,mime){
 if(!isId(id))throw Error("Invalid source identity");
 const meta=await request("/drive/v3/files/"+id+"?fields=name,mimeType");
 if(meta.mimeType!==mime||!meta.name)throw Error("Source metadata mismatch");
 return asText(meta.name);
}
async function loadOne(row,control,intake){
 const project_id=asText(row.project_uid);
 if(!/^PORT-\d{6}$/.test(project_id))throw Error("Invalid project UID");
 const sh=row.schedule_sheet_id,dc=row.narrative_doc_id;
 if(!isId(sh)||!isId(dc))throw Error("Missing source identities for "+project_id);
 const [[project,wbs,acts,rels,packs,drawings,holds,calendarRows,resourceRows],words,sheetName,docName]=await Promise.all([schedule(sh),doc(dc),sourceName(sh,"application/vnd.google-apps.spreadsheet"),sourceName(dc,"application/vnd.google-apps.document")]);
 const facts=Object.fromEntries(project.slice(1).map(x=>[safe(x[0]),safe(x[1])]));
 if(facts["Project ID"]!==project_id||facts["Project name"]!==row.project_title)
  throw Error("Project identity or title crosswalk mismatch for "+project_id);
 const activities=rows(acts).filter(x=>["LEGACY_V002_IMPORT_NOT_APPROVED","PUBLIC_PLANNING_DRAFT","PUBLIC_APPROVED_FOR_DISPLAY"].includes(x["Review status"]))
 .map(x=>({id:asText(x["Activity ID"]),wbs:asText(x["WBS ID"]),title:asText(x["Activity name (English)"]),
  nepali:asText(x["Activity name (Nepali)"]),description:asText(x["Work description"]),
  duration:safe(x.Duration)===""?null:Number(x.Duration),unit:asText(x["Duration unit"]),
  start:sourceDate(x.Start),finish:sourceDate(x.Finish),review:"Planning draft"}));
 const ids=new Map();
 for(const a of activities){if(!a.id||!a.title||ids.has(a.id))throw Error("Invalid or duplicate activity for "+project_id);
  ids.set(a.id,a.title);if(a.duration!==null&&(!Number.isFinite(a.duration)||a.duration<0))throw Error("Invalid work duration");}
 const links=rows(rels).filter(x=>ids.has(x["Predecessor activity ID"])&&ids.has(x["Successor activity ID"]))
 .map(x=>({from:x["Predecessor activity ID"],to:x["Successor activity ID"],
  from_name:ids.get(x["Predecessor activity ID"]),to_name:ids.get(x["Successor activity ID"]),
  type:asText(x["Relation (FS SS FF SF)"]),lag:safe(x.Lag)===""?0:Number(x.Lag),
  basis:asText(x["Lag unit"]),reason:asText(x["Reason in ordinary words"])}));
 if(links.some(l=>!["FS","SS","FF","SF"].includes(l.type)||!Number.isFinite(l.lag)))
  throw Error("Invalid schedule dependency type/lag");
 const relations=new Set();
 for(const l of links){let key=l.from+"|"+l.to+"|"+l.type;if(relations.has(key))throw Error("Duplicate relationship");relations.add(key);}
 const groups=rows(wbs).map(x=>({id:asText(x["WBS ID"]),parent:asText(x["Parent WBS"]),name:asText(x["Work stage / package"])}));
 const pack=rows(packs).filter(x=>x["Review state"]==="PUBLIC_PLANNING_DRAFT"||x["Review state"]==="PUBLIC_APPROVED_FOR_DISPLAY")
 .map(x=>({id:asText(x["Package ID"]),name:asText(x["Package name"]),membership:asText(x["Activity membership IDs"]).split(/[;,]/).map(x=>x.trim()).filter(x=>ids.has(x))}));
 const draw=rows(drawings).filter(x=>x["Review state"]==="PUBLIC_SOURCE_ACCEPTED")
 .map(x=>({drawing:asText(x["Drawing ID"]),revision:asText(x.Revision),element:asText(x["Element ID"]),activity:asText(x["Activity ID"])}));
 const held=rows(holds).filter(x=>ids.has(x["Activity ID"])&&x["Release status"]==="OPEN"&&
   ["Legacy v002 open hold","Public v002 hold","PUBLIC_APPROVED_FOR_DISPLAY"].includes(x.Evidence))
  .map(x=>({id:asText(x["Hold ID"]),activity:asText(x["Activity ID"]),reason:asText(x.Reason),status:"Open"}));
 const calendar=rows(calendarRows).map(x=>({day:asText(x["Day or holiday"]),working:asText(x["Is working day"]),hours:Number(x["Work hours"]||0),effective:asText(x["Effective dates"])}));
 if(calendar.some(x=>!["Yes","No"].includes(x.working)||!Number.isFinite(x.hours)||x.hours<0||x.hours>24))throw Error("Invalid reference calendar");
 const milestones=activities.filter(a=>a.duration===0).map(a=>({id:a.id,title:a.title,wbs:a.wbs,date:a.start}));
 const resourceReferences=[...new Set(rows(resourceRows).map(x=>x["Activity ID"]).filter(x=>ids.has(x)))];
 const controlDate=value=>{if(!value)return "";if(/^R\+\d+$/.test(value)||/^\d{4}-\d{2}-\d{2}$/.test(value))return value;if(/^\d{1,6}$/.test(value)){const serial=Number(value);if(serial>=20000&&serial<=100000)return new Date(Date.UTC(1899,11,30)+serial*86400000).toISOString().slice(0,10);}return "";};
 const span=Number(control["Lookahead span (days)"]);
 const settings={lookahead_start:controlDate(control["Lookahead start"]),span_days:Number.isInteger(span)&&span>=1&&span<=90?span:14,data_date:controlDate(control["Data date"]),mode:control["Network scenario"]==="AUTO_DIAGNOSTIC"?"AUTO_DIAGNOSTIC":"HOLD",input_warning:!!(control["Lookahead start"]&&!controlDate(control["Lookahead start"])||control["Data date"]&&!controlDate(control["Data date"])||!Number.isInteger(span)||span<1||span>90),intake_counts:Object.fromEntries(Object.entries(intake).map(([k,v])=>[k,v.filter(x=>x["Project ID"]===project_id).length])),resource_reference_ids:resourceReferences};
 const result={id:project_id,title:asText(row.project_title),company:asText(row.company_title),company_key:asText(row.company_key),
  slug:asText(row.slug),group:asText(row.group),source_state:activities.length?"Planning draft — awaiting source review":"Schedule not yet provided",
  baseline_approved:false,site_progress_verified:false,engineering_release:false,
  activities,relationships:links,wbs:groups,packages:pack,drawings:draw,holds:held,calendar,milestones,planning_settings:settings,public_narrative:words};
 return {result,sha:digest(result),sheetName,docName};
}
await mkdir(join(out,"projects"),{recursive:true});
const id=await identifyRegistry();
const list=rows(await sheet(id,"PROJECTS!A:N"));
if(list.length!==22||new Set(list.map(x=>x.project_uid)).size!==22)throw Error("Canonical 22-project source index not complete");
const registeredResources=rows(await sheet(id,"RESOURCE_LIBRARY!A:E"));
const controlRows=rows(await sheet(id,"PLANNING_CONTROL!A:E")),controlById=new Map(controlRows.map(x=>[x["Project ID"],x]));
if(controlRows.length!==list.length||controlById.size!==list.length||list.some(x=>!controlById.has(x.project_uid)))throw Error("Planning control inventory does not reconcile");
const intake=Object.fromEntries(await Promise.all([["baseline","BASELINE_INTAKE"],["progress","PROGRESS_INTAKE"],["crew","CREW_INTAKE"]].map(async([k,tab])=>[k,rows(await sheet(id,tab+"!A:E"))])));
if(Object.values(intake).flat().some(x=>!controlById.has(x["Project ID"])))throw Error("Unknown project in planning evidence intake");
const moduleReg=registeredResources.filter(r=>r.Category==="SITE_MODULES");
if(moduleReg.length!==1||!isId(moduleReg[0]["Live source ID"]))throw Error("Missing distinct registered site-module workbook");
const moduleId=moduleReg[0]["Live source ID"];
const privateIds=[id,moduleId,...list.flatMap(row=>[row.schedule_sheet_id,row.narrative_doc_id])];
if(new Set(privateIds).size!==privateIds.length||!privateIds.every(isId))throw Error("Registry source identities must be distinct and valid");
const projects=[];const check=[];const sourceEntries=[];
const addSource=(name,kind,category,company,project,usage)=>sourceEntries.push({name:asText(name),kind,category,company:asText(company),project:asText(project),usage});
addSource(registryName,"Sheet","Project registry","","","Project identities, resource registry, planning settings and evidence intake counts");
for(const [category,key,name,usage] of [["WORK_RATES","SKYFORGE_WORK_RATES_SHEET_ID","Skyforge — Work Output Rates — LIVE — V000001","Work output rates and crew references"],["MATERIAL_NORMS","SKYFORGE_MATERIALS_SHEET_ID","Skyforge — Material Consumption Norms — LIVE — V000001","Material consumption norms"]]){
 const row=registeredResources.filter(x=>x.Category===category);
 if(row.length!==1||!isId(row[0]["Live source ID"])||process.env[key]!==row[0]["Live source ID"])throw Error("Reference workbook identity not reconciled");
 const actual=await sourceName(row[0]["Live source ID"],"application/vnd.google-apps.spreadsheet");if(actual!==name)throw Error("Unexpected reference workbook title");
 addSource(actual,"Sheet","Resources","","",usage);
}
addSource(await sourceName(moduleId,"application/vnd.google-apps.spreadsheet"),"Sheet","Resources","","","Site module resources, checklists, activity links and rates");
for(let i=0;i<list.length;i+=4){
 const chunk=await Promise.all(list.slice(i,i+4).map(row=>loadOne(row,controlById.get(row.project_uid),intake)));
 for(const x of chunk){projects.push({id:x.result.id,title:x.result.title,company:x.result.company,company_key:x.result.company_key,
  group:x.result.group,slug:x.result.slug,state:x.result.source_state,count:x.result.activities.length});
  check.push({id:x.result.id,sha256:x.sha,activities:x.result.activities.length,links:x.result.relationships.length});
  addSource(x.docName,"Doc","Project sources",x.result.company,x.result.title,"Explicit public narrative paragraphs");
  addSource(x.sheetName,"Sheet","Project sources",x.result.company,x.result.title,"Activities, dependencies, WBS, packages, drawings, holds, calendar and resource reference IDs");
  const render=JSON.stringify(x.result,null,2);
  if(privateIds.some(sourceId=>render.includes(sourceId)))throw Error("Private file identity in the public project output");
  await writeFile(join(out,"projects",x.result.id+".json"),render+"\n");
 }
}
if(projects.length!==22)throw Error("Incomplete project projection");

const moduleText=x=>{
 const s=String(x??"").replace(/(\d(?:\s*mm)?)\s*@\s*(\d)/gi,"$1 at $2");
 if(/https?:\/\//i.test(s))throw Error("URL in public module field");
 return asText(s);
};
const [moduleRows,resourceRows,checkRows,linkRows,rateRows]=await Promise.all(["MODULES!A:D","RESOURCES!A:E","CHECKLIST!A:D","ACTIVITY_LINKS!A:D","RATE_LINKS!A:E"].map(range=>sheet(moduleId,range)));
const modules=rows(moduleRows).map(x=>({id:moduleText(x["Module ID"]),title:moduleText(x["Work module"]),scope:moduleText(x.Scope),review:moduleText(x["Review state"]),resources:[],checklist:[],links:[],rates:[]}));
const modMap=new Map(modules.map(m=>[m.id,m]));
if(modMap.size!==modules.length||!modules.length||modules.some(m=>!m.title||!m.review||!/^[A-Z0-9-]+$/.test(m.id)))throw Error("Invalid or duplicate site module");
const lookupModule=x=>{const m=modMap.get(x["Module ID"]);if(!m)throw Error("Unmatched module reference");return m;};
for(const x of rows(resourceRows))lookupModule(x).resources.push({category:moduleText(x.Category),item:moduleText(x["Required item"]),example:moduleText(x["Example count"]),verification:moduleText(x.Verification)});
for(const x of rows(checkRows))lookupModule(x).checklist.push({step:moduleText(x.Step),stage:moduleText(x.Stage),text:moduleText(x["Source-based checklist"])});
for(const x of rows(rateRows))lookupModule(x).rates.push({profile:moduleText(x["Rate profile"]),unit:moduleText(x.Unit),grade:moduleText(x.Grade)});
const projectModels=new Map();
for(const project of projects){
 const data=JSON.parse(await readFile(join(out,"projects",project.id+".json"),"utf8"));
 projectModels.set(project.id,new Set(data.activities.map(a=>a.id)));
}
for(const x of rows(linkRows)){
 const project=moduleText(x["Project UID"]),activity=moduleText(x["Activity ID"]);
 if(!projectModels.get(project)?.has(activity))throw Error("Module link does not match project activity");
 lookupModule(x).links.push({project,activity,review:moduleText(x["Review state"])});
}
const moduleProjection=JSON.stringify({modules,construction_release:false},null,2);
if(privateIds.some(sourceId=>moduleProjection.includes(sourceId)))throw Error("Private file identity in site module projection");
await writeFile(join(out,"site-modules.json"),moduleProjection+"\n");
console.log("PRIMAVERA_SITE_MODULES_IMPORT_PASS",JSON.stringify({modules:modules.length,resources:modules.reduce((a,m)=>a+m.resources.length,0),checklist:modules.reduce((a,m)=>a+m.checklist.length,0),links:modules.reduce((a,m)=>a+m.links.length,0)}));

const linked=registeredResources.filter(r=>!["WORK_RATES","MATERIAL_NORMS","SITE_MODULES"].includes(r.Category)).map(r=>({name:asText(r.Label),kind:r.Category==="SITE_PACKAGES"?"Drive folder":"Doc",usage:"Registered reference; not read directly by this publisher"}));
const sourceProjection=JSON.stringify({generated_at:new Date().toISOString(),inputs:sourceEntries,linked_references:linked},null,2);
if(sourceEntries.length!==48||sourceEntries.filter(x=>x.kind==="Doc").length!==22||sourceEntries.filter(x=>x.kind==="Sheet").length!==26||privateIds.some(x=>sourceProjection.includes(x))||registeredResources.some(r=>r["Live source ID"]&&sourceProjection.includes(r["Live source ID"]))||forbidden(sourceProjection))throw Error("Invalid source register or private locator");
await writeFile(join(out,"source-register.json"),sourceProjection+"\n");
await writeFile(join(out,"project-index.json"),JSON.stringify({format:"PRIMAVERA_V2_PUBLIC_PROJECT_INDEX",projects},null,2)+"\n");
await writeFile(join(out,"private-audit-only.json"),JSON.stringify({format:"PRIMAVERA_V2_SOURCE_MANIFEST",project_count:22,
  completed:new Date().toISOString(),records:check},null,2)+"\n");
console.log("PRIMAVERA_V2_SOURCE_IMPORT_PASS",JSON.stringify({projects:projects.length,
 activities:check.reduce((a,b)=>a+b.activities,0),links:check.reduce((a,b)=>a+b.links,0),
 provisional:check.filter(x=>x.activities>0).map(x=>x.id)}));
