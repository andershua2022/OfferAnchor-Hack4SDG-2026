"use client";
import {useEffect,useState} from 'react';
export default function Complete(){
 const [phase,setPhase]=useState<'loading'|'complete'|'error'>('loading');
 useEffect(()=>{const c=new AbortController();void fetch('/api/account/session',{cache:'no-store',credentials:'same-origin',signal:AbortSignal.any([c.signal,AbortSignal.timeout(10000)])}).then(r=>r.json()).then(v=>{if(c.signal.aborted)return;if(v.authenticated===true){setPhase('complete');window.opener?.postMessage({type:'offeranchor:auth-updated'},location.origin);if(window.opener)setTimeout(()=>window.close(),450);}else setPhase('error');}).catch(()=>{if(!c.signal.aborted)setPhase('error');});return()=>c.abort();},[]);
 return <main><h1>{phase==='complete'?'Signed in':phase==='error'?'Sign-in failed':'Checking session'}</h1><p>Return to the original review window.</p><a href={phase==='complete'?'/check':'/login'}>Continue</a></main>;
}
