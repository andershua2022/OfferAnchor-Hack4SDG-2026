import data from "../../knowledge/published-cases.json";

export type PublishedCase={
 id:string;kind:"reported_case"|"company_practice"|"official_guidance";title:string;category:string;region:string;transcriptAvailable:boolean;
 source:{publisher:string;publishedOn:string|null;checkedOn:string;url:string};
 summary:string;stages:string[];notice:string;question:string;limitation:string;relatedTopics:string[];keywords?:string[];fixtureId?:string;
};
export const publishedCases=data.cases as PublishedCase[];
export function publishedKindLabel(kind:PublishedCase["kind"]):string{
 return kind==="company_practice"?"Company practice":kind==="official_guidance"?"Official guidance":"Reported case";
}
function searchable(text:string):string{return text.normalize("NFKC").toLowerCase();}
// Local keyword matching with curated bilingual terms, not embeddings or a model call.
export function searchPublishedCases(query:string,category="All"):PublishedCase[]{
 const words=searchable(query).trim().split(/[\s,，;；·]+/u).filter(Boolean);
 return publishedCases.filter(item=>{
  if(category!=="All"&&item.category!==category)return false;
  const haystack=searchable([item.title,item.summary,item.notice,item.question,item.limitation,item.source.publisher,item.category,item.region,...item.stages,...(item.keywords??[])].join(" "));
  return words.every(word=>haystack.includes(word));
 });
}
export function matchingCases(referenceIds:readonly string[]):PublishedCase[]{
 const ids=new Set(referenceIds);
 return publishedCases.filter(item=>item.relatedTopics.some(id=>ids.has(id)));
}
