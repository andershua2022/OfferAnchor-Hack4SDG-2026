# Human content review — 17 October 2026

**Purpose:** record the human approval of the exact English and Traditional Chinese (Hong Kong) wording paired with the seven knowledge cards and four routes, plus a narrow official-source check for the bank-contact advice.

**Review basis:** knowledge/library.json draft-0.2.0 and matching keys in locales/en-HK.json and locales/zh-Hant-HK.json. The source register is [research-and-sources.md](research-and-sources.md), with content boundaries in [knowledge-and-data.md](knowledge-and-data.md). Existing card and route checkedOn dates remain **2026-10-05**. S11 was checked on **2026-10-17** for the independent bank-contact advice in K_ALREADY_ACTED only.

## Human approval and scope

**Reviewer:** AI/DS representative; approval authorized by the user on 2026-10-17.

**Decision:** approve the exact bilingual wording and localized meaning for all seven cards and all four routes for their stated scope. No item-specific copy change was requested; the English K_TASK_RECHARGE question received a grammar edit that preserves its meaning.

**Boundary:** this records human content approval only. It does not establish identity verification, app or live-model acceptance, live operational readiness, independent evaluation, or product effectiveness. The existing humanApprovalRequiredForLiveUse gate remains.

## Recorded official source links

The source register describes these uses and limits. Links are reproduced from the canonical library and register; they are not newly checked for this packet.

