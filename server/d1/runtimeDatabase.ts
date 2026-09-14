import {SQLiteAsyncDialect} from 'drizzle-orm/sqlite-core';
import type {SQL} from 'drizzle-orm';
import {createD1Database} from './database';
import {privateDatabaseTransport} from './transport';
import {resultObjects,sqlDatabase} from './sqlAdapter';

// Used only by the isolated D1 application build. Missing configuration fails closed.
const transport=privateDatabaseTransport(process.env.D1_TRANSPORT_SECRET??'');
export const applicationSqlDatabase=sqlDatabase(transport);
const dialect=new SQLiteAsyncDialect();
const orm=createD1Database(transport);
export const db=Object.assign(orm,{
  async execute(query:SQL){
    const compiled=dialect.sqlToQuery(query);
    const params=compiled.params.map(value=>{
      if(value instanceof Date)return value.toISOString();
      if(typeof value==='boolean')return value?1:0;
      if(value===null||typeof value==='string'||(typeof value==='number'&&Number.isFinite(value)))return value;
      throw new Error('DATABASE_PARAMETER_TYPE');
    });
    return {rows:resultObjects(await transport.execute({sql:compiled.sql,params,method:'values'}))};
  },
});

// A missed PostgreSQL dependency must be visible, never silently reach the old database.
export const pool={
  async query():Promise<never>{throw new Error('UNPORTED_POSTGRES_QUERY');},
  async connect():Promise<never>{throw new Error('UNPORTED_POSTGRES_CONNECTION');},
};
