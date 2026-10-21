import assert from 'node:assert/strict';
import {test} from 'node:test';
import type {AnalyzeRequest,ProviderExtraction} from '../../lib/contracts/index.ts';
import {ContractBoundaryError} from '../../lib/contracts/errors.ts';
import {createSourceUnitCatalogue} from '../../lib/server/source-unit-generation.ts';
import type {ContextAtoms} from '../../lib/server/context-generation.ts';
import * as roles from '../../lib/server/source-role-constraints.ts';

type Recipient=ProviderExtraction['actions'][number]['recipient'];
const request=(texts:string[],labels:string[]=[]):AnalyzeRequest=>({contractVersion:'2.0.0',requestId:'role-repair-offline-01',revision:1,locale:'en-HK',clarificationsUsed:0,evidence:texts.map((text,index)=>({id:'E'+(index+1),kind:'instruction',label:labels[index]??'Synthetic role-repair control',sequence:index+1,text}))});
const atoms=(recipient:Recipient,unitIds=['E1_u1']):ContextAtoms=>({actions:[{unitIds,actor:'applicant',operation:'share_payroll_details',polarity:'requested',recipient}],context:[]});
const capabilities=(r:AnalyzeRequest,catalogue=createSourceUnitCatalogue(r))=>roles.sourceRecipientRoleCapabilities(r,catalogue);

test('FR06 reproduced: explicit our Human Resources department permits a source-bound employer receiver',()=>{
 const r=request(['For payroll, please send your account holder name, bank name and account number to our Human Resources department. Do not send a bank login OTP; it is not required for payroll.']);
 assert.deepEqual(roles.sourceRecipientRoles(r),['unknown','employer']);
 const resolved=roles.resolveRoleConstrainedContext(JSON.stringify(atoms('employer')),r);
 assert.equal(resolved.extraction.actions[0].recipient,'employer');
 assert.equal(resolved.extraction.actions[0].mechanism,'payroll_information');
});

test('definite employer HR affiliations support bounded English and Chinese paraphrases',()=>{
 for(const receiver of ['our Human Resources department','Our HR department','the company HR department',"the company’s human resources team",'the company\'s HR office','本公司人事部','本公司的人力資源部','本企业人力资源部','本企業人事部']){
  const r=request(['Send the payroll account details to '+receiver+'.']);
  assert.deepEqual(roles.sourceRecipientRoles(r),['unknown','employer'],receiver);
  assert.doesNotThrow(()=>roles.resolveRoleConstrainedContext(JSON.stringify(atoms('employer')),r),receiver);
 }
});

test('generic HR, arbitrary companies and external HR suppliers never establish employer affiliation',()=>{
 for(const receiver of ['HR','the HR department','the Human Resources department','a company','the hiring company payroll department','our HR supplier','our outsourced Human Resources department','a third party HR supplier','third-party Human Resources department','αour HR department','our Human Resources departmental supplier','人事部','外判人力資源服務','某公司人事部']){
  const r=request(['Send account details to '+receiver+'.']);
  assert.ok(!roles.sourceRecipientRoles(r).includes('employer'),receiver);
 }
});

test('per-unit capabilities use the same role vocabulary, always retaining unknown without source-label leakage',()=>{
 const r=request(['Send payroll details to our Human Resources department.','Send the documents to us.','The supplier will receive the sample pack.'],['Supplier recruiter applicant','Our HR department','Employer']);
 const original=structuredClone(r),catalogue=createSourceUnitCatalogue(r),rows=capabilities(r,catalogue);
 assert.deepEqual(rows,[{unitId:'E1_u1',allowedRecipients:['unknown','employer']},{unitId:'E2_u1',allowedRecipients:['unknown']},{unitId:'E3_u1',allowedRecipients:['unknown','third_party']}]);
 for(const row of rows)assert.ok(row.allowedRecipients.length&&row.allowedRecipients[0]==='unknown');
 const union=[...new Set(rows.flatMap(row=>row.allowedRecipients))];
 assert.deepEqual(new Set(union),new Set(roles.sourceRecipientRoles(r)));
 assert.deepEqual(r,original);
});

test('HR marker in another evidence unit cannot justify this action recipient',()=>{
 const r=request(['Our HR department handles administration.','Send payroll details to us.']);
 assert.throws(()=>roles.resolveRoleConstrainedContext(JSON.stringify(atoms('employer',['E2_u1'])),r),error=>error instanceof ContractBoundaryError&&error.errorCode==='invalid_output');
 assert.doesNotThrow(()=>roles.resolveRoleConstrainedContext(JSON.stringify(atoms('unknown',['E2_u1'])),r));
});

test('unit capability metadata rejects a forged catalogue text instead of promoting its role',()=>{
 const r=request(['Send payroll details to us.']),catalogue=createSourceUnitCatalogue(r);
 catalogue[0]={...catalogue[0],text:'Send payroll details to our HR department.'};
 assert.throws(()=>capabilities(r,catalogue),error=>error instanceof ContractBoundaryError&&error.errorCode==='invalid_citation');
});

test('capabilities are necessary vocabulary availability only: unknown is still admissible and binding needs audit',()=>{
 const r=request(['Our Human Resources department hired an external supplier; send payroll details to that supplier.']);
 assert.deepEqual(capabilities(r)[0].allowedRecipients,['unknown','employer','third_party']);
 assert.doesNotThrow(()=>roles.resolveRoleConstrainedContext(JSON.stringify(atoms('unknown')),r));
 // The source cooccurrence filter does not certify employer as receiver. Independent semantic audit must reject that binding.
 assert.doesNotThrow(()=>roles.resolveRoleConstrainedContext(JSON.stringify(atoms('employer')),r));
});

test('empty evidence and repeated calls never produce empty enums or shared mutable role arrays',()=>{
 assert.deepEqual(roles.sourceRecipientRoles(request([])),['unknown']);
 assert.deepEqual(capabilities(request([])),[]);
 const r=request(['Send payroll details to our HR department.']),first=capabilities(r);
 first[0].allowedRecipients.splice(0);
 assert.deepEqual(capabilities(r),[{unitId:'E1_u1',allowedRecipients:['unknown','employer']}]);
});

test('ambiguous printer and task-platform affiliations stay unknown rather than matching frozen development labels',()=>{
 for(const receiver of ['the printer','the task platform']){
  const r=request(['Transfer HKD 620 from the company expense account to '+receiver+'.']);
  assert.deepEqual(roles.sourceRecipientRoles(r),['unknown'],receiver);
  assert.deepEqual(capabilities(r),[{unitId:'E1_u1',allowedRecipients:['unknown']}],receiver);
 }
 const separated=request(['Send details to our Human','Resources department.']);
 assert.deepEqual(roles.sourceRecipientRoles(separated),['unknown']);
 assert.ok(capabilities(separated).every(row=>row.allowedRecipients.length===1));
});