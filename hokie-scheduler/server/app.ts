import { redditConfigured } from "./providers/redditAuth";
import express from "express";
import type { Dependencies } from "./contracts";
import { requestSchema } from "./contracts";
import { recommend } from "./recommend";
import { config } from "./config";
import { timetable, catalog } from "./providers/vt";
import { reviews } from "./providers/reviews";
import { reddit } from "./providers/reddit";
import { rank } from "./llm";
export const defaultDependencies: Dependencies = {
  timetable,
  catalog,
  reviews,
  reddit,
  ...(config.openaiKey && config.openaiModel ? { rank } : {}),
};
export function createApp(deps: Dependencies = defaultDependencies) {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "48kb" }));
  app.use((req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    const origin = req.headers.origin;
    if (origin && !/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) {
      res
        .status(403)
        .json({ error: "This development API accepts local requests only." });
      return;
    }
    next();
  });
  const requests = new Map<string, { start: number; count: number }>();
  let active = 0;
  app.get("/api/health", (_req, res) =>
    res.json({
      ok: true,
      llmConfigured: !!deps.rank,
      providers: {
        timetable: true,
        catalog: true,
        reddit: redditConfigured(),
        ratemyprofessors: !!config.reviewFile || !!config.reviewFeedUrl,
      },
    }),
  );
  app.post("/api/recommendations", async (req, res) => {
    const parsed = requestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid recommendation request.",
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      });
      return;
    }
    const now = Date.now();
    for (const [ip, value] of requests)
      if (now - value.start > 60000) requests.delete(ip);
    const key = req.ip || "local";
    const count = requests.get(key) ?? { start: now, count: 0 };
    count.count++;
    requests.set(key, count);
    if (count.count > 10 || active >= 3) {
      res.setHeader("Retry-After", "60");
      res
        .status(429)
        .json({ error: "Too many requests. Try again in a minute." });
      return;
    }
    active++;
    try {
      res.json(await recommend(parsed.data, deps));
    } catch {
      res.status(503).json({
        error: "Recommendations are temporarily unavailable. Please try again.",
      });
    } finally {
      active--;
    }
  });
  app.use("/api", (_req, res) =>
    res.status(404).json({ error: "API route not found." }),
  );
  app.use(
    (
      error: Error & { status?: number },
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      res.status(error.status === 413 ? 413 : 400).json({
        error:
          error.status === 413
            ? "Request is too large."
            : "Invalid JSON request.",
      });
    },
  );
  return app;
}
