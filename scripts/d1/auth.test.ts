import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import jwt from 'jsonwebtoken';
import {D1Accounts} from '../../server/d1/accounts';
import {AuthService} from '../../server/services/authCore';
import type {SqlDatabase,SqlStatement} from '../../server/d1/activities';

const secret='test-only-secret-never-use-in-production-123456';
function setup(){
  const db=new DatabaseSync(':memory:');
  db.exec(readFileSync('apps/d1-migration/migrations/0001_application.sql','utf8'));
  const port:SqlDatabase={prepare(sql){
    let values:(string|number|null)[]=[];
    const statement:SqlStatement={bind(...v){values=v;return statement;},
      async first<T>(){return (db.prepare(sql).get(...values)??null) as T|null;},
      async all<T>(){return {results:db.prepare(sql).all(...values) as T[]};},
      async run(){return {meta:{changes:Number(db.prepare(sql).run(...values).changes)}};}};
    return statement;
  }};
  const store=new D1Accounts(port);
  return {db,store,auth:new AuthService(store,secret)};
}
const runner={email:'runner@example.test',password:'test-password-123',firstName:'Test',lastName:'Runner',marketingConsent:false};

test('D1 registration, password login and existing session claims retain compatibility',async()=>{
  const {db,store,auth}=setup();try{
    const registered=await auth.register(runner);
    assert.equal(registered.user.email,runner.email);
    assert.equal((await auth.verifyToken(registered.token))?.id,registered.user.id);
    const account=(await store.getUser(registered.user.id))!;
    assert.notEqual(account.password,runner.password);
    assert.equal(account.marketingOptOut,true);
    assert.equal(account.marketingConsentStatus,'unknown');
    assert.ok(account.createdAt instanceof Date);
    const login=await auth.login({email:runner.email,password:runner.password});
    assert.equal(login.user.id,account.id);
    assert.equal('password' in login.user,false);
    await assert.rejects(auth.login({email:runner.email,password:'wrong-password'}),/Invalid email or password/);
    await assert.rejects(auth.register(runner),/already exists/);
  }finally{db.close();}
});

test('D1 auth separates magic links from sessions and rejects expiry, foreign signatures and deleted accounts',async()=>{
  const {db,auth}=setup();try{
    const {user,token}=await auth.register(runner);
    for(const magic of [await auth.generateMagicLinkToken(runner.email),await auth.generateEmailMagicLinkToken(runner.email)]){
      assert.ok(magic);
      assert.equal(await auth.verifyToken(magic),null);
      const verified=await auth.verifyMagicLinkToken(magic);
      assert.equal((await auth.verifyToken(verified.token))?.id,user.id);
    }
    await assert.rejects(auth.verifyMagicLinkToken(token),/invalid/);
    assert.equal(await auth.verifyToken(jwt.sign({userId:user.id},'different-signature-secret',{expiresIn:60})),null);
    assert.equal(await auth.verifyToken(jwt.sign({userId:user.id},secret,{expiresIn:-1})),null);
    assert.equal(await auth.generateMagicLinkToken('missing@example.test'),null);
    db.prepare('DELETE FROM users WHERE id=?').run(user.id);
    assert.equal(await auth.verifyToken(token),null);
  }finally{db.close();}
});

test('D1 reset hashes tokens and only one concurrent redemption can succeed',async()=>{
  const {db,store,auth}=setup();try{
    const {user}=await auth.register(runner);
    const token=(await auth.generatePasswordResetToken(runner.email))!;
    assert.notEqual((await store.getUser(user.id))?.resetToken,token);
    const results=await Promise.all([auth.resetPassword(token,'new-password-123'),auth.resetPassword(token,'new-password-123')]);
    assert.equal(results.filter(Boolean).length,1);
    assert.equal(await auth.resetPassword(token,'another-password'),false);
    assert.equal((await auth.login({email:runner.email,password:'new-password-123'})).user.id,user.id);
    const expired=(await auth.generatePasswordResetToken(runner.email))!;
    db.prepare('UPDATE users SET reset_token_expiry=? WHERE id=?').run('2000-01-01T00:00:00.000Z',user.id);
    assert.equal(await auth.resetPassword(expired,'expired-password'),false);
    assert.equal(await auth.generatePasswordResetToken('missing@example.test'),null);
  }finally{db.close();}
});
