import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {NativeSignup} from '../../server/services/nativeSignup';
import {NativeStrava} from '../../server/services/nativeStrava';
import {AppleSubscriptionLedger,APPLE_PRODUCTS} from '../../server/services/appleSubscriptions';
import type {AtomicSqlDatabase} from '../../server/d1/jobStore';
import type {SqlStatement} from '../../server/d1/activities';
function setup(){
 const db=new DatabaseSync(':memory:');
 db.exec(`PRAGMA foreign_keys=ON; CREATE TABLE users(id INTEGER PRIMARY KEY,email TEXT UNIQUE,username TEXT,subscription_plan TEXT,subscription_status TEXT,marketing_opt_out INTEGER,marketing_consent_status TEXT);INSERT INTO users(id,email) VALUES(1,'first@example.com'),(2,'Existing@Example.com');`);
 const migration=readFileSync('migrations/20260919_native_onboarding.sql','utf8');db.exec(migration);db.exec(migration);
 const port:AtomicSqlDatabase={prepare(sql){let values:(string|number|null)[]=[];const statement:SqlStatement={bind(...v){values=v;return statement;},async first<T>(){return (db.prepare(sql).get(...values)??null) as T|null;},async all<T>(){return {results:db.prepare(sql).all(...values) as T[]};},async run(){return {meta:{changes:Number(db.prepare(sql).run(...values).changes)}};}};return statement;},async batch(statements){db.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());db.exec('COMMIT');return results;}catch(e){db.exec('ROLLBACK');throw e;}}};
 return {db,port};
}
test('signup verifies email once, creates no premature user, opts out of marketing',async()=>{
 const {db,port}=setup();let token='';const service=new NativeSignup(port,async(_,t)=>{token=t});
 await service.request(' New@Example.com ');
 assert.equal(db.prepare('SELECT count(*) AS n FROM users').get()?.n,2);
 assert.notEqual(db.prepare('SELECT token_hash FROM native_signup_challenges').get()?.token_hash,token);
 const id=await service.verify(token);assert.ok(id>2);
 assert.equal(db.prepare('SELECT marketing_opt_out FROM users WHERE id=?').get(id)?.marketing_opt_out,1);
 await assert.rejects(service.verify(token),/INVALID_TOKEN/);
});
test('existing email is reused case-insensitively and request cooldown holds',async()=>{
 const {db,port}=setup();let token='',sent=0;const service=new NativeSignup(port,async(_,t)=>{token=t;sent++});
 await service.request('existing@example.com');await service.request('EXISTING@example.com');assert.equal(sent,1);
 assert.equal(await service.verify(token),2);assert.equal(db.prepare('SELECT count(*) AS n FROM users').get()?.n,2);
});
test('expired signup and failed email cannot create an account',async()=>{
 const {port}=setup();let now=10000,token='';const service=new NativeSignup(port,async(_,t)=>{token=t},()=>now);
 await service.request('new@example.com');now+=901;await assert.rejects(service.verify(token),/INVALID_TOKEN/);
 const failed=new NativeSignup(port,async(_,t)=>{token=t;throw new Error('provider')});
 await assert.rejects(failed.request('other@example.com'));await assert.rejects(failed.verify(token));
});
test('Strava state is hashed, single-use, account-bound and replaced on retry',async()=>{
 const {port,db}=setup();const service=new NativeStrava(port,'123');const old=await service.start(1);const current=await service.start(1);
 assert.ok(current.url.startsWith('https://www.strava.com/oauth/authorize?'));
 assert.notEqual(db.prepare('SELECT state_hash FROM native_strava_connections').get()?.state_hash,current.state);
 await assert.rejects(service.consume(old.state));assert.equal(await service.consume(current.state),1);await assert.rejects(service.consume(current.state));
});
test('Apple ownership, environment isolation, expiry and out-of-order revocation',async()=>{
 const {port}=setup();const ledger=new AppleSubscriptionLedger(port);const token=await ledger.accountToken(1);
 assert.equal(await ledger.accountToken(1),token);
 const tx={bundleId:'run.aitracker.coach',productId:APPLE_PRODUCTS[0],environment:'Sandbox',appAccountToken:token,originalTransactionId:'original',transactionId:'tx',signedDate:Date.now(),expiresDate:Date.now()+60000};
 await assert.rejects(ledger.record(tx,2),/MISMATCH/);await ledger.record(tx,1);
 assert.equal(await ledger.access(1),null);assert.ok(await ledger.access(1,'Sandbox'));assert.equal(await ledger.access(2,'Sandbox'),null);
 await ledger.record({...tx,signedDate:tx.signedDate+1,revocationDate:Date.now()},1);
 await ledger.record(tx,1);assert.equal(await ledger.access(1,'Sandbox'),null);
 await assert.rejects(ledger.record({...tx,bundleId:'another.app'},1));
 await assert.rejects(ledger.record({...tx,appAccountToken:await ledger.accountToken(2)},2),/MISMATCH/);
});
