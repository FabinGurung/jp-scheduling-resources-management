import {readdir,readFile,writeFile,copyFile,mkdir} from "node:fs/promises";
import {join,relative,dirname} from "node:path";
export async function installForeman(site,sourcePath,sourceRoute){
 const assets=join(site,"assets");await mkdir(assets,{recursive:true});
 await copyFile(sourcePath,join(assets,"skyforge-foreman.mjs"));
 let pages=0,redirects=0;
 async function walk(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const path=join(dir,entry.name);if(entry.isDirectory()){await walk(path);continue;}if(!entry.name.endsWith(".html"))continue;
  let html=await readFile(path,"utf8");if(/<meta\b[^>]*http-equiv\s*=\s*["']?refresh\b/i.test(html)){redirects++;continue;}
  const prefix="../".repeat(relative(site,dirname(path)).split(/[\\/]/).filter(Boolean).length)||"./";
  // Existing legacy base elements may change relative URL resolution.
  const baseAware=/<base\s+href=/i.test(html)?"./":prefix;
  const tag='<script type="module" data-skyforge-foreman data-source-register="'+baseAware+sourceRoute+'" src="'+baseAware+'assets/skyforge-foreman.mjs"></script>';
  if(!/<\/body\s*>/i.test(html))throw Error("No body for Foreman: "+path);
  if(!html.includes("data-skyforge-foreman"))html=html.replace(/<\/body\s*>/i,tag+"</body>");
  await writeFile(path,html);if((html.match(/data-skyforge-foreman\b/g)||[]).length!==1)throw Error("Foreman coverage mismatch");pages++;
 }}
 await walk(site);console.log("SKYFORGE_FOREMAN_COVERAGE",JSON.stringify({pages,redirects}));return {pages,redirects};
}
