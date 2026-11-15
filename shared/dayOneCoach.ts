export const DAY_ONE_COACH_SOURCE = "signup_day1";
export const DAY_ONE_COACH_ENTRY = "/tools/race-predictor?source=signup_day1";
export const DAY_ONE_COACH_TOOL = DAY_ONE_COACH_ENTRY + "&mode=tool";
export const DAY_ONE_COACH_DASHBOARD = "/dashboard?openChat=new&source=signup_day1";
export const DAY_ONE_COACH_SIGN_IN = "/auth?redirect=" + encodeURIComponent(DAY_ONE_COACH_DASHBOARD);
export const DAY_ONE_COACH_QUESTION = "I can run three days a week. What should my next week look like?";

export const DAY_SEVEN_RACE_SOURCE = "signup_day7";
export const DAY_FOURTEEN_FUELING_SOURCE = "signup_day14";
export const SIGNUP_VALUE_LINKS = {
  DAY1: DAY_ONE_COACH_ENTRY,
  DAY7: "/tools/race-predictor?source=" + DAY_SEVEN_RACE_SOURCE,
  DAY14: "/tools/marathon-fueling?source=" + DAY_FOURTEEN_FUELING_SOURCE,
} as const;
