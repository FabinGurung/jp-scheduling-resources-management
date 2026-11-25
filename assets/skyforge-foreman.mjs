// Display-only overlay; no data writes, auto-scroll, network requests or simulated clicks.
const marker=document.querySelector("script[data-skyforge-foreman]");
const key="skyforge-foreman-hidden-v1",reduced=matchMedia("(prefers-reduced-motion: reduce)");
const getHidden=()=>{try{return localStorage.getItem(key)==="1"}catch{return false}};
const setHidden=v=>{try{localStorage.setItem(key,v?"1":"0")}catch{}};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function mount(){
 if(document.querySelector("skyforge-foreman"))return;
 const host=document.createElement("skyforge-foreman");
 host.style.cssText="display:block;position:fixed;inset:0;z-index:9999;pointer-events:none;contain:layout style;";
 const shadow=host.attachShadow({mode:"open"});
 shadow.innerHTML=`<style>
 :host{color:#214b54;font:12px/1.3 system-ui,sans-serif}
 .overlay{position:absolute;inset:0;pointer-events:none;overflow:hidden}
 .character{position:absolute;width:42px;height:47px;left:0;top:0;transform:translate(-100px,-100px);filter:drop-shadow(0 1px 1px #fff);pointer-events:none}
 .legA,.legB{transform-origin:0 0;animation:stride .42s ease-in-out infinite alternate}
 .legB{animation-direction:alternate-reverse}
 @keyframes stride{from{transform:rotate(-15deg)}to{transform:rotate(15deg)}}
 .rest .legA,.rest .legB,.still .legA,.still .legB{animation:none}
 .rest{opacity:.9}.ladder{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
 .tools{position:absolute;right:9px;bottom:max(9px,env(safe-area-inset-bottom));display:flex;gap:4px;align-items:center;pointer-events:auto;background:#fffef9e8;border:1px solid #c5dbd6;border-radius:9px;padding:3px;box-shadow:0 1px 5px #23475715}
 .tools a,.tools button{font:inherit;color:#155c63;background:#fff;border:1px solid #bfdbd7;border-radius:5px;padding:5px 7px;text-decoration:none;cursor:pointer}
 .tools a:focus-visible,.tools button:focus-visible{outline:2px solid #146e72;outline-offset:2px}
 .hidden .overlay{display:none}
 @media(max-width:600px){.character{width:34px;height:39px}.tools{right:5px;font-size:10px}}
 @media(prefers-reduced-motion:reduce){.legA,.legB{animation:none}}
 </style><div class="overlay" aria-hidden="true"><svg class="ladder" xmlns="http://www.w3.org/2000/svg"></svg><svg class="character" viewBox="-22 -38 44 48" aria-hidden="true" focusable="false"><g transform="translate(0,-24)">
 <g stroke="#234757" stroke-width="3.3" stroke-linecap="round"><g transform="translate(-4,17)"><path class="legA" d="M0 0v6l-4 1"/></g><g transform="translate(4,17)"><path class="legB" d="M0 0v6l4 1"/></g></g>
 <path d="M-7 6Q0 3 7 6L7 17H-7Z" fill="#265d75" stroke="#193d4e" stroke-width=".8"/><path d="M-6 7V15M6 7V15M-6 11H6" stroke="#ffb842" stroke-width="2.7"/>
 <circle cx="0" cy="0" r="6.4" fill="#e8ae83" stroke="#995e48" stroke-width=".6"/><path d="M-8 -2Q-8 -10 0 -10Q8 -10 8 -2Z" fill="#ffc746" stroke="#b18423" stroke-width=".8"/><path d="M-9 -2H9" stroke="#d49c25" stroke-width="2.3" stroke-linecap="round"/><path d="M0 -9V-3" stroke="#ffe58a" stroke-width="2"/><circle cx="2" cy="0" r=".7" fill="#273d46"/>
 <path d="M-7 8L-12 13M7 8L12 11" fill="none" stroke="#e8ae83" stroke-width="3" stroke-linecap="round"/>
 <rect x="-17" y="5" width="8.8" height="12" rx="1" fill="#fffdf0" stroke="#567c80" transform="rotate(-10 -12 11)"/><path d="M-15 9h5m-5 3h5m-5 3h3" stroke="#73969b" stroke-width=".65"/>
 <path d="M10 17L19 7L19 17Z" fill="#f1d08b" stroke="#a57e37" stroke-width=".8"/><path d="M14 16l3-4v4Z" fill="#f8fbfa"/>
 </g></svg></div><div class="tools"><a>Live sources</a><button type="button">Hide Foreman</button></div>`;
 const worker=shadow.querySelector(".character"),ladder=shadow.querySelector(".ladder"),toggle=shadow.querySelector("button"),link=shadow.querySelector("a"),overlay=shadow.querySelector(".overlay");
 link.href=new URL(marker?.dataset.sourceRegister||"resources/sources.html",document.baseURI).href;
 document.body.append(host);
 let route=[],index=0,start=0,wait=0,position=null,frame=0,dirty=true,lastPath=null,reverse=false,lastScan=0;
 const visible=(r)=>r.width>0&&r.height>0&&r.right>8&&r.left<innerWidth-8&&r.bottom>12&&r.top<innerHeight-12;
 const safe=(p)=>p.x>=16&&p.x<=innerWidth-16&&p.y>=42&&p.y<=innerHeight-24;
 const anchor=(r)=>({x:clamp(r.left+Math.min(r.width*.45,60),18,innerWidth-18),y:clamp(r.bottom,45,innerHeight-26)});
 function pathRoute(){
  const paths=Array.from(document.querySelectorAll(".gantt-dependencies .dependency-line"));
  if(!paths.length)return [];
  // Sample actual rendered SVG geometry; respect the scrolling Gantt viewport.
  const choices=[];
  for(const p of paths){if(!visible(p.getBoundingClientRect())&&p.getBoundingClientRect().height<1)continue;
   const clip=p.closest(".gantt-scroll")?.getBoundingClientRect();
   const matrix=p.getScreenCTM();if(!matrix)continue;
   const len=p.getTotalLength();if(!len)continue;
   const n=Math.min(120,Math.max(8,Math.ceil(len/14)));let run=[],best=[];
   for(let i=0;i<=n;i++){const q=p.getPointAtLength(len*i/n).matrixTransform(matrix),pt={x:q.x,y:q.y};
    if(safe(pt)&&(!clip||(pt.x>=clip.left&&pt.x<=clip.right&&pt.y>=clip.top&&pt.y<=clip.bottom))){run.push(pt);if(run.length>best.length)best=run.slice()}else run=[];
   }
   if(best.length>=3)choices.push({p,points:best});
  }
  const choice=choices.find(c=>c.p!==lastPath)||choices[0];if(!choice)return [];
  lastPath=choice.p;reverse=!reverse;return reverse?choice.points.slice().reverse():choice.points;
 }
 function calendarRoute(){
  const cells=Array.from(document.querySelectorAll(".calendar-days button")).filter(e=>visible(e.getBoundingClientRect()));
  if(!cells.length)return [];
  const importance=e=>e.getAttribute("aria-current")==="date"?5:e.getAttribute("aria-pressed")==="true"?4:e.classList.contains("cal-milestone")?3:e.classList.contains("cal-rest")?2:1;
  const special=cells.filter(e=>importance(e)>1).sort((a,b)=>importance(b)-importance(a));
  const ordered=[...new Set([...special,...cells])].slice(0,12);
  return ordered.map(e=>({...anchor(e.getBoundingClientRect()),jump:true,rest:e.classList.contains("cal-rest"),important:importance(e)>1}));
 }
 function headingRoute(){
  const nodes=Array.from(document.querySelectorAll("main h1,main h2,main h3,main h4, h1, h2")).filter(e=>visible(e.getBoundingClientRect()));
  const points=[];
  for(const e of [...new Set(nodes)].slice(0,12)){const r=e.getBoundingClientRect(),y=clamp(r.bottom+2,45,innerHeight-25);
   const left=clamp(r.left+18,18,innerWidth-18),right=clamp(Math.min(r.right,r.left+Math.max(50,e.textContent.length*6)),18,innerWidth-18);
   if(points.length){const prev=points.at(-1);points.push({x:prev.x,y});}
   points.push({x:left,y},{x:right,y});
  }
  return points.length?points:[{x:30,y:60},{x:Math.min(140,innerWidth-20),y:60}];
 }
 function refresh(t){lastScan=t;let points=pathRoute(),mode="gantt";
  if(!points.length){points=calendarRoute();mode="calendar"}
  if(!points.length){points=headingRoute();mode="page"}
  host.dataset.mode=mode;route=points;index=0;start=t;wait=0;position=route[0];dirty=false;ladder.replaceChildren();
 }
 function paint(p,rest=false){worker.style.transform="translate("+(p.x-worker.getBoundingClientRect().width/2)+"px,"+(p.y-worker.getBoundingClientRect().height*.80)+"px)";worker.classList.toggle("rest",rest);host.dataset.x=String(Math.round(p.x));host.dataset.y=String(Math.round(p.y))}
 function drawLadder(a,b){
  ladder.replaceChildren();
  if(host.dataset.mode!=="page"||Math.abs(a.x-b.x)>5||Math.abs(a.y-b.y)<35)return;
  const ns="http://www.w3.org/2000/svg",top=Math.min(a.y,b.y),bottom=Math.max(a.y,b.y),x=a.x;
  const line=(x1,y1,x2,y2)=>{const e=document.createElementNS(ns,"line");for(const [k,v] of Object.entries({x1,y1,x2,y2,stroke:"#a87a43","stroke-width":1.5,"stroke-linecap":"round"}))e.setAttribute(k,v);ladder.append(e)};
  line(x-6,top,x-6,bottom);line(x+6,top,x+6,bottom);for(let y=top+6;y<bottom;y+=10)line(x-6,y,x+6,y);
 }
 function tick(t){frame=0;if(getHidden()||document.hidden)return;
  if(dirty||!route.length||t-lastScan>2500&&index>=route.length-1)refresh(t);
  if(reduced.matches){worker.classList.add("still");paint(route[0]);return}
  worker.classList.remove("still");
  if(wait>t){paint(position,true);frame=requestAnimationFrame(tick);return}
  if(index>=route.length-1){dirty=true;frame=requestAnimationFrame(tick);return}
  const a=route[index],b=route[index+1],distance=Math.hypot(b.x-a.x,b.y-a.y),duration=host.dataset.mode==="gantt"?Math.max(80,distance/48*1000):b.jump?Math.max(330,Math.min(1000,distance*5)):Math.max(100,distance/40*1000);
  const k=clamp((t-start)/duration,0,1);position={x:a.x+(b.x-a.x)*k,y:a.y+(b.y-a.y)*k-(b.jump?Math.sin(k*Math.PI)*Math.min(28,distance/3):0)};
  if(k===0||!ladder.childNodes.length)drawLadder(a,b);paint(position);
  if(k>=1){index++;start=t;ladder.replaceChildren();if(b.rest||b.important){wait=t+(b.rest?2800:1200);start=wait}}
  frame=requestAnimationFrame(tick);
 }
 function schedule(){if(!frame&&!getHidden()&&!document.hidden)frame=requestAnimationFrame(tick)}
 function invalidate(){dirty=true;schedule()}
 function sync(){const hidden=getHidden();overlay.style.display=hidden?"none":"block";toggle.textContent=hidden?"Show Foreman":"Hide Foreman";toggle.setAttribute("aria-pressed",String(!hidden));if(hidden&&frame){cancelAnimationFrame(frame);frame=0}invalidate()}
 toggle.addEventListener("click",()=>{setHidden(!getHidden());sync()});reduced.addEventListener?.("change",invalidate);
 addEventListener("scroll",invalidate,{passive:true,capture:true});addEventListener("resize",invalidate,{passive:true});
 document.addEventListener("visibilitychange",invalidate);
 const target=document.querySelector("#view")||document.querySelector("main")||document.body;
 new MutationObserver(records=>{if(records.some(r=>r.target!==host&&!host.contains(r.target)))invalidate()}).observe(target,{childList:true,subtree:true,attributes:true,attributeFilter:["aria-pressed","aria-current","class","d"]});
 sync();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount,{once:true});else mount();
