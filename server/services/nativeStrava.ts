import {createHash,randomBytes} from 'node:crypto';
import type {AtomicSqlDatabase} from '../d1/jobStore';
const digest=(value:string)=>createHash('sha256').update(value).digest('hex');
export class NativeStrava {
  constructor(private db:AtomicSqlDatabase,private clientId:string){}
  async start(user:number){
    if(!/^\d+$/.test(this.clientId))throw new Error('STRAVA_UNAVAILABLE');
    const state=randomBytes(32).toString('hex'),time=Math.floor(Date.now()/1000);
    await this.db.batch([
      this.db.prepare('DELETE FROM native_strava_connections WHERE user_id=? OR expires_at<?').bind(user,time),
      this.db.prepare('INSERT INTO native_strava_connections(state_hash,user_id,expires_at) VALUES(?,?,?)').bind(digest(state),user,time+600),
    ]);
    const url=new URL('https://www.strava.com/oauth/authorize');
    url.search=new URLSearchParams({client_id:this.clientId,response_type:'code',redirect_uri:'https://aitracker.run/api/native/strava/callback',approval_prompt:'auto',scope:'read,activity:read_all',state}).toString();
    return {url:url.toString(),state};
  }
  async consume(state:unknown){
    if(typeof state!=='string'||! /^[a-f0-9]{64}$/.test(state))throw new Error('INVALID_STATE');
    const row=await this.db.prepare('DELETE FROM native_strava_connections WHERE state_hash=? AND expires_at>? RETURNING user_id').bind(digest(state),Math.floor(Date.now()/1000)).first<{user_id:number}>();
    if(!row)throw new Error('INVALID_STATE');
    return row.user_id;
  }
}
