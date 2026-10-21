// WP02 only: local fixture-derived view data, NOT shared API types/validation,
// an analyze implementation, a citation resolver, or a reference selector.
// WP07 will consume the actual AI-owned modules at the documented boundary.
import registry from "../examples/simulation-fixtures.json";
import {ANALYSIS_TIMEOUT_MS,ANALYSIS_DELAYED_MS} from "./analysis-timing";
import manifest from "../docs/project-manifest.json";
import type {CompleteResponse,ErrorCode} from "../lib/contracts/index.ts";
import {parseAnalyzeRequest,validateAnalyzeResponse} from "../lib/contracts/index.ts";
import taskEnRequest from "../examples/request-task-en.json";
import taskEnResponse from "../examples/response-task-en.json";
import taskZhRequest from "../examples/request-task-zh.json";
import taskZhResponse from "../examples/response-task-zh.json";
import companyEnRequest from "../examples/request-company-en.json";
import companyEnResponse from "../examples/response-company-en.json";
import companyZhRequest from "../examples/request-company-zh.json";
import companyZhResponse from "../examples/response-company-zh.json";
import missingRequest from "../examples/request-missing-payer-en.json";
import missingResponse from "../examples/response-missing-payer-en.json";
import fundingRequest from "../examples/request-funding-note-en.json";
import fundingResponse from "../examples/response-funding-note-en.json";
import denialRequest from "../examples/request-task-denial-en.json";
import denialResponse from "../examples/response-task-denial-en.json";
import loanRequest from "../examples/request-personal-loan.json";
import loanResponse from "../examples/response-personal-loan.json";
import en from "../locales/en-HK.json";
import zh from "../locales/zh-Hant-HK.json";

const pairs = {
  "request-task-en.json": { responseFile: "response-task-en.json", request: taskEnRequest, response: taskEnResponse },
  "request-task-zh.json": { responseFile: "response-task-zh.json", request: taskZhRequest, response: taskZhResponse },
  "request-company-en.json": { responseFile: "response-company-en.json", request: companyEnRequest, response: companyEnResponse },
  "request-company-zh.json": { responseFile: "response-company-zh.json", request: companyZhRequest, response: companyZhResponse },
  "request-missing-payer-en.json": { responseFile: "response-missing-payer-en.json", request: missingRequest, response: missingResponse },
  "request-funding-note-en.json": { responseFile: "response-funding-note-en.json", request: fundingRequest, response: fundingResponse },
  "request-task-denial-en.json": { responseFile: "response-task-denial-en.json", request: denialRequest, response: denialResponse },
  "request-personal-loan.json": { responseFile: "response-personal-loan.json", request: loanRequest, response: loanResponse }
} as const;
export const fixtures = registry.fixtures.map(meta => {
  const pair = pairs[meta.requestFile as keyof typeof pairs];
  if (!pair || pair.responseFile !== meta.responseFile) throw new Error("Unconnected preview fixture");
  return { ...meta, request: pair.request, response: pair.response };
});
export type PreviewRequest = (typeof fixtures)[number]["request"];
type PreviewResponse = CompleteResponse;
type Evidence = PreviewRequest["evidence"][number];

export function text(locale: string, key: string): string {
  let value: unknown = locale === "en-HK" ? en : locale === "zh-Hant-HK" ? zh : null;
  for (const part of key.split(".")) {
    value = value && typeof value === "object" ? (value as Record<string, unknown>)[part] : null;
  }
  if (typeof value !== "string") throw new Error("Missing preview locale key");
  return value;
}

export const normalizeLines = (value: string) => value.replace(/\r\n/g, "\n");
const wellFormed = (value: string) => !/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(value);

