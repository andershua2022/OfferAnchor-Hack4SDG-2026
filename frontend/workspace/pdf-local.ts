// Bundled separately and loaded only when the user chooses a PDF.
// @ts-ignore The pinned upstream module is supplied with the local vendor files.
import {getDocument,GlobalWorkerOptions,OPS} from "../../public/workspace/vendor/pdfjs/pdf.mjs";
// @ts-ignore esbuild loads the upstream worker as text to keep file:// previews local.
import workerText from "../../public/workspace/vendor/pdfjs/pdf.worker.mjs";
GlobalWorkerOptions.workerSrc=URL.createObjectURL(new Blob([workerText],{type:"text/javascript"}));

async function extract(bytes:Uint8Array,signal:AbortSignal):Promise<{text:string;pages:number;images?:string[]}>{
 signal.throwIfAborted();
 const task=getDocument({data:bytes,isEvalSupported:false,useWasm:false,useWorkerFetch:false,disableFontFace:true,enableXfa:false,stopAtErrors:true,verbosity:0});
 let password=false;
 task.onPassword=()=>{password=true;void task.destroy();};
 const cancel=()=>{void task.destroy();};signal.addEventListener("abort",cancel,{once:true});
 try{
  const pdf=await task.promise;signal.throwIfAborted();
  if(pdf.numPages>10)throw new Error("Choose a PDF of 10 pages or fewer, or paste the relevant section.");
  const pages:string[]=[];let length=0;let hasImages=false;
  for(let pageNo=1;pageNo<=pdf.numPages;pageNo++){
   signal.throwIfAborted();const page=await pdf.getPage(pageNo),content=await page.getTextContent({disableNormalization:true});
   let value="",previous:{x:number;y:number;width:number;height:number;eol:boolean}|null=null;
   for(const item of content.items){
    if(typeof item.str!=="string")continue;
    const x=item.transform[4],y=item.transform[5];
    if(previous){
     if(previous.eol||Math.abs(y-previous.y)>Math.max(3,previous.height*.5)){if(!value.endsWith("\n"))value+="\n";}
     else if(x-(previous.x+previous.width)>1&&!/\s$/.test(value)&&!/^\s/.test(item.str))value+=" ";
    }
    value+=item.str;previous={x,y,width:item.width,height:item.height,eol:item.hasEOL};
   }
   length+=value.length;if(length>24000)throw new Error("This PDF has too much text for the local preview. Paste the relevant section instead.");
   const operators=await page.getOperatorList();if(operators.fnArray.some((op:number)=>[OPS.paintImageXObject,OPS.paintInlineImageXObject,OPS.paintImageMaskXObject,OPS.paintImageXObjectRepeat].includes(op)))hasImages=true;
   pages.push(value);page.cleanup();
  }
  const text=pages.join("\n\n");
  if(hasImages||pages.some(page=>!page.trim())){
   if(pdf.numPages>2)throw new Error("Choose at most two pages for a scanned or mixed PDF. Export the relevant pages as a smaller PDF or images.");
   const images:string[]=[];
   for(let pageNo=1;pageNo<=pdf.numPages;pageNo++){
    signal.throwIfAborted();const page=await pdf.getPage(pageNo),base=page.getViewport({scale:1});
    if(!Number.isFinite(base.width)||!Number.isFinite(base.height)||base.width<=0||base.height<=0)throw new Error("This PDF page has invalid dimensions.");
    const scale=Math.min(2,2560/Math.max(base.width,base.height),Math.sqrt(4194304/(base.width*base.height))),viewport=page.getViewport({scale});
    const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);const context=canvas.getContext('2d');if(!context)throw new Error("Local page rendering is unavailable.");
    try{await page.render({canvasContext:context,canvas,viewport,annotationMode:0}).promise;signal.throwIfAborted();images.push(canvas.toDataURL('image/jpeg',.92));}finally{canvas.width=canvas.height=0;page.cleanup();}
   }
   return {text:'',pages:pdf.numPages,images};
  }
  return {text,pages:pdf.numPages};
 }catch(error){
  if(signal.aborted)throw new DOMException("Import cancelled.","AbortError");
  if(password)throw new Error("Password-protected PDFs are not supported. Paste only the relevant words instead.");
  if(error instanceof Error&&/Choose a PDF|Choose at most two|too much text|No selectable text|invalid dimensions|rendering is unavailable/.test(error.message))throw error;
  throw new Error("This PDF could not be read locally. It may be damaged, scanned or use unsupported text. Paste the relevant words instead.");
 }finally{signal.removeEventListener("abort",cancel);await task.destroy();}
}
Object.assign(window,{OfferAnchorPDF:{extract}});
