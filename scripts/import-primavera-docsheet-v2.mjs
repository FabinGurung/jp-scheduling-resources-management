// Skyforge v2 source importer. The editable data lives ONLY in controlled Google Docs/Sheets.
// This file contains no Google file IDs, source records or project-specific page code.
import {mkdir,writeFile} from "node:fs/promises";
import {createHash} from "node:crypto";
import {resolve,join} from "node:path";

const token=process.env.GOOGLE_OAUTH_ACCESS_TOKEN;
const registryName="PRIMAVERA__ALL_PROJECTS__LIVE_SOURCE_INDEX__V000001";
const out=resolve("build","primavera-v2");
const digest=v=>createHash("sha256").update(JSON.stringify(v)).digest("hex");
const isId=x=>typeof x==="string"&&/^[a-zA-Z0-9_-]{20,160}$/.test(x);
const urlBase="https://www.googleapis.com";
async function request(path){
 if(!token)throw Error("A read-only Google OAuth token is required");
 let response;for(let n=0;n<3;n++){
  response=await fetch(urlBase+path,{headers:{Authorization:"Bearer "+token},signal:AbortSignal.timeout(60000)});
  if(response.ok)break;
  if(![429,500,502,503,504].includes(response.status)||n===2)break;
  await new Promise(r=>setTimeout(r,(n+1)*1500));
 }
 if(!response.ok)throw Error("Source read failed, HTTP "+response.status+" (private record not published)");
 return response.json();
}
const safe=s=>String(s??"").trim();
const rows=(v)=>{const headers=(v?.[0]||[]).map(safe);return(v||[]).slice(1).filter(r=>r.some(x=>safe(x)!=="")).map(r=>Object.fromEntries(headers.map((h,i)=>[h,safe(r[i])])));};
async function sheet(id,range){
 if(!isId(id))throw Error("Invalid registered Sheet identity");
 const path="/sheets/v4/spreadsheets/"+encodeURIComponent(id)+"/values/"+encodeURIComponent(range)+"?valueRenderOption=UNFORMATTED_VALUE";
 const data=await request(path);return data.values||[];
}
async function doc(id){
 if(!isId(id))throw Error("Invalid registered Doc identity");
 // A document may be a native single-tab or multi-tab Doc. Read its tab content, but publish
 // only explicit [PUBLIC] paragraphs and never link its private file ID to Pages.
 const data=await request("/docs/v1/documents/"+encodeURIComponent(id)+"?includeTabsContent=true");
 const list=[];
 const inspect=body=>{for(const block of body?.content||[]){for(const el of block.paragraph?.elements||[]){
  const str=el.textRun?.content;if(str)list.push(str);
 }}};
 inspect(data.body);
 const recurse=t=>{inspect(t.documentTab?.body);for(const child of t.childTabs||[])recurse(child);};
 for(const t of data.tabs||[])recurse(t);
 return list.join("").split(/\n/).map(x=>x.trim()).filter(x=>/^\[PUBLIC\]\s+/.test(x))
   .map(x=>x.replace(/^\[PUBLIC\]\s+/,"")).filter(x=>x.length>8&&x.length<400)
   .filter(x=>!/(docs\.google|drive\.google|@|access_token|github\.com\/settings)/i.test(x)).slice(0,20);
}
const forbidden=t=>/(docs\.google\.com|drive\.google\.com|ya29\.|BEGIN PRIVATE KEY|access_token|@)/i.test(t);
const asText=x=>{const s=safe(x);if(forbidden(s)||s.length>600)throw Error("Nonpublic text entered in a publishable field");return s;};
async function identifyRegistry(){
 const p=new URLSearchParams({q:"name = '"+registryName+"' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false",fields:"nextPageToken,files(id,name,mimeType)",pageSize:"100"});
 const d=await request("/drive/v3/files?"+p.toString());
 if(d.nextPageToken||d.files?.length!==1||d.files[0]?.name!==registryName)throw Error("Expected exactly one authorized LIVE project index");
 return d.files[0].id;
}
async function loadOne(row){
 const project_id=asText(row.project_uid);
 if(!/^PORT-\d{6}$/.test(project_id))throw Error("Invalid project UID");
 const sh=row.schedule_sheet_id,dc=row.narrative_doc_id;
 if(!isId(sh)||!isId(dc))throw Error("Missing source identities for "+project_id);
 const [project,wbs,acts,rels,packs,drawings,holds,words]=await Promise.all([
  sheet(sh,"PROJECT!A1:C15"),sheet(sh,"WBS!A1:E2000"),
  sheet(sh,"ACTIVITIES!A1:M2000"),sheet(sh,"RELATIONSHIPS!A1:J2200"),
  sheet(sh,"PACKAGES!A1:F2000"),sheet(sh,"DRAWINGS!A1:G2000"),
  sheet(sh,"HOLDS!A1:F2200"),doc(dc)
 ]);
 const facts=Object.fromEntries(project.slice(1).map(x=>[safe(x[0]),safe(x[1])]));
 if(facts["Project ID"]!==project_id||facts["Project name"]!==row.project_title)
  throw Error("Project identity or title crosswalk mismatch for "+project_id);
 const activities=rows(acts).filter(x=>["LEGACY_V002_IMPORT_NOT_APPROVED","PUBLIC_PLANNING_DRAFT","PUBLIC_APPROVED_FOR_DISPLAY"].includes(x["Review status"]))
 .map(x=>({id:asText(x["Activity ID"]),wbs:asText(x["WBS ID"]),title:asText(x["Activity name (English)"]),
  nepali:asText(x["Activity name (Nepali)"]),description:asText(x["Work description"]),
  duration:safe(x.Duration)===""?null:Number(x.Duration),unit:asText(x["Duration unit"]),
  start:asText(x.Start),finish:asText(x.Finish),review:"Planning draft"}));
 const ids=new Set();
 for(const a of activities){if(!a.id||!a.title||ids.has(a.id))throw Error("Invalid or duplicate activity for "+project_id);
  ids.add(a.id);if(a.duration!==null&&(!Number.isFinite(a.duration)||a.duration<0))throw Error("Invalid work duration");}
 const links=rows(rels).map(x=>({from:asText(x["Predecessor activity ID"]),to:asText(x["Successor activity ID"]),
  from_name:asText(x["Predecessor activity name"]),to_name:asText(x["Successor activity name"]),
  type:asText(x["Relation (FS SS FF SF)"]),lag:safe(x.Lag)===""?0:Number(x.Lag),
  basis:asText(x["Lag unit"]),reason:asText(x["Reason in ordinary words"])}))
  .filter(x=>ids.has(x.from)&&ids.has(x.to));
 if(links.some(l=>!["FS","SS","FF","SF"].includes(l.type)||!Number.isFinite(l.lag)))
  throw Error("Invalid schedule dependency type/lag");
 const relations=new Set();
 for(const l of links){let key=l.from+"|"+l.to+"|"+l.type;if(relations.has(key))throw Error("Duplicate relationship");relations.add(key);}
 const groups=rows(wbs).map(x=>({id:asText(x["WBS ID"]),parent:asText(x["Parent WBS"]),name:asText(x["Work stage / package"])}));
 const pack=rows(packs).filter(x=>x["Review state"]==="PUBLIC_PLANNING_DRAFT"||x["Review state"]==="PUBLIC_APPROVED_FOR_DISPLAY")
 .map(x=>({id:asText(x["Package ID"]),name:asText(x["Package name"]),membership:asText(x["Activity membership IDs"]).split(/[;,]/).map(x=>x.trim()).filter(x=>ids.has(x))}));
 const draw=rows(drawings).filter(x=>x["Review state"]==="PUBLIC_SOURCE_ACCEPTED")
 .map(x=>({drawing:asText(x["Drawing ID"]),revision:asText(x.Revision),element:asText(x["Element ID"]),activity:asText(x["Activity ID"])}));
 const held=rows(holds).filter(x=>ids.has(x["Activity ID"])).map(x=>({id:asText(x["Hold ID"]),activity:asText(x["Activity ID"]),reason:asText(x.Reason),status:"Open"}));
 const result={id:project_id,title:asText(row.project_title),company:asText(row.company_title),company_key:asText(row.company_key),
  slug:asText(row.slug),group:asText(row.group),source_state:activities.length?"Planning draft — awaiting source review":"Schedule not yet provided",
  baseline_approved:false,site_progress_verified:false,engineering_release:false,
  activities,relationships:links,wbs:groups,packages:pack,drawings:draw,holds:held,public_narrative:words};
 return {result,sha:digest(result)};
}
await mkdir(join(out,"projects"),{recursive:true});
const id=await identifyRegistry();
const list=rows(await sheet(id,"PROJECTS!A1:N100"));
if(list.length!==22||new Set(list.map(x=>x.project_uid)).size!==22)throw Error("Canonical 22-project source index not complete");
const projects=[];const check=[];
for(let i=0;i<list.length;i+=4){
 const chunk=await Promise.all(list.slice(i,i+4).map(loadOne));
 for(const x of chunk){projects.push({id:x.result.id,title:x.result.title,company:x.result.company,company_key:x.result.company_key,
  group:x.result.group,slug:x.result.slug,state:x.result.source_state,count:x.result.activities.length});
  check.push({id:x.result.id,sha256:x.sha,activities:x.result.activities.length,links:x.result.relationships.length});
  await writeFile(join(out,"projects",x.result.id+".json"),JSON.stringify(x.result,null,2)+"\n");
 }
}
if(projects.length!==22)throw Error("Incomplete project projection");
await writeFile(join(out,"project-index.json"),JSON.stringify({format:"PRIMAVERA_V2_PUBLIC_PROJECT_INDEX",projects},null,2)+"\n");
await writeFile(join(out,"private-audit-only.json"),JSON.stringify({format:"PRIMAVERA_V2_SOURCE_MANIFEST",project_count:22,
  completed:new Date().toISOString(),records:check},null,2)+"\n");
console.log("PRIMAVERA_V2_SOURCE_IMPORT_PASS",JSON.stringify({projects:projects.length,
 activities:check.reduce((a,b)=>a+b.activities,0),links:check.reduce((a,b)=>a+b.links,0),
 provisional:check.filter(x=>x.activities>0).map(x=>x.id)}));
