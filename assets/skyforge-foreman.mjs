// Decorative component only. No network requests, schedule writes or external assets.
const marker=document.querySelector("script[data-skyforge-foreman]");
const key="skyforge-foreman-hidden-v1";
const reduced=matchMedia("(prefers-reduced-motion: reduce)");
const getHidden=()=>{try{return localStorage.getItem(key)==="1"}catch{return false}};
const setHidden=v=>{try{localStorage.setItem(key,v?"1":"0")}catch{}};
function mount(){
 if(document.querySelector("skyforge-foreman"))return;
 const host=document.createElement("skyforge-foreman");
 host.style.cssText="display:block;max-width:100%;position:relative;isolation:isolate";
 const shadow=host.attachShadow({mode:"open"});
 shadow.innerHTML=`<style>
 :host{display:block;color:#214b54;font:12px/1.35 system-ui,sans-serif}
 .wrap{max-width:1520px;margin:0 auto;padding:3px clamp(12px,2vw,28px);display:flex;align-items:center;gap:10px;min-width:0;background:#f8fbfa;border-bottom:1px solid #d6e6e3}
 .scene{height:68px;width:min(540px,100%);min-width:0;flex:1;display:block;overflow:hidden}
 .tools{display:flex;gap:9px;align-items:center;flex-wrap:wrap;margin-left:auto;justify-content:flex-end}
 button,a{font:inherit;color:#155c63;background:#fff;border:1px solid #bfdbd7;border-radius:6px;padding:5px 8px;text-decoration:none;cursor:pointer}
 button:focus-visible,a:focus-visible{outline:2px solid #146e72;outline-offset:2px}
 .worker{animation:route 20s linear infinite}.legA{transform-origin:0 0;animation:stride .46s ease-in-out infinite alternate}.legB{transform-origin:0 0;animation:stride .46s ease-in-out infinite alternate-reverse}
 @keyframes route{0%,5%{transform:translate(36px,26px)} 34%{transform:translate(278px,26px)} 48%{transform:translate(278px,62px)} 80%{transform:translate(490px,62px)} 84%,100%{transform:translate(490px,62px);opacity:1} 99.5%{opacity:0}}
 @keyframes stride{from{transform:rotate(-17deg)}to{transform:rotate(17deg)}}
 .hidden .scene{display:none}.hidden{min-height:30px}.hidden .tools{margin-left:auto}
 .paused .worker,.paused .legA,.paused .legB{animation:none!important}
 .paused .worker{transform:translate(36px,26px)}
 @media(max-width:600px){.wrap{gap:5px;padding:3px 10px}.scene{height:56px}.tools{gap:4px;max-width:125px}button,a{font-size:10px;padding:4px 6px}}
 @media(prefers-reduced-motion:reduce){.worker,.legA,.legB{animation:none!important}.worker{transform:translate(36px,26px)}}
 </style><div class="wrap"><svg class="scene" viewBox="0 0 550 82" aria-hidden="true" focusable="false">
 <g fill="#e1efec" stroke="#79a7a3"><rect x="10" y="31" width="279" height="12" rx="4"/><rect x="270" y="67" width="266" height="12" rx="4"/></g>
 <g stroke="#aa7e48" stroke-width="2.3" fill="none"><path d="M273 36V67M287 36V67M273 42H287M273 48H287M273 54H287M273 60H287"/></g>
 <g fill="#225d60" font-family="system-ui,sans-serif" font-size="9" font-weight="600"><text id="stepOne" x="12" y="29">Plan</text><text id="stepTwo" x="299" y="65">Review</text></g>
 <g class="worker" style="pointer-events:none">
 <g transform="translate(0,-24)">
 <g stroke="#234757" stroke-width="3.3" stroke-linecap="round"><g transform="translate(-4,17)"><path class="legA" d="M0 0v6l-4 1"/></g><g transform="translate(4,17)"><path class="legB" d="M0 0v6l4 1"/></g></g>
 <path d="M-7 6Q0 3 7 6L7 17H-7Z" fill="#265d75" stroke="#193d4e" stroke-width=".8"/><path d="M-6 7V15M6 7V15M-6 11H6" stroke="#ffb842" stroke-width="2.7"/>
 <circle cx="0" cy="0" r="6.4" fill="#e8ae83" stroke="#995e48" stroke-width=".6"/><path d="M-8 -2Q-8 -10 0 -10Q8 -10 8 -2Z" fill="#ffc746" stroke="#b18423" stroke-width=".8"/><path d="M-9 -2H9" stroke="#d49c25" stroke-width="2.3" stroke-linecap="round"/><path d="M0 -9V-3" stroke="#ffe58a" stroke-width="2"/><circle cx="2" cy="0" r=".7" fill="#273d46"/>
 <path d="M-7 8L-12 13M7 8L12 11" fill="none" stroke="#e8ae83" stroke-width="3" stroke-linecap="round"/>
 <rect x="-17" y="5" width="8.8" height="12" rx="1" fill="#fffdf0" stroke="#567c80" transform="rotate(-10 -12 11)"/><path d="M-15 9h5m-5 3h5m-5 3h3" stroke="#73969b" stroke-width=".65"/>
 <path d="M10 17L19 7L19 17Z" fill="#f1d08b" stroke="#a57e37" stroke-width=".8"/><path d="M14 16l3-4v4Z" fill="#f8fbfa"/>
 </g></g></svg><div class="tools"><a class="sources">Live sources</a><button type="button" class="toggle">Hide Foreman</button></div></div>`;
 const wrap=shadow.querySelector(".wrap"),toggle=shadow.querySelector("button"),link=shadow.querySelector("a");
 link.href=new URL(marker?.dataset.sourceRegister||"resources/sources.html",document.baseURI).href;
 const titles=()=>Array.from(document.querySelectorAll("main h1, main h2, main h3, h1")).map(x=>x.textContent.trim()).filter(Boolean);
 const trim=s=>s.length>34?s.slice(0,31)+"…":s;
 function updateTitles(){const t=titles();shadow.getElementById("stepOne").textContent=trim(t[0]||"Plan the work");shadow.getElementById("stepTwo").textContent=trim(t.find(x=>x!==t[0])||"Review the schedule");}
 function sync(){const hidden=getHidden();wrap.classList.toggle("hidden",hidden);wrap.classList.toggle("paused",reduced.matches);toggle.textContent=hidden?"Show Foreman":"Hide Foreman";toggle.setAttribute("aria-pressed",String(!hidden));}
 toggle.addEventListener("click",()=>{setHidden(!getHidden());sync()});reduced.addEventListener?.("change",sync);
 const header=document.querySelector("header.sf-global,header.top,header");
 if(header&&header.parentNode)header.after(host);else document.body.prepend(host);
 updateTitles();sync();setTimeout(updateTitles,1200);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount,{once:true});else mount();
