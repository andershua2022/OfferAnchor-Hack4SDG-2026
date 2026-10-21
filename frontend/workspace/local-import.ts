import {validateDocxArchive} from "./docx-bounds";
export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_EXTRACTED_CHARS = 24000;
export const ACCEPTED_FILES = ".pdf,.docx,.txt,.md,.png,.jpg,.jpeg,.webp";
export type FileKind = "text" | "pdf" | "docx" | "image";

export function classifyFile(file: Pick<File,"name"|"size"|"type">):FileKind {
 if(!file.size)throw new Error("This file is empty.");
 if(file.size>MAX_FILE_BYTES)throw new Error("Choose one file of 5 MB or less.");
 const ext=file.name.split(".").at(-1)?.toLowerCase();
 if(ext==="doc"||ext==="docm")throw new Error("Save this Word file as .docx or paste its text. Old .doc and macro-enabled documents are not supported.");
 const kind=ext==="docx"?"docx":ext==="pdf"?"pdf":ext==="txt"||ext==="md"?"text":["png","jpg","jpeg","webp"].includes(ext??"")?"image":null;
 if(!kind)throw new Error("Choose a PDF, DOCX, TXT, MD, PNG, JPG or WebP file.");
 const allowed=kind==="docx"?["application/vnd.openxmlformats-officedocument.wordprocessingml.document"]:kind==="pdf"?["application/pdf"]:kind==="text"?["text/plain","text/markdown","text/x-markdown"]:ext==="png"?["image/png"]:ext==="webp"?["image/webp"]:["image/jpeg"];
 if(file.type&&file.type!=="application/octet-stream"&&!allowed.includes(file.type.toLowerCase()))throw new Error("The file type does not match its name. Export it in a supported format.");
 return kind;
}
export function decodeText(bytes:Uint8Array):string {
 let value:string;
 try{value=new TextDecoder("utf-8",{fatal:true}).decode(bytes);}catch{throw new Error("Save this text file as UTF-8, then try again.");}
 value=value.replace(/^\uFEFF/,"").replace(/\r\n?/g,"\n");
 if(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(value))throw new Error("This does not appear to be a plain-text file.");
 if(value.length>MAX_EXTRACTED_CHARS)throw new Error("This document is too long for the local preview. Paste only the relevant section instead.");
 return value;
}
export function validateImportedText(value:string,existingChars:number):string|null {
 if(!value.trim())return "Add the words you want to check.";
 if(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(value))return "Remove unsupported control characters from this text.";
 if(value.length>4000)return "Select or edit this source to 4,000 characters or fewer. Nothing is shortened automatically.";
 if(value.length+existingChars>12000)return "The combined sources must stay within 12,000 characters. Shorten the selection first.";
 return null;
}
export function checkSignature(kind:FileKind,bytes:Uint8Array,name:string):void {
 if(kind==="text")return;
 if(kind==="docx"){validateDocxArchive(bytes);return;}
 const starts=(expected:number[])=>expected.every((value,i)=>bytes[i]===value);
 const ext=name.split(".").at(-1)?.toLowerCase();
 const valid=kind==="pdf"?new TextDecoder("latin1").decode(bytes.subarray(0,1024)).includes("%PDF-"):
 ext==="png"?starts([137,80,78,71,13,10,26,10]):ext==="webp"?starts([82,73,70,70])&&new TextDecoder().decode(bytes.subarray(8,12))==="WEBP":starts([255,216,255]);
 if(!valid)throw new Error("The file contents do not match its format. Choose the original file or export it again.");
}

declare global {interface Window {OfferAnchorDOCX?:{extract:(bytes:Uint8Array,signal:AbortSignal)=>Promise<{text:string;warnings:number}>};OfferAnchorPDF?:{extract:(bytes:Uint8Array,signal:AbortSignal)=>Promise<{text:string;pages:number;images?:string[]}>}}}
let pdfReader:Promise<NonNullable<Window["OfferAnchorPDF"]>>|undefined;
function loadPdfReader(){
 if(window.OfferAnchorPDF)return Promise.resolve(window.OfferAnchorPDF);
 if(pdfReader)return pdfReader;
 pdfReader=new Promise<NonNullable<Window["OfferAnchorPDF"]>>((resolve,reject)=>{
  const script=document.createElement("script");script.src=new URL("/workspace/assets/pdf-local.js",document.baseURI).href;
  const timer=setTimeout(()=>finish(new Error("Local PDF reader could not start. Paste the relevant text instead.")),15000);
  function finish(error?:Error){clearTimeout(timer);script.onload=null;script.onerror=null;if(error){script.remove();pdfReader=undefined;reject(error);}else if(window.OfferAnchorPDF)resolve(window.OfferAnchorPDF);else{pdfReader=undefined;reject(new Error("Local PDF reader is unavailable."));}}
  script.onload=()=>finish();script.onerror=()=>finish(new Error("Keep the full preview folder together to load the local PDF reader."));document.head.append(script);
 });
 return pdfReader;
}
let docxReader:Promise<NonNullable<Window["OfferAnchorDOCX"]>>|undefined;
function loadDocxReader(){
 if(window.OfferAnchorDOCX)return Promise.resolve(window.OfferAnchorDOCX);
 if(docxReader)return docxReader;
 docxReader=new Promise<NonNullable<Window["OfferAnchorDOCX"]>>((resolve,reject)=>{
  const script=document.createElement("script");script.src=new URL("/workspace/assets/docx-local.js",document.baseURI).href;
  const timer=setTimeout(()=>finish(new Error("Local Word reader could not start. Paste its text instead.")),15000);
  function finish(error?:Error){clearTimeout(timer);script.onload=null;script.onerror=null;if(error){script.remove();docxReader=undefined;reject(error);}else if(window.OfferAnchorDOCX)resolve(window.OfferAnchorDOCX);else{docxReader=undefined;reject(new Error("Local Word reader is unavailable."));}}
  script.onload=()=>finish();script.onerror=()=>finish(new Error("Keep the full preview folder together to load the Word reader."));document.head.append(script);
 });return docxReader;
}
export async function readLocalFile(file:File,signal:AbortSignal):Promise<{kind:FileKind;text:string;pages?:number;images?:string[]}>{
 const kind=classifyFile(file);signal.throwIfAborted();
 const bytes=new Uint8Array(await file.arrayBuffer());signal.throwIfAborted();checkSignature(kind,bytes,file.name);
 if(kind==="image")return {kind,text:""};
 if(kind==="text")return {kind,text:decodeText(bytes)};
 if(kind==="docx"){const reader=await loadDocxReader();signal.throwIfAborted();const result=await reader.extract(bytes,signal);signal.throwIfAborted();return {kind,text:decodeText(new TextEncoder().encode(result.text))};}
 const reader=await loadPdfReader();signal.throwIfAborted();
 return {kind,...await reader.extract(bytes,signal)};
}
