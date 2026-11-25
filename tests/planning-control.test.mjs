import test from "node:test";
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {scheduleNetwork} from "../src/kernel/cpm.mjs";
const a=(id,duration,start="R+0",finish="R+"+duration)=>({id,duration,unit:"workday",start,finish});
const r=(from,to,type="FS",lag=0,basis="workdays")=>({from,to,type,lag,basis});
const run=(activities,relationships)=>JSON.parse(execFileSync("python3",["scripts/planning-control.py"],{input:JSON.stringify({activities,relationships}),encoding:"utf8"}));
test("Python planning diagnostic agrees with hand-calculated FS and float",()=>{
 const x=run([a("A",3),a("B",2),a("C",1)],[r("A","B")]);
 assert.equal(x.scenario.finish,5);
 assert.deepEqual(x.scenario.activities.map(a=>[a.id,a.total_float]).sort(),[["A",0],["B",0],["C",4]]);
 assert.equal(x.approved_critical_path,false);
});
test("Python handles all four dependency types and matches independent CPM",()=>{
 const acts=[a("A",5),a("B",3),a("C",4),a("D",2),a("E",1)];
 const rels=[r("A","B","SS",2),r("A","C","FF",1),r("B","D","FS"),r("C","E","SF",1)];
 const x=run(acts,rels),y=scheduleNetwork({activities:acts,relationships:rels.map(r=>({predecessor:r.from,successor:r.to,type:r.type,lag:r.lag}))});
 assert.equal(x.scenario.finish,y.project.early_finish);
 for(const p of x.scenario.activities){const q=y.activities.find(a=>a.id===p.id);assert.equal(p.early_start,q.es);assert.equal(p.total_float,q.total_float);}
});
test("Mixed elapsed lag and relative date-span mismatch are not silently converted",()=>{
 const x=run([a("A",2,"R+0","R+3"),a("B",3)],[r("A","B","FS",1,"elapsed days")]);
 assert.equal(x.relative_span_mismatches,1);assert.equal(x.non_workday_nonzero_lags,1);assert.equal(x.scenario.state,"HELD");assert.equal(x.scenario.finish,null);
});
test("Missing activities and cyclic networks are held",()=>{
 assert.equal(run([],[]).scenario.state,"HELD");const x=run([a("A",1),a("B",1)],[r("A","B"),r("B","A")]);assert.equal(x.cycle,true);assert.equal(x.scenario.state,"HELD");
});
