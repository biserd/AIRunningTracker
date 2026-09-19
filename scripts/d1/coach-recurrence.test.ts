import {test} from 'node:test';
import assert from 'node:assert/strict';
import {nextOccurrence} from '../../server/services/coachRecurrence';
const seconds=(value:string)=>Date.parse(value)/1000;
const iso=(value:number)=>new Date(value*1000).toISOString();
test('daily recurrence keeps the local hour across DST rather than adding 24 hours',()=>{
 const anchor=seconds('2026-03-07T12:00:00Z');
 assert.equal(iso(nextOccurrence(anchor,anchor,'America/New_York','daily')),'2026-03-08T11:00:00.000Z');
});
test('spring missing time skips an occurrence and fall ambiguity emits only once',()=>{
 const spring=seconds('2026-03-07T07:30:00Z');
 assert.equal(iso(nextOccurrence(spring,spring,'America/New_York','daily')),'2026-03-09T06:30:00.000Z');
 const fall=seconds('2026-10-31T05:30:00Z'),first=seconds('2026-11-01T05:30:00Z');
 assert.equal(nextOccurrence(fall,fall,'America/New_York','daily'),first);
 assert.equal(iso(nextOccurrence(fall,first,'America/New_York','daily')),'2026-11-02T06:30:00.000Z');
});
test('weekly recurrence preserves weekday and skips downtime backlog',()=>{
 const anchor=seconds('2026-09-21T11:00:00Z');
 assert.equal(iso(nextOccurrence(anchor,seconds('2026-10-01T15:00:00Z'),'America/New_York','weekly')),'2026-10-05T11:00:00.000Z');
 assert.throws(()=>nextOccurrence(anchor,anchor,'Not/AZone','daily'));
});
