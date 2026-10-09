import { MongoClient } from "mongodb";
import express from "express";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createApp } from "./app.mjs";
const root = fileURLToPath(new URL("..", import.meta.url));
const port = Number(process.env.PORT || 3000);
const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/mneme";
const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
try {
  await client.connect();
  await client.db().command({ ping: 1 });
} catch {
  console.error(
    "MongoDB is unavailable. Check MONGODB_URI and start MongoDB before the application.",
  );
  await client.close();
  process.exit(1);
}
const app = createApp(client.db().collection("workspaces"), () =>
  client.db().command({ ping: 1 }),
);
const server = createServer(app);
let vite;
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(root, "dist")));
  app.get("/{*path}", (_req, res) =>
    res.sendFile(path.join(root, "dist", "index.html")),
  );
} else {
  const { createServer: createViteServer } = await import("vite");
  vite = await createViteServer({
    root,
    server: {
      middlewareMode: true,
      hmr: { server },
      watch: { usePolling: true, interval: 250 },
    },
    appType: "custom",
  });
  app.use(vite.middlewares);
  app.use(async (req, res, next) => {
    if (req.method !== "GET") return next();
    try {
      const template = await readFile(path.join(root, "index.html"), "utf8");
      res
        .status(200)
        .type("html")
        .send(await vite.transformIndexHtml(req.originalUrl, template));
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
app.use((error, _req, res, _next) => {
  console.error("Page rendering failed:", error.message);
  res
    .status(500)
    .type("text")
    .send("Mneme could not load this page. Please try again.");
});
server.listen(port, "0.0.0.0", () =>
  console.log(`Mneme ready at http://localhost:${port} — MongoDB connected`),
);
let closing = false;
async function shutdown() {
  if (closing) return;
  closing = true;
  const forced = setTimeout(() => process.exit(1), 8000);
  forced.unref();
  await new Promise((resolve) => server.close(resolve));
  await vite?.close();
  await client.close();
  clearTimeout(forced);
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
