const root=document.body.dataset.root||"./";
const $=(id)=>document.getElementById(id);
const el=(tag,klass="",value)=>{const n=document.createElement(tag);if(klass)n.className=klass;if(value!==undefined)n.textContent=String(value);return n;};
const make=(parent,tag,klass="",value)=>{const x=el(tag,klass,value);parent.append(x);return x;};
const href=(parent,label,link,klass="")=>{const a=make(parent,"a",klass,label);a.href=link;return a;};
const json=async p=>{const r=await fetch(root+p,{cache:"no-store"});if(!r.ok)throw Error("The published project information is unavailable.");return r.json();};
const companyColor={fishtail:"#21868a",rohini:"#c66a51",jp:"#4c68b0",paila:"#9870a7"};
const pill=(parent,txt)=>make(parent,"span","pill",txt);
const draft=(model)=>model.source_state||"Schedule not yet provided";
const plain=x=>String(x??"");
const shortDate=s=>String(s||"Not scheduled").replace(/^R\+(\d+)$/,"Relative day $1");
function empty(parent,message){const p=make(parent,"p","empty",message);return p;}
async function homepage(){try{const data=await json("data/project-index.json");$("count").textContent=data.projects.length+" projects arranged by company, with one consistent workspace for each.";}catch{$("count").textContent="The project directory could not be loaded."}}
async function directory(){
 const data=await json("data/project-index.json"),list=$("projects"),filter=$("company"),search=$("search");
 for(const org of [...new Set(data.projects.map(x=>x.company))].sort()){const option=make(filter,"option","",org);option.value=org;}
 const update=()=>{list.replaceChildren();const query=search.value.toLowerCase().trim();
  const records=data.projects.filter(p=>(!filter.value||p.company===filter.value)&&
   (!query||(p.title+" "+p.company+" "+p.group).toLowerCase().includes(query)));
  $("count").textContent=records.length+" project"+(records.length===1?"":"s")+" found";
  for(const p of records){const a=href(list,"","view.html?project="+encodeURIComponent(p.id),"project-card");
   a.style.setProperty("--company",companyColor[p.company_key]||"#21868a");
   make(a,"strong","",p.title);make(a,"span","",p.company+" · "+p.group);make(a,"span","",p.state);}
  if(!records.length)empty(list,"No matching projects. Try a different name or company.");
 };
 search.addEventListener("input",update);filter.addEventListener("change",update);update();
}
async function workspace(){
 const id=new URLSearchParams(location.search).get("project")||"";
 const list=await json("data/project-index.json");
 const lookup=list.projects.find(x=>x.id===id);
 if(!lookup){$("heading").textContent="Project not found";$("stage").textContent="Choose a project from the directory.";return;}
 const model=await json("data/projects/"+lookup.id+".json");
 $("heading").textContent=model.title;$("companyLabel").textContent=model.company;
 $("companyLabel").style.background=companyColor[model.company_key]||"#e4f3f2";$("companyLabel").style.color="#fff";
 $("stage").textContent=model.group+" · "+draft(model);
 if(model.public_narrative?.length){
  const notes=el("section","card section");
  make(notes,"h2","","Project notes");
  for(const paragraph of model.public_narrative)make(notes,"p","",paragraph);
  $("stage").after(notes);
 }
 // Historical routes remain available during the source migration.
 const footer=document.querySelector("main footer");
 if(footer&&/^(fishtail|rohini|jp|paila)$/.test(model.company_key)&&/^[a-z0-9-]+$/.test(model.slug)){
  href(footer,"Previous project page","../../projects/"+model.company_key+"/"+model.slug+"/");
 }
 document.title=model.title+" — Skyforge";
 const controls={tab:"activities",wbs:"",search:"",offset:0,packageStart:1,packageEnd:Math.min(15,model.activities.length),week:0,month:0};
 const initial=(location.hash||"").replace("#","");
 if(["activities","gantt","calendar","packages","drawings"].includes(initial))controls.tab=initial;
 const inspector=$("inspector"),view=$("view"),left=$("leftStages");
 const activities=model.activities||[],byId=new Map(activities.map(a=>[a.id,a]));
 function setInspector(item){inspector.replaceChildren();
  if(item.kind==="day"){make(inspector,"h3","",item.title);make(inspector,"p","muted","Planning date / week — actual attendance not verified.");
   for(const a of item.activities){const b=make(inspector,"button","row-action",a.title);b.type="button";b.onclick=()=>setInspector({kind:"activity",activity:a});}return;}
  if(item.kind==="package"){make(inspector,"h3","",item.title);make(inspector,"p","muted",item.activities.length+" activities in this selected package.");
   make(inspector,"p","notice","A selected group is not a separately approved schedule.");
   for(const a of item.activities.slice(0,35)){const b=make(inspector,"button","row-action",a.title);b.type="button";b.onclick=()=>setInspector({kind:"activity",activity:a});}return;}
  if(item.kind==="drawing"){make(inspector,"h3","",item.title);make(inspector,"p","muted","Drawing source is shown for reference. Check its revision and engineering approval separately.");return;}
  const a=item.activity;
  make(inspector,"h3","",a.title);pill(inspector,a.review||"Planning reference");
  if(a.description)make(inspector,"p","",a.description);
  if(a.nepali)make(inspector,"p","",a.nepali);
  const dl=make(inspector,"dl");
  for(const [k,v] of [["Work stage",model.wbs?.find(w=>w.id===a.wbs)?.name||"Not assigned"],
    ["Duration",a.duration===null?"Unmeasured":a.duration+" "+(a.unit||"days")],["Start",shortDate(a.start)],["Finish",shortDate(a.finish)]]){make(dl,"dt","",k);make(dl,"dd","",v);}
  const held=(model.holds||[]).filter(h=>h.activity===a.id);
  if(held.length){make(inspector,"h4","","Open engineering checks");for(const h of held)make(inspector,"p","notice",h.reason);}
  const inbound=(model.relationships||[]).filter(r=>r.to===a.id);
  const outbound=(model.relationships||[]).filter(r=>r.from===a.id);
  for(const [label,rels,field] of [["Must follow",inbound,"from"],["Followed by",outbound,"to"]]){
   make(inspector,"h4","",label+" ("+rels.length+")");
   for(const r of rels.slice(0,12)){
    const target=byId.get(r[field]);if(!target)continue;
    const b=make(inspector,"button","row-action",target.title+" · "+r.type+(r.lag?" +"+r.lag:""));
    b.type="button";b.onclick=()=>setInspector({kind:"activity",activity:target});
    if(r.reason)make(inspector,"p","small muted",r.reason);
   }
  }
  make(inspector,"p","small muted","Site progress and construction release are not verified.");
 }
 function stageList(){left.replaceChildren();const all=make(left,"button","","All work stages");all.type="button";all.onclick=()=>{controls.wbs="";controls.offset=0;render();};
  for(const w of model.wbs||[]){const b=make(left,"button","",w.name);b.type="button";b.onclick=()=>{controls.wbs=w.id;controls.offset=0;render();};}}
 const search=$("leftSearch");search.oninput=()=>{controls.search=search.value.toLowerCase().trim();controls.offset=0;render();};
 function matching(){return activities.filter(a=>(!controls.wbs||a.wbs===controls.wbs)&&
  (!controls.search||(a.title+" "+a.description+" "+a.nepali).toLowerCase().includes(controls.search)));}
 function makeRowList(parent,arr){const wrap=make(parent,"div","table-wrap"),table=make(wrap,"table"),thead=make(table,"thead"),tr=make(thead,"tr");
  for(const h of ["Activity","Work stage","Duration","Start","Finish"])make(tr,"th","",h);
  const tbody=make(table,"tbody");for(const a of arr){const tr=make(tbody,"tr");
   const cell=make(tr,"td");const b=make(cell,"button","row-action",a.title);b.type="button";b.onclick=()=>setInspector({kind:"activity",activity:a});
   make(tr,"td","",model.wbs?.find(w=>w.id===a.wbs)?.name||"");make(tr,"td","",a.duration===null?"—":a.duration+" "+a.unit);
   make(tr,"td","",shortDate(a.start));make(tr,"td","",shortDate(a.finish));}
 }
 function paged(parent,filtered,renderRows){const visible=filtered.slice(controls.offset,controls.offset+50);
  make(parent,"p","small muted","Showing "+(filtered.length?controls.offset+1:0)+"–"+Math.min(controls.offset+50,filtered.length)+" of "+filtered.length+" activities.");
  renderRows(parent,visible);
  const t=make(parent,"div","toolbar");
  const back=make(t,"button","","Previous 50");back.type="button";back.disabled=controls.offset===0;back.onclick=()=>{controls.offset=Math.max(0,controls.offset-50);render();};
  const next=make(t,"button","","Next 50");next.type="button";next.disabled=controls.offset+50>=filtered.length;next.onclick=()=>{controls.offset+=50;render();};}
 function activityView(){const found=matching();if(!found.length)return empty(view,"No activity schedule is available for this selection.");paged(view,found,makeRowList);}
 const startValue=a=>/^R\+(\d+)$/.test(a.start||"")?Number(a.start.slice(2)):
  /^\d{4}-\d{2}-\d{2}$/.test(a.start||"")?Date.parse(a.start)/86400000:null;
 const finishValue=a=>/^R\+(\d+)$/.test(a.finish||"")?Number(a.finish.slice(2)):
  /^\d{4}-\d{2}-\d{2}$/.test(a.finish||"")?Date.parse(a.finish)/86400000:null;
 function ganttView(){const found=matching();if(!found.length)return empty(view,"No Gantt data has been admitted yet.");paged(view,found,(box,arr)=>{
  const xs=arr.map(startValue).filter(x=>x!==null),ys=arr.map(finishValue).filter(x=>x!==null);
  const lo=Math.min(...xs),hi=Math.max(...ys,lo+1),span=Math.max(1,hi-lo);
  for(const a of arr){const row=make(box,"div","gantt-row");const label=make(row,"button","row-action",a.title);label.type="button";label.onclick=()=>setInspector({kind:"activity",activity:a});
   const track=make(row,"div","gantt-track");const b=make(track,"span","gantt-bar");
   const st=startValue(a),en=finishValue(a);if(st===null||en===null){b.style.display="none";continue;}
   b.style.left=(100*(st-lo)/span)+"%";b.style.width=Math.max(1,100*(en-st)/span)+"%";}
 });}
 function calendarView(){if(!activities.length)return empty(view,"No project calendar can be displayed until activities are available.");
  const relative=activities.some(a=>/^R\+\d+$/.test(a.start||""));
  const bar=make(view,"div","toolbar");
  if(relative){const lbl=make(bar,"label","","Relative week ");const input=make(lbl,"input");input.type="number";input.min="1";input.value=controls.week+1;input.style.width="90px";
   input.onchange=()=>{controls.week=Math.max(0,Number(input.value||1)-1);render();};
   const days=make(view,"div","calendar-days");
   for(let i=0;i<7;i++){const num=controls.week*7+i;
    const hits=activities.filter(a=>{const s=startValue(a),e=finishValue(a);return s!==null&&e!==null&&s<=num&&e>=num;});
    const b=make(days,"button","", "Day "+num);make(b,"small","",hits.length+" scheduled");b.type="button";
    b.onclick=()=>setInspector({kind:"day",title:"Relative day "+num,activities:hits});}
  }else{
   const dates=activities.map(a=>a.start).filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x||"")).sort();
   if(!dates.length)return empty(view,"No dated source calendar is available yet.");
   const initial=dates[0].slice(0,7);const [year,month]=initial.split("-").map(Number);
   const d=new Date(Date.UTC(year,month-1+controls.month,1));const current=d.toISOString().slice(0,7);
   const prev=make(bar,"button","","← Previous month");prev.type="button";prev.onclick=()=>{controls.month--;render();};
   make(bar,"strong","",new Intl.DateTimeFormat("en",{month:"long",year:"numeric",timeZone:"UTC"}).format(d));
   const next=make(bar,"button","","Next month →");next.type="button";next.onclick=()=>{controls.month++;render();};
   const days=make(view,"div","calendar-days");const count=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();
   for(let i=1;i<=count;i++){const date=current+"-"+String(i).padStart(2,"0");
    const hits=activities.filter(a=>(a.start||"")<=date&&(a.finish||"")>=date);
    const b=make(days,"button","",String(i));make(b,"small","",hits.length+" scheduled");b.type="button";
    b.onclick=()=>setInspector({kind:"day",title:date,activities:hits});}
  }
 }
 function packageView(){if(!activities.length)return empty(view,"Work packages will appear once activities are available.");
  const t=make(view,"div","toolbar");const start=make(t,"input");start.type="number";start.min="1";start.max=activities.length;start.value=controls.packageStart;start.style.width="110px";start.setAttribute("aria-label","Package first activity position");
  const end=make(t,"input");end.type="number";end.min="1";end.max=activities.length;end.value=controls.packageEnd;end.style.width="110px";end.setAttribute("aria-label","Package last activity position");
  const show=make(t,"button","","Show package");show.type="button";
  const result=make(view,"div");function draw(){result.replaceChildren();let a=Number(start.value),b=Number(end.value);
   if(!Number.isInteger(a)||!Number.isInteger(b)||a<1||b<a||b>activities.length||b-a>149){empty(result,"Choose an activity range of up to 150 positions inside this project.");return;}
   controls.packageStart=a;controls.packageEnd=b;
   const choice=activities.slice(a-1,b);make(result,"h3","","Selected package · "+a+"–"+b);
   make(result,"p","muted",choice.length+" activities. The selected subset does not create a new approved project schedule.");
   setInspector({kind:"package",title:"Selected work package · "+a+"–"+b,activities:choice});
   makeRowList(result,choice);
  }
  show.onclick=draw;draw();
  if(model.packages?.length){make(view,"h3","","Recorded work packages");for(const p of model.packages){const b=make(view,"button","row-action",p.name);b.type="button";b.onclick=()=>setInspector({kind:"package",title:p.name,activities:p.membership.map(x=>byId.get(x)).filter(Boolean)});}}
 }
 function drawingView(){const entries=model.drawings||[];if(!entries.length){empty(view,"No drawing-to-activity links have passed source review for this project.");const p=make(view,"p","muted","The drawing repository retains authoritative working drawings and their revision history.");href(view,"Open drawing library","https://fabingurung.github.io/jp-drawing-coordination/");return;}
  for(const d of entries){const b=make(view,"button","row-action",d.drawing+" · Revision "+d.revision);b.type="button";b.onclick=()=>setInspector({kind:"drawing",title:d.drawing});}}
 function render(){view.replaceChildren();for(const b of document.querySelectorAll(".tabs button"))b.setAttribute("aria-selected",b.dataset.view===controls.tab?"true":"false");
  if(controls.tab==="activities")activityView();else if(controls.tab==="gantt")ganttView();else if(controls.tab==="calendar")calendarView();else if(controls.tab==="packages")packageView();else drawingView();}
 for(const tab of document.querySelectorAll(".tabs button"))tab.onclick=()=>{controls.tab=tab.dataset.view;controls.offset=0;location.hash=controls.tab;render();};
 stageList();render();if(activities.length)setInspector({kind:"activity",activity:activities[0]});
 else empty(inspector,"This project does not yet have an accepted scheduling register.");
}
async function resources(){
 const holder=$("resourceCards"),search=$("resourceSearch"),list=$("resourceList");
 try{
  const [work,materials]=await Promise.all([json("data/resources/productivity-norms.v1.json"),json("data/resources/material-references.v1.json")]);
  holder.replaceChildren();
  for(const [title,desc,count,label,link] of [
   ["Work output rates","Labour days per unit of work.",work.items.length,"Open work rates calculator","../../work-items/productivity.html"],
   ["Material consumption norms","Material quantities per unit of work.",materials.recipes.length,"Open materials planner","../../work-items/materials.html"],
   ["Site work packages","Activity bundles and project planning notes.",null,"Find project packages","../projects/index.html"],
   ["Construction guidance","Reference notes and review requirements.",null,"Open construction guidance","../../knowledge/index.html"]]){
    const card=make(holder,"section","card");make(card,"h2","",title);make(card,"p","",desc);
    href(card,label,link);if(count!==null)pill(card,count+" reference entries");}
  const entries=[...work.items.map(x=>({name:x.title,kind:"Work output",unit:x.unit,
    details:x.rate?`${x.rate.skilled_days_per_unit} skilled days, ${x.rate.helper_days_per_unit} helper days`:"Rate pending"})),
   ...materials.recipes.map(x=>({name:x.title,kind:"Material norm",unit:x.work_unit,
    details:x.lines.map(line=>`${line.material} ${line.quantity_per_unit??"pending"} ${line.unit}`).join(" · ")}))];
  const draw=()=>{const q=search.value.trim().toLowerCase();list.replaceChildren();
   const subset=entries.filter(x=>x.name.toLowerCase().includes(q)).slice(0,75);
   if(!subset.length)return empty(list,"No matching reference entries.");
   const table=make(list,"table"),head=make(make(table,"thead"),"tr");
   for(const title of ["Reference work","Category","Unit","Per work unit"])make(head,"th","",title).scope="col";
   const body=make(table,"tbody");for(const x of subset){const tr=make(body,"tr");for(const v of [x.name,x.kind,x.unit,x.details])make(tr,"td","",v||"—");}
   make(list,"p","small muted","Reference only. No project quantity or approval is assumed.");};
  search.oninput=draw;draw();
 }catch{holder.replaceChildren();empty(holder,"The resource references could not be refreshed. The project library remains accessible.");}
}
try{if(document.body.dataset.page==="home")await homepage();else if(document.body.dataset.page==="projects")await directory();else if(document.body.dataset.page==="project")await workspace();else if(document.body.dataset.page==="resources")await resources();}
catch(err){const place=$("view")||$("projects")||$("count")||$("resourceCards");if(place){place.replaceChildren();empty(place,"Information could not be loaded. Please try again after the latest published update.");}console.error("Skyforge public view loading failed",err.message);}
