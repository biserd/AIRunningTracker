import React from 'react';
import type {State} from '../shared/coach';
export function RunningChart({state}:{state:State}) {
 const weeks=new Map<string,number>();
 for(const run of state.activities){const d=new Date(run.date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-((d.getUTCDay()+6)%7));const key=d.toISOString().slice(0,10);weeks.set(key,(weeks.get(key)||0)+run.km);}
 const rows=[...weeks].sort(([a],[b])=>a.localeCompare(b));const max=Math.max(1,...rows.map(([,km])=>km));
 return <figure className="running-chart"><h3>Your distance, week by week</h3><p>{state.source==="production_account"?"Recorded runs":"Sample activities"} · kilometers · weeks start Monday</p>{rows.length?rows.map(([date,km])=><div className="distance-row" key={date}><span>{date}</span><div><i style={{width:`${km/max*100}%`}}/></div><strong>{km.toFixed(1)} km</strong></div>):<p>No activities to chart.</p>}<figcaption>Based on {state.activities.length} available runs. Distance alone does not indicate improved fitness.</figcaption></figure>;
}
