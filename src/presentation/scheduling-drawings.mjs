/**
 * Skyforge Drawing Links V1: fetch only public CAD GitHub Pages projection and
 * validate its project id/schema before displaying a current source status.
 * Never claim that a source page is an approved construction drawing.
 */
export const CAD_BASE="https://fabingurung.github.io/jp-drawing-coordination/";
const root=new URL("../../work-items/scheduling-drawing-references.v1.json",import.meta.url);
export function validateDrawingIndex(index){
 if(index?.format!=="SKYFORGE_CAD_DRAWING_REFERENCES_V1"||
  index.upstream_pages!==CAD_BASE||!Array.isArray(index.project_links))throw Error("Unverified CAD index");
 const projects=new Set(),recordIds=new Set();
 for(const p of index.project_links){
  if(!p.project_id||projects.has(p.project_id)||!Array.isArray(p.routes)||!Array.isArray(p.registers)||
   !Array.isArray(p.activity_links))throw Error("Invalid CAD project mapping");
  projects.add(p.project_id);
  for(const r of [...p.routes,...p.registers]){
   if(!r.id||recordIds.has(r.id)||typeof r.url!=="string")throw Error("Duplicate/invalid CAD record reference");
   recordIds.add(r.id);
   const url=new URL(r.url);
   if(url.protocol!=="https:"||url.origin!==new URL(CAD_BASE).origin||
      !url.pathname.startsWith("/jp-drawing-coordination/")||url.search||url.hash)
    throw Error("CAD reference points outside the approved public CAD Pages source");
  }
  for(const link of p.activity_links){
   if(typeof link.activity_id!=="string"||!recordIds.has(link.record_id)||
    !link.source_evidence_id||link.status!=="SOURCE_ACCEPTED")
    throw Error("CAD activity join must reference an explicitly accepted evidence item");
  }
 }
 return true;
}
export function verifyCADSource(data,record){
 if(!data||data.schema!==record.schema||data[record.project_field]!==record.expected_project)
  throw Error("CAD source schema or project ID does not match the validated public index");
 const status=record.status_field?data[record.status_field]??"NOT STATED":"NOT STATED";
 const revision=record.revision_field?data[record.revision_field]??"NOT STATED":"NOT STATED";
 return {status:String(status),revision:String(revision),source_schema:data.schema,
  approval_status:"NOT VERIFIED FOR CONSTRUCTION",verified_project:record.expected_project};
}
const element=(parent,tag,cls="",value)=>{
 const e=document.createElement(tag);if(cls)e.className=cls;
 if(value!==undefined)e.textContent=String(value);parent.append(e);return e;
};
const link=(parent,label,url)=>{
 const a=element(parent,"a","",label);a.href=url;a.target="_blank";a.rel="noopener noreferrer";return a;
};
export async function loadSchedulingDrawingIndex(fetcher=fetch){
 const response=await fetcher(root,{cache:"no-store"});
 if(!response.ok)throw Error("CAD public reference index unavailable: HTTP "+response.status);
 const data=await response.json();validateDrawingIndex(data);return data;
}
export async function renderDrawingReferences(container,model,{onInspect,onSelect,fetcher=fetch}={}){
 const heading=element(container,"header","desk-drawing-head");
 element(heading,"h2","","Working drawings · linked source review");
 element(heading,"p","","CAD owns drawings; this read-only workspace fetches its public-source register. A published CAD record is not an engineer's issued-for-construction approval.");
 const result=element(container,"section","desk-drawing-list");
 result.setAttribute("aria-live","polite");
 const status=element(result,"p","desk-compass-note","Reading the published CAD reference index…");
 let manifest,project;
 try{
  manifest=await loadSchedulingDrawingIndex(fetcher);
  project=manifest.project_links.find(x=>x.project_id===model.project.id);
 }catch(e){status.textContent="Drawing reference manifest could not be validated: "+e.message;return {status:"HELD"};}
 result.replaceChildren();
 if(!project){
  element(result,"p","desk-drawing-held","No project-matched CAD source register has been admitted. Add a reviewed project mapping to the canonical drawing-link manifest; do not reuse another project's drawings.");
  return {status:"NO_VERIFIED_PROJECT_LINK"};
 }
 element(result,"h3","",project.name+" · CAD project source");
 const boundary=element(result,"p","desk-compass-alert",
  "Activity/WBS drawing joins admitted: "+project.activity_links.length+
  ". Unmapped means no accepted source relation, not that a drawing does not exist.");
 const links=element(result,"section","desk-drawing-cards");
 for(const r of project.routes){
  const card=element(links,"article","desk-drawing-card");
  element(card,"h3","",r.title);
  element(card,"p","desk-compass-note","CAD public project workspace · repository-owned");
  link(card,"Open CAD page ↗",r.url);
  const inspect=element(card,"button","","Inspect in East");
  inspect.type="button";inspect.addEventListener("click",()=>onInspect?.({...r,project_id:project.project_id,source_status:"CAD public page; not construction approval"}));
 }
 const register=element(result,"section","desk-drawing-register");
 element(register,"h3","","Live public drawing registers");
 for(const r of project.registers){
  const card=element(register,"article","desk-drawing-card");
  element(card,"h3","",r.title);
  const badge=element(card,"p","desk-drawing-status","Fetching CAD source…");
  const inspect=element(card,"button","","Inspect in East");
  inspect.type="button";inspect.addEventListener("click",()=>onInspect?.({...r,project_id:project.project_id,source_status:badge.textContent}));
  link(card,"Open original public CAD register ↗",r.url);
  try{
   const response=await fetcher(r.url,{cache:"no-store",signal:AbortSignal.timeout(15000)});
   if(!response.ok)throw Error("HTTP "+response.status);
   const record=verifyCADSource(await response.json(),r);
   badge.textContent="CAD READBACK · "+record.revision+" · "+record.status;
   card.dataset.cadVerified="true";
  }catch(e){
   badge.textContent="CAD READBACK NOT VERIFIED · "+e.message;
   card.dataset.cadVerified="false";
  }
 }
 if(project.activity_links.length){
  const admitted=element(result,"section","desk-drawing-activity-joins");
  element(admitted,"h3","","Source-accepted activity links");
  for(const join of project.activity_links){
   if(!model.activities.some(x=>x.id===join.activity_id))continue;
   const b=element(admitted,"button","",join.activity_id+" · linked CAD record "+join.record_id);
   b.type="button";b.addEventListener("click",()=>onSelect?.(join.activity_id));
  }
 }else element(result,"p","desk-compass-note",
  "No activity-specific drawing/WBS mappings have been verified. Link such records only after CAD publishes stable element IDs and an accepted schedule–drawing crosswalk. Original restricted Drive documents remain access-controlled.");
 return {status:"PUBLIC_PROJECT_LINKS",project_id:project.project_id,registers:project.registers.length};
}
