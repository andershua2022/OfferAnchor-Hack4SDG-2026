import assert from 'node:assert/strict';
import {test} from 'node:test';
import content from '../../knowledge/library.json';
import published from '../../knowledge/published-cases.json';
import en from '../../locales/en-HK.json';
import zh from '../../locales/zh-Hant-HK.json';
import {loadReferenceLibrary} from '../../lib/knowledge/index';
import {retrieveReferences} from '../../lib/research/retrieval';
import {sourceCheckedReference} from '../../lib/research/source-passages';
const library=loadReferenceLibrary(content,{'en-HK':en,'zh-Hant-HK':zh});
const questions:[string,string,string][]=[
 ['P_STUDENT_TASK','Why can an internship with early task commissions still require suspicious personal payments?','實習招聘先給任務佣金，後來要求付款，為何仍要核查？'],
 ['P_FINANCING_PRESSURE','What was the clerical company financing loan case involving a bank prosecution threat?','文員被要求個人貸款幫公司融資，再遭銀行追究威嚇，有甚麼公開案例？'],
 ['P_ADMIN_LOAN','Does a company promise to repay my personal loan establish company funding?','公司承諾代還個人貸款，是否等於公司已提供資金？'],
 ['P_CONSTRUCTION_DATA','What did the construction-worker alert say about identity documents and qualification photos?','建築散工招聘要求身份證和資格證件相片，有甚麼官方警示？'],
 ['P_HKEX_PAYROLL','Does HKEX list a payee name and bank account number after an accepted offer?','港交所在接受聘用後，會收取出糧戶口號碼嗎？'],
 ['P_TEEKAY_POLICY','Does Teekay charge applicants a fee before a formal offer?','Teekay 在正式聘用前會向申請人收費嗎？'],
 ['P_TRAINING_FEE','What if a training course fee is required to be eligible for the post?','面試要求先付培訓課程費，才符合獲聘資格，應留意甚麼？'],
 ['P_TALENT_SCOUT','A modelling audition requires a deposit and a beauty-service purchase. Is there guidance?','模特兒試鏡要求美容課程及按金，勞工處有甚麼指引？'],
 ['P_MONEY_MULE','What is the risk when a job asks me to lend or rent my bank account?','工作要求借出或出租銀行戶口，有甚麼公開警示？'],
 ['P_BANK_LOGIN','Is a bank login OTP ordinary payroll information?','出糧要求銀行登入驗證碼，與收款戶口資料有何分別？'],
 ['P_BLIND_CV','What should an anonymous recruitment advertisement collecting my CV identify?','匿名招聘廣告直接收集履歷，應交代誰收取資料？'],
 ['P_ID_COPY_EARLY','Why collect identity-card copies before I accept employment?','接受聘用之前，為何要求身份證副本？'],
 ['P_ROLE_SWITCH','A clerical job application turns into a different company sales role. Is there a case?','文員申請在面試時變成另一公司的銷售職位，有甚麼個案？'],
 ['P_CV_MISDIRECT','What happened when CV applications were misdirected to the wrong companies?','招聘平台把履歷誤送到其他公司，曾有甚麼資料事故？'],
 ['P_FAKE_CHEQUE','What if an employer sends a cheque and asks me to forward money for activation?','僱主寄支票後，要我轉款支付帳戶啟用費，有甚麼比較資料？'],
 ['P_TASK_TOP_UP','Do remote optimisation tasks requiring cryptocurrency to unlock earnings appear in an FBI alert?','遙距優化任務要求先付加密貨幣解鎖收益，有甚麼警示？'],
 ['P_HAYS_FEES','Does Hays charge a recruitment fee to jobseekers?','Hays 會向求職者收取招聘費嗎？'],
 ['P_CATHAY_DATA','What does Cathay say about recruitment personal-data purposes and post-offer use?','國泰招聘私隱聲明如何說明資料用途及接受聘用後的處理？'],
 ['P_AGENCY_COMMISSION','What commission can a Hong Kong employment agency charge after placement?','香港職業介紹所成功介紹工作後，可收取哪些佣金？'],
 ['P_COMPANY_REGISTER','Does a registered company record establish the authority of a recruitment sender?','公司註冊資料是否代表招聘發件人已獲授權？'],
 ['P_SECONDARY_ADCC','A person claiming to be an ADCC officer on WhatsApp knows earlier scam details. Is that proof?','有人在 WhatsApp 自稱反詐騙中心人員，知道早前案情就能證明身份嗎？'],
 ['P_BANK_CONTACT','I already shared sensitive bank information. How should I find the bank contact?','我已經洩露銀行敏感資料，應如何獨立找銀行聯絡方法？'],
 ['P_REPORT_EVIDENCE','How should I preserve evidence and attachments before submitting a police report?','向警方報案前應如何保留證據及準備附件？'],
 ['P_PYRAMID_JOIN','A salaried job requires buying products and recruiting more members to join a scheme. What guidance applies?','高薪工作要求買產品並招募成員加入計劃，有甚麼求職警示？'],
];
for(const [id,english,chinese] of questions)for(const [locale,question] of [['en-HK',english],['zh-Hant-HK',chinese]] as const)test(`audited ${id} is usable for a specific ${locale} question`,()=>{
 const refs=retrieveReferences(library,question,locale,[],true,true);
 const found=refs.find(r=>r.id===id);assert.ok(found,`${id} not among ${refs.map(r=>r.id)}`);
 assert.equal(found.reviewStatus,'source_checked');assert.ok(refs.length<=3);
});
test('a source-content drift cannot retain its audited eligibility',()=>{
 const original=published.cases.find(c=>c.id==='P_HAYS_FEES')!;
 assert.ok(sourceCheckedReference(original,'en-HK'));
 for(const mutate of [(c:typeof original)=>{c.summary='A new unsupported fee is required.';},(c:typeof original)=>{c.source.url='https://www.hays.com.hk/another-policy';},(c:typeof original)=>{c.limitation='The employer is guaranteed safe.';}]){const changed=structuredClone(original);mutate(changed);assert.equal(sourceCheckedReference(changed,'en-HK'),null);}
});
