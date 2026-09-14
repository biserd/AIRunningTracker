import {applicationSqlDatabase as db} from './runtimeDatabase';
import {D1Conversations} from './conversations';
import {positiveId} from './activityPolicy';
import type {InsertAIMessage,AIMessage} from '../../shared/schema';

export async function deleteActivityAtomic(activityId:number){
  positiveId(activityId);
  await db.batch([
    db.prepare('DELETE FROM coach_recaps WHERE activity_id=?').bind(activityId),
    db.prepare('DELETE FROM activity_route_map WHERE activity_id=?').bind(activityId),
    db.prepare('DELETE FROM activity_features WHERE activity_id=?').bind(activityId),
    db.prepare('DELETE FROM similar_runs_cache WHERE activity_id=?').bind(activityId),
    db.prepare('UPDATE plan_days SET linked_activity_id=NULL WHERE linked_activity_id=?').bind(activityId),
    db.prepare('UPDATE agent_runs SET activity_id=NULL WHERE activity_id=?').bind(activityId),
    db.prepare('DELETE FROM activities WHERE id=?').bind(activityId),
  ]);
}
export function deleteConversationAtomic(conversationId:number,userId:number){return new D1Conversations(db).remove(userId,conversationId);}
export async function addMessageAtomic(message:InsertAIMessage,userId:number):Promise<AIMessage|undefined>{
  const row=await db.prepare(`INSERT INTO ai_messages(conversation_id,role,content,feedback)
    SELECT id,?,?,? FROM ai_conversations WHERE id=? AND user_id=? RETURNING *`)
    .bind(message.role,message.content,message.feedback??null,positiveId(message.conversationId),positiveId(userId))
    .first<{id:number;conversation_id:number;role:'user'|'assistant';content:string;feedback:'positive'|'negative'|null;created_at:string|null}>();
  if(!row)return undefined;
  return {id:row.id,conversationId:row.conversation_id,role:row.role,content:row.content,feedback:row.feedback,createdAt:row.created_at?new Date(row.created_at):null};
}

export async function claimEmailJobIds(limit:number,workerId:string,leaseSeconds:number):Promise<number[]>{
  if(!Number.isInteger(limit)||limit<1||limit>100||!Number.isInteger(leaseSeconds)||leaseSeconds<60||leaseSeconds>900||!workerId||workerId.length>128)throw new Error('INVALID_EMAIL_CLAIM');
  const now=new Date(),at=now.toISOString(),until=new Date(now.getTime()+leaseSeconds*1000).toISOString();
  const result=await db.prepare(`UPDATE email_jobs SET status='processing',claimed_at=?,claimed_by=?,lease_expires_at=?
    WHERE id IN (SELECT id FROM email_jobs WHERE scheduled_at<=? AND (next_attempt_at IS NULL OR next_attempt_at<=?)
    AND (status IN ('pending','retry_scheduled') OR (status='processing' AND lease_expires_at<?))
    ORDER BY scheduled_at,id LIMIT ?) RETURNING id`).bind(at,workerId,until,at,at,at,limit).all<{id:number}>();
  return result.results.map(row=>row.id);
}
