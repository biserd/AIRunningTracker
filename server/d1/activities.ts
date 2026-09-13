import { positiveId } from './activityPolicy';

/** Narrow repository port, implemented by the Worker D1 binding or a SQLite test adapter. */
export interface SqlStatement {
  bind(...values:(string|number|null)[]):SqlStatement;
  first<T>():Promise<T|null>;
  all<T>():Promise<{results:T[]}>;
  run():Promise<{meta:{changes?:number}}>;
}
export interface SqlDatabase { prepare(sql:string):SqlStatement }
export interface ActivitySummary {
  id:number; user_id:number; strava_id:string; name:string; distance:number;
  moving_time:number; average_speed:number; average_heartrate:number|null;
  start_date:string; type:string;
}
const summaryColumns='id,user_id,strava_id,name,distance,moving_time,average_speed,average_heartrate,start_date,type';
const iso=(value:string)=>{
  const date=new Date(value);
  if(!Number.isFinite(date.getTime()))throw new Error('INVALID_DATE');
  return date.toISOString();
};

/** Caller must derive runnerId from verified authentication, never an AI tool argument. */
export class D1Activities {
  constructor(private readonly db:SqlDatabase){}

  async isExcluded(runnerId:number,stravaId:string):Promise<boolean>{
    positiveId(runnerId);
    if(!/^\d+$/.test(stravaId))throw new Error('INVALID_STRAVA_ID');
    return !!await this.db.prepare('SELECT 1 AS excluded FROM migration_activity_exclusions WHERE user_id=? AND strava_id=?')
      .bind(runnerId,stravaId).first();
  }

  async get(runnerId:number,activityId:number):Promise<ActivitySummary|null>{
    return this.db.prepare(`SELECT ${summaryColumns} FROM activities WHERE user_id=? AND id=?`)
      .bind(positiveId(runnerId),positiveId(activityId)).first<ActivitySummary>();
  }

  async list(runnerId:number,input:{from:string;to:string;limit?:number;cursor?:{date:string;id:number}}){
    positiveId(runnerId);
    const from=iso(input.from),to=iso(input.to);
    const duration=Date.parse(to)-Date.parse(from);
    if(duration<=0 || duration>366*86400000)throw new Error('DATE_RANGE_LIMIT');
    const limit=input.limit??50;
    if(!Number.isInteger(limit)||limit<1||limit>100)throw new Error('PAGE_SIZE_LIMIT');
    const values:(number|string)[]=[runnerId,from,to];
    let cursor='';
    if(input.cursor){
      const date=iso(input.cursor.date),id=positiveId(input.cursor.id);
      cursor=' AND (start_date < ? OR (start_date = ? AND id < ?))';values.push(date,date,id);
    }
    values.push(limit+1);
    const {results}=await this.db.prepare(`SELECT ${summaryColumns} FROM activities WHERE user_id=? AND start_date>=? AND start_date<?${cursor} ORDER BY start_date DESC,id DESC LIMIT ?`)
      .bind(...values).all<ActivitySummary>();
    const hasMore=results.length>limit,items=results.slice(0,limit),last=items.at(-1);
    return {items,nextCursor:hasMore&&last?{date:last.start_date,id:last.id}:null};
  }

  async getStreams(runnerId:number,activityId:number){
    // No SELECT *: session, Strava credentials and unrelated user data are unreachable.
    const row=await this.db.prepare('SELECT streams_data,laps_data FROM activities WHERE user_id=? AND id=?')
      .bind(positiveId(runnerId),positiveId(activityId)).first<{streams_data:string|null;laps_data:string|null}>();
    return row;
  }

  async updateStreams(runnerId:number,activityId:number,streams:string|null,laps:string|null){
    positiveId(runnerId);positiveId(activityId);
    for(const payload of [streams,laps]){
      if(payload!==null){
        if(new TextEncoder().encode(payload).byteLength>1_800_000)throw new Error('D1_ACTIVITY_TOO_LARGE');
        try {JSON.parse(payload);} catch {throw new Error('INVALID_ACTIVITY_PAYLOAD');}
      }
    }
    // The database trigger checks the full merged row atomically, including polylines.
    const result=await this.db.prepare('UPDATE activities SET streams_data=?,laps_data=? WHERE user_id=? AND id=?')
      .bind(streams,laps,runnerId,activityId).run();
    return result.meta.changes===1;
  }
}
