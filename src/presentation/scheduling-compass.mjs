/* Skyforge scheduling compass, 2026-11-16.
 * Presentation ONLY. Field & Desk is a design reference, never an API or a data input.
 * Shared across every published project using the verified Scheduling Desk model.
 */
const element=(parent,tag,cls="",txt)=>{
 const node=document.createElement(tag);
 if(cls)node.className=cls;
 if(txt!==undefined)node.textContent=String(txt);
 parent.append(node);return node;
};
const sourceUrl=value=>{
 if(typeof value!=="string")return null;
 try{
  const url=new URL(value);
  if(url.protocol!=="https:"||url.username||url.password)return null;
  return url.href;
 }catch{return null;}
};
const sortedGroups=model=>{
 const byId=new Map(model.wbs.map(x=>[x.id,x]));
 return model.wbs.map(item=>({
  id:item.id,title:item.title,
  count:model.activities.filter(a=>a.wbs_id===item.id).length,
  depth:(()=>{
   let cursor=item,parent=0,seen=new Set();
   while(cursor?.parent_id&&byId.has(cursor.parent_id)&&!seen.has(cursor.parent_id)&&parent<4){
    seen.add(cursor.parent_id);cursor=byId.get(cursor.parent_id);parent++;
   }return parent;
  })()
 }));
};
const projectRoute=model=>model.project.id==="PRJ-000007"
 ?"projects/fishtail/narayani-parajuli-residence/"
 :model.project.id==="PORT-000014"
  ?"projects/fishtail/harisharan-residence/":"projects/";
const canonical=path=>new URL("../../"+path,import.meta.url).href;
function anchor(parent,label,path){
 const a=element(parent,"a","",label);a.href=path;return a;
}
/**
 * No material/rate/people assignments are consumed here.
 * Callback-driven so the same source-selected activity remains synchronized
 * with the existing Gantt, calendar and detail panes.
 */
