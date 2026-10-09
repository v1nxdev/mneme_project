import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { MongoClient } from "mongodb";
import { createApp } from "../server/app.mjs";
const uri = process.env.MONGODB_TEST_URI || process.env.MONGODB_URI;
test(
  "MongoDB API: persistence, validation, conflicting edits, and cleanup",
  { skip: !uri },
  async () => {
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
    await client.connect();
    // The test owns a newly named database and never deletes application data.
    const db = client.db(`mneme_test_${randomUUID().replaceAll("-", "")}`),
      collection = db.collection("workspaces");
    const app = createApp(collection, () => db.command({ ping: 1 })),
      server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    const url = `http://127.0.0.1:${server.address().port}`;
    const get = async () => {
      const r = await fetch(url + "/api/workspace");
      assert.equal(r.status, 200);
      return r.json();
    };
    const post = (action, input, revision) =>
      fetch(url + "/api/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, input, revision }),
      });
    try {
      let state = await get();
      let response = await post(
        "project.create",
        { name: "API test", description: "Temporary", color: "lime" },
        state.revision,
      );
      assert.equal(response.status, 200);
      state = await response.json();
      const id = state.projects[0].id;
      assert.equal((await get()).projects[0].name, "API test");
      response = await post(
        "checkpoint.create",
        {
          projectId: id,
          title: "Persistent context",
          working: "API roundtrip",
          next: "Resume after a reload",
        },
        state.revision,
      );
      assert.equal(response.status, 200);
      state = await response.json();
      const checkpointId = state.checkpoints[0].id;
      assert.equal(
        (await collection.findOne({ _id: "personal" })).checkpoints[0].next,
        "Resume after a reload",
      );
      const before = state.revision;
      const concurrent = await Promise.all([
        post("project.update", { id, name: "Edit A" }, before),
        post("project.update", { id, name: "Edit B" }, before),
      ]);
      assert.deepEqual(concurrent.map((r) => r.status).sort(), [200, 409]);
      state = await get();
      response = await post(
        "checkpoint.create",
        { projectId: id, title: "Missing next", next: "" },
        state.revision,
      );
      assert.equal(response.status, 400);
      assert.equal((await get()).revision, state.revision);
      response = await fetch(url + "/api/workspace", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "https://unrelated.example",
        },
        body: JSON.stringify({
          action: "project.delete",
          input: { id },
          revision: state.revision,
        }),
      });
      assert.equal(response.status, 403);
      response = await post(
        "checkpoint.update",
        {
          id: checkpointId,
          projectId: id,
          title: "Edited context",
          working: "Saved",
          blocked: "",
          tried: "Reload",
          next: "Keep going",
        },
        state.revision,
      );
      assert.equal(response.status, 200);
      state = await response.json();
      assert.equal(state.checkpoints[0].title, "Edited context");
      response = await post("project.delete", { id }, state.revision);
      assert.equal(response.status, 200);
      state = await get();
      assert.ok(!state.checkpoints.some((c) => c.projectId === id));
      assert.equal((await fetch(url + "/api/health")).status, 200);
    } finally {
      await new Promise((resolve) => server.close(resolve));
      await db.dropDatabase();
      await client.close();
    }
  },
);
