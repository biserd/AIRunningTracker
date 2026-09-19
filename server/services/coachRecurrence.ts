export type Recurrence='daily'|'weekly';
/** Wall-clock recurrence, not a fixed 24-hour interval. Skip nonexistent local
 * times during spring DST and use only the first occurrence during fall DST. */
export function nextOccurrence(anchor:number,after:number,zone:string,recurrence:Recurrence):number {
 if(!Number.isSafeInteger(anchor)||!Number.isSafeInteger(after)||!['daily','weekly'].includes(recurrence))throw new Error('Invalid schedule.');
 const formatter=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
 const local=(value:number)=>{
  const parts=formatter.formatToParts(new Date(value*1000));
  const get=(type:string)=>Number(parts.find(p=>p.type===type)?.value);
  return {y:get('year'),m:get('month'),d:get('day'),h:get('hour'),min:get('minute')};
 };
 const a=local(anchor),current=local(after),weekday=new Date(Date.UTC(a.y,a.m-1,a.d)).getUTCDay();
 for(let days=0;days<=15;days++){
  const date=new Date(Date.UTC(current.y,current.m-1,current.d+days));
  if(recurrence==='weekly'&&date.getUTCDay()!==weekday)continue;
  const naive=Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate(),a.h,a.min)/1000;
  const offsets=new Set<number>();
  for(const shift of [-86400,0,86400]){const sample=naive+shift,p=local(sample);offsets.add(Date.UTC(p.y,p.m-1,p.d,p.h,p.min)/1000-sample);}
  const candidates=[...offsets].map(offset=>naive-offset).filter(value=>{
   const p=local(value);return p.y===date.getUTCFullYear()&&p.m===date.getUTCMonth()+1&&p.d===date.getUTCDate()&&p.h===a.h&&p.min===a.min;
  }).sort((x,y)=>x-y);
  // Never emit the second occurrence of an ambiguous clock time.
  if(candidates[0]>after)return candidates[0];
 }
 throw new Error('Unable to resolve the next local reminder time.');
}
