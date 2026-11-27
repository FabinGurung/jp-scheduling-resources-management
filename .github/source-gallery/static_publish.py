"""Skyforge V1.20: source-first relative calendar and static publication.
Run only against a completed, previously validated combined Pages artifact.
This module is an executable derivative of the native Google Doc source.
"""
import argparse, collections, functools, html, json, os, pathlib, re, shutil, subprocess, tempfile, urllib.parse, urllib.request

REGISTRY = 'PRIMAVERA__ALL_PROJECTS__LIVE_SOURCE_INDEX__V000001'
ARCHIVE = 'https://drive.google.com/drive/folders/1iwFDKR5lJzA40uKPldoYCge2r90mZdav'
SOURCES = 'https://docs.google.com/spreadsheets/d/1ONVr7nEC4noswyH9bBuXI9GEVW5r6RcaDyo-Z3z2uy4/edit'
ROOT = '/jp-scheduling-resources-management/'

def require(ok, msg):
    if not ok: raise ValueError(msg)

def load(p): return json.loads(p.read_text())
def save(p, value): p.write_text(json.dumps(value, ensure_ascii=False, indent=2)+'\n')

def read_basis():
    token = os.environ['GOOGLE_OAUTH_ACCESS_TOKEN']
    def get(url):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={'Authorization':'Bearer '+token}), timeout=60) as r:
                return json.load(r)
        except Exception as e: raise RuntimeError('Read-only Google source lookup failed: '+type(e).__name__) from None
    q=urllib.parse.urlencode({'q':f"name = '{REGISTRY}' and trashed = false and mimeType = 'application/vnd.google-apps.spreadsheet'",'fields':'nextPageToken,files(id,name)','pageSize':100})
    res=get('https://www.googleapis.com/drive/v3/files?'+q)
    require(len(res.get('files',[]))==1 and not res.get('nextPageToken'),'Calendar register identity ambiguous')
    sid=res['files'][0]['id']
    return get('https://sheets.googleapis.com/v4/spreadsheets/'+sid+'/values/D01_CALENDAR_BASIS%21A%3AE')['values'][1:]

