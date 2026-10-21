import {initialState,inputWithinBounds,normalizeLines,previewReducer,type PreviewState} from "../../app/fixture-preview";
export type AttachmentTarget="instruction"|"offer"|"advertisement";
export type ComposerFile={id:string;name:string;size:number;text:string;target:AttachmentTarget;reviewed:boolean;reading:boolean;error:string;ready?:boolean;origin?:"local"|"vision"|"manual";committedEvidenceId?:string};
export function prepareComposer(base:PreviewState,draft:{latest:string;advert:string;offer:string},files:readonly ComposerFile[]):{state:PreviewState|null;error:string|null;attachedEvidenceIds?:Record<string,string>}{
 const fail=(error:string)=>({state:null,error});
 const attachedEvidenceIds:Record<string,string>={};
 files=files.filter(file=>!file.committedEvidenceId);
 if(files.some(file=>file.reading))return fail("Wait for the attached files to finish reading.");
 if(files.some(file=>file.error))return fail("Remove or replace the file that could not be read.");
 if(files.some(file=>!file.reviewed&&!file.ready))return fail("Read the image or review unclear attachment text first.");
 if(files.some(file=>!file.text.trim()||file.text.length>4000))return fail("Keep each attached source within 4,000 characters.");
 let candidate=base;
 const attached=files.map(file=>({kind:file.target,label:"Attached "+(file.target==="instruction"?"instruction":file.target==="offer"?"offer":"advertisement")+(file.reviewed?" (user-reviewed text)":file.origin==="vision"?" (machine-read image text; not verified)":" (locally extracted text; not verified)"),text:normalizeLines(file.text)}));
 if(!base.request.evidence.length){
  const selected=[...[["advertisement","Job advertisement",draft.advert],["offer","Offer",draft.offer],["instruction","Latest instruction",draft.latest]].filter(([, ,value])=>value.trim()).map(([kind,label,value])=>({kind,label,text:normalizeLines(value)})),...attached];
  if(!selected.some(item=>item.kind==="instruction"))return fail("Add the latest instruction, or set one attachment to Latest instruction.");
  if(selected.length+base.nextEvidenceId-1>8)return fail("A check has eight source IDs. Start a new check or use fewer sources.");
  const evidence=selected.map((item,i)=>({...item,id:"E"+(base.nextEvidenceId+i),sequence:i+1}));
  const request={...base.request,evidence};if(!inputWithinBounds(request))return fail("Use up to 4,000 characters per source and 12,000 in total.");
  files.forEach((file,i)=>{attachedEvidenceIds[file.id]=evidence[evidence.length-files.length+i].id;});
  candidate=previewReducer(base,{type:"initialize",evidence});
 }else{
  if(base.nextEvidenceId+attached.length-1>8||base.request.evidence.length+attached.length>8)return fail("This check has used its eight source IDs. Start a new check for more material.");
  for(const [i,file] of attached.entries()){attachedEvidenceIds[files[i].id]="E"+candidate.nextEvidenceId;candidate=previewReducer(candidate,{type:"add",kind:file.kind,label:file.label,value:file.text});}
  if(!inputWithinBounds(candidate.request))return fail("Use up to 4,000 characters per source and 12,000 in total.");
 }
 return {state:candidate,error:null,attachedEvidenceIds};
}
