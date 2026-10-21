import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
const manifest=JSON.parse(readFileSync('publication-manifest.json','utf8'));

test('public kit retains exact published core and nonvisual adapter bytes without production visual assets or private configuration',()=>{
 const entries=Object.entries(manifest.unchangedFunctionalFiles) as [string,string][];assert.equal(createHash('sha256').update(JSON.stringify(entries.sort(([a],[b])=>a<b?-1:a>b?1:0))).digest('hex'),'b27d6b8b77fd191d02798d50b871ad16619cc9cc7eea47bb6b94a1c5a4c53d52');
 for(const [path,hash]of entries)assert.equal(createHash('sha256').update(readFileSync(path)).digest('hex'),hash,path);
 for(const path of ['public/landing','public/brand','public/favicon.svg','public/workspace/workspace.css','public/workspace/workspace-refresh.css','frontend/workspace/app.tsx','app/login/login.css','.env.local','.vercel'])assert.equal(existsSync(path),false,path);
 const walk=(dir:string):string[]=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(dir,e.name)):[join(dir,e.name)]);
 for(const path of walk('public'))assert.ok(!/\.(?:svg|png|jpe?g|gif|webp|ttf|woff2?|css)$/i.test(path),path);
 assert.equal(manifest.productionModified,false);assert.equal(manifest.pendingFinalsCodeIncluded,false);
});

test('public nonvisual integration explicitly declines proprietary visual inspection rather than reporting a pass',async()=>{
 const tool=await import('../../tools/check-team-integration.mjs');const result=tool.inspectDesignFlowIntake();assert.equal(result.checked,false);assert.equal(result.status,'excluded_from_public_review_kit');
 const r=tool.inspectTeamIntegration();assert.equal(r.DesignFlowIntake.checked,false);assert.equal(r.sourceContentApproval,true);assert.equal(r.modelCalls,0);assert.equal(r.CSAppAcceptance,false);
});
