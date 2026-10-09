import test from "node:test";
import assert from "node:assert/strict";
import { initialWorkspace, mutateWorkspace } from "../core/domain.mjs";
test("clearing samples preserves user work added to an example project", () => {
  let state = initialWorkspace();
  const projectId = state.projects[0].id;
  state = mutateWorkspace(state, "checkpoint.create", {
    projectId,
    title: "My real work",
    next: "Continue tomorrow",
  });
  state = mutateWorkspace(state, "examples.clear");
  assert.equal(state.checkpoints.length, 1);
  assert.equal(state.checkpoints[0].title, "My real work");
  assert.equal(state.projects.length, 1);
  assert.equal(state.projects[0].id, projectId);
  assert.equal(state.projects[0].sample, false);
});
test("a rejected save cannot mutate existing work", () => {
  const state = initialWorkspace();
  const snapshot = JSON.stringify(state);
  assert.throws(
    () =>
      mutateWorkspace(state, "checkpoint.create", {
        projectId: state.projects[0].id,
        title: "Not finished",
        next: "   ",
      }),
    /Next step is required/,
  );
  assert.equal(JSON.stringify(state), snapshot);
});
test("archived work stays unchanged and deleting a project removes its checkpoints", () => {
  let state = initialWorkspace();
  const id = state.projects[0].id;
  state = mutateWorkspace(state, "project.update", { id, archived: true });
  assert.throws(
    () =>
      mutateWorkspace(state, "checkpoint.create", {
        projectId: id,
        title: "Oops",
        next: "No",
      }),
    /Restore the project/,
  );
  state = mutateWorkspace(state, "project.delete", { id });
  assert.ok(!state.checkpoints.some((c) => c.projectId === id));
});
