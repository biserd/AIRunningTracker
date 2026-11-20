import type { Express, RequestHandler } from "express";
import { z } from "zod";
import { STARTER_ACTIONS, starterWeekSchema } from "@shared/starterJourney";
import type { AtomicSqlDatabase } from "../d1/jobStore";
import { recordFunnelEvent } from "./funnelAnalytics";
import { starterJourneyReportSql } from "./starterJourneyReport";

export function registerStarterJourneyRoutes(app: Express, options: {
  authenticate: RequestHandler; admin: RequestHandler; database: () => Promise<AtomicSqlDatabase>;
  record?: typeof recordFunnelEvent;
}) {
  const route = "/api/onboarding/starter-week";
  const noStore = { "Cache-Control": "private, no-store" };
  app.get(route, options.authenticate, async (req: any, res) => {
    res.set(noStore);
    try {
      const row = await (await options.database()).prepare("SELECT settings_json,saved_at FROM starter_weeks WHERE user_id=?")
        .bind(req.user.id).first<{ settings_json: string; saved_at: string }>();
      if (!row) return res.json({ week: null });
      return res.json({ week: { ...starterWeekSchema.parse(JSON.parse(row.settings_json)), savedAt: row.saved_at } });
    } catch {
      return res.status(503).json({ message: "Your saved week is temporarily unavailable." });
    }
  });
  app.put(route, options.authenticate, async (req: any, res) => {
    res.set(noStore);
    const week = starterWeekSchema.safeParse(req.body);
    if (!week.success) return res.status(400).json({ message: "Choose a valid goal and at least two distinct running days." });
    const savedAt = new Date().toISOString();
    try {
      await (await options.database()).prepare(`
        INSERT INTO starter_weeks(user_id,settings_json,saved_at) VALUES(?,?,?)
        ON CONFLICT(user_id) DO UPDATE SET settings_json=excluded.settings_json,saved_at=excluded.saved_at
      `).bind(req.user.id, JSON.stringify(week.data), savedAt).run();
      return res.json({ week: { ...week.data, savedAt } });
    } catch {
      return res.status(503).json({ message: "Could not save your week. Please try again." });
    }
  });
  app.post("/api/onboarding/event", options.authenticate, async (req: any, res) => {
    res.set(noStore);
    const parsed = z.object({ action: z.enum(STARTER_ACTIONS), session: z.string().uuid() }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid onboarding event" });
    const { action, session } = parsed.data;
    const event = await (options.record || recordFunnelEvent)({
      event: "starter_journey", userId: req.user.id, props: { session, action },
      dedupeKey: `starter-journey:${req.user.id}:${session}:${action}`,
    });
    return res.sendStatus(event.recorded || event.deduped ? 204 : 503);
  });
  app.get("/api/admin/starter-journey", options.admin, async (_req, res) => {
    res.set(noStore);
    try {
      const now = new Date().toISOString();
      const counts = await (await options.database()).prepare(starterJourneyReportSql).bind(now,now,now).first();
      return res.json({ counts });
    } catch {
      return res.status(503).json({ message: "Starter journey reporting is unavailable." });
    }
  });
}
