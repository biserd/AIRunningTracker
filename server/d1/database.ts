import {drizzle} from 'drizzle-orm/sqlite-proxy';
import * as schema from '../../shared/schema.d1';

export type DatabaseParameter=string|number|null;
export type DatabaseCommand={sql:string;params:DatabaseParameter[];method:'run'|'all'|'values'|'get'};
export type DatabaseResult={rows:unknown[];columns?:string[];changes?:number};
export interface DatabaseTransport {
  execute(command:DatabaseCommand):Promise<DatabaseResult>;
  batch(commands:DatabaseCommand[]):Promise<DatabaseResult[]>;
}

function command(sql:string,params:unknown[],method:DatabaseCommand['method']):DatabaseCommand {
  if(params.length>100)throw new Error('DATABASE_PARAMETER_LIMIT');
  const values=params.map(value=>{
    if(value===null||typeof value==='string'||(typeof value==='number'&&Number.isFinite(value)))return value;
    throw new Error('DATABASE_PARAMETER_TYPE');
  });
  return {sql,params:values,method};
}

/** Application ORM backed by D1, retaining typed dates, booleans and JSON codecs.
 * The transport must use native D1 binding calls and preserve atomic batch semantics.
 * Interactive PostgreSQL transactions deliberately remain unsupported.
 */
export function createD1Database(transport:DatabaseTransport){
  return drizzle(
    (sql,params,method)=>transport.execute(command(sql,params,method)),
    commands=>transport.batch(commands.map(c=>command(c.sql,c.params,c.method))),
    {schema},
  );
}
