import assert from 'node:assert/strict';
import {test} from 'node:test';
import type {AnalyzeRequest} from '../../lib/contracts/index.ts';
import type {ContextAtoms} from '../../lib/server/context-generation.ts';

const modulePromise=import('../../lib/server/same-payment-events.ts').catch(()=>null);
async function mod(){const m=await modulePromise;assert.ok(m,'Same-payment event protection must exist.');return m;}
const request=(first:string,later:string,kind:AnalyzeRequest['evidence'][number]['kind']='reply'):AnalyzeRequest=>({contractVersion:'2.0.0',requestId:'same-payment-control-001',revision:2,locale:'en-HK',clarificationsUsed:0,evidence:[{id:'E1',kind:'instruction',label:'Authored synthetic source',sequence:1,text:first},{id:'E2',kind,label:'Authored synthetic source',sequence:2,text:later}]});
const fr05=request('請你轉賬港幣680元畀印刷供應商，作為下一批工作材料費。款項必須先付，工作先可以開始。','講清楚上一筆680元材料費：請你用公司支出戶口內嘅公司款項轉賬畀同一間印刷供應商。切勿把你自己嘅錢轉賬畀印刷供應商嚟解鎖同一批工作。切勿以你個人名義借私人貸款。');
const action=(operation:ContextAtoms['actions'][number]['operation'],unitIds=['E1_u1'],polarity:ContextAtoms['actions'][number]['polarity']='requested'):ContextAtoms['actions'][number]=>({unitIds,actor:'applicant',operation,polarity,recipient:'third_party'});

test('FR05 original unknown-funding payment and explicit same-payment reply produce one bounded source identity hint',async()=>{
 const m=await mod();
 assert.deepEqual(m.createSamePaymentHints(fr05),[{earlierUnitId:'E1_u1',laterUnitId:'E2_u1',amount:'680',currency:'HKD',basis:'explicit_same_payment_reference'}]);
});

test('English and Traditional Chinese same-earlier references support a hint without asserting funding or performer',async()=>{
 const m=await mod();
 const controls=[
  request('Please transfer HKD 620 to the supplier for materials.','For the same earlier HKD 620 payment, please transfer the company funds to the supplier.'),
  request('請轉賬港幣680元給供應商。','就上述同一筆680元付款，請使用公司款項轉賬。','user_note'),
 ];
 for(const r of controls){const h=m.createSamePaymentHints(r);assert.equal(h.length,1);assert.equal(h[0].earlierUnitId,'E1_u1');assert.equal(h[0].laterUnitId,'E2_u1');assert.ok(!('actor' in h[0]));assert.ok(!('resource' in h[0]));}
});

test('ambiguous earlier payments, another payment, negated identity, and differing amounts never create a same-event hint',async()=>{
 const m=await mod();
 const controls=[
  request('Please transfer HKD 680 to the supplier.','For another HKD 680 payment, use the company funds.'),
  request('Please transfer HKD 680 to the supplier.','This is not the same earlier HKD 680 payment; use the company funds.'),
  request('Please transfer HKD 680 to the supplier.','For the same earlier HKD 680 payment, transfer HKD 700 from the company account.'),
  request('請轉賬港幣680元畀供應商。','呢筆唔係上一筆680元材料費，請用公司款項。'),
  request('請轉賬港幣680元畀供應商。','另一筆680元款項，請用公司款項。'),
  request('Please transfer HKD 680 to the printer.\nPlease transfer HKD 680 to the vendor.','For the same earlier HKD 680 payment, use company funds.'),
 ];
 for(const r of controls)assert.deepEqual(m.createSamePaymentHints(r),[],r.evidence[1].text);
});

