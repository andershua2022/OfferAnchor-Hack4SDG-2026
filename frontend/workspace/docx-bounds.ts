export function validateDocxArchive(bytes:Uint8Array):void{
 const fail=()=>{throw new Error("This Word file is invalid, protected or too complex. Save a smaller .docx or paste the relevant text.");};
 if(bytes.length<22)fail();
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let end=-1;
 for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--){if(view.getUint32(i,true)===0x06054b50&&i+22+view.getUint16(i+20,true)===bytes.length){end=i;break;}}
 if(end<0)fail();
 const count=view.getUint16(end+10,true),offset=view.getUint32(end+16,true),size=view.getUint32(end+12,true);
 if(view.getUint16(end+4,true)!==0||view.getUint16(end+6,true)!==0||view.getUint16(end+8,true)!==count||count===0||count>512||offset+size>end)fail();
 let pos=offset,total=0,document=false,contentTypes=false;
 for(let index=0;index<count;index++){
  if(pos+46>offset+size||view.getUint32(pos,true)!==0x02014b50)fail();
  const flags=view.getUint16(pos+8,true),method=view.getUint16(pos+10,true),expanded=view.getUint32(pos+24,true),nameLength=view.getUint16(pos+28,true),extra=view.getUint16(pos+30,true),comment=view.getUint16(pos+32,true),length=46+nameLength+extra+comment;
  if(flags&1||![0,8].includes(method)||pos+length>offset+size)fail();
  const name=new TextDecoder("utf-8",{fatal:true}).decode(bytes.subarray(pos+46,pos+46+nameLength));
  if(!name||name.includes("\0")||name.includes("\\")||name.startsWith("/")||name.split("/").includes(".."))fail();
  total+=expanded;if(total>20*1024*1024)fail();
  if(name==="word/document.xml")document=true;if(name==="[Content_Types].xml")contentTypes=true;pos+=length;
 }
 if(!document||!contentTypes||pos!==offset+size)fail();
}
