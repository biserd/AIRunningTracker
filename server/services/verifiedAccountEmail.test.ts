import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import type {AtomicSqlDatabase} from '../d1/jobStore';
import type {SqlStatement} from '../d1/activities';
import {VerifiedAccountEmail} from './verifiedAccountEmail';
function fixture(){
 const sql=new DatabaseSync(':memory:');sql.exec(`PRAGMA foreign_keys=ON;CREATE TABLE users(id INTEGER PRIMARY KEY,email TEXT UNIQUE,marketing_opt_out INTEGER DEFAULT 1,marketing_consent_status TEXT DEFAULT 'unknown',marketing_consented_at TEXT,marketing_consent_source TEXT);INSERT INTO users(id) VALUES(1),(2);INSERT INTO users(id,email) VALUES(3,'Existing@Example.com');`);
 const migration=readFileSync('apps/d1-migration/migrations/0044_verified_account_email.sql','utf8');sql.exec(migration);sql.exec(migration);
 const db:AtomicSqlDatabase={prepare(query){let params:(string|number|null)[]=[];const statement:SqlStatement={bind(...v){params=v;return statement;},async first<T>(){return (sql.prepare(query).get(...params)||null)as T|null;},async all<T>(){return {results:sql.prepare(query).all(...params)as T[]};},async run(){return {meta:{changes:Number(sql.prepare(query).run(...params).changes)}};}};return statement;},async batch(statements){sql.exec('BEGIN');try{const result=[];for(const s of statements)result.push(await s.run());sql.exec('COMMIT');return result;}catch(e){sql.exec('ROLLBACK');throw e;}}};
 let clock=1000000,token='',sends=0;const service=new VerifiedAccountEmail(db,async(_,value)=>{token=value;sends++;},()=>clock);
 return {sql,db,service,token:()=>token,sends:()=>sends,advance:(ms:number)=>{clock+=ms;}};
}
test('email is not attached and consent is unchanged until single-use verification',async()=>{
 const f=fixture();try{await f.service.request(1,' New@Example.com ',true);assert.equal(f.sql.prepare('SELECT email FROM users WHERE id=1').get()?.email,null);assert.equal(f.sql.prepare('SELECT marketing_opt_out FROM users WHERE id=1').get()?.marketing_opt_out,1);
 assert.notEqual(f.sql.prepare('SELECT token_hash FROM account_email_challenges').get()?.token_hash,f.token());
 assert.equal(await f.service.verify(f.token()),1);const user=f.sql.prepare('SELECT * FROM users WHERE id=1').get()!;assert.equal(user.email,'new@example.com');assert.equal(user.marketing_opt_out,0);assert.equal(user.marketing_consent_status,'consented');assert.equal(user.marketing_consent_source,'verified_account_email');await assert.rejects(f.service.verify(f.token()));
 }finally{f.sql.close();}
});
test('unchecked consent, newer unsubscribe and suppression remain opted out',async()=>{
 for(const status of ['unknown','unsubscribed','suppressed']){const f=fixture();try{await f.service.request(1,'new@example.com',status!=='unknown');f.sql.prepare('UPDATE users SET marketing_consent_status=? WHERE id=1').run(status);await f.service.verify(f.token());assert.equal(f.sql.prepare('SELECT marketing_opt_out FROM users WHERE id=1').get()?.marketing_opt_out,1);assert.equal(f.sql.prepare('SELECT marketing_consent_status FROM users WHERE id=1').get()?.marketing_consent_status,status);}finally{f.sql.close();}}
});
test('email ownership and challenge owner cannot be overwritten or merged',async()=>{
 const f=fixture();try{await assert.rejects(f.service.request(1,'existing@example.com',false),/EMAIL_IN_USE/);await assert.rejects(f.service.request(3,'new@example.com',true),/EMAIL_ALREADY_SET/);
 await f.service.request(1,'new@example.com',true);f.sql.prepare('UPDATE users SET email=? WHERE id=2').run('NEW@example.com');await assert.rejects(f.service.verify(f.token()));assert.equal(f.sql.prepare('SELECT email FROM users WHERE id=1').get()?.email,null);
 }finally{f.sql.close();}
});
test('cooldown, resend invalidation, expiry and failed delivery are enforced',async()=>{
 const f=fixture();try{await f.service.request(1,'new@example.com',false);const old=f.token();await assert.rejects(f.service.request(1,'new@example.com',false),/EMAIL_RATE_LIMIT/);assert.equal(f.sends(),1);
 f.advance(60001);await f.service.request(1,'new@example.com',false);await assert.rejects(f.service.verify(old));f.advance(900001);await assert.rejects(f.service.verify(f.token()));
 let failed='';const failure=new VerifiedAccountEmail(f.db,async(_,t)=>{failed=t;throw new Error('provider unavailable');});await assert.rejects(failure.request(2,'failure@example.com',true),/EMAIL_DELIVERY_FAILED/);await assert.rejects(failure.verify(failed));
 }finally{f.sql.close();}
});
test('account deletion cascades pending email challenges',async()=>{
 const f=fixture();try{await f.service.request(1,'new@example.com',true);f.sql.exec('DELETE FROM users WHERE id=1');assert.equal(f.sql.prepare('SELECT count(*) n FROM account_email_challenges').get()?.n,0);await assert.rejects(f.service.verify(f.token()));}finally{f.sql.close();}
});
test('an unchecked new-email preference opts out even when an older account default allowed unknown consent',async()=>{
 const f=fixture();try{f.sql.exec('UPDATE users SET marketing_opt_out=0 WHERE id=1');await f.service.request(1,'new@example.com',false);await f.service.verify(f.token());assert.equal(f.sql.prepare('SELECT marketing_opt_out FROM users WHERE id=1').get()?.marketing_opt_out,1);}finally{f.sql.close();}
});
