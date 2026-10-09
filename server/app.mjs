import express from "express";
import {
  initialWorkspace,
  mutateWorkspace,
  InputError,
} from "../core/domain.mjs";

// One private workspace per installation. A revision check prevents a second
// browser tab from silently overwriting a newer save.
export function createApp(collection, ping) {
  const app = express();
  app.disable("x-powered-by");
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    next();
  });
  app.use("/api", (req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    if (req.method === "POST") {
      const origin = req.get("origin");
      try {
        if (origin && new URL(origin).host !== req.get("host"))
          return res
            .status(403)
            .json({ error: "This request must come from your workspace." });
      } catch {
        return res.status(403).json({ error: "Invalid origin." });
      }
      if (!req.is("application/json"))
        return res.status(415).json({ error: "Send JSON content." });
    }
    next();
  });
  app.use(express.json({ limit: "80kb", strict: true }));
  async function read() {
    await collection.updateOne(
      { _id: "personal" },
      { $setOnInsert: { ...initialWorkspace(), revision: 0 } },
      { upsert: true },
    );
    const doc = await collection.findOne(
      { _id: "personal" },
      { projection: { _id: 0 } },
    );
    if (!doc) throw new Error("Workspace unavailable");
    return doc;
  }
  app.get("/api/hello", (_req, res) =>
    res.type("text").send("Welcome to Mneme!"),
  );
  app.get("/api/health", async (_req, res) => {
    try {
      await ping();
      res.json({ status: "ok", service: "Mneme", database: "connected" });
    } catch {
      res.status(503).json({ status: "unavailable", database: "disconnected" });
    }
  });
  app.get("/api/workspace", async (_req, res) => res.json(await read()));
  app.post("/api/workspace", async (req, res) => {
    const { action, input, revision } = req.body ?? {};
    const current = await read();
    if (!Number.isInteger(revision) || revision !== current.revision)
      throw new InputError(
        "This workspace changed in another tab. We refreshed it; please save your input again.",
        409,
      );
    const next = mutateWorkspace(current, action, input);
    delete next.revision;
    const result = await collection.updateOne(
      { _id: "personal", revision },
      { $set: next, $inc: { revision: 1 } },
    );
    if (result.modifiedCount !== 1)
      throw new InputError(
        "This workspace changed in another tab. Please save again.",
        409,
      );
    res.json({ ...next, revision: revision + 1 });
  });
  app.use("/api", (_req, res) =>
    res.status(404).json({ error: "API route not found." }),
  );
  app.use((error, req, res, next) => {
    if (error instanceof InputError)
      return res.status(error.status).json({ error: error.message });
    if (error.type === "entity.too.large")
      return res.status(413).json({ error: "This checkpoint is too large." });
    if (error instanceof SyntaxError && "body" in error)
      return res.status(400).json({ error: "Invalid JSON." });
    console.error("Workspace request failed:", error.message);
    res
      .status(503)
      .json({
        error: "Your workspace is temporarily unavailable. Please try again.",
      });
  });
  return app;
}