// UI bounds only. This does not replace AI's schema/runtime request parser.
export function inputWithinBounds(request: PreviewRequest): boolean {
  const items = request.evidence;
  return request.contractVersion === registry.contractVersion &&
    /^[A-Za-z0-9_-]{8,64}$/.test(request.requestId) &&
    Number.isSafeInteger(request.revision) && request.revision >= 1 &&
    ["en-HK", "zh-Hant-HK"].includes(request.locale) &&
    Number.isInteger(request.clarificationsUsed) && request.clarificationsUsed >= 0 && request.clarificationsUsed <= 2 &&
    items.length >= 1 && items.length <= 8 &&
    new Set(items.map(e => e.id)).size === items.length &&
    items.some(e => e.kind === "instruction" || e.kind === "reply") &&
    items.every((e, index) => /^E[1-8]$/.test(e.id) && e.sequence === index + 1 &&
      ["advertisement", "offer", "instruction", "reply", "user_note"].includes(e.kind) &&
      e.label.length >= 1 && e.label.length <= 120 && wellFormed(e.label) &&
      e.text.trim().length > 0 && e.text.length <= 4000 && wellFormed(e.text)) &&
    items.reduce((sum, e) => sum + e.text.length, 0) <= 12000 &&
    new TextEncoder().encode(JSON.stringify(request)).length <= 96 * 1024;
}

function sameEvidence(a: Evidence[], b: Evidence[]): boolean {
  return a.length === b.length && a.every((entry, index) => {
    const other = b[index];
    return entry.id === other.id && entry.kind === other.kind && entry.label === other.label &&
      entry.sequence === other.sequence && entry.text === other.text;
  });
}

export function previewFixture(request: PreviewRequest):Outcome {
  if (!inputWithinBounds(request)) return { status: "incomplete" as const, errorCode: "invalid_input" as const, retryable: false };
  const fixture = fixtures.find(f => f.request.contractVersion === request.contractVersion &&
    f.request.locale === request.locale && f.request.clarificationsUsed === request.clarificationsUsed &&
    sameEvidence(f.request.evidence, request.evidence));
  if (!fixture) return { status: "incomplete" as const, errorCode: "simulation_unsupported" as const, retryable: false };
  const parsed=parseAnalyzeRequest(request);
  if(!parsed.ok)return {status:"incomplete",errorCode:"invalid_input",retryable:false};
  const response=validateAnalyzeResponse({...structuredClone(fixture.response),requestId:request.requestId,revision:request.revision},parsed.request,"simulation");
  return response.status==="complete"?{status:"complete",response}:{status:"incomplete",errorCode:response.errorCode,retryable:response.retryable};
}

export type Outcome = {status:"complete";response:PreviewResponse}|{status:"incomplete";errorCode:ErrorCode;retryable:boolean};
export type PreviewState = {
 request:PreviewRequest;
 nextEvidenceId:number;
 phase:"editing"|"processing"|"delayed"|"complete"|"incomplete";
 active:{requestId:string;revision:number;deadline:number}|null;
 outcome:Outcome|null;
 shownQuestionKeys:string[];
 displayedQuestions:typeof missingResponse.extraction.questions;
 questionHistory:{key:string;question:typeof missingResponse.extraction.questions[number];requestId:string;revision:number;answered:boolean}[];
 includeQuotes:boolean;
 body:string;originalBody:string;
};
export function initialState():PreviewState{
 return {request:{contractVersion:registry.contractVersion,requestId:"preview_initial",revision:1,locale:"en-HK",clarificationsUsed:0,evidence:[]},
 nextEvidenceId:1,phase:"editing",active:null,outcome:null,shownQuestionKeys:[],displayedQuestions:[],questionHistory:[],includeQuotes:true,body:"",originalBody:""};
}
export type PreviewEvent =
 |{type:"load";fixtureId:string}|{type:"continue_authored"}|{type:"clear"}|{type:"locale";locale:string}
 |{type:"initialize";evidence:PreviewRequest["evidence"]}
 |{type:"edit";id:string;field:"text"|"label";value:string}
 |{type:"add";kind:string;label:string;value:string}|{type:"delete";id:string}
 |{type:"reorder";id:string;direction:-1|1}
 |{type:"answer";questionKey:string;value:string}|{type:"quotes";value:boolean}
 |{type:"delayed";requestId:string;revision:number;now?:number}
 |{type:"terminate";requestId:string;revision:number;errorCode:"cancelled"|"timeout"}
 |{type:"start";requestId:string;now?:number}
 |{type:"finish";requestId:string;revision:number;outcome:Outcome;now?:number}
 |{type:"body";value:string};
