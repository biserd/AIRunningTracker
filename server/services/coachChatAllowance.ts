import { sql, type SQL } from "drizzle-orm";
import { FREE_COACH_CHAT_MESSAGES } from "../../shared/coachChatAllowance";

type Execute = (query: SQL) => Promise<{ rows: readonly unknown[] }>;

export async function freeCoachMessagesRemaining(execute: Execute, userId: number): Promise<number> {
  const { rows } = await execute(sql`
    SELECT messages_used FROM free_coach_chat_usage WHERE user_id = ${userId}
  `);
  const usage = rows[0] as { messages_used: number } | undefined;
  return Math.max(0, FREE_COACH_CHAT_MESSAGES - (usage?.messages_used ?? 0));
}

export async function reserveFreeCoachMessage(execute: Execute, userId: number): Promise<boolean> {
  const result = await execute(sql`
    INSERT INTO free_coach_chat_usage (user_id, messages_used)
    VALUES (${userId}, 1)
    ON CONFLICT (user_id) DO UPDATE
      SET messages_used = free_coach_chat_usage.messages_used + 1
      WHERE free_coach_chat_usage.messages_used < ${FREE_COACH_CHAT_MESSAGES}
    RETURNING user_id
  `);
  return result.rows.length === 1;
}

export async function refundFreeCoachMessage(execute: Execute, userId: number): Promise<void> {
  await execute(sql`
    UPDATE free_coach_chat_usage
    SET messages_used = messages_used - 1
    WHERE user_id = ${userId} AND messages_used > 0
  `);
}
