/**
 * Skyforge project-independent Activity Package V1.
 * Read-only projection of a contiguous inclusive range of source activity
 * ORDER (1-based, no implied ID sequence), optionally narrowed to a WBS.
 * No approval, cost, material procurement or verified site progress claims.
 */
export const PACKAGE_FORMAT="SKYFORGE_ACTIVITY_PACKAGE_VIEW_V1";
export function buildActivityPackage(model,{start=1,end=Math.min(15,model.activities.length),wbs="ALL"}={}){
 if(!model||!Array.isArray(model.activities)||!Array.isArray(model.links)||!Array.isArray(model.wbs))
  throw Error("Activity package needs one validated schedule model");
 const length=model.activities.length;
 if(!Number.isInteger(start)||!Number.isInteger(end)||start<1||end<start||end>length)
  throw Error("Activity package must have an ordered 1-based inclusive range within the published model");
 if(end-start+1>150)throw Error("Limit each work package to 150 source activities; select a smaller range");
 if(wbs!=="ALL"&&!model.wbs.some(x=>x.id===wbs))
  throw Error("Unknown source WBS branch for activity package");
 const scope=model.activities.slice(start-1,end);
 const activities=scope.filter(a=>wbs==="ALL"||a.wbs_id===wbs);
 const ids=new Set(activities.map(a=>a.id));
 const internal=model.links.filter(x=>ids.has(x.from)&&ids.has(x.to));
 const incoming=model.links.filter(x=>!ids.has(x.from)&&ids.has(x.to));
 const outgoing=model.links.filter(x=>ids.has(x.from)&&!ids.has(x.to));
 const wbsRows=model.wbs.filter(w=>activities.some(a=>a.wbs_id===w.id))
  .map(w=>({id:w.id,title:w.title,activities:activities.filter(a=>a.wbs_id===w.id).length}));
 const holds=model.holds?.filter(h=>Array.isArray(h.activities)&&h.activities.some(id=>ids.has(id)))??[];
 const dated=activities.filter(a=>typeof a.start_date==="string"&&typeof a.finish_date==="string");
 return {
  format:PACKAGE_FORMAT,
  project_id:model.project.id,source_sha256:model.input_sha256,
  source_revision:model.revision??null,range:{start,end,wbs},
  counts:{included:activities.length,scope:end-start+1,internal_dependencies:internal.length,
   incoming_dependencies:incoming.length,outgoing_dependencies:outgoing.length,
   held_activities:activities.filter(a=>a.hold?.length).length,hold_groups:holds.length,
   scheduled:dated.length},
  wbs:wbsRows,
  activities:activities.map(a=>({
   id:a.id,title:a.title,wbs_id:a.wbs_id,duration:a.duration??null,
   start_date:a.start_date??null,finish_date:a.finish_date??null,
   holds:[...(a.hold??[])],status:a.status
  })),
  links:{internal:internal.map(x=>({from:x.from,to:x.to,type:x.type??"FS",lag:x.lag??0})),
   incoming:incoming.map(x=>({from:x.from,to:x.to,type:x.type??"FS",lag:x.lag??0})),
   outgoing:outgoing.map(x=>({from:x.from,to:x.to,type:x.type??"FS",lag:x.lag??0}))},
  first_date:dated.length?dated.map(a=>a.start_date).sort()[0]:null,
  last_date:dated.length?dated.map(a=>a.finish_date).sort().at(-1):null,
  baseline_approved:false,engineering_release:false,site_progress_verified:false,
  note:"On-demand, URL-shareable view; not a saved or authorized project schedule edition"
 };
}
export function parseActivityPackageQuery(search,count,wbsIds=[]){
 const params=new URLSearchParams(search);
 const raw=params.get("pkg");
 const match=raw?.match(/^(\\d{1,4})-(\\d{1,4})$/);
 const defaultEnd=Math.min(15,count);
 let start=1,end=defaultEnd;
 if(match){
  const a=Number(match[1]),b=Number(match[2]);
  if(a>=1&&a<=b&&b<=count&&b-a<150){start=a;end=b;}
 }
 const proposed=params.get("pkgWbs");
 const wbs=proposed&&wbsIds.includes(proposed)?proposed:"ALL";
 return {start,end,wbs};
}
export function packageUrl(current,{start,end,wbs}){
 const url=new URL(current);
 url.searchParams.set("pkg",start+"-"+end);
 if(wbs!=="ALL")url.searchParams.set("pkgWbs",wbs);
 else url.searchParams.delete("pkgWbs");
 url.hash="packages";
 return url.toString();
}
const node=(parent,tag,klass="",text)=>{
 const e=document.createElement(tag);if(klass)e.className=klass;
 if(text!==undefined)e.textContent=String(text);parent.append(e);return e;
};
export function renderActivityPackages(container,model,{onSelect,onFocusPackage}={}){
 const ids=model.wbs.map(x=>x.id);
 const state=parseActivityPackageQuery(typeof location==="undefined"?"":location.search,model.activities.length,ids);
 const title=node(container,"header","desk-package-head");
 node(title,"h2","","Work packages · selected activity ranges");
 node(title,"p","","Build a read-only module from a slice of the existing activity order (e.g. 4–15 or 70–90). No source schedules are replaced.");
 const form=node(container,"form","desk-package-form");
 const startLabel=node(form,"label","","First activity position");
 const from=node(startLabel,"input");
 from.type="number";from.min=1;from.max=model.activities.length;from.value=state.start;
 const endLabel=node(form,"label","","Last activity position");
 const to=node(endLabel,"input");
 to.type="number";to.min=1;to.max=model.activities.length;to.value=state.end;
 const wbsLabel=node(form,"label","","WBS branch");
 const group=node(wbsLabel,"select");
 let all=node(group,"option","","All WBS branches");all.value="ALL";
 for(const w of model.wbs){const o=node(group,"option","",w.title);o.value=w.id;}
 group.value=state.wbs;
 const apply=node(form,"button","desk-package-apply","Show work package");
 apply.type="submit";
 const quick=node(container,"nav","desk-package-presets");
 quick.setAttribute("aria-label","Common bounded package examples");
 for(const [a,b] of [[4,15],[70,90]]){
  if(b>model.activities.length)continue;
  const btn=node(quick,"button","",a+"–"+b+" activities");
  btn.type="button";
  btn.addEventListener("click",()=>{from.value=a;to.value=b;group.value="ALL";render();});
 }
 const alert=node(container,"p","desk-package-error","");
 alert.setAttribute("role","alert");
 const summary=node(container,"div","desk-package-summary");
 const list=node(container,"div","desk-package-items");
 const foot=node(container,"div","desk-package-share");
 const viewCache={snapshot:null};
 function render(){
  alert.textContent="";let pkg;
  try{pkg=buildActivityPackage(model,{start:Number(from.value),end:Number(to.value),wbs:group.value});}
  catch(e){alert.textContent=e.message;return;}
  viewCache.snapshot=pkg;
  summary.replaceChildren();list.replaceChildren();foot.replaceChildren();
  node(summary,"h3","", "Package "+pkg.range.start+"–"+pkg.range.end+
   (pkg.range.wbs==="ALL"?"":" · WBS "+pkg.range.wbs));
  node(summary,"p","","This view includes "+pkg.counts.included+" activities, "+
   pkg.counts.internal_dependencies+" internal links, "+pkg.counts.incoming_dependencies+
   " incoming and "+pkg.counts.outgoing_dependencies+" outgoing links. "+
   pkg.counts.held_activities+" activities have open holds.");
  node(summary,"p","desk-compass-alert","Planner projection only: not an approved baseline, construction instruction, BOQ or site progress.");
  const info=node(summary,"button","desk-package-focus","Inspect package in East →");
  info.type="button";info.addEventListener("click",()=>onFocusPackage?.(pkg));
  for(const a of pkg.activities){
   const item=node(list,"button","desk-package-item",a.id+" · "+a.title);
   item.type="button";item.dataset.activityId=a.id;
   node(item,"small","","WBS "+a.wbs_id+" · "+(a.start_date??"Unscheduled")+" → "+(a.finish_date??"Unscheduled")+
    (a.holds.length?" · HOLD":""));
   item.addEventListener("click",()=>onSelect?.(a.id));
  }
  if(!pkg.activities.length)node(list,"p","desk-compass-note","No activities in this WBS within the selected positional range.");
  const share=node(foot,"button","desk-package-share-button","Copy package view link");
  share.type="button";share.addEventListener("click",async()=>{
   const url=packageUrl(location.href,{start:pkg.range.start,end:pkg.range.end,wbs:pkg.range.wbs});
   try{await navigator.clipboard.writeText(url);share.textContent="Link copied";}catch{
    const a=node(foot,"a","","Open shareable package view");a.href=url;
    share.textContent="Clipboard unavailable";
   }
  });
  if(typeof history!=="undefined")history.replaceState(null,"",packageUrl(location.href,pkg.range));
  onFocusPackage?.(pkg);
 }
 form.addEventListener("submit",e=>{e.preventDefault();render();});
 render();
 return {getSnapshot:()=>viewCache.snapshot,render};
}
