export const FREE_COACH_CHAT_MESSAGES = 10;
export const FREE_COACH_CHAT_LIMIT_REACHED = "FREE_COACH_CHAT_LIMIT_REACHED";

export type CoachChatAllowance = {
  /** Null when the account has Premium chat access. */
  remaining: number | null;
};