function invalidate(state:PreviewState,request:PreviewRequest):PreviewState{
 return {...state,request:{...request,revision:state.request.revision+1},phase:"editing",active:null,outcome:null,displayedQuestions:[],body:"",originalBody:""};
}
export function previewReducer(state:PreviewState,event:PreviewEvent):PreviewState{
 if(event.type==="clear")return {...initialState(),includeQuotes:state.includeQuotes};
 if(event.type==="load"){
  const fixture=fixtures.find(f=>f.fixtureId===event.fixtureId);if(!fixture)return state;
  const request=structuredClone(fixture.request);
  return {...initialState(),includeQuotes:state.includeQuotes,request,nextEvidenceId:Math.max(...request.evidence.map(e=>Number(e.id.slice(1))))+1};
 }
 if(event.type==="continue_authored"){
  const next=authoredContinuation(state);if(!next)return state;const e=next.request.evidence.at(-1)!;
  const added=previewReducer(state,{type:"add",kind:e.kind,label:e.label,value:e.text});
  return {...added,questionHistory:added.questionHistory.map(q=>e.kind==="user_note"?{...q,answered:true}:q)};
 }
 if(event.type==="initialize"){
  if(state.request.evidence.length)return state;
  const evidence=event.evidence.map((e,i)=>({...e,id:"E"+(state.nextEvidenceId+i),sequence:i+1,text:normalizeLines(e.text)}));
  const request={...state.request,evidence};if(!inputWithinBounds(request))return state;
  return {...invalidate(state,request),nextEvidenceId:state.nextEvidenceId+evidence.length};
 }
 if(event.type==="locale"){
  if(!["en-HK","zh-Hant-HK"].includes(event.locale)||event.locale===state.request.locale)return state;
  return invalidate(state,{...state.request,locale:event.locale});
 }
 if(event.type==="edit"){
  if(!state.request.evidence.some(e=>e.id===event.id&&e[event.field]!==normalizeLines(event.value)))return state;
  return invalidate(state,{...state.request,evidence:state.request.evidence.map(e=>e.id===event.id?{...e,[event.field]:normalizeLines(event.value)}:e)});
 }
 if(event.type==="delete"){
  if(!state.request.evidence.some(e=>e.id===event.id))return state;
  return invalidate(state,{...state.request,evidence:state.request.evidence.filter(e=>e.id!==event.id).map((e,i)=>({...e,sequence:i+1}))});
 }
 if(event.type==="reorder"){
  const from=state.request.evidence.findIndex(e=>e.id===event.id),to=from+event.direction;
  if(from<0||to<0||to>=state.request.evidence.length)return state;
  const evidence=[...state.request.evidence];[evidence[from],evidence[to]]=[evidence[to],evidence[from]];
  return invalidate(state,{...state.request,evidence:evidence.map((e,i)=>({...e,sequence:i+1}))});
 }
 if(event.type==="add"){
  if(state.nextEvidenceId>8||state.request.evidence.length>=8)return state;
  const next=invalidate(state,{...state.request,evidence:[...state.request.evidence,{
   id:"E"+state.nextEvidenceId,kind:event.kind,label:event.label,sequence:state.request.evidence.length+1,text:normalizeLines(event.value)
  }]});
  return {...next,nextEvidenceId:state.nextEvidenceId+1};
 }
 if(event.type==="answer"){
  const history=state.questionHistory.find(q=>q.key===event.questionKey&&!q.answered);
  if(!history||!event.value.trim())return state;
  const en=state.request.locale==="en-HK";
  const value=(en?"Question (":"問題（")+history.question.id+(en?"): ":"）：")+history.question.text+
   (en?"\nAnswer: ":"\n回答：")+normalizeLines(event.value);
  const next=previewReducer(state,{type:"add",kind:"user_note",label:(en?"Clarification answer ":"澄清問題回答 ")+history.question.id,value});
  if(next===state||!inputWithinBounds(next.request))return state;
  return {...next,questionHistory:next.questionHistory.map(q=>q.key===event.questionKey?{...q,answered:true}:q)};
 }
 if(event.type==="quotes"){
  if(!canExport(state)||state.outcome?.status!=="complete")return {...state,includeQuotes:event.value};
  const body=briefBody(state.outcome.response,state.request.locale,event.value);
  return {...state,includeQuotes:event.value,body,originalBody:body};
 }
 if(event.type==="terminate"||event.type==="delayed"){
  if(!state.active||state.active.requestId!==event.requestId||state.active.revision!==event.revision)return state;
  if(event.type==="delayed"){
   const now=event.now??performance.now();
   if(now>=state.active.deadline)return previewReducer(state,{type:"terminate",requestId:event.requestId,revision:event.revision,errorCode:"timeout"});
   return now>=state.active.deadline-(ANALYSIS_TIMEOUT_MS-ANALYSIS_DELAYED_MS)?{...state,phase:"delayed"}:state;
  }
  return {...state,phase:"incomplete",active:null,outcome:{status:"incomplete",errorCode:event.errorCode,retryable:true},body:"",originalBody:"",displayedQuestions:[]};
 }
 if(event.type==="start")return {...state,request:{...state.request,requestId:event.requestId},phase:"processing",
  active:{requestId:event.requestId,revision:state.request.revision,deadline:(event.now??performance.now())+ANALYSIS_TIMEOUT_MS},outcome:null,displayedQuestions:[],body:"",originalBody:""};
 if(event.type==="body")return canExport(state)?{...state,body:event.value}:state;
 if(event.type==="finish"){
  if(!state.active||state.active.requestId!==event.requestId||state.active.revision!==event.revision||state.request.revision!==event.revision)return state;
  if((event.now??performance.now())>=state.active.deadline)return previewReducer(state,{type:"terminate",requestId:event.requestId,revision:event.revision,errorCode:"timeout"});
  if(event.outcome.status==="incomplete")return {...state,phase:"incomplete",active:null,outcome:event.outcome};
  const response=event.outcome.response;if(response.requestId!==event.requestId||response.revision!==event.revision)return state;
  const shown=new Set(state.shownQuestionKeys),questions:PreviewState["displayedQuestions"]=[],history=[...state.questionHistory];
  for(const question of response.extraction.questions){
   const unknown=response.extraction.unknowns.find(u=>u.id===question.unknownId);if(!unknown)continue;
   const evidenceIds=[...new Set(response.extraction.actions.filter(a=>unknown.relatedActionIds.includes(a.id)).flatMap(a=>a.citations.map(c=>c.evidenceId)))].sort();
   const key=JSON.stringify([unknown.kind,evidenceIds,question.text]);
   if(!shown.has(key)&&questions.length<2-state.request.clarificationsUsed){
    shown.add(key);questions.push(question);history.push({key,question,requestId:event.requestId,revision:event.revision,answered:false});
   }
  }
  const body=briefBody(response,state.request.locale,state.includeQuotes);
  return {...state,phase:"complete",active:null,outcome:event.outcome,request:{...state.request,clarificationsUsed:state.request.clarificationsUsed+questions.length},
   shownQuestionKeys:[...shown],displayedQuestions:questions,questionHistory:history,body,originalBody:body};
 }
 return state;
}
export function canExport(state:PreviewState):boolean{
 return state.phase==="complete"&&state.outcome?.status==="complete"&&state.outcome.response.requestId===state.request.requestId&&state.outcome.response.revision===state.request.revision;
}

