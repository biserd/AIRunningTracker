import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import bcrypt from 'bcrypt';
import {AuthService} from '../../server/services/authCore';
import {D1Accounts} from '../../server/d1/accounts';
import {reviewerLogin,isReviewAccount,REVIEW_EMAIL,REVIEW_USERNAME} from '../../server/services/reviewerAccess';
import type {SqlDatabase,SqlStatement} from '../../server/d1/activities';
function setup(){
 const raw=new DatabaseSync(':memory:');raw.exec(readFileSync('apps/d1-migration/migrations/0001_application.sql','utf8'));
 const db:SqlDatabase={prepare(sql){let values:any[]=[];const s:SqlStatement={bind(...v){values=v;return s},async first<T>(){return (raw.prepare(sql).get(...values)??null) as T|null},async all<T>(){return {results:raw.prepare(sql).all(...values) as T[]}},async run(){return {meta:{changes:Number(raw.prepare(sql).run(...values).changes)}}}};return s}};
 const auth=new AuthService(new D1Accounts(db),'unit-test-signing-secret-at-least-32-characters');
 return {raw,db,auth};
}
test('review login verifies real password and cannot select another runner or grant admin',async()=>{
 const {raw,db,auth}=setup();try{
 const password='test-only-review-password';
 raw.prepare('INSERT INTO users(email,username,password) VALUES(?,?,?)').run(REVIEW_EMAIL,REVIEW_USERNAME,await bcrypt.hash(password,10));
 const login=(v:{email:string;password:string})=>auth.login(v);
 const session=await reviewerLogin(db,{email:REVIEW_EMAIL,password,userId:105},'test-ip',login);
 assert.equal((await auth.verifyToken(session.token))?.id,1);
 await assert.rejects(reviewerLogin(db,{email:REVIEW_EMAIL,password:'incorrect-password'},'test-ip',login));
 await assert.rejects(reviewerLogin(db,{email:'real@example.test',password},'test-ip',login));
 raw.prepare('UPDATE users SET is_admin=1').run();
 await assert.rejects(reviewerLogin(db,{email:REVIEW_EMAIL,password},'test-ip',login));
 assert.equal(isReviewAccount({email:REVIEW_EMAIL,username:'other'}),false);
 }finally{raw.close()}
});
test('review login is rate limited and missing/invalid credentials fail closed',async()=>{
 const {raw,db}=setup();try{
 const login=async()=>{throw new Error('must not call login')};
 for(let n=0;n<20;n++)await assert.rejects(reviewerLogin(db,null,'one-ip',login),/REVIEW_CREDENTIALS/);
 await assert.rejects(reviewerLogin(db,null,'one-ip',login),/REVIEW_RATE_LIMIT/);
 await assert.rejects(reviewerLogin(db,null,'different-ip',login),/REVIEW_CREDENTIALS/);
 raw.prepare("UPDATE mcp_rate_limits SET window_started_at='2000-01-01T00:00:00Z'").run();
 await assert.rejects(reviewerLogin(db,null,'one-ip',login),/REVIEW_CREDENTIALS/);
 }finally{raw.close()}
});
