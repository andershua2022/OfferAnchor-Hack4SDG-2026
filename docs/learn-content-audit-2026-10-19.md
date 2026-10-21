# Learn source/content audit — 19 October 2026

> **Subsequent scoped update:** the owner authorized source-checked bilingual passages for existing optional Knowledge questions after this initial audit. See [the governed Q&A release](research-qa-release-2026-10-19.md). The initial wiring/status below describes the audit snapshot; no human approval was added and core extraction is unchanged.

**Result:** all 24 public-source summaries were compared with the saved primary-page/PDF text and their stated limitations. Their key factual claims are supported; no material factual correction was needed. Selected current publisher pages (Hays, Teekay, the Employment Agencies Administration and OCBC) were also reopened. This is an agent editorial/source check, not a newly recorded human approval, an accuracy benchmark or a fresh fetch of every page. The corpus is unchanged.

## What Check actually uses

| Area | Current use |
| --- | --- |
| Learn | All 24 public-source summaries can be searched, filtered and read, alongside seven core guides. |
| Check main analysis | The model extracts actions, claims and original-word evidence from the user's supplied material. The validated result then selects the applicable approved core guide(s) and routes. It does not receive the 24 summaries as extra case facts. |
| Check related material | `matchingCases(result.referenceIds)` links these 24 records to the result's core topics; the existing view shows at most three related items. This is related reading, not evidence that the sender matches a known scam. |
| Optional live Knowledge question | Retrieval filters for approved material before ranking. The seven approved core guides are eligible; the 24 draft summaries are excluded from generated answers. |
| Optional Public sources | The explicit Find sources action uses Firecrawl with the reviewed generic query and allowed official domains. Search results do not replace the main reading. |

