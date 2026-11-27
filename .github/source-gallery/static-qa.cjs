const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const http=require('node:http');
const path=require('node:path');
const {chromium}=require('playwright');
const prefix='/jp-scheduling-resources-management/';
(async()=>{
 const site=path.resolve(process.argv[2]||'dist');
 const server=http.createServer(async(req,res)=>{try{const u=new URL(req.url,'http://127.0.0.1');if(!u.pathname.startsWith(prefix))throw Error('route');const p=u.pathname.slice(prefix.length);const f=path.resolve(site,p+(p.endsWith('/')||!p?'index.html':''));if(!f.startsWith(site+path.sep))throw Error('path');res.setHeader('Content-Type',{'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json'}[path.extname(f)]||'application/octet-stream');res.end(await fs.readFile(f));}catch{res.statusCode=404;res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port+prefix,root=base+'schedules/';
 const browser=await chromium.launch({args:['--no-sandbox']});
 try{
 for(const width of [1440,1024,768,390]){
 const page=await browser.newPage({viewport:{width,height:900},isMobile:width<500,hasTouch:width<500});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base);await page.waitForURL('**/schedules/');await page.goto(root+'projects/index.html');await page.locator('.project-card').first().waitFor();assert.equal(await page.locator('.project-card').count(),22);
 await page.goto(root+'projects/gantt.html?project=PORT-000001');await page.locator('.gantt-bar').first().waitFor();assert.ok(await page.locator('.dependency-line').count());await page.getByRole('button',{name:'Hide dependency lines'}).click();assert.equal(await page.locator('.dependency-line').count(),0);await page.getByRole('button',{name:'Show dependency lines'}).click();
 await page.goto(root+'projects/calendar.html?project=PORT-000001');await page.locator('.calendar-days button').first().waitFor();assert.equal(await page.locator('.calendar-days button').count(),7);assert.equal(await page.locator('.calendar-days button.cal-rest').count(),1);await page.locator('.calendar-days button').first().click();await page.locator('#inspector h3').getByText('Relative day 0').waitFor();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
 await page.goto(root+'projects/control.html?project=PORT-000001');await page.getByRole('heading',{name:'Network and float',exact:true}).waitFor();assert.match(await page.locator('#view').innerText(),/524 relative calendar days; 91 zero-float activities/);assert.doesNotMatch(await page.locator('#view').innerText(),/draft|diagnostic/i);
 await page.goto(root+'projects/activities.html?project=PORT-000014');await page.getByText('of 839 activities',{exact:false}).waitFor();
 await page.goto(root+'resources/index.html');await page.getByRole('link',{name:'Open material norms source'}).waitFor();assert.ok(await page.locator('#resourceList tbody tr').count());
 await page.goto(root+'resources/modules.html');await page.getByRole('heading',{name:'Readiness checklist'}).waitFor();
 await page.goto(root+'projects/history.html?project=PORT-000001');await page.getByRole('link',{name:'Open version archive (Google sign-in)'}).waitFor();
 await page.goto(base+'planner.html');await page.getByRole('heading',{name:'Version archive'}).waitFor();assert.equal(await page.locator('script').count(),0);
 assert.deepEqual(errors,[]);console.log('STATIC_BROWSER_PASS '+width);await page.close();}
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
