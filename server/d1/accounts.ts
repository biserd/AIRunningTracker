import {getTableColumns} from 'drizzle-orm';
import {users} from '../../shared/schema.d1';
import type {User,InsertUser} from '../../shared/schema';
import type {AuthStore} from '../services/authStore';
import type {SqlDatabase} from './activities';
import {positiveId} from './activityPolicy';

const fields=getTableColumns(users);
function decode(row:Record<string,unknown>|null):User|undefined{
  if(!row)return undefined;
  // Column names/codecs come only from the checked-in schema, never request data.
  return Object.fromEntries(Object.entries(fields).map(([key,column])=>[
    key,row[column.name]===null?null:column.mapFromDriverValue(row[column.name]),
  ])) as User;
}
const bindValue=(value:unknown):string|number|null=>{
  if(value===null||typeof value==='string'||typeof value==='number')return value;
  throw new Error('INVALID_ACCOUNT_FIELD');
};
/** Internal account repository. Never expose this full record as an API response. */
export class D1Accounts implements AuthStore {
  constructor(private db:SqlDatabase){}
  async getUser(id:number){return decode(await this.db.prepare('SELECT * FROM users WHERE id=?').bind(positiveId(id)).first<Record<string,unknown>>());}
  async getUserByEmail(email:string){
    if(email.length>254)throw new Error('INVALID_EMAIL');
    return decode(await this.db.prepare('SELECT * FROM users WHERE email=?').bind(email).first<Record<string,unknown>>());
  }
  async createUser(input:InsertUser):Promise<User>{
    const entries=Object.entries(input).filter(([,v])=>v!==undefined);
    if(entries.length===0||entries.length>90)throw new Error('INVALID_ACCOUNT_FIELDS');
    const columns:string[]=[],values:(string|number|null)[]=[];
    for(const [key,value] of entries){
      if(key==='id'||!Object.hasOwn(fields,key))throw new Error('INVALID_ACCOUNT_FIELD');
      const column=fields[key as keyof typeof fields];
      columns.push(`"${column.name}"`);
      values.push(value===null?null:bindValue(column.mapToDriverValue(value)));
    }
    const user=decode(await this.db.prepare(`INSERT INTO users(${columns.join(',')}) VALUES(${values.map(()=>'?').join(',')}) RETURNING *`)
      .bind(...values).first<Record<string,unknown>>());
    if(!user)throw new Error('ACCOUNT_CREATE_FAILED');
    return user;
  }
  async updateUserResetToken(id:number,hash:string,expiresAt:Date){
    await this.db.prepare('UPDATE users SET reset_token=?,reset_token_expiry=? WHERE id=?')
      .bind(hash,expiresAt.toISOString(),positiveId(id)).run();
  }
  async getUserByResetToken(hash:string){return decode(await this.db.prepare('SELECT * FROM users WHERE reset_token=?')
    .bind(hash).first<Record<string,unknown>>());}
  async updateUserPassword(id:number,passwordHash:string){
    await this.db.prepare('UPDATE users SET password=?,reset_token=NULL,reset_token_expiry=NULL WHERE id=?').bind(passwordHash,positiveId(id)).run();
  }
  async consumePasswordReset(id:number,tokenHash:string,passwordHash:string,now:Date){
    const result=await this.db.prepare('UPDATE users SET password=?,reset_token=NULL,reset_token_expiry=NULL WHERE id=? AND reset_token=? AND reset_token_expiry>?')
      .bind(passwordHash,positiveId(id),tokenHash,now.toISOString()).run();
    return result.meta.changes===1;
  }
}