test('labels, unrelated evidence kinds, sequence ties and explicit known original funding do not qualify as a funding clarification',async()=>{
 const m=await mod();
 const labelOnly=request('Please transfer HKD 680 to the supplier.','Use the company funds for HKD 680.');labelOnly.evidence[1].label='For the same earlier payment';
 assert.deepEqual(m.createSamePaymentHints(labelOnly),[]);
 const offer=request(fr05.evidence[0].text,fr05.evidence[1].text,'offer');assert.deepEqual(m.createSamePaymentHints(offer),[]);
 const tie=structuredClone(fr05);tie.evidence[1].sequence=1;assert.deepEqual(m.createSamePaymentHints(tie),[]);
 for(const first of ['Transfer HKD 680 from your own savings to the supplier.','Transfer HKD 680 from the company account to the supplier.','Transfer the HKD 680 personal loan proceeds to the supplier.','Do not transfer HKD 680 to the supplier.']){
  assert.deepEqual(m.createSamePaymentHints(request(first,'For the same earlier HKD 680 payment, use company funds.')),[],first);
 }
});

test('FR05 accepted wrong duplicate is rejected without changing atoms; prohibitions remain separate',async()=>{
 const m=await mod(),h=m.createSamePaymentHints(fr05);
 const atoms:ContextAtoms={actions:[action('unresolved_transfer'),action('company_transfer',['E2_u1']),action('own_money_transfer_prohibition',['E2_u1'],'prohibited'),action('borrow_personally',['E2_u1'],'prohibited')],context:[]};
 const before=structuredClone(atoms);
 assert.throws(()=>m.assertNoDuplicateSamePayment(atoms,h),(e:unknown)=>!!e&&typeof e==='object'&&'errorCode' in e&&e.errorCode==='invalid_output');assert.deepEqual(atoms,before);
 const unified:ContextAtoms={actions:[action('company_transfer',['E1_u1','E2_u1']),...atoms.actions.slice(2)],context:[{unitIds:['E2_u1'],meaning:'funds_company',targets:[0]}]};
 assert.doesNotThrow(()=>m.assertNoDuplicateSamePayment(unified,h));assert.equal(unified.actions.length,3);
});

test('separate payments, different verbs, known personal funding, loan proceeds and other performers are not merged or rejected by this narrow guard',async()=>{
 const m=await mod(),h=m.createSamePaymentHints(fr05);
 const controls:ContextAtoms['actions'][]=[
  [action('unresolved_pay'),action('company_transfer',['E2_u1'])],
  [action('task_transfer'),action('company_transfer',['E2_u1'])],
  [action('transfer_loan_proceeds'),action('company_transfer',['E2_u1'])],
  [action('unresolved_transfer',['E3_u1']),action('company_transfer',['E2_u1'])],
  [{...action('unresolved_transfer'),actor:'employer'},action('company_transfer',['E2_u1'])],
  [action('unresolved_transfer'),action('company_transfer',['E2_u1'],'prohibited')],
 ];
 for(const actions of controls){const a:ContextAtoms={actions,context:[]},before=structuredClone(a);assert.doesNotThrow(()=>m.assertNoDuplicateSamePayment(a,h));assert.deepEqual(a,before);}
 assert.doesNotThrow(()=>m.assertNoDuplicateSamePayment({actions:[action('unresolved_transfer'),action('company_transfer',['E2_u1'])],context:[]},[]));
});

test('a later same-event company-funding context cannot leave its targeted original payment unresolved',async()=>{
 const m=await mod(),h=m.createSamePaymentHints(fr05);
 const atoms:ContextAtoms={actions:[action('unresolved_transfer')],context:[{unitIds:['E2_u1'],meaning:'funds_company',targets:[0]}]},before=structuredClone(atoms);
 assert.throws(()=>m.assertNoDuplicateSamePayment(atoms,h),(e:unknown)=>!!e&&typeof e==='object'&&'errorCode' in e&&e.errorCode==='invalid_output');assert.deepEqual(atoms,before);
});

