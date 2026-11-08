import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emailService} from './email';

test('magic-link email propagates provider refusal instead of reporting delivery success',async()=>{
 const original=emailService.sendEmail;
 try{
  emailService.sendEmail=async()=>false;
  await assert.rejects(emailService.sendMagicLinkEmail('fixture@example.test','signup_'+'a'.repeat(64),'https://new.aitracker.run'),/^Error: MAGIC_LINK_EMAIL_FAILED$/);
 }finally{emailService.sendEmail=original;}
});

test('native signup link stays in the native origin fragment and carries the exact challenge',async()=>{
 const original=emailService.sendEmail;let link='';
 try{
  emailService.sendEmail=async options=>{link=options.text?.match(/https:\/\/\S+/)?.[0]||'';return true;};
  const token='signup_'+'b'.repeat(64);
  await emailService.sendMagicLinkEmail('fixture@example.test',token,'https://new.aitracker.run');
  const url=new URL(link);assert.equal(url.origin,'https://new.aitracker.run');assert.equal(url.search,'');
  assert.equal(new URLSearchParams(url.hash.slice(1)).get('token'),token);
 }finally{emailService.sendEmail=original;}
});