export function independentQuestion(response: PreviewResponse, locale: string): string {
  return response.guidance === "no_personal_financial_request_identified" && response.referenceIds[0] === "K_UNKNOWN"
    ? text(locale, "guidance.noScopedQuestion")
    : text(locale, `knowledge.cards.${response.referenceIds[0]}.question`);
}

export function briefBody(response: PreviewResponse, locale: string, includeQuotes: boolean): string {
  const lines = [text(locale, `guidance.${response.guidance}`), independentQuestion(response, locale)];
  for (const action of response.extraction.actions) {
    lines.push(`${action.id}: ${action.actor} / ${action.verb} / ${action.polarity} / ${action.resource} / ${action.mechanism}`, action.purpose);
    if (includeQuotes) lines.push(...action.citations.map(c => `${c.evidenceId} [${c.start}:${c.end}]: “${c.quote}”`));
  }
  for (const claim of response.extraction.claims) {
    lines.push(`${claim.id} / ${claim.kind} / ${claim.status}: ${claim.text}`, text(locale, "guidance.claim"));
    if (includeQuotes) lines.push(...claim.citations.map(c => `${c.evidenceId} [${c.start}:${c.end}]: “${c.quote}”`));
  }
  lines.push(...response.extraction.comparisons.map(c => `${c.earlierClaimId} → ${c.laterActionId}: ${c.explanation}`));
  lines.push(...response.extraction.relationships.map(r => `${r.kind}: ${r.earlierItemId} → ${r.laterItemId}: ${r.explanation}`));
  lines.push(...response.extraction.unknowns.map(u => `${u.id} / ${u.kind} / ${u.priority}: ${u.issue}`));
  return lines.join("\n\n");
}

