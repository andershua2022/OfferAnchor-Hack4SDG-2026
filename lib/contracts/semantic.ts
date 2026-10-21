import type {
  AnalyzeRequest,
  CanonicalExtraction,
  Action,
} from './generated.ts';
import { matchesSchema, schemas, isRecord } from './schema.ts';
import { requireContract } from './errors.ts';
export function potentiallyFinancial(a: Action): boolean {
  return (
    [
      'borrow',
      'transfer',
      'pay',
      'share_otp',
      'share_account_details',
    ].includes(a.verb) && ['requested', 'uncertain'].includes(a.polarity)
  );
}
export function needsScopeClarification(a: Action): boolean {
  return (
    potentiallyFinancial(a) &&
    (a.actor === 'unknown' ||
      a.resource === 'unknown' ||
      a.mechanism === 'unclear')
  );
}
export function validateCitationShapes(
  value: unknown,
  kind: 'raw' | 'canonical',
): void {
  if (!isRecord(value)) return;
  const schema =
    schemas[
      kind === 'raw'
        ? 'provider-extraction.schema.json'
        : 'extraction.schema.json'
    ];
  for (const collection of ['actions', 'claims']) {
    const rows = value[collection];
    if (!Array.isArray(rows)) continue;
    const citationSchema =
      schema.properties![collection].items!.properties!.citations!;
    for (const row of rows)
      if (isRecord(row))
        requireContract(
          matchesSchema(row.citations, citationSchema),
          'invalid_citation', 'citation_shape',
        );
  }
}
export function validateCanonicalExtraction(
  value: unknown,
  request: AnalyzeRequest,
): CanonicalExtraction {
  validateCitationShapes(value, 'canonical');
  requireContract(matchesSchema(value, schemas['extraction.schema.json']), 'invalid_output', 'canonical_schema');
  const ex = value as CanonicalExtraction;
  const evidence = new Map(request.evidence.map((e) => [e.id, e]));
  const actions = new Map(ex.actions.map((a) => [a.id, a]));
  for (const rows of Object.values(ex))
    requireContract(new Set(rows.map((row) => row.id)).size === rows.length, 'invalid_output', 'ids');
  let count = 0;
  for (const item of [...ex.actions, ...ex.claims])
    for (const cite of item.citations) {
      const source = evidence.get(cite.evidenceId);
      requireContract(
        source &&
          cite.start >= 0 &&
          cite.start < cite.end &&
          cite.end <= source.text.length &&
          source.text.slice(cite.start, cite.end) === cite.quote,
        'invalid_citation', 'citation_match',
      );
      count++;
    }
  requireContract(count <= 20, 'invalid_output', 'citation_limit');
  const items = new Map(
    [...ex.actions, ...ex.claims].map((item) => [item.id, item]),
  );
  const order = (id: string) => {
    const item = items.get(id);
    requireContract(item, 'invalid_output', 'reference');
    return Math.min(
      ...item.citations.map((c) => evidence.get(c.evidenceId)!.sequence),
    );
  };
  for (const comparison of ex.comparisons) {
    requireContract(
      ex.claims.some((c) => c.id === comparison.earlierClaimId) &&
        actions.has(comparison.laterActionId),
      'invalid_output', 'reference',
    );
    requireContract(
      order(comparison.earlierClaimId) < order(comparison.laterActionId),
      'invalid_output', 'chronology',
    );
  }
  for (const relationship of ex.relationships)
    requireContract(
      relationship.earlierItemId !== relationship.laterItemId &&
        order(relationship.earlierItemId) < order(relationship.laterItemId),
      'invalid_output', 'chronology',
    );
  for (const claim of ex.claims) {
    requireContract(claim.relatedActionIds.every((id) => actions.has(id)), 'invalid_output', 'reference');
    if (claim.kind === 'advertised_duty')
      requireContract(
        claim.citations.some((c) => ['advertisement', 'offer'].includes(evidence.get(c.evidenceId)!.kind)),
        'invalid_output', 'claim',
      );
    if (claim.status === 'user_reported')
      requireContract(
        claim.citations.some(
          (c) => evidence.get(c.evidenceId)!.kind === 'user_note',
        ),
        'invalid_output', 'claim',
      );
    if (claim.kind === 'repayment_promise')
      requireContract(claim.status === 'stated_in_input', 'invalid_output', 'claim');
    if (
      claim.kind === 'completed_action' &&
      claim.citations.some(
        (c) => evidence.get(c.evidenceId)!.kind === 'user_note',
      )
    )
      requireContract(claim.status === 'user_reported', 'invalid_output', 'claim');
  }
  for (const u of ex.unknowns) {
    requireContract(u.relatedActionIds.every((id) => actions.has(id)), 'invalid_output', 'reference');
    if (u.priority === 'blocking')
      requireContract(
        ['actor', 'resource', 'payment_condition', 'contradiction'].includes(
          u.kind,
        ) &&
          u.relatedActionIds.length > 0 &&
          u.relatedActionIds.some((id) =>
            potentiallyFinancial(actions.get(id)!),
          ),
        'invalid_output', 'unknown',
      );
  }
  for (const a of ex.actions) {
    const compatible: Record<string, boolean> = {
      task_recharge:
        ['pay', 'transfer'].includes(a.verb) && a.resource === 'personal_money',
      personal_borrowing:
        ['borrow', 'transfer', 'pay'].includes(a.verb) &&
        a.resource === 'personal_borrowing',
      credential_control:
        ['share_otp', 'share_account_details'].includes(a.verb) &&
        a.resource === 'account_control',
      company_funded_work: a.resource === 'company_money',
      payroll_information:
        a.verb === 'share_account_details' &&
        a.resource === 'account_information',
    };
    requireContract(compatible[a.mechanism] !== false, 'invalid_output', 'mechanism');
    if (a.actor === 'applicant' && a.verb === 'borrow' && a.resource === 'personal_money')
      requireContract(false, 'invalid_output', 'mechanism');
    if (a.verb === 'share_otp')
      requireContract(
        a.resource === 'account_control' &&
          a.mechanism === 'credential_control',
        'invalid_output', 'mechanism',
      );
    if (a.resource === 'personal_borrowing')
      requireContract(a.mechanism === 'personal_borrowing', 'invalid_output', 'mechanism');
    if (a.resource === 'account_control')
      requireContract(a.mechanism === 'credential_control', 'invalid_output', 'mechanism');
    if (
      potentiallyFinancial(a) &&
      a.actor === 'applicant' &&
      ['personal_money', 'personal_borrowing', 'account_control'].includes(
        a.resource,
      )
    )
      requireContract(a.mechanism !== 'none', 'invalid_output', 'mechanism');
    if (needsScopeClarification(a))
      requireContract(
        ex.unknowns.some(
          (u) => u.priority === 'blocking' && u.relatedActionIds.includes(a.id),
        ),
        'invalid_output', 'unknown',
      );
  }
  for (const q of ex.questions) {
    requireContract(
      ex.unknowns.some(
        (u) => u.id === q.unknownId && u.priority === 'blocking',
      ),
      'invalid_output', 'question',
    );
    // Defense in depth, not a semantic safety proof. Discussing a demand is
    // necessary to clarify its payer; an instruction to execute it is not.
    const text = q.text.trim();
    const credentials =
      /(?:password|passcode|\botp\b|one[- ]time (?:password|code)|(?:verification|security) codes?\b|(?:full )?(?:bank(?: account)?|account|id|identity card|hkid) number|密碼|密码|驗證碼|验证码|一次性密碼|一次性密码|(?:銀行|银行)(?:帳號|账号|戶口號碼|户口号码|帳戶號碼|账户号码)|(?:香港)?(?:身份證|身份证|身分證|身分证)(?:號碼|号码))/iu;
    const describesDemand =
      /^(?:are you (?:being )?asked|were you asked|have you been asked|did (?:they|the (?:recruiter|employer)) ask|does (?:this|the (?:instruction|message|recruiter|employer)) (?:ask|require)|(?:你|對方|对方|招聘方|僱主|雇主).{0,20}(?:是否|有否|有沒有|有没有|要求))/iu;
    const requestsCredential =
      /(?:^|[\n.!?。！？,，;；:]\s*|\b(?:then|now|please|and)\s+)(?:(?:please|can you|could you|would you)\s+)?(?:send|share|provide|enter|type|give|paste|disclose|upload|tell me).{0,60}(?:password|passcode|\botp\b|one[- ]time (?:password|code)|(?:verification|security) codes?\b|(?:full )?(?:bank(?: account)?|account|id|identity card|hkid) number)|\bwhat (?:is|are) (?:your|the) (?:password|passcode|otp)|(?:(?:請|请)|(?:^|[\n.!?。！？,，;；:：]\s*|(?:然後|然后|並且|并且)\s*)(?:提供|輸入|输入|發送|发送|告訴我|告诉我)).{0,30}(?:密碼|密码|驗證碼|验证码|完整.{0,8}(?:帳號|账号|證件|证件)|(?:銀行|银行)(?:帳號|账号|戶口號碼|户口号码|帳戶號碼|账户号码)|(?:香港)?(?:身份證|身份证|身分證|身分证)(?:號碼|号码))/iu;
    // A sensitive noun need not be repeated by an appended request: a
    // pronoun can still ask for its value. Explaining a demand remains allowed.
    const requestsCredentialReference = credentials.test(text) &&
      /(?:^|[\n.!?。！？,，;；:]\s*|\b(?:then|now|please|and)\s+)(?:(?:please|can you|could you|would you)\s+)?(?:send|share|provide|enter|type|give|paste|disclose|upload|tell me)\s+(?:it|them)\b/iu.test(text);
    // A noun heading is not a payment command. Remove only that heading for
    // command scanning; appended clauses are still checked and text is intact.
    const executionText = text.replace(
      /^(?:complete|make)\s+(?:(?:the|a|this|your)\s+)?payment\s+(?:instructions|requirements|documentation|details)(?=\s*:\s*(?:who|whose|which)\b)/iu,
      '',
    );
    const execution =
      /(?:^|[\n.!?。！？,，;；:]\s*|\b(?:then|next|and)\s+)(?:(?:and|then|next|please|now|can you|could you|would you|will you|you (?:must|should|need to))\s+)*(?:send|transfer|pay|borrow|take out|apply for (?:a )?loan|(?:complete|make)\s+(?:(?:the|a|this|your)\s+)?payment)\b|(?:請|请|麻煩|麻烦|立即|馬上|马上|先)\s*(?:轉帳|转账|匯款|汇款|借貸|借贷)|^(?:轉帳|转账|匯款|汇款|借貸|借贷)/iu;
    // New funding verbs need an explicit command prefix or a destination.
    // A bare amount can also name a cost; it is not sufficient on its own.
    const fundingExecution =
      /(?:^|[\n.!?。！？,，;；:]\s*|\b(?:then|next|and)\s+)(?:(?:(?:and|then|next|please|now|can you|could you|would you|will you|you (?:must|should|need to))\s+)+(?:deposit|recharge|top[ -]up)\b|(?:deposit|recharge|top[ -]up)\s+(?:(?:(?:HKD|USD|RMB|HK\$|\$)\s*)?[0-9]+(?:[.,][0-9]+)?\s*(?:dollars?\s*)?|(?:(?:your|personal)\s+)?(?:money|funds|cash)\s+)?(?:to|into)\b)|(?:^|[\n。！？,，;；:：]\s*)(?:(?:請|请|麻煩|麻烦|立即|馬上|马上|先)\s*(?:充值|支付|付款|儲值|储值|入金)|(?:充值|支付|付款|儲值|储值|入金)\s*(?:(?:(?:HKD|USD|RMB|HK\$|港幣|港币|人民幣|人民币)\s*)?[0-9]+(?:[.,][0-9]+)?\s*(?:元|港元|美元)?\s*)?(?:給|给|到|向))/iu;
    // A comma can introduce a noun-list item or a separate instruction.
    // Only an anchored list of credential nouns inherits demand context.
    const noun = `(?:(?:a|an|the|your)\\s+)?(?:${credentials.source})`;
    const credentialList = new RegExp(
      `^(?:(?:and|or)\\s+|(?:或|或者|還是|还是|及|和)\\s*)?${noun}(?:\\s*(?:and|or|或|或者|還是|还是|及|和)\\s*${noun})*$`,
      'iu',
    );
    // Newly supported Who/passive discussions must match the whole clause.
    // A prefix alone could consume an appended request with a new verb.
    const discussesDemand = (clause: string): boolean => {
      if (describesDemand.test(clause)) return true;
      const who = /^who (?:(?:is|was) (?:asking|requesting)|asks|asked|requests|requested)\s+(?:for\s+)?(.+)$/iu.exec(clause);
      if (who)
        return credentialList.test(who[1].replace(
          /\s+and (?:can|could|would) you explain (?:the|this|that) request$/iu, '',
        ));
      const passive = /^(?:is|was|were|are)\s+(.+?)\s+(?:being\s+)?(?:requested|demanded|mentioned|asked for)(?:\s+(?:by|in)\s+(?:the\s+)?(?:recruiter|employer|instruction|message))?$/iu.exec(clause);
      return passive !== null && credentialList.test(passive[1]);
    };
    const safeCredentialDiscussion = text
      .split(/[.!?。！？;；\n]/u)
      .every((sentence) => {
        const clauses = sentence.split(/[,，]/u).map((clause) => clause.trim());
        const demandContext = discussesDemand(clauses[0] ?? '');
        return clauses.every(
          (clause, index) =>
            !credentials.test(clause) ||
            discussesDemand(clause) ||
            (index > 0 && demandContext && credentialList.test(clause)),
        );
      });
    requireContract(
      !/(?:https?:\/\/|www\.)/iu.test(text) &&
        !execution.test(executionText) &&
        !fundingExecution.test(text) &&
        !requestsCredential.test(text) &&
        !requestsCredentialReference &&
        safeCredentialDiscussion,
      'invalid_output', 'question',
    );
  }
  return ex;
}
