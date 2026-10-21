import '../analysis/server-guard.ts';
import type {AnalyzeRequest} from '../contracts/index.ts';
import {requireContract} from '../contracts/errors.ts';
import {COMPACT_OPERATIONS} from './compact-generation.ts';
import type {ContextAtoms} from './context-generation.ts';
import {createSourceUnitCatalogue,type SourceUnit} from './source-unit-generation.ts';

/** A bounded source-reference hint. It does not establish identity, funds or authority. */
export interface SamePaymentHint{
 earlierUnitId:string;
 laterUnitId:string;
 amount:string;
 currency:'HKD';
 basis:'explicit_same_payment_reference';
}
const currentKinds=new Set(['instruction','reply','user_note']);
const payment=/\b(?:transfer|pay|payment)\b|轉賬|轉帳|轉账|付款|支付/iu;
const negativeOriginal=/\b(?:do\s+not|don['’]t|must\s+not|never)\b|禁止|切勿|不要|唔好|不應|不应/iu;
const knownOriginalFunds=/\b(?:your\s+(?:(?:own|personal)\s+)?(?:money|funds|savings|(?:bank\s+)?account)|own\s+(?:money|funds|savings|(?:bank\s+)?account)|company\s+(?:expense\s+)?(?:funds|money|account)|personal\s+(?:loan|borrowing|(?:bank\s+)?account)|loan\s+proceeds|borrow\b[^.!?\n]{0,60}\b(?:in\s+your\s+name|proceeds))\b|自己.{0,8}(?:錢|钱|資金|资金|戶口|户口|帳戶|账户)|個人.{0,4}(?:資金|资金|借|貸)|个人.{0,4}(?:资金|借|贷)|公司.{0,7}(?:款項|款项|資金|资金|戶口|户口|帳戶|账户)|貸款所得|贷款所得/iu;
const sameReference=/\bsame\s+(?:earlier\s+)?(?:[^.!?\n]|\.(?=\d)){0,45}\b(?:payment|transfer)\b|\b(?:that|the)\s+earlier\s+(?:[^.!?\n]|\.(?=\d)){0,30}\b(?:payment|transfer)\b|上一筆|上一笔|上述同一筆|上述同一笔|先前嗰筆|先前那筆|先前那笔/iu;
const differentReference=/\bnot\s+(?:the\s+)?same\b|\b(?:different|another|separate|other)\b[^.!?\n]{0,35}\b(?:payment|transfer)\b|\b(?:separately|additional(?:ly)?|second|another)\b[^.!?\n]{0,55}\b(?:transfer|pay|payment|supplier|vendor|printer)\b|\b(?:transfer|pay)\b[^.!?\n]{0,35}\b(?:another|different|additional)\s+(?:supplier|vendor|printer)\b|(?:唔係|不是|並非|并非).{0,10}(?:同一筆|同一笔|上一筆|上一笔)|另一筆|另一笔|不同.{0,4}(?:付款|轉賬|转账|轉帳)|另外|另行|此外|額外|额外|另一間|另一家/iu;
const foreignCurrency=/\b(?:USD|CNY|RMB|EUR|GBP)\b|US\$|人民幣|人民币|美元|歐元|欧元|英鎊|英镑/iu;
const signedAmount=/(?:HK\$|HKD|港幣|港币)\s*[+−-]|[+−-]\s*(?:(?:HK\$|HKD|港幣|港币)\s*)?\d/iu;
const amountPattern=/(?:(?:(?<![\p{L}\p{N}_])(?:HK\$|HKD)\s*|(?:港幣|港币)\s*)((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?)\s*(?:元)?|(?<![\dA-Za-z_,.+−-])((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?)\s*元)(?![\dA-Za-z_,]|\.\d)/giu;
function amounts(text:string):{amount:string;explicitHKD:boolean}[]{
 if(signedAmount.test(text))return [];
 const parsed:{amount:string;explicitHKD:boolean}[]=[];
 for(const match of text.matchAll(amountPattern)){
  const [rawInteger,fraction='']=(match[1]??match[2]).replaceAll(',','').split('.');
  if(rawInteger.length>12)return [];
  const integer=rawInteger.replace(/^0+(?=\d)/u,''),cents=fraction.replace(/0+$/u,'');
  if(integer==='0'&&!cents)return [];
  parsed.push({amount:integer+(cents?'.'+cents:''),explicitHKD:match[1]!==undefined});
 }
 return parsed;
}
/** Only an explicit, uniquely anchored HKD reference is offered. Ambiguity yields no hint. */
export function createSamePaymentHints(request:AnalyzeRequest,catalogue=createSourceUnitCatalogue(request)):SamePaymentHint[]{
 const evidence=new Map(request.evidence.map(e=>[e.id,e]));
 const eligible=(unit:SourceUnit)=>{const source=evidence.get(unit.evidenceId);return !!source&&currentKinds.has(source.kind)&&source.text.slice(unit.start,unit.end)===unit.text;};
 const units=catalogue.filter(eligible),hints:SamePaymentHint[]=[];
 for(const later of units){
  const laterEvidence=evidence.get(later.evidenceId)!;
  // A correction elsewhere in this source item invalidates the unit-only identity hint.
  if(!sameReference.test(later.text)||differentReference.test(laterEvidence.text)||foreignCurrency.test(laterEvidence.text))continue;
  const laterAmounts=amounts(later.text);if(laterAmounts.length!==1)continue;
  const amount=laterAmounts[0].amount,laterSequence=evidence.get(later.evidenceId)!.sequence;
  const anchors=units.filter(earlier=>{
   if(evidence.get(earlier.evidenceId)!.sequence>=laterSequence||!payment.test(earlier.text)||foreignCurrency.test(earlier.text))return false;
   const earlierAmounts=amounts(earlier.text);
   return earlierAmounts.length===1&&earlierAmounts[0].explicitHKD&&earlierAmounts[0].amount===amount;
  });
  if(anchors.length!==1)continue;
  const earlier=anchors[0];
  // A later assertion must not silently replace a stated original source of funds or prohibition.
  if(negativeOriginal.test(earlier.text)||knownOriginalFunds.test(evidence.get(earlier.evidenceId)!.text))continue;
  hints.push({earlierUnitId:earlier.id,laterUnitId:later.id,amount,currency:'HKD',basis:'explicit_same_payment_reference'});
  if(hints.length===4)break;
 }
 return hints;
}
/** Reject only the observed duplicate. No rows are merged, deleted or relabeled. */
export function assertNoDuplicateSamePayment(atoms:ContextAtoms,hints:readonly SamePaymentHint[]):void{
 const positive=(action:ContextAtoms['actions'][number])=>action.actor==='applicant'&&(action.polarity==='requested'||action.polarity==='uncertain');
 for(const hint of hints){
  for(let earlierIndex=0;earlierIndex<atoms.actions.length;earlierIndex++){
   const earlier=atoms.actions[earlierIndex],originalTuple=COMPACT_OPERATIONS[earlier.operation];
   if(!positive(earlier)||originalTuple.resource!=='unknown'||!['pay','transfer'].includes(originalTuple.verb)||!earlier.unitIds.includes(hint.earlierUnitId))continue;
   const companyContext=atoms.context.some(context=>context.meaning==='funds_company'&&context.targets.includes(earlierIndex)&&context.unitIds.includes(hint.laterUnitId));
   const conflicts=atoms.context.some(context=>['funds_own','funds_personal_loan','funds_unknown'].includes(context.meaning)&&'targets' in context&&context.targets.includes(earlierIndex));
   // Reject a stale unresolved tuple only when the model itself binds compatible company funding.
   // Conflicting assertions remain intact for the existing contradiction policy and source audit.
   requireContract(!companyContext||conflicts,'invalid_output','contract');
   for(let laterIndex=0;laterIndex<atoms.actions.length;laterIndex++){
    if(laterIndex===earlierIndex)continue;
    const later=atoms.actions[laterIndex],laterTuple=COMPACT_OPERATIONS[later.operation];
    const duplicate=positive(later)&&laterTuple.resource==='company_money'&&laterTuple.verb===originalTuple.verb&&later.unitIds.includes(hint.laterUnitId);
    requireContract(!duplicate,'invalid_output','contract');
   }
  }
 }
}
