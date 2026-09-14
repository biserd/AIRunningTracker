import {db} from './db';
import {activities,coachRecaps,aiConversations,aiMessages,type InsertAIMessage} from '@shared/schema';
import {and,eq,sql} from 'drizzle-orm';

export async function deleteActivityAtomic(activityId:number){
  await db.transaction(async tx=>{
    await tx.delete(coachRecaps).where(eq(coachRecaps.activityId,activityId));
    await tx.execute(sql`DELETE FROM activity_route_map WHERE activity_id=${activityId}`);
    await tx.execute(sql`DELETE FROM activity_features WHERE activity_id=${activityId}`);
    await tx.execute(sql`DELETE FROM similar_runs_cache WHERE activity_id=${activityId}`);
    await tx.execute(sql`UPDATE plan_days SET linked_activity_id=NULL WHERE linked_activity_id=${activityId}`);
    await tx.execute(sql`UPDATE agent_runs SET activity_id=NULL WHERE activity_id=${activityId}`);
    await tx.delete(activities).where(eq(activities.id,activityId));
  });
}
export async function deleteConversationAtomic(conversationId:number,userId:number){
  return db.transaction(async tx=>{
    const [owned]=await tx.select({id:aiConversations.id}).from(aiConversations)
      .where(and(eq(aiConversations.id,conversationId),eq(aiConversations.userId,userId))).limit(1);
    if(!owned)return false;
    await tx.delete(aiMessages).where(eq(aiMessages.conversationId,owned.id));
    await tx.delete(aiConversations).where(and(eq(aiConversations.id,owned.id),eq(aiConversations.userId,userId)));
    return true;
  });
}
export async function addMessageAtomic(message:InsertAIMessage,userId:number){
  return db.transaction(async tx=>{
    const [owned]=await tx.select({id:aiConversations.id}).from(aiConversations)
      .where(and(eq(aiConversations.id,message.conversationId),eq(aiConversations.userId,userId))).limit(1);
    if(!owned)return undefined;
    const [inserted]=await tx.insert(aiMessages).values({...message,conversationId:owned.id}).returning();
    return inserted;
  });
}

export async function claimEmailJobIds(limit:number,workerId:string,leaseSeconds:number):Promise<number[]>{
  const result=await db.execute(sql`WITH candidates AS (
    SELECT id FROM email_jobs WHERE scheduled_at<=NOW() AND (next_attempt_at IS NULL OR next_attempt_at<=NOW())
    AND (status IN ('pending','retry_scheduled') OR (status='processing' AND lease_expires_at<NOW()))
    ORDER BY scheduled_at,id FOR UPDATE SKIP LOCKED LIMIT ${limit})
    UPDATE email_jobs AS jobs SET status='processing',claimed_at=NOW(),claimed_by=${workerId},
    lease_expires_at=NOW()+(${leaseSeconds} * INTERVAL '1 second')
    FROM candidates WHERE jobs.id=candidates.id RETURNING jobs.id`);
  return result.rows.map(row=>Number(row.id)).filter(Number.isSafeInteger);
}
