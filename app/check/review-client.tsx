"use client";
import {useEffect,useRef,useState} from 'react';
import {fixtures} from '../fixture-preview';
import {requestAnalysis} from '../analysis-client';
import {parseAnalyzeRequest} from '../../lib/contracts';
import {requestResearch} from '../../frontend/workspace/research-client';
import {readLocalFile,ACCEPTED_FILES} from '../../frontend/workspace/local-import';
import type {WorkspaceStatus} from '../workspace-status';

// A plain reviewer tool; intentionally contains none of the production visual design.
export default function ReviewClient(){
 const [selected,setSelected]=useState(fixtures[0].fixtureId),[input,setInput]=useState(JSON.stringify(fixtures[0].request,null,2));
 const [status,setStatus]=useState<WorkspaceStatus|null>(null),[result,setResult]=useState<unknown>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[code,setCode]=useState(''),[question,setQuestion]=useState(''),[research,setResearch]=useState<unknown>(null),[imported,setImported]=useState('');
 const active=useRef<AbortController|null>(null);
 async function refresh(){try{const r=await fetch('/api/session',{cache:'no-store',credentials:'same-origin',signal:AbortSignal.timeout(5000)});setStatus(await r.json());}catch{setError('The local API is unavailable.');}}
 useEffect(()=>{void refresh();return()=>active.current?.abort();},[]);
 function change(value:string){active.current?.abort();setInput(value);setResult(null);setError('');setBusy(false);}
 async function run(prepared=false){
  active.current?.abort();const c=new AbortController();active.current=c;setError('');setResult(null);
  try{const parsed=parseAnalyzeRequest(JSON.parse(input));if(!parsed.ok)throw Error('Request does not match contract 2.0.0.');setBusy(true);
   const value=await requestAnalysis(parsed.request,c.signal,fetch,status?.mode==='live'?'live':'simulation',prepared);
   if(!c.signal.aborted&&active.current===c)setResult(value);
  }catch{if(!c.signal.aborted)setError('Use valid JSON matching AnalyzeRequest; no request was accepted.');}finally{if(active.current===c)setBusy(false);}
 }
 async function unlock(event:React.FormEvent){event.preventDefault();setError('');try{const r=await fetch('/api/session',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({accessCode:code}),signal:AbortSignal.timeout(5000)});setCode('');if(!r.ok)setError('Access was not accepted.');await refresh();}catch{setCode('');setError('The local API is unavailable.');}}
 async function ask(kind:'knowledge'|'web'){active.current?.abort();const c=new AbortController();active.current=c;setResearch(null);setBusy(true);try{const base={contractVersion:'research-1.0.0' as const,requestId:crypto.randomUUID(),revision:1,locale:'en-HK' as const};const value=await requestResearch(kind==='knowledge'?{...base,question}:{...base,query:question},kind,status?.mode==='live'?'live':'simulation',c.signal);if(!c.signal.aborted)setResearch(value);}finally{if(active.current===c)setBusy(false);}}
 async function importFile(file:File|undefined){if(!file)return;setError('');try{const value=await readLocalFile(file,new AbortController().signal);setImported(value.text||'Image/scanned content requires the separately consented image API. See the API guide.');}catch(e){setError(e instanceof Error?e.message:'File import failed.');}}
 function download(){if(!result)return;const blob=new Blob([JSON.stringify({request:JSON.parse(input),result},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='offeranchor-review-result.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 return <main><h1>OfferAnchor functional review kit</h1><p>This plain client is for source review. The production visual design is excluded. <a href="https://offeranchor-hk.vercel.app">Open the complete hosted prototype</a>.</p>
 <nav><a href="#check">Check</a> | <a href="#sources">Sources</a> | <a href="/login">Sign in</a> | <a href="/privacy">Data handling</a> | <a href="/terms">Terms</a></nav>
 <details><summary>Connection and demo access</summary><pre>{JSON.stringify(status,null,2)}</pre><button onClick={()=>void refresh()}>Refresh connection</button><form onSubmit={e=>void unlock(e)}><label>Demo access code <input type="password" autoComplete="off" maxLength={256} value={code} onChange={e=>setCode(e.target.value)}/></label><button>Unlock demo</button></form><p>No access code or API key is included in this repository.</p></details>
 <section id="check"><h2>Check an evidence request</h2><label>Prepared case <select value={selected} onChange={e=>{setSelected(e.target.value);const f=fixtures.find(f=>f.fixtureId===e.target.value);if(f)change(JSON.stringify(f.request,null,2));}}>{fixtures.map(f=><option key={f.fixtureId} value={f.fixtureId}>{f.fixtureId}</option>)}</select></label>
 <p><label htmlFor="request-json">AnalyzeRequest JSON</label></p><textarea id="request-json" rows={20} cols={85} spellCheck={false} value={input} onChange={e=>change(e.target.value)}/>
 <p><button disabled={busy} onClick={()=>void run(false)}>Run server check</button> <button disabled={busy} onClick={()=>void run(true)}>Run prepared example (no API)</button> <button disabled={!busy} onClick={()=>{active.current?.abort();setBusy(false);}}>Cancel</button> <button disabled={!result} onClick={download}>Download review JSON</button></p>
 <details><summary>Local file-to-text adapters</summary><p>Files convert locally. The plain reference client shows extracted text for manual placement in evidence; it does not upload images automatically. The complete intake UI remains in the hosted product.</p><input aria-label="Local document" type="file" accept={ACCEPTED_FILES} onChange={e=>void importFile(e.target.files?.[0])}/><pre>{imported}</pre></details>
 {error&&<p role="alert">{error}</p>}<h3>Result</h3><pre id="analysis-result">{result?JSON.stringify(result,null,2):'No result.'}</pre></section>
 <section id="sources"><h2>Optional source Q&A and search</h2><p>Do not enter private details. Knowledge uses the local reviewed collection first; web search is explicit and optional. Simulation does not call providers.</p><label>General question <input value={question} maxLength={300} onChange={e=>setQuestion(e.target.value)}/></label> <button disabled={busy||!question.trim()} onClick={()=>void ask('knowledge')}>Ask knowledge</button> <button disabled={busy||!question.trim()} onClick={()=>void ask('web')}>Search public sources</button><pre>{research?JSON.stringify(research,null,2):'No source answer.'}</pre></section></main>;
}