The relevant paths are [main analysis](../lib/analysis/index.ts), [core reference selection](../lib/knowledge/index.ts), [related-record matching](../frontend/workspace/published-cases.ts), [Check/Learn views](publication-scope.md#excluded-material), [retrieval](../lib/research/retrieval.ts) and [research API](../lib/server/research-api.ts). There is no claim that adding display cards automatically improves the core model's accuracy.

## What the dates mean

`source.publishedOn` is the publisher's exact day, when one is stated. A card uses it without the word Checked. If the exact publication day is unknown, the card uses `source.checkedOn` with the explicit Checked label. That is the recorded source-check date, not the incident date, the employer's verification date or an expiry date.

Many new records were collected and checked together on 19 October, so they correctly share `2026-10-19`. A case number such as 2019DB03, an upload month or a copyright year must not be converted into an invented publication day. For example, the PCPD page for 2019DB03 says uploaded in July 2022, and Hays' terms carry a March 2018 version label; neither provides an exact day here. This audit records its own date rather than mass-redating the unchanged cards.

## Source-by-source findings

All entries below retain their existing kind and source URL. The 24 summaries represent 22 distinct source URLs: two ADCC borrowing summaries share one alert, and two Labour Department guidance summaries share one job-traps page. This is not 24 independent fraud investigations.

| Record | Kind | Primary-source finding and scope |
| --- | --- | --- |
| [P_STUDENT_TASK](https://www.adcc.gov.hk/en-hk/alerts-detail/alerts-2038471984935432194.html) | reported_case | The age, induction, three early commissions and approximate loss match the ADCC account. The alert date is not a model-test date. |
| [P_FINANCING_PRESSURE](https://www.adcc.gov.hk/zh-hk/alerts-detail/alerts-2044683469105754113.html) | reported_case | Clerical duties, later personal financing and the bank-prosecution threat are in the same ADCC account; losses exceed HK$2.25 million. |
| [P_ADMIN_LOAN](https://www.adcc.gov.hk/zh-hk/alerts-detail/alerts-2044683469105754113.html) | reported_case | The remote administrative role, HK$100 hourly rate, personal borrowing, transfers and repayment promise are supported; the rate alone is not a rule. |
| [P_CONSTRUCTION_DATA](https://www.pcpd.org.hk/tc_chi/news_events/media_statements/press_20260129.html) | reported_case | The warning reports 42 construction-worker complaints over two weeks, identity/qualification photos and some bank numbers; it does not estimate student incidence. |
| [P_HKEX_PAYROLL](https://www.hkex.com.hk/Global/Exchange/HKEX-Privacy-Notices/Privacy-Notice-For-Human-Resources-Management?sc_lang=en) | company_practice | Section 1.2 specifically concerns accepted-offer onboarding and payroll details; it does not authorise bank login access or authenticate a sender. |
| [P_TEEKAY_POLICY](https://www.teekay.com/blog/2026/08/01/how-we-hire-at-teekay-avoiding-employment-scams/) | company_practice | The dated company statement covers its own no-fee process and pre-offer banking-data warning. This is company policy, not a universal fee law. |
| [P_TRAINING_FEE](https://www.labour.gov.hk/eng/public/eip/JobHunting.pdf) | official_guidance | The job-hunting guide, printed page 28, warns about paying for courses to qualify for a promised post. This is general guidance, not a victim account. |
| [P_TALENT_SCOUT](https://www1.jobs.gov.hk/0/en/information/jobtrap/) | official_guidance | Trap 3 describes modelling/performance pitches, service fees, auditions and deposits without assured work. No finding about every agency is implied. |
| [P_MONEY_MULE](https://www.police.gov.hk/ppp_en/04_crime_matters/aml.html) | official_guidance | Police describe recruited account holders and account lending/selling for suspected crime proceeds. The card does not determine an applicant's criminal liability. |
| [P_BANK_LOGIN](https://www.ocbc.com.hk/cmh/files/2024Q2JobScamE.pdf) | official_guidance | The PDF separately describes fake-job requests for banking details and warns never to share access codes, PINs or OTPs. The payroll contrast is editorial explanation, not a quoted case. |
| [P_BLIND_CV](https://www.pcpd.org.hk/english/data_privacy_law/code_of_practices/code_faq_1.html) | official_guidance | The FAQ distinguishes direct CV collection by an unidentified advertiser from an enquiry-only advert or use of an identified agency. Confidential hiring is not automatically fraud. |
| [P_ID_COPY_EARLY](https://www.pcpd.org.hk/english/enforcement/case_notes/casenotes_2.php?content_nature=&content_type=&id=2024C01&msg_id2=565) | reported_case | The case covers premature identity/bank-card copies and the acceptance-stage distinction. It is a privacy compliance case, not a fraud conviction. |
| [P_ROLE_SWITCH](https://www.pcpd.org.hk/english/enforcement/case_notes/casenotes_2.php?content_nature=34&content_type=&id=2018C10&msg_id2=497) | reported_case | The clerical application led to Company B's sales vacancy; PCPD did issue a warning letter. Both the company's staff warning and PCPD's separate action are in the original. |
| [P_CV_MISDIRECT](https://www.pcpd.org.hk/english/enforcement/case_notes/casenotes_2.php?content_nature=&content_type=&id=2019DB03&msg_id2=549) | reported_case | The counts and manual sorting error following server misconfiguration match. The case ID is not its publication date; the page says uploaded in July 2022. |
| [P_FAKE_CHEQUE](https://archive.fdic.gov/view/fdic/11771/fdic_11771_DS1.pdf) | official_guidance | The FDIC PDF describes supposed home-working/mystery-shopping cheques followed by onward or activation payments. It is explicitly a US comparison. |
| [P_TASK_TOP_UP](https://www.ic3.gov/PSA/2024/PSA240604) | official_guidance | The FBI alert supports simple optimisation/rating work, crypto payments to unlock tasks and an interface showing unavailable earnings. This is US pattern guidance. |
| [P_HAYS_FEES](https://www.hays.com.hk/terms-of-engagement) | company_practice | The jobseeker terms explicitly state no fee for Hays jobseeker services. Their March 2018 version label has no exact day; no day is invented. |
| [P_CATHAY_DATA](https://careers.cathaypacific.com/en/pics-page) | company_practice | The privacy notice gives collection purposes/recipients and post-acceptance use under its employee notice. A copied policy does not authenticate a recruitment channel. |
| [P_AGENCY_COMMISSION](https://www.eaa.labour.gov.hk/en/looking.html) | official_guidance | The portal supports the prescribed first-month commission, successful-placement condition, licensing checks and receipts; it does not endorse a particular charge. |
| [P_COMPANY_REGISTER](https://www.cr.gov.hk/en/electronic/e-servicesportal/e-search.htm) | official_guidance | The registry describes entity/document searches. The separate sender-authority distinction is product reasoning; the registry does not verify a recruiter for this product. |
| [P_SECONDARY_ADCC](https://www.adcc.gov.hk/en-hk/alerts-detail/alerts-2042518500290256897.html) | reported_case | The dated alert supports impersonation, knowledge of names/prior scam details and independent verification. It does not promise recovery. |
| [P_BANK_CONTACT](https://www.hsbc.com.hk/content/dam/hsbc/hk/docs/help/cybersecurity-and-fraud/hsbc-fraudbooklet.pdf) | official_guidance | The booklet supports independent bank contact after sensitive-data compromise. Exporting a brief cannot reverse a payment or contact the bank automatically. |
| [P_REPORT_EVIDENCE](https://www.police.gov.hk/ppp_en/13_faqs/faq_erc.html) | official_guidance | The FAQ covers attachments, logon and saved-but-unsubmitted forms. OfferAnchor does not file a report or claim its ZIP is an accepted attachment. |
| [P_PYRAMID_JOIN](https://www1.jobs.gov.hk/0/en/information/jobtrap/) | official_guidance | Trap 1 supports the transition from advertised pay to purchases, borrowing and recruiting members. The card avoids classifying every sales role as illegal. |

## Remaining editorial status and release decision

The source/content verification that the agent can perform is complete and recorded here. A named team member has not approved the exact 24 summary texts for use as model-answer passages; the existing 17 October approval covers only seven core guides and four routes. No reviewer, signature or approval date was invented. Human approval alone would not silently change the current wiring: widening generated-answer references would require an explicit scoped backend change and regression check. It is deferred for this judging version.

There is no need to translate or approve every new summary to keep the present working product available. Learn already labels them as English editorial paraphrases, preserves original sources and limitations, and the live answer path excludes drafts. Keep those boundaries when presenting the project.

Freeze the deployed judging baseline after this documentary clarification. It is a runnable, reviewable competition demonstration with tested examples, original-word evidence, download/reimport, related-source reading and optional research. It is not independently validated population accuracy, general privacy/legal advice or a guarantee about arbitrary offers. A short trial rehearsal is more useful now than adding another model, search mode or feature. The existing official Alibaba model configuration, five lifetime account actions, frontend assets and deployment remain unchanged.

Evidence: [the Learn release and actual service/browser checks](learn-source-release-2026-10-19.md), [machine-readable release receipt](learn-source-verification-2026-10-19.json), [the unchanged core human approval](content-review-2026-10-17.md) and [the separately measured model repair](loan-funding-release-2026-10-19.md). Source-checking a summary is not a model-quality result.

## Verification for this documentary audit

The existing Learn-source regression suite passed 6/6 tests; research API/contracts and core knowledge coverage passed 43/43 tests, with no real model requests. The staged diff contains only this audit, the root README and the knowledge README. The 24-record corpus and all runtime/frontend files are unchanged. The local privacy scan of 521 tracked files found zero exact project-credential matches, zero unreviewed pattern candidates and zero new unreviewed personal-email candidates. This documentation update requires no rebuild or production deployment.
