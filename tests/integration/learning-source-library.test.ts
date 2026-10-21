import assert from 'node:assert/strict';
import {test} from 'node:test';
import * as published from '../../frontend/workspace/published-cases';
import data from '../../knowledge/published-cases.json';
import content from '../../knowledge/library.json';
import en from '../../locales/en-HK.json';
import zh from '../../locales/zh-Hant-HK.json';
import {loadReferenceLibrary} from '../../lib/knowledge/index';
import {retrieveReferences} from '../../lib/research/retrieval';
import {safeReferenceUrl} from '../../lib/research/contracts';
const library=loadReferenceLibrary(content,{'en-HK':en,'zh-Hant-HK':zh});

test('public library has 24 distinct editorial records, three truthful kinds and five populated existing categories',()=>{
 assert.equal(data.cases.length,24);
 assert.equal(new Set(data.cases.map(c=>c.id)).size,24);
 assert.deepEqual([...new Set(data.cases.map(c=>c.kind))].sort(),['company_practice','official_guidance','reported_case']);
 assert.deepEqual([...new Set(data.cases.map(c=>c.category))].sort(),['Accounts','Borrowing','Context','Next steps','Payments']);
 for(const item of data.cases){assert.equal(item.transcriptAvailable,false);assert.ok(item.limitation.length>=30);assert.ok(item.stages.length>=2&&item.stages.length<=4);assert.ok(safeReferenceUrl(item.source.url,'knowledge'),item.id);assert.ok(item.relatedTopics.every(id=>content.cards.some(card=>card.id===id)));}
 assert.equal(content.cards.length,7,'Public source expansion does not enlarge the automated core or fabricate human approval');
});

test('local card search covers reordered words, traditional/simplified Chinese, source details and category combinations without an API',()=>{
 const search=(published as unknown as {searchPublishedCases?: (query:string,category?:string)=>typeof data.cases}).searchPublishedCases;
 assert.equal(typeof search,'function');
 assert.ok(search!('佣金').some(c=>c.id==='P_AGENCY_COMMISSION'));
 assert.ok(search!('身份证').some(c=>c.id==='P_ID_COPY_EARLY'));
 assert.ok(search!('cheque fake').some(c=>c.id==='P_FAKE_CHEQUE'));
 assert.ok(search!('bank account control','Accounts').length>0);
 assert.equal(search!('佣金','Accounts').length,0);
 assert.equal(search!('sourdough baking').length,0);
 assert.equal(search!('  ').length,24);
});

test('company policies, official guidance and published cases have distinct card labels',()=>{
 const label=(published as unknown as {publishedKindLabel?: (kind:string)=>string}).publishedKindLabel;
 assert.equal(typeof label,'function');
 assert.equal(label!('official_guidance'),'Official guidance');
 assert.equal(label!('company_practice'),'Company practice');
 assert.equal(label!('reported_case'),'Reported case');
});

test('live knowledge selection excludes editorial drafts before the top-three cutoff',()=>{
 const retrieve=retrieveReferences as unknown as (l:typeof library,q:string,loc:'en-HK',ids:string[],approvedOnly?:boolean)=>ReturnType<typeof retrieveReferences>;
 const refs=retrieve(library,'internship freshman remote commission early payments','en-HK',[],true);
 assert.ok(refs.length>0);
 assert.ok(refs.every(r=>r.reviewStatus==='approved'&&r.contentType==='team_synthesis'));
 const borrowing=retrieve(library,'Why is a company repayment promise not company funding for my personal loan?','en-HK',['K_PERSONAL_BORROWING'],true);
 assert.ok(borrowing.some(r=>r.id==='K_PERSONAL_BORROWING'));
 assert.ok(borrowing.length<=3);
});

test('published source IDs do not alias unrelated trailing-slash URLs',()=>{
 const refs=retrieveReferences(library,'A talent offer becomes a purchase modelling performance auditions beauty services deposits','en-HK');
 const item=refs.find(r=>r.id==='P_TALENT_SCOUT');assert.ok(item);assert.deepEqual(item.sourceIds,['P_TALENT_SCOUT']);
});

test('international comparisons use primary FDIC and FBI records instead of unavailable FTC pages',()=>{
 assert.equal(data.cases.find(c=>c.id==='P_FAKE_CHEQUE')?.source.url,'https://archive.fdic.gov/view/fdic/11771/fdic_11771_DS1.pdf');
 assert.equal(data.cases.find(c=>c.id==='P_TASK_TOP_UP')?.source.url,'https://www.ic3.gov/PSA/2024/PSA240604');
 assert.ok(data.cases.every(c=>new URL(c.source.url).hostname!=='consumer.ftc.gov'));
});
