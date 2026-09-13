import { customType, integer, text } from 'drizzle-orm/sqlite-core';
export { sqliteTable as pgTable, text, integer, real, index, uniqueIndex } from 'drizzle-orm/sqlite-core';

// Names deliberately match the generated schema's source imports. This is a
// SQLite model, not a PostgreSQL compatibility layer or SQL translator.
export const serial = integer;
export const boolean = (name:string)=>integer(name,{mode:'boolean'});
export const json = (name:string)=>text(name,{mode:'json'});
export const jsonb = json;
export const timestamp=customType<{data:Date;driverData:string}>({
  dataType(){return 'text';},
  toDriver(value){
    if(!(value instanceof Date)||!Number.isFinite(value.getTime()))throw new Error('INVALID_TIMESTAMP');
    return value.toISOString();
  },
  fromDriver(value){
    const result=new Date(value);
    if(!Number.isFinite(result.getTime()))throw new Error('INVALID_STORED_TIMESTAMP');
    return result;
  },
});
