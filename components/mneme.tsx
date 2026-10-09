"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";
import {
  Archive,
  Box,
  Check,
  CheckCheck,
  ChevronRight,
  Circle,
  Code2,
  Download,
  Folder,
  FolderOpen,
  GitCommitHorizontal,
  LayoutGrid,
  Loader2,
  MoreHorizontal,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Terminal,
  Trash2,
  Volume2,
  VolumeX,
  X,
  Zap,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

type Project = {
  id: string;
  name: string;
  description: string;
  color: string;
  archived: boolean;
  sample: boolean;
  createdAt: string;
  updatedAt: string;
};
type Checkpoint = {
  id: string;
  projectId: string;
  title: string;
  working: string;
  blocked: string;
  tried: string;
  next: string;
  sample: boolean;
  createdAt: string;
  updatedAt: string;
};
type Workspace = {
  projects: Project[];
  checkpoints: Checkpoint[];
  revision: number;
};
type Draft = {
  id?: string;
  projectId: string;
  title: string;
  working: string;
  blocked: string;
  tried: string;
  next: string;
};
type Confirm = {
  title: string;
  description: string;
  label: string;
  action: string;
  input: Record<string, unknown>;
};
type Tone = "click" | "hover" | "save" | "boot";
const colors: Record<string, string> = {
  lime: "#c1f887",
  blue: "#9bbcff",
  orange: "#efb780",
  violet: "#c7a8f7",
};
const blank = (projectId = ""): Draft => ({
  projectId,
  title: "",
  working: "",
  blocked: "",
  tried: "",
  next: "",
});
function ago(s: string) {
  const m = Math.max(
    0,
    Math.floor((Date.now() - new Date(s).getTime()) / 60000),
  );
  return m < 1
    ? "just now"
    : m < 60
      ? `${m}m ago`
      : m < 1440
        ? `${Math.floor(m / 60)}h ago`
        : `${Math.floor(m / 1440)}d ago`;
}
function date(s: string) {
  return new Date(s).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
function Glyph({ className = "" }: { className?: string }) {
  return (
    <span className={`mneme-glyph ${className}`} aria-hidden="true">
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}
function SoundGlyph({ on }: { on: boolean }) {
  return on ? <Volume2 size={17} /> : <VolumeX size={17} />;
}
function BinaryField({ active }: { active: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!active) return;
    const c = ref.current;
    if (!c) return;
    const x = c.getContext("2d");
    if (!x) return;
    let frame = 0,
      then = 0,
      drops: number[] = [];
    const resize = () => {
      const ratio = Math.min(devicePixelRatio || 1, 2);
      c.width = c.clientWidth * ratio;
      c.height = c.clientHeight * ratio;
      x.setTransform(ratio, 0, 0, ratio, 0, 0);
      drops = Array.from(
        { length: Math.ceil(c.clientWidth / 24) },
        () => Math.random() * (c.clientHeight / 20),
      );
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(c);
    const draw = (time: number) => {
      frame = requestAnimationFrame(draw);
      if (time - then < 60) return;
      then = time;
      x.fillStyle = "rgba(7,10,8,.10)";
      x.fillRect(0, 0, c.clientWidth, c.clientHeight);
      x.font = "13px monospace";
      drops.forEach((y, i) => {
        x.fillStyle = i % 5 === 0 ? "#a8e77c" : "#315f36";
        x.fillText(Math.random() > 0.5 ? "1" : "0", i * 24, y * 20);
        drops[i] += 0.45;
        if (y * 20 > c.clientHeight && Math.random() > 0.99)
          drops[i] = -Math.random() * 12;
      });
    };
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [active]);
  return <canvas ref={ref} className="binary-field" aria-hidden="true" />;
}
export default function Mneme() {
  return (
    <SidebarProvider
      defaultOpen
      style={{ "--sidebar-width": "232px" } as CSSProperties}
    >
      <WorkspaceApp />
    </SidebarProvider>
  );
}
function WorkspaceApp() {
  const [data, setData] = useState<Workspace>({
    projects: [],
    checkpoints: [],
    revision: 0,
  });
  const [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [page, setPage] = useState("workspace"),
    [projectId, setProjectId] = useState<string | null>(null),
    [search, setSearch] = useState(""),
    [filter, setFilter] = useState("all");
  const [projectModal, setProjectModal] = useState(false),
    [projectDraft, setProjectDraft] = useState({
      id: "",
      name: "",
      description: "",
      color: "lime",
    });
  const [checkpointModal, setCheckpointModal] = useState(false),
    [draft, setDraft] = useState<Draft>(blank());
  const [detail, setDetail] = useState<Checkpoint | null>(null),
    [settings, setSettings] = useState(false),
    [confirm, setConfirm] = useState<Confirm | null>(null);
  const [saving, setSaving] = useState(false),
    [sound, setSound] = useState(false),
    [reduced, setReduced] = useState(false),
    [boot, setBoot] = useState(true),
    [bootTarget, setBootTarget] = useState(8),
    [bootProgress, setBootProgress] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null),
    audioRef = useRef<AudioContext | null>(null),
    soundRef = useRef(false),
    lastHover = useRef(0),
    stateRef = useRef(data),
    savingRef = useRef(false);
  const { setOpenMobile } = useSidebar();
  stateRef.current = data;
  soundRef.current = sound;
  const play = useCallback((kind: Tone = "click", force = false) => {
    if (!force && !soundRef.current) return;
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctx) return;
      const ctx = audioRef.current ?? new Ctx();
      audioRef.current = ctx;
      void ctx.resume();
      if (kind === "hover" && ctx.currentTime - lastHover.current < 0.12)
        return;
      lastHover.current = ctx.currentTime;
      const tones =
        kind === "save"
          ? [523.25, 783.99, 1046.5]
          : kind === "boot"
            ? [130.81, 261.63, 523.25]
            : kind === "hover"
              ? [440]
              : [659.25];
      tones.forEach((f, i) => {
        const osc = ctx.createOscillator(),
          gain = ctx.createGain(),
          t = ctx.currentTime + i * 0.08;
        osc.type = kind === "hover" ? "sine" : "triangle";
        osc.frequency.value = f;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(
          kind === "hover" ? 0.012 : 0.035,
          t + 0.008,
        );
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.16);
      });
    } catch {}
  }, []);
  const toggleSound = (on: boolean) => {
    setSound(on);
    soundRef.current = on;
    try {
      localStorage.setItem("mneme-sound", String(on));
    } catch {}
    if (on) play("boot", true);
  };
  const toggleReduced = (on: boolean) => {
    setReduced(on);
    try {
      localStorage.setItem("mneme-reduced", String(on));
    } catch {}
  };
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/workspace", { cache: "no-store" }),
        body = (await r.json()) as Workspace & { error?: string };
      if (!r.ok)
        throw new Error(
          body.error || "Your workspace is temporarily unavailable.",
        );
      setData(body);
      setBootTarget(78);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not load the workspace.",
      );
    } finally {
      setLoading(false);
      setBootTarget(100);
    }
  }, []);
  useEffect(() => {
    let skip = false;
    try {
      setSound(localStorage.getItem("mneme-sound") === "true");
      const preference = localStorage.getItem("mneme-reduced"),
        reduce =
          preference === null
            ? matchMedia("(prefers-reduced-motion: reduce)").matches
            : preference === "true";
      setReduced(reduce);
      skip = sessionStorage.getItem("mneme-booted") === "true" || reduce;
    } catch {}
    if (skip) setBoot(false);
    setBootTarget(25);
    void load();
  }, [load]);
  useEffect(() => {
    if (!boot) return;
    let frame = 0;
    const tick = () => {
      setBootProgress((p) =>
        Math.min(100, p + (bootTarget - p) * 0.055 + 0.045),
      );
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [boot, bootTarget]);
  const finishBoot = useCallback(() => {
    setBoot(false);
    try {
      sessionStorage.setItem("mneme-booted", "true");
    } catch {}
  }, []);
  useEffect(() => {
    if (boot && bootProgress >= 99.8) {
      const timer = setTimeout(finishBoot, 200);
      return () => clearTimeout(timer);
    }
  }, [boot, bootProgress, finishBoot]);
  useEffect(() => {
    document.documentElement.dataset.reducedMotion = String(reduced);
  }, [reduced]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape" && document.activeElement === searchRef.current) {
        setSearch("");
        searchRef.current?.blur();
      }
    };
    addEventListener("keydown", key);
    return () => removeEventListener("keydown", key);
  }, []);
  useEffect(() => {
    type Tool = {
      name: string;
      description: string;
      inputSchema: object;
      annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
      execute: (input: unknown) => unknown;
    };
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (
            tool: Tool,
            options: { signal: AbortSignal },
          ) => void | Promise<void>;
        };
      }
    ).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const tools: Tool[] = [
      {
        name: "list_checkpoints",
        description:
          "Read checkpoint titles and project names in this workspace.",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true, untrustedContentHint: true },
        execute: () =>
          stateRef.current.checkpoints.map((c) => ({
            id: c.id,
            title: c.title,
            project: stateRef.current.projects.find((p) => p.id === c.projectId)
              ?.name,
            createdAt: c.createdAt,
          })),
      },
      {
        name: "open_checkpoint",
        description:
          "Open a saved checkpoint in the visible resume panel. Does not change saved records.",
        inputSchema: {
          type: "object",
          properties: { id: { type: "string" } },
          required: ["id"],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: true },
        execute: async (input) => {
          if (
            !input ||
            typeof input !== "object" ||
            !("id" in input) ||
            typeof input.id !== "string"
          )
            throw new Error("A checkpoint id is required.");
          const c = stateRef.current.checkpoints.find(
            (c) => c.id === (input as { id: string }).id,
          );
          if (!c) throw new Error("Checkpoint not found.");
          setDetail(c);
          await new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(resolve)),
          );
          return { opened: true, id: c.id, title: c.title, next: c.next };
        },
      },
    ];
    for (const tool of tools) {
      try {
        void Promise.resolve(
          context.registerTool(tool, { signal: lifecycle.signal }),
        ).catch(() => {});
      } catch {}
    }
    return () => lifecycle.abort();
  }, []);
  const commit = async (action: string, input: Record<string, unknown>) => {
    if (savingRef.current) return false;
    savingRef.current = true;
    setSaving(true);
    try {
      const r = await fetch("/api/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          input,
          revision: stateRef.current.revision,
        }),
      });
      const body = (await r.json()) as Workspace & { error?: string };
      if (!r.ok) {
        if (r.status === 409) await load();
        throw new Error(
          body.error || "Could not save. Your input is still here.",
        );
      }
      setData(body);
      play("save");
      return true;
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Could not save. Please try again.",
      );
      return false;
    } finally {
      setSaving(false);
      savingRef.current = false;
    }
  };
  const navigate = (to: string, id: string | null = null) => {
    setPage(to);
    setProjectId(id);
    setFilter("all");
    setSearch("");
    setOpenMobile(false);
  };
  const active = data.projects.filter((p) => !p.archived),
    archived = data.projects.filter((p) => p.archived),
    selected = data.projects.find((p) => p.id === projectId);
  const activeIds = new Set(active.map((p) => p.id));
  const recent = [...data.checkpoints]
    .filter((c) => activeIds.has(c.projectId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const latest = selected
      ? recent.find((c) => c.projectId === selected.id)
      : recent[0],
    latestProject = data.projects.find((p) => p.id === latest?.projectId);
  const needle = search.trim().toLowerCase();
  const visibleProjects = (page === "archived" ? archived : active).filter(
    (p) =>
      (!projectId || p.id === projectId) &&
      (!needle || `${p.name} ${p.description}`.toLowerCase().includes(needle)),
  );
  const visibleCheckpoints = [...data.checkpoints]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .filter((c) => {
      const p = data.projects.find((p) => p.id === c.projectId);
      return (
        p &&
        (page === "archived" ? p.archived : !p.archived) &&
        (!projectId || c.projectId === projectId) &&
        (filter !== "blocked" || !!c.blocked) &&
        (!needle ||
          `${p.name} ${c.title} ${c.working} ${c.blocked} ${c.tried} ${c.next}`
            .toLowerCase()
            .includes(needle))
      );
    });
  const newProject = () => {
    setProjectDraft({ id: "", name: "", description: "", color: "lime" });
    setProjectModal(true);
  };
  const newCheckpoint = (id?: string) => {
    if (!active.length) {
      newProject();
      toast.info("Create a project to give your checkpoint a home.");
      return;
    }
    setDraft(blank(id || selected?.id || active[0].id));
    setCheckpointModal(true);
  };
  const editProject = (p: Project) => {
    setProjectDraft({
      id: p.id,
      name: p.name,
      description: p.description,
      color: p.color,
    });
    setProjectModal(true);
  };
  const saveProject = async (e: FormEvent) => {
    e.preventDefault();
    if (
      await commit(
        projectDraft.id ? "project.update" : "project.create",
        projectDraft,
      )
    ) {
      setProjectModal(false);
      toast.success(
        projectDraft.id
          ? "Project updated"
          : "Project created. Your next idea has a home.",
      );
    }
  };
  const saveCheckpoint = async (e: FormEvent) => {
    e.preventDefault();
    if (
      await commit(draft.id ? "checkpoint.update" : "checkpoint.create", draft)
    ) {
      setCheckpointModal(false);
      setDetail(null);
      toast.success("Checkpoint saved. You can let it go now.");
    }
  };
  const exportWorkspace = () => {
    const file = new Blob(
        [
          JSON.stringify(
            {
              format: "mneme.workspace",
              version: 1,
              exportedAt: new Date().toISOString(),
              ...data,
            },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      ),
      url = URL.createObjectURL(file),
      link = document.createElement("a");
    link.href = url;
    link.download = `mneme-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    toast.success("Workspace exported");
  };
  const clearSamples = () =>
    setConfirm({
      title: "Clear the example work?",
      description:
        "Only the supplied example checkpoints will be removed. Your own projects and checkpoints will stay.",
      label: "Clear examples",
      action: "examples.clear",
      input: {},
    });
  const removeProject = (p: Project) =>
    setConfirm({
      title: `Delete ${p.name}?`,
      description:
        "This permanently deletes the project and all of its checkpoints. Export a backup first if you want to keep a copy.",
      label: "Delete project",
      action: "project.delete",
      input: { id: p.id },
    });
  const row = (c: Checkpoint) => {
    const p = data.projects.find((p) => p.id === c.projectId)!;
    return (
      <button
        className="checkpoint-row"
        key={c.id}
        onClick={() => setDetail(c)}
      >
        <span className="timeline-mark" style={{ color: colors[p.color] }}>
          <GitCommitHorizontal size={22} />
        </span>
        <span className="checkpoint-row-copy">
          <strong>{c.title}</strong>
          <span>
            <span style={{ color: colors[p.color] }}>{p.name}</span>
            <span className="dot-divider">/</span>
            {c.next}
          </span>
        </span>
        {c.blocked && <span className="blocked-badge">1 blocker</span>}
        <time title={date(c.createdAt)}>{ago(c.createdAt)}</time>
        <ChevronRight size={17} />
      </button>
    );
  };
  return (
    <div
      className="mneme-app"
      onClickCapture={(e) => {
        if ((e.target as HTMLElement).closest("button")) play("click");
      }}
    >
      <Sidebar className="mneme-sidebar">
        <SidebarHeader className="brand-header">
          <button
            className="brand"
            onClick={() => navigate("workspace")}
            aria-label="Mneme workspace"
          >
            <Glyph />
            <span>
              mneme<span className="brand-period">.</span>
            </span>
          </button>
          <span className="brand-caption">A PLACE TO PICK UP.</span>
        </SidebarHeader>
        <SidebarContent className="nav-content">
          <span className="nav-label">YOUR SPACE</span>
          <SidebarMenu>
            {[
              { id: "workspace", name: "Overview", icon: LayoutGrid },
              {
                id: "timeline",
                name: "All checkpoints",
                icon: GitCommitHorizontal,
              },
              { id: "archived", name: "Archive", icon: Archive },
            ].map((item) => (
              <SidebarMenuItem key={item.id}>
                <SidebarMenuButton
                  className="nav-button"
                  isActive={page === item.id && !projectId}
                  onPointerEnter={() => play("hover")}
                  onClick={() => navigate(item.id)}
                >
                  <item.icon size={18} />
                  <span>{item.name}</span>
                  {item.id === "timeline" && (
                    <span className="nav-count">
                      {recent.length.toString().padStart(2, "0")}
                    </span>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
          <div className="nav-project-heading">
            <span className="nav-label">PROJECTS</span>
            <button
              className="small-icon"
              aria-label="New project"
              onClick={newProject}
            >
              <Plus size={15} />
            </button>
          </div>
          <SidebarMenu>
            {active.map((p) => (
              <SidebarMenuItem key={p.id}>
                <SidebarMenuButton
                  className="nav-button project-nav"
                  isActive={projectId === p.id}
                  onPointerEnter={() => play("hover")}
                  onClick={() => navigate("workspace", p.id)}
                >
                  <span
                    className="project-dot"
                    style={{ background: colors[p.color] }}
                  />
                  <span>{p.name}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
          <button className="add-project" onClick={newProject}>
            <Plus size={15} /> New project
          </button>
        </SidebarContent>
        <SidebarFooter className="sidebar-bottom">
          <div className="sidebar-note">
            <Glyph />
            <p>
              Good work deserves
              <br />a way back.
            </p>
            <span className="note-binary">01101101 01101110</span>
          </div>
          <button
            className="nav-button settings-nav"
            onClick={() => setSettings(true)}
          >
            <Settings2 size={17} /> Preferences
          </button>
          <div className="sidebar-identity">
            <div className="user-avatar">M</div>
            <div>
              <strong>Personal workspace</strong>
              <span>MNEME / V.01</span>
            </div>
            <button
              className={`sound-button ${sound ? "is-on" : ""}`}
              aria-label={sound ? "Mute sound" : "Enable sound"}
              onClick={() => toggleSound(!sound)}
            >
              <SoundGlyph on={sound} />
            </button>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="workspace-inset">
        <header className="topbar">
          <div className="breadcrumb">
            <SidebarTrigger className="mobile-menu" />
            <span>Workspace</span>
            <span className="breadcrumb-slash">/</span>
            <strong>
              {selected?.name ||
                (page === "timeline"
                  ? "Checkpoints"
                  : page === "archived"
                    ? "Archive"
                    : "Overview")}
            </strong>
          </div>
          <div className="searchbox">
            <Search size={16} />
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Find a thought…"
              aria-label="Search projects and checkpoints"
            />
            {search ? (
              <button aria-label="Clear search" onClick={() => setSearch("")}>
                <X size={14} />
              </button>
            ) : (
              <kbd>⌘ K</kbd>
            )}
          </div>
          <button
            className="topbar-settings"
            aria-label="Preferences"
            onClick={() => setSettings(true)}
          >
            <Settings2 size={18} />
          </button>
        </header>
        <main className="workspace-main">
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                <span className="tiny-square" />
                {page === "archived"
                  ? "STORED, NOT FORGOTTEN"
                  : page === "timeline"
                    ? "YOUR WORK, IN MOMENTS"
                    : selected
                      ? "PROJECT / CONTEXT"
                      : "CONTEXT IS EVERYTHING"}
              </div>
              <h1>
                {selected?.name ||
                  (page === "timeline"
                    ? "Every step, remembered."
                    : page === "archived"
                      ? "Room for what’s next."
                      : "Pick up the thread.")}
              </h1>
              <p>
                {selected?.description ||
                  (page === "timeline"
                    ? "The decisions, detours, and next steps that got you here."
                    : page === "archived"
                      ? "Finished for now. Your context is here whenever you need it."
                      : "Your projects. Your progress. Exactly where you left off.")}
              </p>
            </div>
            <button
              className="primary-button"
              disabled={loading || !!error || selected?.archived}
              onClick={() => newCheckpoint()}
            >
              <Plus size={18} /> Save checkpoint
            </button>
          </div>
          {error ? (
            <div className="error-state">
              <Terminal size={30} />
              <h2>Connection interrupted.</h2>
              <p>{error}</p>
              <button className="outline-button" onClick={() => void load()}>
                <RefreshCw size={16} /> Try again
              </button>
            </div>
          ) : loading ? (
            <div className="loading-workspace">
              <Loader2 className="spin" size={24} />
              <span>Restoring your workspace…</span>
            </div>
          ) : (
            <>
              {page === "workspace" && !needle && (
                <section className="resume-panel">
                  <div className="resume-panel-copy">
                    <div className="section-label">
                      <span className="live-indicator" />
                      {latest ? "LAST CHECKPOINT" : "YOUR NEXT CHAPTER"}
                      <span className="resume-index">
                        {latest
                          ? `CP_${String(data.checkpoints.length).padStart(3, "0")}`
                          : "CP_001"}
                      </span>
                    </div>
                    {latest && latestProject ? (
                      <>
                        <div className="resume-project">
                          <FolderOpen size={14} />
                          {latestProject.name}
                          <span>•</span>
                          {ago(latest.createdAt)}
                        </div>
                        <h2>{latest.title}</h2>
                        <p className="resume-next">
                          <span>NEXT UP</span>
                          {latest.next}
                        </p>
                        <button
                          className="resume-button"
                          onClick={() => setDetail(latest)}
                        >
                          <Play size={15} fill="currentColor" /> Resume session
                        </button>
                      </>
                    ) : (
                      <>
                        <h2>A clear place to come back to.</h2>
                        <p className="empty-resume-text">
                          Capture what works, what’s stuck, and your next move.
                        </p>
                        <button
                          className="resume-button"
                          onClick={() =>
                            active.length ? newCheckpoint() : newProject()
                          }
                        >
                          <Plus size={17} />
                          {active.length
                            ? "Save your first checkpoint"
                            : "Create your first project"}
                        </button>
                      </>
                    )}
                  </div>
                  <div className="core-visual">
                    <img
                      src="/images/mneme-core.webp"
                      alt=""
                      width="600"
                      height="600"
                      fetchPriority="high"
                    />
                    <div className="core-orbit" />
                    <span className="core-coordinate coordinate-top">
                      MEMORY / 0x01
                    </span>
                    <span className="core-coordinate coordinate-bottom">
                      CONTEXT PRESERVED
                    </span>
                    <span className="core-cross cross-one">+</span>
                    <span className="core-cross cross-two">+</span>
                  </div>
                </section>
              )}
              {page !== "timeline" && !selected && (
                <section className="projects-section">
                  <div className="section-heading">
                    <h2>
                      {page === "archived" ? "Archived projects" : "In motion"}
                      <span>
                        {visibleProjects.length.toString().padStart(2, "0")}
                      </span>
                    </h2>
                    {page !== "archived" && (
                      <button className="text-button" onClick={newProject}>
                        <Plus size={15} /> New project
                      </button>
                    )}
                  </div>
                  <div className="project-grid">
                    {visibleProjects.map((p) => {
                      const cps = data.checkpoints
                          .filter((c) => c.projectId === p.id)
                          .sort((a, b) =>
                            b.createdAt.localeCompare(a.createdAt),
                          ),
                        last = cps[0];
                      return (
                        <article
                          className={`project-card ${p.color}`}
                          key={p.id}
                        >
                          <div className="project-card-top">
                            <span className={`project-glyph ${p.color}`}>
                              <Box size={20} strokeWidth={1.5} />
                            </span>
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                className="small-icon"
                                aria-label={`Options for ${p.name}`}
                              >
                                <MoreHorizontal size={19} />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="mneme-menu"
                              >
                                <DropdownMenuItem
                                  onClick={() => editProject(p)}
                                >
                                  <Pencil /> Edit project
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={async () => {
                                    if (
                                      await commit("project.update", {
                                        id: p.id,
                                        archived: !p.archived,
                                      })
                                    )
                                      toast.success(
                                        p.archived
                                          ? "Project restored"
                                          : "Project archived",
                                      );
                                  }}
                                >
                                  <Archive />
                                  {p.archived
                                    ? "Restore project"
                                    : "Archive project"}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="delete-item"
                                  onClick={() => removeProject(p)}
                                >
                                  <Trash2 /> Delete project
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          <button
                            className="project-card-body"
                            onClick={() =>
                              navigate(
                                p.archived ? "archived" : "workspace",
                                p.id,
                              )
                            }
                          >
                            <h3>{p.name}</h3>
                            <p>
                              {p.description || "Ready for your next idea."}
                            </p>
                            <div className="project-last">
                              <GitCommitHorizontal size={14} />
                              <span>{last?.title || "No checkpoints yet"}</span>
                            </div>
                            <div className="project-card-footer">
                              <span>
                                {cps.length} checkpoint
                                {cps.length !== 1 ? "s" : ""}
                              </span>
                              <time title={date(p.updatedAt)}>
                                {ago(p.updatedAt)}
                              </time>
                            </div>
                          </button>
                        </article>
                      );
                    })}
                    {!visibleProjects.length && (
                      <div className="empty-state">
                        <Folder size={28} />
                        <h3>
                          {needle
                            ? "No matching projects."
                            : page === "archived"
                              ? "Nothing archived yet."
                              : "Make room for your first project."}
                        </h3>
                        <p>
                          {needle
                            ? "Try a different project name."
                            : page === "archived"
                              ? "Archive a project from its menu when you’re ready."
                              : "Give it a name. Save the context as you go."}
                        </p>
                        {page === "workspace" && !needle && (
                          <button
                            className="outline-button"
                            onClick={newProject}
                          >
                            <Plus size={16} /> Create project
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </section>
              )}
              <section className="checkpoint-section">
                <div className="section-heading">
                  <h2>
                    {selected
                      ? "Project checkpoints"
                      : page === "timeline"
                        ? "All checkpoints"
                        : "Recent checkpoints"}
                    <span>
                      {visibleCheckpoints.length.toString().padStart(2, "0")}
                    </span>
                  </h2>
                  {page === "workspace" && !selected ? (
                    <button
                      className="text-button"
                      onClick={() => navigate("timeline")}
                    >
                      View all
                    </button>
                  ) : (
                    <Tabs value={filter} onValueChange={setFilter}>
                      <TabsList variant="line" className="checkpoint-tabs">
                        <TabsTrigger value="all">All</TabsTrigger>
                        <TabsTrigger value="blocked">With blockers</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  )}
                </div>
                <div className="checkpoint-list">
                  {(page === "workspace" && !selected
                    ? visibleCheckpoints.slice(0, 4)
                    : visibleCheckpoints
                  ).map(row)}
                  {!visibleCheckpoints.length && (
                    <div className="empty-state">
                      <GitCommitHorizontal size={28} />
                      <h3>
                        {needle
                          ? "Nothing matches that thought."
                          : filter === "blocked"
                            ? "No blockers here."
                            : "A fresh timeline."}
                      </h3>
                      <p>
                        {needle
                          ? "Search a title, project, or something you wrote."
                          : filter === "blocked"
                            ? "Checkpoints with a blocker will appear here."
                            : "Your checkpoints will connect the dots."}
                      </p>
                      {page !== "archived" &&
                        !needle &&
                        filter !== "blocked" && (
                          <button
                            className="text-button"
                            onClick={() => newCheckpoint()}
                          >
                            Save a checkpoint
                          </button>
                        )}
                    </div>
                  )}
                </div>
              </section>
              {selected && (
                <div className="project-actions">
                  <button
                    className="text-button"
                    onClick={() => editProject(selected)}
                  >
                    <Pencil size={15} /> Edit project
                  </button>
                  <button
                    className="text-button"
                    onClick={async () => {
                      if (
                        await commit("project.update", {
                          id: selected.id,
                          archived: !selected.archived,
                        })
                      ) {
                        navigate(selected.archived ? "workspace" : "archived");
                        toast.success(
                          selected.archived
                            ? "Project restored"
                            : "Project archived",
                        );
                      }
                    }}
                  >
                    <Archive size={15} />
                    {selected.archived ? "Restore project" : "Archive project"}
                  </button>
                </div>
              )}
              {data.projects.some((p) => p.sample) && (
                <div className="example-note">
                  <span>
                    <Code2 size={14} /> Example projects, ready to explore.
                  </span>
                  <button onClick={clearSamples}>Clear examples</button>
                </div>
              )}
            </>
          )}
          <footer className="workspace-footer">
            <span>
              <Glyph /> HOLD THE THOUGHT.
            </span>
            <span>
              Made for the way your mind works.
              <span className="footer-cursor">_</span>
            </span>
          </footer>
        </main>
      </SidebarInset>
      <Dialog
        open={projectModal}
        onOpenChange={(v) => {
          if (!saving) setProjectModal(v);
        }}
      >
        <DialogContent className="mneme-dialog">
          <DialogHeader>
            <span className="eyebrow">
              PROJECT / {projectDraft.id ? "EDIT" : "NEW"}
            </span>
            <DialogTitle>
              {projectDraft.id
                ? "A little fine-tuning."
                : "Give the idea a home."}
            </DialogTitle>
            <DialogDescription>
              A project holds the checkpoints that bring you back.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={saveProject}>
            <label className="field-label" htmlFor="project-name">
              Project name
            </label>
            <input
              id="project-name"
              className="text-input"
              maxLength={64}
              required
              autoFocus
              placeholder="Something worth making"
              value={projectDraft.name}
              onChange={(e) =>
                setProjectDraft({ ...projectDraft, name: e.target.value })
              }
            />
            <label className="field-label" htmlFor="project-description">
              A little context <span>optional</span>
            </label>
            <textarea
              id="project-description"
              className="text-input"
              maxLength={240}
              rows={3}
              placeholder="What are you working toward?"
              value={projectDraft.description}
              onChange={(e) =>
                setProjectDraft({
                  ...projectDraft,
                  description: e.target.value,
                })
              }
            />
            <fieldset className="color-picker">
              <legend className="field-label">Project color</legend>
              {Object.entries(colors).map(([color, hex]) => (
                <button
                  type="button"
                  key={color}
                  aria-label={color}
                  aria-pressed={projectDraft.color === color}
                  style={{ "--swatch": hex } as CSSProperties}
                  className={projectDraft.color === color ? "selected" : ""}
                  onClick={() => setProjectDraft({ ...projectDraft, color })}
                >
                  {projectDraft.color === color && <Check size={15} />}
                </button>
              ))}
            </fieldset>
            <div className="form-actions">
              <button
                type="button"
                className="text-button"
                disabled={saving}
                onClick={() => setProjectModal(false)}
              >
                Cancel
              </button>
              <button className="primary-button" disabled={saving}>
                {saving ? (
                  <Loader2 size={16} className="spin" />
                ) : (
                  <Plus size={16} />
                )}{" "}
                {projectDraft.id ? "Save changes" : "Create project"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={checkpointModal}
        onOpenChange={(v) => {
          if (!saving) setCheckpointModal(v);
        }}
      >
        <DialogContent
          className="mneme-dialog checkpoint-dialog"
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <span className="eyebrow">
              MEMORY / {draft.id ? "EDIT" : "CAPTURE"}
            </span>
            <DialogTitle>
              {draft.id ? "Refine the context." : "Leave yourself a way back."}
            </DialogTitle>
            <DialogDescription>
              You don’t have to remember everything. Just capture enough to
              continue.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={saveCheckpoint}>
            <div className="checkpoint-top-fields">
              <div>
                <label className="field-label" htmlFor="checkpoint-project">
                  Project
                </label>
                <Select
                  value={draft.projectId}
                  disabled={!!draft.id}
                  onValueChange={(value) =>
                    setDraft({ ...draft, projectId: value })
                  }
                >
                  <SelectTrigger
                    id="checkpoint-project"
                    className="project-select"
                  >
                    <SelectValue placeholder="Choose project" />
                  </SelectTrigger>
                  <SelectContent>
                    {active.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="field-label" htmlFor="checkpoint-title">
                  Checkpoint title
                </label>
                <input
                  id="checkpoint-title"
                  className="text-input"
                  required
                  maxLength={100}
                  placeholder="Where did you leave things?"
                  value={draft.title}
                  onChange={(e) =>
                    setDraft({ ...draft, title: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="checkpoint-fields">
              {(
                [
                  {
                    key: "working",
                    label: "What’s working",
                    hint: "What’s done, stable, or making sense?",
                    icon: CheckCheck,
                  },
                  {
                    key: "blocked",
                    label: "What’s blocked",
                    hint: "Anything that’s slowing you down?",
                    icon: Circle,
                  },
                  {
                    key: "tried",
                    label: "What you tried",
                    hint: "Decisions, dead ends, useful discoveries.",
                    icon: Code2,
                  },
                  {
                    key: "next",
                    label: "Your next move",
                    hint: "One clear step for when you come back.",
                    icon: Zap,
                  },
                ] as const
              ).map((field) => (
                <div className={`context-field ${field.key}`} key={field.key}>
                  <label
                    className="field-label"
                    htmlFor={`checkpoint-${field.key}`}
                  >
                    <field.icon size={15} />
                    {field.label}
                    {field.key !== "next" && <span>optional</span>}
                  </label>
                  <textarea
                    id={`checkpoint-${field.key}`}
                    className="text-input"
                    maxLength={field.key === "next" ? 2000 : 6000}
                    required={field.key === "next"}
                    rows={3}
                    placeholder={field.hint}
                    value={draft[field.key]}
                    onChange={(e) =>
                      setDraft({ ...draft, [field.key]: e.target.value })
                    }
                  />
                </div>
              ))}
            </div>
            <div className="form-actions">
              <span className="form-note">
                A small note. A much easier tomorrow.
              </span>
              <button
                className="primary-button"
                disabled={saving || !draft.projectId}
              >
                {saving ? (
                  <Loader2 size={16} className="spin" />
                ) : (
                  <GitCommitHorizontal size={18} />
                )}{" "}
                Save checkpoint
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <Sheet
        open={!!detail}
        onOpenChange={(v) => {
          if (!v) setDetail(null);
        }}
      >
        <SheetContent className="mneme-detail">
          <SheetHeader>
            <span className="eyebrow">SESSION / RESTORE</span>
            <SheetTitle>{detail?.title}</SheetTitle>
            <SheetDescription>
              {data.projects.find((p) => p.id === detail?.projectId)?.name} ·{" "}
              {detail && date(detail.createdAt)}
            </SheetDescription>
          </SheetHeader>
          {detail && (
            <>
              <div className="detail-next">
                <span className="eyebrow">
                  <Zap size={15} /> START HERE
                </span>
                <h3>Your next move</h3>
                <p>{detail.next}</p>
              </div>
              <div className="detail-context">
                {(
                  [
                    {
                      key: "working",
                      label: "What’s working",
                      icon: CheckCheck,
                    },
                    { key: "blocked", label: "What’s blocked", icon: Circle },
                    { key: "tried", label: "What you tried", icon: Code2 },
                  ] as const
                ).map((field) => (
                  <section key={field.key}>
                    <h3>
                      <field.icon size={16} />
                      {field.label}
                    </h3>
                    <p className={detail[field.key] ? "" : "muted"}>
                      {detail[field.key] || "Nothing noted."}
                    </p>
                  </section>
                ))}
              </div>
              <div className="detail-actions">
                {!data.projects.find((p) => p.id === detail.projectId)
                  ?.archived && (
                  <>
                    <button
                      className="primary-button"
                      onClick={() => {
                        const id = detail.projectId;
                        setDetail(null);
                        newCheckpoint(id);
                      }}
                    >
                      <Plus size={16} /> Next checkpoint
                    </button>
                    <button
                      className="outline-button"
                      onClick={() => {
                        setDraft({ ...detail });
                        setDetail(null);
                        setCheckpointModal(true);
                      }}
                    >
                      <Pencil size={16} /> Edit
                    </button>
                  </>
                )}
                <button
                  className="small-icon danger"
                  aria-label="Delete checkpoint"
                  onClick={() =>
                    setConfirm({
                      title: "Delete this checkpoint?",
                      description:
                        "This removes the saved context permanently. Other checkpoints stay unchanged.",
                      label: "Delete checkpoint",
                      action: "checkpoint.delete",
                      input: { id: detail.id },
                    })
                  }
                >
                  <Trash2 size={17} />
                </button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
      <Dialog open={settings} onOpenChange={setSettings}>
        <DialogContent className="mneme-dialog">
          <DialogHeader>
            <span className="eyebrow">SYSTEM / PREFERENCES</span>
            <DialogTitle>Make space your own.</DialogTitle>
            <DialogDescription>
              Small details. Just the way you like them.
            </DialogDescription>
          </DialogHeader>
          <div className="preference-row">
            <div>
              <h3>Interface sounds</h3>
              <p>Soft clicks, signals, and a saved-state chime.</p>
            </div>
            <Switch
              checked={sound}
              onCheckedChange={toggleSound}
              aria-label="Interface sounds"
            />
          </div>
          <div className="preference-row">
            <div>
              <h3>Reduce motion</h3>
              <p>Keep the atmosphere. Skip the movement.</p>
            </div>
            <Switch
              checked={reduced}
              onCheckedChange={toggleReduced}
              aria-label="Reduce motion"
            />
          </div>
          <div className="settings-actions">
            <button
              className="outline-button"
              onClick={() => {
                setSettings(false);
                setBootProgress(0);
                setBootTarget(100);
                setBoot(true);
                play("boot");
              }}
            >
              <Terminal size={16} /> Replay boot sequence
            </button>
            <button
              className="outline-button"
              disabled={loading || !!error}
              onClick={exportWorkspace}
            >
              <Download size={16} /> Export workspace
            </button>
          </div>
          <p className="settings-footnote">
            Your checkpoints are saved to your workspace. Sound and motion
            preferences stay on this device.
          </p>
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={!!confirm}
        onOpenChange={(v) => {
          if (!v && !saving) setConfirm(null);
        }}
      >
        <AlertDialogContent className="mneme-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm?.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Keep it</AlertDialogCancel>
            <button
              className="danger-button"
              disabled={saving}
              onClick={async () => {
                if (confirm && (await commit(confirm.action, confirm.input))) {
                  setConfirm(null);
                  setDetail(null);
                  if (confirm.action === "project.delete")
                    navigate("workspace");
                  toast.success("Workspace updated");
                }
              }}
            >
              {saving ? "Working…" : confirm?.label}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Toaster position="bottom-right" theme="dark" closeButton />
      {boot && (
        <div
          className="boot-screen"
          role="dialog"
          aria-modal="true"
          aria-label="Restoring Mneme workspace"
        >
          <BinaryField active={!reduced} />
          <div className="boot-top">
            <span>MNEME SYSTEMS / 001</span>
            <button
              className="sound-button"
              onClick={() => toggleSound(!sound)}
              aria-label={sound ? "Mute boot sound" : "Enable boot sound"}
            >
              <SoundGlyph on={sound} />
            </button>
          </div>
          <div className="boot-center">
            <Glyph className="boot-mark" />
            <div className="boot-wordmark">
              mneme<span>_</span>
            </div>
            <div className="boot-terminal">
              <p>
                <span>~/mneme</span> restore --context
              </p>
              <p className="terminal-line">
                <span>✓</span> Interface initialized
              </p>
              <p className="terminal-line">
                <span>{bootProgress > 45 ? "✓" : "·"}</span>{" "}
                {error
                  ? "Workspace connection interrupted"
                  : bootProgress > 45
                    ? "Workspace located"
                    : "Locating workspace…"}
              </p>
              <p className="terminal-line">
                <span>{bootProgress > 90 ? "✓" : "·"}</span>{" "}
                {error
                  ? "Retry is available in the workspace"
                  : bootProgress > 90
                    ? "Ready to pick up the thread"
                    : "Restoring the thread…"}
              </p>
            </div>
            <div className="boot-progress-meta">
              <span>RESTORING WORKSPACE</span>
              <strong>
                {Math.min(100, Math.floor(bootProgress))
                  .toString()
                  .padStart(2, "0")}
                <span>%</span>
              </strong>
            </div>
            <Progress
              value={bootProgress}
              className="boot-progress"
              aria-label="Workspace initialization"
            />
          </div>
          <div className="boot-bottom">
            <span>NOTHING LOST. JUST PAUSED.</span>
            <button onClick={finishBoot}>
              Skip intro <kbd>↵</kbd>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
