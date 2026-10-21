import {isRecord,validUnicode} from '../contracts/schema.ts';
export const IMAGE_VERSION='image-intake-1.0.0' as const;
export const MAX_IMAGE_BYTES=2*1024*1024;
export const MAX_IMAGE_BODY=3*1024*1024;
export const OCR_MODEL='qwen-vl-ocr-2025-11-20';
export type ImageError='disabled'|'simulation_unavailable'|'not_configured'|'invalid_image'|'no_text'|'too_long'|'provider_error'|'invalid_output'|'timeout'|'cancelled';
export type ImageInput={contractVersion:typeof IMAGE_VERSION;requestId:string;consent:true;image:string};
export type ImageResponse={contractVersion:typeof IMAGE_VERSION;requestId:string;status:'complete';mode:'live';text:string;modelId:string;warnings:string[];usage:{inputTokens:number|null;outputTokens:number|null}}|{contractVersion:typeof IMAGE_VERSION;requestId:string;status:'incomplete';errorCode:ImageError};
const errors:ImageError[]=['disabled','simulation_unavailable','not_configured','invalid_image','no_text','too_long','provider_error','invalid_output','timeout','cancelled'];
const identifier=(v:unknown):v is string=>typeof v==='string'&&/^[A-Za-z0-9_-]{8,64}$/.test(v);
const keys=(v:Record<string,unknown>,expected:string[])=>Object.keys(v).sort().join(',')===[...expected].sort().join(',');
export function transcriptionText(v:unknown):v is string{return typeof v==='string'&&v.trim().length>0&&v.length<=24000&&validUnicode(v)&&!/[\u0000-\u0008\u000b-\u001f\u007f]/u.test(v);}
export function parseImageInput(v:unknown):ImageInput|null{
 if(!isRecord(v)||!keys(v,['contractVersion','requestId','consent','image'])||v.contractVersion!==IMAGE_VERSION||!identifier(v.requestId)||v.consent!==true||typeof v.image!=='string'||v.image.length>Math.ceil(MAX_IMAGE_BYTES/3)*4+40||!/^data:image\/(?:png|jpeg|webp);base64,(?:[A-Za-z0-9+/]{4})+(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(v.image))return null;
 return v as ImageInput;
}
export function validateImageResponse(v:unknown,requestId:string):v is ImageResponse{
 if(!isRecord(v)||v.contractVersion!==IMAGE_VERSION||v.requestId!==requestId||!identifier(v.requestId))return false;
 if(v.status==='incomplete')return keys(v,['contractVersion','requestId','status','errorCode'])&&errors.includes(v.errorCode as ImageError);
 if(v.status!=='complete'||!keys(v,['contractVersion','requestId','status','mode','text','modelId','warnings','usage'])||v.mode!=='live'||v.modelId!==OCR_MODEL||!transcriptionText(v.text)||!Array.isArray(v.warnings)||v.warnings.length>3||!v.warnings.every(s=>typeof s==='string'&&s.length<=240&&validUnicode(s))||!isRecord(v.usage)||!keys(v.usage,['inputTokens','outputTokens']))return false;
 return [v.usage.inputTokens,v.usage.outputTokens].every(n=>n===null||(Number.isSafeInteger(n)&&(n as number)>=0&&(n as number)<=2000000));
}
