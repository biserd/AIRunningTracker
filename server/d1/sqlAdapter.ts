import type {DatabaseTransport,DatabaseCommand,DatabaseResult} from './database';
import type {AtomicSqlDatabase} from './jobStore';
import type {SqlStatement} from './activities';

export function resultObjects(result:DatabaseResult):Record<string,unknown>[] {
  if(!result.rows.length)return [];
  if(!result.columns||result.columns.some(c=>typeof c!=='string'))throw new Error('DATABASE_COLUMNS_MISSING');
  const columns=result.columns;
  return result.rows.map(row=>{
    if(!Array.isArray(row)||row.length!==columns.length)throw new Error('DATABASE_ROW_INVALID');
    return Object.fromEntries(columns.map((name,index)=>[name,row[index]]));
  });
}

/** Bridges the application repositories and native atomic D1 batch execution. */
export function sqlDatabase(transport:DatabaseTransport):AtomicSqlDatabase {
  const commands=new WeakMap<SqlStatement,DatabaseCommand>();
  return {
    prepare(sql){
      const command:DatabaseCommand={sql,params:[],method:'values'};
      const statement:SqlStatement={
        bind(...params){command.params=params;return statement;},
        async first<T>(){return (resultObjects(await transport.execute(command))[0]??null) as T|null;},
        async all<T>(){return {results:resultObjects(await transport.execute(command)) as T[]};},
        async run(){const result=await transport.execute({...command,method:'run'});return {meta:{changes:result.changes}};},
      };
      commands.set(statement,command);return statement;
    },
    async batch(statements){
      const batch=statements.map(s=>{const c=commands.get(s);if(!c)throw new Error('DATABASE_FOREIGN_STATEMENT');return {...c,method:'run' as const};});
      return (await transport.batch(batch)).map(result=>({meta:{changes:result.changes}}));
    },
  };
}
