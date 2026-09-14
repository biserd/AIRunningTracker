import type {DatabaseTransport,DatabaseCommand} from '../../../server/d1/database';

/** Native binding access only. This module must never use the administrative D1 REST API. */
export function nativeD1Transport(db:D1Database):DatabaseTransport {
  const prepared=(command:DatabaseCommand)=>db.prepare(command.sql).bind(...command.params);
  return {
    async execute(command){
      const statement=prepared(command);
      if(command.method==='run'){const result=await statement.run();return {rows:[],changes:result.meta.changes};}
      const [columns,...rows]=await statement.raw<unknown[]>({columnNames:true});
      return {rows:command.method==='get'?(rows[0]??[]):rows,columns};
    },
    async batch(commands){
      const results=await db.batch<Record<string,unknown>>(commands.map(prepared));
      return results.map((result,index)=>{
        if(commands[index].method==='run')return {rows:[],changes:result.meta.changes};
        const rows=result.results.map(row=>Object.values(row));
        return {rows:commands[index].method==='get'?(rows[0]??[]):rows,columns:Object.keys(result.results[0]??{}),changes:result.meta.changes};
      });
    },
  };
}