export function protectedFooter(state: PreviewState): string {
  if (!canExport(state) || state.outcome?.status !== "complete") return "";
  const response = state.outcome.response;
  return [
    `${text(state.request.locale, "app.name")} | baseline ${manifest.versions.documentation} | contract ${response.contractVersion} | revision ${response.revision} | ${response.mode}`,
    `${response.provenance.promptVersion} | ${response.provenance.libraryVersion} | modelId: ${response.provenance.modelId??'null'}`,
    ...(response.mode==="simulation"?[text(state.request.locale,"brief.simulation")]:[state.request.locale==="en-HK"?"LIVE MODEL OUTPUT: an interpretation of selected material, not independent verification.":"真實模型輸出：只解讀所選材料，並非獨立核實。"]), text(state.request.locale, "brief.boundary"),
    `${text(state.request.locale, "guidance.unknown")}: ${response.extraction.unknowns.map(u => u.issue).join("; ")}`,
    `edited: ${state.body !== state.originalBody}`,
    ...(state.body !== state.originalBody ? [text(state.request.locale, "brief.edited")] : [])
  ].join("\n\n");
}

// Explicit authored continuations append the exact next source; no fuzzy matching or session reset.
export function authoredContinuation(state:PreviewState){
 if(!canExport(state)||state.outcome?.status!=="complete"||state.outcome.response.mode!=="simulation")return null;
 return fixtures.find(f=>f.sessionInitialization==="seeded_demo_stage"&&f.request.locale===state.request.locale&&
  f.request.clarificationsUsed===state.request.clarificationsUsed&&f.request.evidence.length===state.request.evidence.length+1&&
  f.request.evidence.slice(0,-1).every((e,i)=>{const prior=state.request.evidence[i];return prior&&e.id===prior.id&&e.kind===prior.kind&&e.label===prior.label&&e.sequence===prior.sequence&&e.text===prior.text;})&&
  f.request.evidence.at(-1)?.id==="E"+state.nextEvidenceId)??null;
}