| ID | Recorded source | Recorded relevance and limitation |
|---|---|---|
| S01 | [Hong Kong Police: 2025 annual crime review](https://www.police.gov.hk/ppp_tc/01_about_us/cp_ye.html) | Territory-wide context; does not establish student prevalence. |
| S02 | [ADCC alert, 30 March 2026](https://www.adcc.gov.hk/zh-cn/alerts-detail/alerts-2038471984935432194.html) | One published student task-payment case; not incidence or product-effectiveness evidence. |
| S03 | [ADCC alert, 16 April 2026](https://www.adcc.gov.hk/zh-cn/alerts-detail/alerts-2044683469105754113.html) | Published adult borrowing/transfer cases; not student prevalence or a liability finding. |
| S04 | [Labour Department: job traps](https://www1.jobs.gov.hk/0/tc/information/jobtrap/) | General comparison/checking guidance; does not certify a job. |
| S06 | [CyberDefender: Scameter+](https://cyberdefender.hk/zh-cn/scameter/) | Official manual checking service; no private API/database access and no-match is not proof of safety. |
| S07 | [ADCC contact information](https://www.adcc.gov.hk/zh-hk/contact-us.html) | Records 18222 consultation scope; not a verification API. |
| S08 | [Companies Registry: e-Search](https://www.cr.gov.hk/en/electronic/e-servicesportal/e-search.htm) | Registration lookup; company existence does not authorize a recruiter or instruction. Access/fees may apply. |
| S10 | [OCBC Hong Kong: job-scam guidance (PDF)](https://www.ocbc.com.hk/cmh/files/2024Q2JobScamE.pdf) | Supports credential/OTP and independent-contact distinctions; not incidence, endorsement, or partnership evidence. |
| S11 | [HSBC Hong Kong: fraud booklet (PDF)](https://www.hsbc.com.hk/content/dam/hsbc/hk/docs/help/cybersecurity-and-fraud/hsbc-fraudbooklet.pdf) | Advises customers with compromised sensitive information to contact the bank using details from its official website or app, or hotline details on the back of banking cards. Supports the bank-contact route only; not bank identity, recovery, or transaction outcome. Checked 2026-10-17. |

The cards are source-inspired product synthesis, not quotations or findings about a specific job. A source citation does not establish a recruiter's identity, an employer's legitimacy, promised repayment, or the effectiveness of this product.

## Cards — exact displayed wording

### K_TASK_RECHARGE — Your money is requested before tasks or withdrawals

**English**

> Your money is requested before tasks or withdrawals
>
> Pause this payment. Why is your own money required before tasks or earnings? Ask an independent adviser to help you check using a reliable channel you found yourself.

**Traditional Chinese (Hong Kong)**

```text
要先付自己的錢，才能做任務或取款

先暫停這項付款。為何要用自己的錢才能做任務或取得收益？請自行尋找可靠渠道，並找獨立人士協助核實。
```

Sources: S01, S02, S04, S10. Recorded checkedOn: **2026-10-05**. Review whether “tasks or earnings” and the corresponding Traditional Chinese phrase convey the same trigger without implying every advance payment is fraudulent.

### K_PERSONAL_BORROWING — Personal borrowing or use of borrowed funds is requested

**English**

> Personal borrowing or use of borrowed funds is requested
>
> Pause this borrowing, transfer or payment using personal borrowing proceeds. Why does the work require borrowing in your own name, or using existing borrowed funds? Check independently; a company repayment promise remains unverified.

**Traditional Chinese (Hong Kong)**

```text
對方要求個人借貸或動用借款

先暫停這項個人借貸、借款轉賬或以借款付款。為何工作需要你以個人名義借錢，或動用已有借款？請獨立核實指示；「公司會還款」仍只是未經核實的承諾。
```

Sources: S03, S04. Recorded checkedOn: **2026-10-05**. Review whether the pause applies clearly to the borrowing/transfer/payment and whether the unverified promise caveat is equivalent in both languages.

### K_COMPANY_PAID — The text describes company payment or prohibits personal payment

**English**

> The text describes company payment or prohibits personal payment
>
> Which costs are paid directly by the company? Check through a company channel you found independently; a payment statement is not confirmation.

**Traditional Chinese (Hong Kong)**

```text
文字提到公司付款或禁止個人付款

哪些費用由公司直接支付？請透過自行找到的公司渠道核實安排；文字中的付款承諾並不等於已確認。
```

Source: S04. Recorded checkedOn: **2026-10-05**. Benign control: a prohibition is not itself a request. Review whether the title and question avoid treating a company-payment statement as proof of legitimacy.

### K_PAYROLL — Payroll details are not bank-account control

**English**

> Payroll details are not bank-account control
>
> Independently check who is requesting the information and why. Do not disclose banking passwords or one-time passwords (OTPs) to them, or hand over account control.

**Traditional Chinese (Hong Kong)**

```text
出糧資料不等於銀行戶口控制權

請先獨立核實收取資料的人及用途。不要向對方提供銀行密碼、一次性密碼（OTP），或交出戶口控制權。
```

Sources: S04, S06, S10. Recorded checkedOn: **2026-10-05**. Review whether the distinction between ordinary payroll details and credentials/account control is clear and accurate.

### K_UNKNOWN — Some details still need independent checking

**English**

> Some details still need independent checking
>
> Who pays or borrows, and whose money is used? Is payment required for tasks or withdrawal? Clarify missing or conflicting details that affect personal financial exposure.

**Traditional Chinese (Hong Kong)**

```text
仍有事項需要獨立核實

是誰付款或借貸、用誰的錢？付款是否做任務或取款的條件？請先釐清會影響個人財務風險的缺漏或矛盾。
```

Source: S04. Recorded checkedOn: **2026-10-05**. Boundary: a changed duty without a financial demand is not a fraud finding. Review whether the questions are neutral and understandable.

### K_ALREADY_ACTED — You report that you have already acted

**English**

> You report that you have already acted
>
> What payment, borrowing or account action have you taken? Seek help through your bank app opened independently or the contact details on your card. Call 18222 for anti-scam advice; suspected victims should report at a police station.

**Traditional Chinese (Hong Kong)**

```text
你表示已採取相關行動

你已做了哪些付款、借貸或戶口操作？請透過自己開啟的銀行應用程式或卡背聯絡方式求助。可致電18222諮詢；懷疑已受騙請到警署報案。
```

Sources: S07, S11. S07 checkedOn: **2026-10-05**; S11 checked **2026-10-17** for independent bank-contact advice. Boundary: a user report is not official confirmation or recovered funds; no recovery promise is implied.

### K_ORDINARY_EXPENSE — A work expense is not necessarily a task payment

**English**

> A work expense is not necessarily a task payment
>
> What is the expense for, and who pays it? Independently check the expense policy and reimbursement conditions; a reimbursement promise is neither confirmation nor permission to pay.

**Traditional Chinese (Hong Kong)**

```text
工作開支不一定是任務付款

這筆費用用於甚麼、由誰支付？請獨立核實開支政策及報銷條件；「可報銷」既未獲確認，也不等於可以付款。
```

Source: S04. Recorded checkedOn: **2026-10-05**. Boundary: an ordinary work expense alone is not payment to unlock tasks or earnings. Review whether this distinction remains clear and does not suggest payment is safe.

## Routes — exact displayed wording and scope

### ADCC_18222 — Anti-scam advice: 18222

**English label and scope**

> Anti-scam advice: 18222
>
> 24-hour advice, not a crime report or employer certification. Suspected victims should report at a police station; call 999 for emergencies.

**Traditional Chinese (Hong Kong) label and scope**

```text
防騙易18222：反詐騙諮詢

24小時諮詢，並非報案或僱主認證。懷疑已受騙請到警署報案；緊急事故致電999。
```

Official link: [ADCC contact information](https://www.adcc.gov.hk/zh-hk/contact-us.html). Recorded phone: **18222**. Recorded checkedOn: **2026-10-05**. Review service hours, distinction from reporting, and emergency wording against the recorded source.

### SCAMETER — Scameter official checking service

**English label and scope**

> Scameter official checking service
>
> Open the official service yourself to check suspicious details. 'No record' does not mean risk-free and is not employer certification.

**Traditional Chinese (Hong Kong) label and scope**

```text
防騙視伏器（Scameter）

由你自行開啟官方服務查核可疑資料。「沒有紀錄」不代表沒有風險，也不是僱主認證。
```

Official link: [CyberDefender Scameter+](https://cyberdefender.hk/zh-cn/scameter/). Recorded checkedOn: **2026-10-05**. Review that the wording does not imply an automated lookup, access to a private database, or safety after a no-record result.

### LABOUR_GUIDANCE — Labour Department: job-trap guidance

**English label and scope**

> Labour Department: job-trap guidance
>
> General job-trap and checking advice; it does not authenticate a particular job or employer.

**Traditional Chinese (Hong Kong) label and scope**

```text
勞工處：提防求職陷阱

一般求職陷阱及核實建議，不判定個別工作或僱主是否真實。
```

Official link: [Labour Department job traps](https://www1.jobs.gov.hk/0/tc/information/jobtrap/). Recorded checkedOn: **2026-10-05**. Review the general-guidance boundary.

### COMPANY_SEARCH — Companies Registry: company-search information

**English label and scope**

> Companies Registry: company-search information
>
> Check registration information. A company's existence does not authorize this recruiter or payment instruction. Check official access conditions and fees.

**Traditional Chinese (Hong Kong) label and scope**

```text
公司註冊處：公司查冊資訊

可查註冊資料；公司存在不代表招聘者或此付款指示獲授權。查閱條件及收費請以官方說明為準。
```

Official link: [Companies Registry e-Search](https://www.cr.gov.hk/en/electronic/e-servicesportal/e-search.htm). Recorded checkedOn: **2026-10-05**. Review that registration is not framed as recruiter authorization and access/fee conditions remain visible.

## Recorded reviewer decision

Reviewer: AI/DS representative; approval authorized by the user on 2026-10-17. Decision: approve the seven cards and four routes in both languages for their stated scope. The approval is limited to content and localized meaning; it does not certify identities, live operation, effectiveness, independent evaluation, or app/device acceptance. The grammar edit to K_TASK_RECHARGE preserves its meaning.
