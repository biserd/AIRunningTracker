import {test} from 'node:test';
import assert from 'node:assert/strict';
import {maintainTyping} from '../worker/whatsapp-typing';

test('Typing repeats while working and stops without waiting for the next interval',async()=>{
 let calls=0;let reached!:()=>void;const twice=new Promise<void>(resolve=>reached=resolve);
 const stop=maintainTyping(async()=>{if(++calls===2)reached();},5);
 await twice;await stop();const count=calls;
 await new Promise(resolve=>setTimeout(resolve,20));assert.equal(calls,count);assert.equal(count,2);
});
test('Stopping aborts an in-flight indicator; cosmetic failures do not escape',async()=>{
 let aborted=false;
 const stop=maintainTyping(signal=>new Promise<void>(resolve=>signal.addEventListener('abort',()=>{aborted=true;resolve();},{once:true})));
 await stop();assert.equal(aborted,true);
 await maintainTyping(async()=>{throw new Error('unavailable');})();
});
