export type WorkspaceStatus={mode:"simulation"|"live"|"unavailable";accessRequired:boolean;authorized:boolean;ready:boolean;reason:string|null;expiresAt:number|null;trialPolicy?:{limit:5;period:'lifetime';unit:'ai_action_attempt'}};
export async function readWorkspaceStatus(signal:AbortSignal,send:typeof fetch=fetch):Promise<WorkspaceStatus>{
 const deadline=AbortSignal.any([signal,AbortSignal.timeout(8000)]);
 const response=await send("/api/session",{cache:"no-store",credentials:"same-origin",signal:deadline});
 if(!response.ok)throw Error("configuration_unavailable");
 const value:unknown=await response.json();
 if(!value||typeof value!=="object"||Array.isArray(value))throw Error("configuration_unavailable");
 const v=value as Record<string,unknown>;
 if(Object.keys(v).filter(k=>k!=='trialPolicy').sort().join(",")!=="accessRequired,authorized,expiresAt,mode,ready,reason"||
 !["simulation","live","unavailable"].includes(String(v.mode))||typeof v.authorized!=="boolean"||typeof v.accessRequired!=="boolean"||
 typeof v.ready!=="boolean"||!(v.reason===null||["configuration_unavailable","live_disabled","access_configuration","content_review","provider_configuration"].includes(String(v.reason)))||
 !(v.expiresAt===null||typeof v.expiresAt==="number"&&Number.isSafeInteger(v.expiresAt)))throw Error("configuration_unavailable");
 if(Object.hasOwn(v,'trialPolicy')){const p=v.trialPolicy as Record<string,unknown>|null;if(!p||typeof p!=='object'||Array.isArray(p)||Object.keys(p).sort().join(',')!=='limit,period,unit'||p.limit!==5||p.period!=='lifetime'||p.unit!=='ai_action_attempt')throw Error('configuration_unavailable');}
 return v as WorkspaceStatus;
}