export function buildSchedulingCompass({model,state,west,east,south,onSelect,onView,onWbs,onDetails}){
 const groups=sortedGroups(model),byActivity=new Map(model.activities.map(a=>[a.id,a]));
 const byName=new Map(model.wbs.map(w=>[w.id,w.title]));
 element(west,"p","desk-compass-eyebrow","WEST · PROJECT & WBS");
 element(west,"h2","","Find work");
 const searchLabel=element(west,"label","desk-compass-label","Search WBS or activity");
 const search=element(searchLabel,"input","desk-compass-search");
 search.type="search";search.placeholder="Footing, columns, F050…";
 search.setAttribute("aria-label","Search WBS navigation");
 const toc=element(west,"nav","desk-compass-toc");
 toc.setAttribute("aria-label","Scheduling sections");
 for(const [label,mode] of [["Activities & Gantt","activities"],["Calendar","calendar"]]){
  const b=element(toc,"button","",label);
  b.type="button";b.addEventListener("click",()=>onView(mode));
  b.dataset.compassView=mode;
 }
 const items=element(west,"nav","desk-compass-wbs");
 items.setAttribute("aria-label","Searchable WBS and project navigation");
 const status=element(west,"p","desk-compass-note","");
 const groupsWithWork=groups.filter(group=>group.count>0);
 function drawGroups(){
  const needle=search.value.trim().toLocaleLowerCase();
  const found=groupsWithWork.filter(g=>[g.id,g.title].some(v=>v.toLocaleLowerCase().includes(needle))||
   model.activities.some(a=>a.wbs_id===g.id&&[a.id,a.title].some(v=>v.toLocaleLowerCase().includes(needle))));
  items.replaceChildren();
  const show=found.slice(0,40);
  for(const g of show){
   const b=element(items,"button","desk-compass-wbs-button");
   b.type="button";b.dataset.wbsId=g.id;b.style.setProperty("--wbs-depth",String(g.depth));
   const label=element(b,"strong","",g.title);
   label.title=g.id;
   element(b,"small","",g.id+" · "+g.count+" activities");
   b.setAttribute("aria-pressed",String(g.id===state.wbsFilter));
   b.addEventListener("click",()=>{
    state.wbsFilter=g.id;onWbs(g.id);
    const chosen=model.activities.find(a=>a.wbs_id===g.id);
    if(chosen&&chosen.id!==state.selected)onSelect(chosen.id);
    onView("activities");refresh();
   });
  }
  status.textContent=found.length===0?"No matching WBS in the published source.":show.length+" of "+found.length+" matching WBS groups";
  if(groupsWithWork.length)status.textContent+=" · "+groupsWithWork.length+" populated branches";
 }
 search.addEventListener("input",drawGroups);
 const all=element(west,"button","desk-compass-all","Show all WBS activities");
 all.type="button";all.addEventListener("click",()=>{state.wbsFilter="ALL";onWbs("ALL");refresh();onView("activities");});
 const contextTitle=element(east,"p","desk-compass-eyebrow","EAST · ACTIONABLE CONTEXT");
 const chosen=element(east,"section","desk-compass-selected");
 chosen.setAttribute("aria-live","polite");
 const sources=element(east,"section","desk-compass-sources");
 const nexts=element(east,"section","desk-compass-next");
 const trailHead=element(south,"div","desk-compass-trail-header");
 element(trailHead,"strong","","SOUTH · Continue / source history");
 element(trailHead,"small","","Planning views are read-only. No field approvals are inferred.");
 const trail=element(south,"nav","desk-compass-trail");
 trail.setAttribute("aria-label","Previous and next activity and related pages");
 const linkbar=element(south,"nav","desk-compass-trail-links");
 linkbar.setAttribute("aria-label","Related scheduling engine pages");
 const home=projectRoute(model);
 anchor(linkbar,"Project record",canonical(home));
 anchor(linkbar,"All projects",canonical("projects/"));
 anchor(linkbar,"Work output rates",canonical("work-items/productivity.html"));
 anchor(linkbar,"Material calculator",canonical("work-items/materials.html"));
 anchor(linkbar,"Reusable engine",canonical("studio/"));
 anchor(linkbar,"Version history","https://github.com/FabinGurung/jp-scheduling-resources-management/commits/kernel-v0.2-open-source-engines/");
 anchor(linkbar,"Published milestone","https://github.com/FabinGurung/jp-scheduling-resources-management/releases/tag/v1.16.0-skyforge-standard-schedule-template.1");
 const sourceNote=element(south,"p","desk-compass-provenance",
  "Google Drive/Sheets: governed source originals · GitHub: tested schedules, versioned logic and public-safe JSON · GitHub Actions: verification · GitHub Pages: read-only views. Field & Desk owns actual site resource records; Cost Estimation owns forecast and commercial estimates.");
 function refresh(){
  const a=byActivity.get(state.selected);
  chosen.replaceChildren();sources.replaceChildren();nexts.replaceChildren();trail.replaceChildren();
  if(!a){element(chosen,"p","","Select an activity to inspect source context.");return;}
  const index=model.activities.findIndex(x=>x.id===a.id);
  element(chosen,"h2","",a.id+" · "+a.title);
  element(chosen,"p","desk-compass-note",(byName.get(a.wbs_id)||a.wbs_id)+
   " · "+(a.duration===null?"Duration unresolved":a.duration+" scenario "+(a.estimate?.kind?.startsWith("Elapsed")?"elapsed days":"workdays")));
  if(a.hold?.length)element(chosen,"p","desk-compass-alert","Open holds: "+a.hold.join(" · "));
  const open=element(chosen,"nav","desk-compass-actions");
  for(const name of ["Resources","Predecessors","Successors","Constraints","Quantities"]){
   const b=element(open,"button","",name);
   b.type="button";b.addEventListener("click",()=>onDetails(name));
  }
  const incoming=model.links.filter(x=>x.to===a.id);
  const outgoing=model.links.filter(x=>x.from===a.id);
  for(const [label,list,key] of [["Prerequisites",incoming,"from"],["Successors",outgoing,"to"]]){
   element(nexts,"h3","",label+" ("+list.length+")");
   if(!list.length){element(nexts,"p","desk-compass-note","No declared "+label.toLowerCase()+" in this scenario.");continue;}
   const block=element(nexts,"div","desk-compass-relations");
   for(const edge of list.slice(0,12)){
    const linked=byActivity.get(edge[key]);
    if(!linked)continue;
    const b=element(block,"button","",(edge.type||"FS")+" · "+linked.id+" · "+linked.title);
    b.type="button";b.title="Select "+linked.title;b.addEventListener("click",()=>onSelect(linked.id));
   }
   if(list.length>12)element(block,"p","desk-compass-note",String(list.length-12)+" more relationships in Activity Details");
  }
  element(sources,"h3","","Sources & approval");
  element(sources,"p","desk-compass-alert","Approved baseline: NO · actual completion: NOT VERIFIED · engineering release: NO");
  const declared=Array.isArray(a.source_refs)?a.source_refs:[];
  const candidates=declared.length?declared.map(id=>[id,model.citations?.[id]]):
   Object.entries(model.citations||{}).slice(0,3);
  let linked=0;
  for(const [id,citation] of candidates){
   const url=sourceUrl(citation?.url);
   if(!url)continue;
   anchor(sources,citation?.title||id,url).className="desk-compass-source-link";
   linked++;
  }
  if(!linked)element(sources,"p","desk-compass-note","No directly linked public citation is available for this activity. Do not invent a Drive file link.");
  const prev=model.activities[index-1],next=model.activities[index+1];
  const previous=element(trail,"button","","← "+(prev?prev.id+" · Previous activity":"First activity"));
  previous.type="button";previous.disabled=!prev;
  if(prev)previous.addEventListener("click",()=>onSelect(prev.id));
  const following=element(trail,"button","",next?next.id+" · Next activity →":"Last activity");
  following.type="button";following.disabled=!next;
  if(next)following.addEventListener("click",()=>onSelect(next.id));
  drawGroups();
 }
 function setMode(mode){
  for(const b of toc.querySelectorAll("button")){
   b.setAttribute("aria-current",b.dataset.compassView===mode?"page":"false");
  }
 }
 refresh();
 return {refresh,setMode,search};
}
