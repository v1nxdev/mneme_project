// Domain rules shared by the hosted review and Express/MongoDB.
export class InputError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}
function text(v, name, max = 6000, required = false) {
  if (typeof v !== "string") throw new InputError(`${name} must be text.`);
  v = v.trim();
  if (v.length > max)
    throw new InputError(`${name} is too long (maximum ${max} characters).`);
  if (required && !v) throw new InputError(`${name} is required.`);
  return v;
}
const colors = ["lime", "blue", "orange", "violet"];
export function initialWorkspace(now = Date.now()) {
  const at = (m) => new Date(now - m * 60000).toISOString();
  const projects = [
    {
      id: "example-interface",
      name: "Interface system",
      description: "A quieter, more intentional interface.",
      color: "lime",
      archived: false,
      sample: true,
      createdAt: at(4200),
      updatedAt: at(28),
    },
    {
      id: "example-orbit",
      name: "Orbit API",
      description: "A small backend with a solid foundation.",
      color: "blue",
      archived: false,
      sample: true,
      createdAt: at(5500),
      updatedAt: at(185),
    },
    {
      id: "example-motion",
      name: "Motion studies",
      description: "Making small interactions feel right.",
      color: "orange",
      archived: false,
      sample: true,
      createdAt: at(6800),
      updatedAt: at(1440),
    },
  ];
  const checkpoints = [
    {
      id: "example-cp-1",
      projectId: projects[0].id,
      title: "Navigation finally feels right",
      working:
        "The sidebar collapses smoothly. Keyboard navigation and focus states are in place.",
      blocked: "The project menu is a little cramped at 375px wide.",
      tried:
        "Reduced the icon spacing and tested a horizontal layout. Neither felt quite right.",
      next: "Try moving the project switcher into a bottom sheet on mobile.",
      createdAt: at(28),
      updatedAt: at(28),
      sample: true,
    },
    {
      id: "example-cp-2",
      projectId: projects[1].id,
      title: "Database connection is stable",
      working:
        "MongoDB connects on startup. The health endpoint checks database availability.",
      blocked: "",
      tried:
        "Added a connection timeout and a clear error response when the database is unavailable.",
      next: "Add input validation to the create-project endpoint.",
      createdAt: at(185),
      updatedAt: at(185),
      sample: true,
    },
    {
      id: "example-cp-3",
      projectId: projects[2].id,
      title: "Finding the right easing curve",
      working:
        "The dialog fades and settles into position without a hard stop.",
      blocked: "",
      tried:
        "Compared 180ms, 240ms, and 320ms transitions. 240ms feels most natural.",
      next: "Check the reduced-motion version and remove unnecessary movement.",
      createdAt: at(1440),
      updatedAt: at(1440),
      sample: true,
    },
    {
      id: "example-cp-4",
      projectId: projects[0].id,
      title: "Foundations in place",
      working: "Type scale, spacing, and the dark palette are defined.",
      blocked: "",
      tried:
        "A softer green is easier to read against the charcoal background.",
      next: "Build the navigation and project cards.",
      createdAt: at(2850),
      updatedAt: at(2850),
      sample: true,
    },
  ];
  return { projects, checkpoints };
}
export function mutateWorkspace(
  current,
  action,
  input = {},
  now = new Date().toISOString(),
) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new InputError("Provide a valid action input.");
  const state = structuredClone(current);
  const project = (id) => {
    const p = state.projects.find((p) => p.id === id);
    if (!p) throw new InputError("Project not found.", 404);
    return p;
  };
  if (action === "project.create") {
    if (state.projects.length >= 200)
      throw new InputError("This workspace has reached its 200-project limit.");
    state.projects.unshift({
      id: crypto.randomUUID(),
      name: text(input.name, "Project name", 64, true),
      description: text(input.description ?? "", "Description", 240),
      color: colors.includes(input.color) ? input.color : "lime",
      archived: false,
      sample: false,
      createdAt: now,
      updatedAt: now,
    });
  } else if (action === "project.update") {
    const p = project(input.id);
    if (input.name !== undefined)
      p.name = text(input.name, "Project name", 64, true);
    if (input.description !== undefined)
      p.description = text(input.description, "Description", 240);
    if (input.color !== undefined) {
      if (!colors.includes(input.color))
        throw new InputError("Choose a valid color.");
      p.color = input.color;
    }
    if (input.archived !== undefined) {
      if (typeof input.archived !== "boolean")
        throw new InputError("Archived must be true or false.");
      p.archived = input.archived;
    }
    p.updatedAt = now;
  } else if (action === "project.delete") {
    project(input.id);
    state.projects = state.projects.filter((p) => p.id !== input.id);
    state.checkpoints = state.checkpoints.filter(
      (c) => c.projectId !== input.id,
    );
  } else if (action === "checkpoint.create" || action === "checkpoint.update") {
    const p = project(input.projectId);
    if (p.archived)
      throw new InputError(
        "Restore the project before changing its checkpoints.",
      );
    const fields = {
      projectId: p.id,
      title: text(input.title, "Checkpoint title", 100, true),
      working: text(input.working ?? "", "What is working"),
      blocked: text(input.blocked ?? "", "What is blocked"),
      tried: text(input.tried ?? "", "What you tried"),
      next: text(input.next, "Next step", 2000, true),
      updatedAt: now,
    };
    if (action === "checkpoint.create") {
      if (state.checkpoints.length >= 2000)
        throw new InputError(
          "This workspace has reached its 2,000-checkpoint limit.",
        );
      state.checkpoints.unshift({
        id: crypto.randomUUID(),
        ...fields,
        createdAt: now,
        sample: false,
      });
    } else {
      const c = state.checkpoints.find((c) => c.id === input.id);
      if (!c) throw new InputError("Checkpoint not found.", 404);
      if (c.projectId !== p.id)
        throw new InputError("A checkpoint cannot move to another project.");
      Object.assign(c, fields);
    }
    p.updatedAt = now;
  } else if (action === "checkpoint.delete") {
    const c = state.checkpoints.find((c) => c.id === input.id);
    if (!c) throw new InputError("Checkpoint not found.", 404);
    state.checkpoints = state.checkpoints.filter((c) => c.id !== input.id);
    project(c.projectId).updatedAt = now;
  } else if (action === "examples.clear") {
    const keep = new Set(
      state.checkpoints.filter((c) => !c.sample).map((c) => c.projectId),
    );
    state.projects = state.projects
      .filter((p) => !p.sample || keep.has(p.id))
      .map((p) => ({ ...p, sample: false }));
    state.checkpoints = state.checkpoints.filter((c) => !c.sample);
  } else throw new InputError("Unknown workspace action.");
  if (JSON.stringify(state).length > 4000000)
    throw new InputError(
      "Workspace storage limit reached. Export a backup and remove old checkpoints.",
    );
  return state;
}
