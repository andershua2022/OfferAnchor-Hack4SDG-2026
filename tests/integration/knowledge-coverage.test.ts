import assert from 'node:assert/strict';
import {test} from 'node:test';
import {loadReferenceLibrary} from '../../lib/knowledge/index';
import {retrieveReferences} from '../../lib/research/retrieval';
import content from '../../knowledge/library.json';
import en from '../../locales/en-HK.json';
import zh from '../../locales/zh-Hant-HK.json';
const library=loadReferenceLibrary(content,{'en-HK':en,'zh-Hant-HK':zh});
const cases:[string,string,string,string][]=[
 ['K_TASK_RECHARGE','Must I recharge before unlocking tasks?','任務開始前要充值嗎？','任务开始前要充值吗？'],
 ['K_PERSONAL_BORROWING','Why is a loan in my name still my debt?','招聘要求個人貸款，公司承諾還款','招聘要求个人贷款，公司承诺还款'],
 ['K_COMPANY_PAID','The company pays directly and prohibits personal payment.','公司直接付款，禁止個人墊付','公司直接付款，禁止个人垫付'],
 ['K_PAYROLL','Can payroll request my password or OTP?','出糧要提供銀行密碼和驗證碼嗎？','发工资要提供银行密码和验证码吗？'],
 ['K_UNKNOWN','The payer is not specified. Who pays?','沒有說明誰付款，付款人不明','没有说明谁付款，付款人不明'],
 ['K_ALREADY_ACTED','I already transferred money. What next?','我已轉賬，下一步怎麼辦？','我已转账，下一步怎么办？'],
 ['K_ORDINARY_EXPENSE','Is this a normal transport expense reimbursement?','正常車費報銷和交通開支','正常车费报销和交通开支']
];
for(const [id,...questions] of cases)for(const [i,question] of questions.entries())test(`knowledge retrieves reviewed ${id} from ${['English','Traditional Chinese','Simplified Chinese'][i]}`,()=>{
 const refs=retrieveReferences(library,question,i===0?'en-HK':'zh-Hant-HK');assert.ok(refs.some(r=>r.id===id),`Missing ${id}: ${refs.map(r=>r.id)}`);assert.ok(refs.length<=3);assert.equal(refs.find(r=>r.id===id)?.reviewStatus,'approved');
});
test('knowledge has seven approved topics, four approved routes and nine public sources, not universal coverage',()=>{assert.equal(library.cards.length,7);assert.equal(library.routes.length,4);assert.equal(library.sources.length,9);assert.ok([...library.cards,...library.routes].every(c=>c.approvalStatus==='approved'));assert.deepEqual(retrieveReferences(library,'How to bake sourdough bread?','en-HK'),[]);});
