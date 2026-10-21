import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PROMPT_VERSION,SYSTEM_PROMPT} from '../../lib/analysis/index';
import {CANDIDATE229_PROMPT_VERSION,CANDIDATE229_SYSTEM_PROMPT} from '../../lib/analysis/prompt-candidate-v2.29';
test('current product entry uses the catalogued source units with atomic financial/context facts, bounded recipient vocabulary and source audit generation profile',()=>{assert.equal(PROMPT_VERSION,CANDIDATE229_PROMPT_VERSION);assert.equal(SYSTEM_PROMPT,CANDIDATE229_SYSTEM_PROMPT);});

import {readFileSync} from 'node:fs';
import {validateAnalyzeResponse} from '../../lib/contracts/index';
test('response boundary accepts the declared prompt revision and rejects unknown generation profiles',()=>{
 const request=JSON.parse(readFileSync('examples/request-personal-loan.json','utf8')),response=JSON.parse(readFileSync('examples/response-personal-loan.json','utf8'));response.mode='live';response.provenance.modelId='synthetic_generation_boundary';response.provenance.promptVersion='extract-v2.29';
 assert.doesNotThrow(()=>validateAnalyzeResponse(response,request,'live'));
 response.provenance.promptVersion='extract-v99.99';assert.throws(()=>validateAnalyzeResponse(response,request,'live'));
});