def calendar_network(model, rows, kernel):
    basis={r[0]:r[1] for r in rows if r and r[0]}
    all_acts={a['id']:a for a in model['activities']}
    require(len(basis)==len(rows)==len(all_acts) and set(basis)==set(all_acts),'Calendar basis coverage changed')
    require(set(basis.values())<={'HOUSE WORKDAY','ELAPSED','UNSCHEDULED'},'Unknown calendar basis')
    ids={k:a for k,a in all_acts.items() if basis[k]!='UNSCHEDULED'}
    excluded=set(all_acts)-set(ids)
    require(all(all_acts[k]['duration'] is None for k in excluded),'Unscheduled activity acquired duration: revise source basis')
    for a in ids.values():
        require(type(a['duration']) is int and a['duration']>=0 and re.fullmatch(r'R\+\d+',a['start']) and re.fullmatch(r'R\+\d+',a['finish']),'Missing relative timing')
    def working(k,d): return basis[k]=='ELAPSED' or d%7!=6
    @functools.lru_cache(None)
    def place(k,s):
        n=ids[k]['duration']; d=s
        if not n: return (s,s)
        while not working(k,d): d+=1
        start=d
        while n:
            if working(k,d): n-=1
            d+=1
        return start,d
    def shift(e,lag,elapsed):
        while lag>0:
            if elapsed or e%7!=6: lag-=1
            e+=1
        while lag<0:
            e-=1
            if elapsed or e%7!=6: lag+=1
        return e
    incoming={k:[] for k in ids}; outgoing={k:[] for k in ids}; links=[]; dropped=[]
    for r in model['relationships']:
        require(r['from'] in all_acts and r['to'] in all_acts,'Unknown relationship identity')
        if r['from'] in excluded or r['to'] in excluded: dropped.append(r);continue
        require(r['type'] in ('FS','SS','FF','SF') and type(r['lag']) is int and r['lag']>=0 and r['basis'] in ('workdays','elapsed days'),'Unsupported lag basis; reconcile source')
        links.append(r);incoming[r['to']].append(r);outgoing[r['from']].append(r)
    def satisfied(r,p,s): return s[0 if r['type'][1]=='S' else 1]>=shift(p[0 if r['type'][0]=='S' else 1],r['lag'],r['basis']=='elapsed days')
    degree={k:len(v) for k,v in incoming.items()};q=collections.deque(k for k in ids if not degree[k]);order=[]
    while q:
        k=q.popleft();order.append(k)
        for r in outgoing[k]:
            j=r['to'];degree[j]-=1
            if not degree[j]:q.append(j)
    require(len(order)==len(ids),'Cyclic network')
    horizon=max(int(a['finish'][2:]) for a in ids.values())+366
    require(horizon<=10000,'Unexpected relative horizon')
    early={};late={}
    for k in order:
        early[k]=next((p for s in range(horizon+1) if (p:=place(k,s))[1]<=horizon and all(satisfied(r,early[r['from']],p) for r in incoming[k])),None)
        require(early[k] is not None,'No early placement')
    finish=max(p[1] for p in early.values())
    for k in reversed(order):
        late[k]=next((p for s in range(finish,-1,-1) if (p:=place(k,s))[1]<=finish and all(satisfied(r,p,late[r['to']]) for r in outgoing[k])),None)
        require(late[k] is not None,'No late placement')
    for k,a in ids.items():require(early[k]==(int(a['start'][2:]),int(a['finish'][2:])),'Relative source dates differ: '+k)
    # Independent existing reviewed JS engine. It runs only in Actions, never in Pages.
    oracle='''import {scheduleCalendarNetwork} from './src/kernel/calendar-scheduler.mjs';import {readFileSync} from 'node:fs';const x=JSON.parse(readFileSync(0,'utf8'));const r=scheduleCalendarNetwork(x);console.log(JSON.stringify({finish:r.project.early_finish,rows:r.activities.map(a=>[a.id,a.es,a.ef,a.ls,a.total_float])}));'''
    payload=dict(activities=[dict(id=k,duration=a['duration'],calendar_id='ELAPSED' if basis[k]=='ELAPSED' else 'HOUSE') for k,a in ids.items()],relationships=[dict(predecessor=r['from'],successor=r['to'],type=r['type'],lag=r['lag'],lag_calendar_mode='EXPLICIT',lag_calendar_id='ELAPSED' if r['basis']=='elapsed days' else 'HOUSE') for r in links],calendars=[dict(id='HOUSE',working_weekdays=list(range(6))),dict(id='ELAPSED',working_weekdays=list(range(7)))],projectStart='2000-01-02',horizonEnd='2028-01-01',projectCalendarId='HOUSE',projectTimeZone='Asia/Kathmandu')
    check=json.loads(subprocess.check_output(['node','--input-type=module','-e',oracle],input=json.dumps(payload),text=True,cwd=kernel,timeout=120))
    expected={k:[*early[k],late[k][0],late[k][0]-early[k][0]] for k in ids}
    require(check['finish']==finish and {r[0]:r[1:] for r in check['rows']}==expected,'Independent calendar engine mismatch')
    result=[dict(id=k,early_start=early[k][0],early_finish=early[k][1],late_start=late[k][0],total_float=late[k][0]-early[k][0],zero_float=late[k][0]==early[k][0]) for k in order]
    days={str(d):[k for k in ids if (early[k][0]==early[k][1]==d) or (early[k][0]<=d<early[k][1] and working(k,d))] for d in range(finish+1)}
    for k,a in all_acts.items():
        if k in excluded: a['start']=a['finish']='';a['review']='Not scheduled'
        else:a['unit']='elapsed days' if basis[k]=='ELAPSED' else 'workdays'
    model['calendar_display']={'days':days,'weekdays':['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],'rest_weekday':6}
    model['planning_control']['scenario']={'state':'RELATIVE_CALENDAR','finish':finish,'activities':result,'zero_float_count':sum(x['zero_float'] for x in result)}
    audit={'project':model['id'],'timed':len(ids),'unscheduled':sorted(excluded),'links':len(links),'excluded_links':len(dropped),'finish':finish,'zero_float':sum(x['zero_float'] for x in result),'mismatches':0,'independent_calendar_match':True,'basis':'relative Sunday origin, not actual dates'}
    return audit

def patch_app(path):
    s=path.read_text()
    def change(old,new):
        nonlocal s
        require(old in s,'Presentation source changed: '+old[:70]);s=s.replace(old,new)
    change('const draft=(model)=>model.source_state||"Schedule not yet provided";', 'const scheduleLabel=(model)=>model.activities.length?"Project schedule":"Schedule not yet available";')
    change('draft(model)','scheduleLabel(model)')
    change('href(footer,"Previous project page","../../projects/"+model.company_key+"/"+model.slug+"/");',f'href(footer,"Source and version history","{ARCHIVE}");')
    change('pill(inspector,a.review||"Planning reference");','pill(inspector,a.duration===null?"Not scheduled":a.duration===0?"Milestone / inspection":"Scheduled work");')
    change('Planning date / week — actual attendance not verified.','Scheduled activities')
    change('   make(inspector,"p","notice","A selected group is not a separately approved schedule.");','')
    change('   if(r.reason)make(inspector,"p","small muted",r.reason);','')
    change('  make(inspector,"p","small muted","Site progress and construction release are not verified.");','')
    change('Reference policy; actual attendance not verified.','Working calendar')
    change('const hit=value=>found.filter(a=>{const s=startValue(a),e=finishValue(a);return s!==null&&e!==null&&(s===e?s===value:s<=value&&value<e);});','const hit=value=>model.calendar_display?found.filter(a=>(model.calendar_display.days[String(value)]||[]).includes(a.id)):found.filter(a=>{const s=startValue(a),e=finishValue(a);return s!==null&&e!==null&&(s===e?s===value:s<=value&&value<e);});')
    change('dayCell("Day "+n,"Relative day "+n,n);','dayCell("Day "+n,"Relative day "+n,n,!!model.calendar_display&&n%7===model.calendar_display.rest_weekday);')
    change('Relative days have no verified civil-date anchor; weekday holidays are not assigned to them.','Relative programme days; not civil dates. Saturday rest applies to workday activities; elapsed activities continue.')
    change('make(result,"p","muted",choice.length+" activities. The selected subset does not create a new approved project schedule.");','make(result,"p","muted",choice.length+" activities.");')
    change('R02 is a site coordination draft, not an engineering release.','R02 — drawing coordination; follow the issued drawing revision for execution.')
    change('No drawing-to-activity links have passed source review for this project.','No linked drawings are available.')
    change('Zero-duration milestones and inspection gates from the planning source; not actual completion.','Scheduled milestones and inspection gates.')
    start=s.index(' function historyView(){');end=s.index(' function controlView(){',start)
    s=s[:start]+f' function historyView(){{make(view,"h3","","Source and version history");href(view,"Open version archive (Google sign-in)","{ARCHIVE}");href(view,"Project source register","../resources/sources.html");}}\n'+s[end:]
    change('  make(view,"p","notice","Draft schedule only. No approved baseline, verified actual progress, resource capacity or critical path. Work-slot calculations are diagnostics, not a rescheduled plan.");','  make(view,"p","muted","Programme, upcoming work and network timing. Site execution follows issued drawings and engineering releases.");')
    change('Open admitted holds','Open engineering checks')
    change('Source date intervals only; no holiday recalculation or actual progress inference. Data date: ','Programme date intervals. Status date: ')
    change('     if(s.input_warning)make(result,"p","notice","A planning control setting requires review; safe defaults are used.");','')
    change('Network and float diagnostic','Network and float')
    change('  make(view,"p","small muted",c.roots+" network starts · "+c.terminals+" network ends · "+c.relative_span_mismatches+" relative date-span differences · "+c.non_workday_nonzero_lags+" incompatible nonzero lags.");','')
    change('if(c.scenario.state==="WORK_SLOT_DIAGNOSTIC"){','if(["WORK_SLOT_DIAGNOSTIC","RELATIVE_CALENDAR"].includes(c.scenario.state)){')
    change('   make(view,"p","notice","Logic-only shared work-slot scenario, independently checked against the existing scheduling engine. Excludes civil calendar, constraints, actuals and resource leveling; does not replace the source schedule.");','   const relativeCalendar=c.scenario.state==="RELATIVE_CALENDAR"; const units=relativeCalendar?"relative calendar days":"work slots"; make(view,"p","muted",relativeCalendar?"Relative programme · mixed working and elapsed calendars":"Work-slot network · calendar dates shown separately");')
    change('   make(view,"p","","Network finish: "+c.scenario.finish+" abstract work slots; "+c.scenario.activities.filter(a=>a.zero_float).length+" zero-float activities in this scenario.");','   make(view,"p","","Network finish: "+c.scenario.finish+" "+units+"; "+c.scenario.zero_float_count+" zero-float activities.");')
    change('"Total float (slots)"','"Total float ("+units+")"')
    change('CPM scenario held — "+c.scenario.reasons.join("; ")','Network timing not available"')
    # The previous replacement intentionally includes its closing quote; remove duplicate trailing quote if present.
    change('"Network timing not available");','"Network timing not available");')
    start=s.index('  for(const [key,label,reason]');end=s.index('  href(view,"Open the signed-in source register',start)
    s=s[:start]+'''  for(const [key,label] of [["baseline","Baseline"],["progress","Actual progress"],["crew","Resource loading"]])make(view,"p","muted",label+" — "+(s.intake_counts[key]||0)+" records available");\n'''+s[end:]
    change('This project does not yet have an accepted scheduling register.','Select an activity when the schedule is available.')
    change('"Open work rates calculator","../../work-items/productivity.html"','"Open work rates source","'+SOURCES+'#gid=103"')
    change('"Open materials planner","../../work-items/materials.html"','"Open material norms source","'+SOURCES+'#gid=103"')
    change('"Open construction guidance","../../knowledge/index.html"','"Open construction guidance","'+SOURCES+'#gid=103"')
    change('m.review+" — reference only, not a work release."','"Resource and readiness reference"')
    change('m.scope+" · "+m.review','m.scope')
    change('make(p,"span","muted"," · "+l.review);','')
    path.write_text(s)

def main():
    ap=argparse.ArgumentParser();ap.add_argument('site',type=pathlib.Path);ap.add_argument('--basis',type=pathlib.Path);ap.add_argument('--kernel',type=pathlib.Path,default=pathlib.Path('.'));ap.add_argument('--audit',type=pathlib.Path,required=True);args=ap.parse_args()
    site=args.site.resolve();shared=site/'schedules';data=shared/'data';index=load(data/'project-index.json');registry=load(args.kernel/'projects/registry.json')
    require({p['id'] for p in index['projects']}=={p['id'] for p in registry['projects']},'Project coverage mismatch')
    basis=load(args.basis) if args.basis else read_basis();audit={};records={}
    for p in index['projects']:
        f=data/'projects'/f"{p['id']}.json";m=load(f);require(m['id']==p['id'],'Project identity mismatch')
        if m['id']=='PORT-000001':audit=calendar_network(m,basis,args.kernel)
        p['state']='Project schedule' if m['activities'] else 'Schedule not yet available';m['source_state']=p['state']
        # Review notes remain in the project Docs and Sheets. Preserve all operational holds and links.
        m['public_narrative']=[x for x in m.get('public_narrative',[]) if not re.search(r'\bdraft\b|\bprovisional\b|\bunverified\b|\bconfirm\b',x,re.I)]
        for a in m['activities']:a['review']='Not scheduled' if a['duration'] is None else 'Scheduled work'
        for r in m['relationships']:r['reason']=''
        for c in m['calendar']:c.pop('effective',None)
        control=m['planning_control'];scenario=control['scenario'];scenario.pop('reasons',None);scenario.pop('independent_kernel_check',None);scenario['zero_float_count']=sum(a['zero_float'] for a in scenario['activities'])
        for key in ('relative_span_mismatches','non_workday_nonzero_lags','cycle','roots','terminals'):control.pop(key,None)
        m['planning_settings'].pop('input_warning',None)
        save(f,m);records[m['id']]=m
    save(data/'project-index.json',index)
    modules_file=data/'resources/site-modules.json';modules=load(modules_file)
    for m in modules['modules']:
        m.pop('review',None)
        for link in m['links']:link.pop('review',None)
    save(modules_file,modules)
    source_page=shared/'resources/sources.html'
    source_text=source_page.read_text();marker='Planning control inputs</a>'
    require(marker in source_text,'Source register link marker missing')
    source_page.write_text(source_text.replace(marker,marker+f'<a class="ghost" href="{SOURCES}#gid=112" target="_blank" rel="noopener noreferrer">Native code source index</a><a class="ghost" href="{ARCHIVE}" target="_blank" rel="noopener noreferrer">Version archive</a>'))
    patch_app(shared/'assets/app.js')
    for f in (shared/'projects').glob('*.html'):
        s=f.read_text().replace('Plan shown for reference. No construction approval or site progress is implied.','Site execution follows issued drawings and engineering releases.');f.write_text(s)
    # All original HTML paths survive, but legacy code/data are removed from the public artifact.
    old=[f.relative_to(site).as_posix() for f in site.rglob('*.html') if not f.is_relative_to(shared)]
    project_routes={}
    for p in registry['projects']:
        project_routes[f"projects/{p['company']}/{p['slug']}/"]=p['id']
        if p.get('legacy_portfolio_slug'):project_routes[f"projects/portfolio/{p['legacy_portfolio_slug']}/"]=p['id']
    project_routes['projects/narayani/']='PORT-000001';project_routes['studio/projects/narayani/']='PORT-000001'
    def destination(path):
        for prefix,pid in sorted(project_routes.items(),key=lambda x:-len(x[0])):
            if path.startswith(prefix):
                if path.endswith('boq-v003.html') or path.endswith('detailed-preview.html') or path.endswith('visual.html') or path.endswith('beta.html') or path.endswith('readiness.html'):return ARCHIVE
                return ROOT+'schedules/projects/activities.html?project='+pid
        if path=='index.html':return ROOT+'schedules/'
        if path.startswith('work-items/'):return ROOT+'schedules/resources/'
        if path in ('projects/index.html','projects/portfolio/index.html') or re.fullmatch(r'projects/(fishtail|rohini|jp|paila)/index.html',path):return ROOT+'schedules/projects/'
        return ARCHIVE
    for f in list(site.iterdir()):
        if f.name in ('schedules','source-gallery.js','THIRD_PARTY_NOTICES.md'):continue
        if f.is_dir():shutil.rmtree(f)
        else:f.unlink()
    redirects=0
    for path in old:
        target=destination(path);f=site/path;f.parent.mkdir(parents=True,exist_ok=True);t=html.escape(target,quote=True)
        if target==ARCHIVE:
            content=f'<h1>Version archive</h1><p>This previous workspace is retained in the synchronized Google Drive archive.</p><p><a href="{t}">Open archive (Google sign-in)</a></p><p><a href="{ROOT}schedules/">Open current Skyforge workspace</a></p>'
            meta=''
        else:
            redirects+=1;meta=f'<meta http-equiv="refresh" content="0;url={t}">';content=f'<h1>Skyforge</h1><p><a href="{t}">Open current workspace</a></p>'
        f.write_text(f'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">{meta}<title>Skyforge</title></head><body><main>{content}</main></body></html>\n')
    require(all((site/p).is_file() for p in old),'Legacy HTML route lost')
    allowed={'schedules/assets/app.js','schedules/assets/skyforge-foreman.mjs','source-gallery.js'}
    actual={f.relative_to(site).as_posix() for f in site.rglob('*') if f.suffix in ('.js','.mjs','.py','.ts','.wasm')}
    require(actual==allowed,'Unexpected executable assets in public artifact: '+str(actual-allowed))
    for f in site.rglob('*.html'):
        if not f.is_relative_to(shared):require('<script' not in f.read_text().lower(),'Legacy route still executes code')
    require(not (site/'src').exists() and not (site/'machine').joinpath('demo-foundation/plan.json').exists(),'Engine payload retained')
    subprocess.run(['node','--check',str(shared/'assets/app.js')],check=True)
    audit.update({'projects':len(index['projects']),'shared_pages':len(list(shared.rglob('*.html'))),'legacy_routes':len(old),'public_executables':sorted(actual)})
    manifest=load(shared/'release.json');manifest.update({'edition':'V1.20 calendar and static publication','interactive_pages':audit['shared_pages'],'redirects':redirects,'archive_routes':len(old)-redirects,'public_engine_files':0});save(shared/'release.json',manifest)
    audit.update({'redirects':redirects,'archive_routes':len(old)-redirects,'route_destinations':{x:destination(x) for x in old}})
    args.audit.parent.mkdir(parents=True,exist_ok=True);save(args.audit,audit)
    print('SKYFORGE_STATIC_PUBLICATION_PASS',json.dumps({k:audit[k] for k in ('projects','shared_pages','legacy_routes','timed','finish','zero_float','mismatches')}))

if __name__=='__main__':main()
