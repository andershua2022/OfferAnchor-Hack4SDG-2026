import assert from 'node:assert/strict';
import {test} from 'node:test';
import {parseAnalyzeRequest} from '../../lib/contracts';
import {createSnapshot,readDeviceHistory,writeDeviceHistory} from '../../frontend/workspace/history';
import {initialState,previewReducer,previewFixture} from '../../app/fixture-preview';
test('manual browser records remain separate for guest and two verified UUID namespaces',()=>{
 const previous=Object.getOwnPropertyDescriptor(globalThis,'localStorage'),store=new Map<string,string>();Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(key:string)=>store.get(key)??null,setItem:(key:string,value:string)=>store.set(key,value)}});
 try{let state=previewReducer(initialState(),{type:'load',fixtureId:'task-en'});state=previewReducer(state,{type:'start',requestId:'account-history-01',now:1});const request=structuredClone(state.request);state=previewReducer(state,{type:'finish',requestId:request.requestId,revision:request.revision,outcome:previewFixture(request),now:2});const parsed=parseAnalyzeRequest(request);assert.ok(parsed.ok);const saved=createSnapshot(state,parsed.request,'Synthetic saved check'),a='6c97aa7e-4a3e-4a5a-b896-6785fc3c190a',b='f13bacb7-bb38-4c1a-b45e-4642ea731a35';assert.equal(writeDeviceHistory([saved],a).ok,true);assert.equal(readDeviceHistory(a).records.length,1);assert.equal(readDeviceHistory(b).records.length,0);assert.equal(readDeviceHistory().records.length,0);assert.equal(writeDeviceHistory([],b).ok,true);assert.equal(readDeviceHistory(a).records.length,1);assert.equal(writeDeviceHistory([],'../../account').ok,false);}finally{if(previous)Object.defineProperty(globalThis,'localStorage',previous);else Reflect.deleteProperty(globalThis,'localStorage');}
});