test('conflicting stated funding, unbound funding and funding from another unit remain available to the independent audit',async()=>{
 const m=await mod(),h=m.createSamePaymentHints(fr05);
 const company={unitIds:['E2_u1'],meaning:'funds_company' as const,targets:[0]};
 const controls:ContextAtoms[]=[
  {actions:[action('unresolved_transfer')],context:[company,{unitIds:['E2_u1'],meaning:'funds_personal_loan',targets:[0]}]},
  {actions:[action('unresolved_transfer')],context:[company,{unitIds:['E1_u1'],meaning:'funds_own',targets:[0]}]},
  {actions:[action('unresolved_transfer')],context:[company,{unitIds:['E2_u1'],meaning:'funds_unknown',targets:[0]}]},
  {actions:[action('unresolved_transfer')],context:[{...company,targets:[]}]},
  {actions:[action('unresolved_transfer')],context:[{...company,unitIds:['E3_u1']}]},
 ];
 for(const atoms of controls){const before=structuredClone(atoms);assert.doesNotThrow(()=>m.assertNoDuplicateSamePayment(atoms,h));assert.deepEqual(atoms,before);}
});
test('known original bank-account funding and monetary statements elsewhere in the original evidence do not become an unknown-funding update hint',async()=>{
 const m=await mod();
 for(const first of ['Please transfer HKD 680 from your own bank account to the supplier.','請你從自己嘅銀行戶口轉賬港幣680元畀供應商。','請轉賬港幣680元畀供應商。\n上述款項要由你自己的錢支付。']){
  assert.deepEqual(m.createSamePaymentHints(request(first,'For the same earlier HKD 680 payment, use company funds.')),[],first);
 }
});

test('non-finite or excessively large numeric references never produce identity metadata',async()=>{
 const m=await mod(),amount='9'.repeat(80);
 assert.deepEqual(m.createSamePaymentHints(request('Please transfer HKD '+amount+' to the supplier.','For the same earlier HKD '+amount+' payment, use company funds.')),[]);
});

test('amount normalization never collapses distinct unsafe-size payments into the same anchor',async()=>{
 const m=await mod();
 assert.deepEqual(m.createSamePaymentHints(request('Please transfer HKD 9007199254740992 to the supplier.','For the same earlier HKD 9007199254740993 payment, use company funds.')),[]);
});

test('a later same-reference unit with a separate second payment does not tie that second action to the earlier event',async()=>{
 const m=await mod(),r=request('Please transfer HKD 680 to the supplier.','For the same earlier HKD 680 transfer, keep waiting. Separately transfer company funds to another supplier.');
 assert.deepEqual(m.createSamePaymentHints(r),[]);
});

test('explicit personal bank-account and own-name borrowing proceeds exclude an unknown-source payment hint',async()=>{
 const m=await mod();
 for(const first of ['Please transfer HKD 680 from your personal bank account to the supplier.','Borrow HKD 680 in your name and transfer the proceeds to the supplier.']){
  assert.deepEqual(m.createSamePaymentHints(request(first,'For the same earlier HKD 680 payment, use company funds.')),[],first);
 }
});

test('unsupported numeric syntax, zero, and more than twelve integer digits do not become payment hints',async()=>{
 const m=await mod();
 for(const amount of ['1000000000000','-680','- 680','1e5','680.333','1,23','0']){
  const r=request('Please transfer HKD '+amount+' to the supplier.','For the same earlier HKD '+amount+' payment, use company funds.');
  assert.deepEqual(m.createSamePaymentHints(r),[],amount);
 }
});

test('valid decimal and grouped HKD amounts normalize exactly without floating-point rounding',async()=>{
 const m=await mod(),r=request('Please transfer HK$1,680.50 to the supplier.','For the same earlier HKD 1680.5 payment, use company funds.');
 assert.deepEqual(m.createSamePaymentHints(r),[{earlierUnitId:'E1_u1',laterUnitId:'E2_u1',amount:'1680.5',currency:'HKD',basis:'explicit_same_payment_reference'}]);
});

test('later cross-unit corrections of payment identity or currency suppress all same-payment hints from that evidence',async()=>{
 const m=await mod();
 const controls=[
  request('Please transfer HKD 680 to the supplier for materials.','For the same earlier HKD 680 payment, use company funds.\nCorrection: this refers to another payment, not the original one.'),
  request('請轉賬港幣680元畀供應商。','關於上一筆680元付款。\n其實這筆是人民幣付款，並不是港幣。'),
 ];
 for(const r of controls)assert.deepEqual(m.createSamePaymentHints(r),[],r.evidence[1].text);
});
