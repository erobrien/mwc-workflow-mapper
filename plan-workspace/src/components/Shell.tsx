import { type ReactNode } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, GitBranch, Boxes, Workflow, Network, MessagesSquare,
  ListChecks, Terminal, Gavel, ShieldAlert, Moon, Sun, Menu, SearchCheck, ClipboardList, Share2, Tag,
  Video, Smartphone, SlidersHorizontal, LayoutGrid, Send, CalendarClock, Database, Waypoints, Route,
} from "lucide-react";
import { cn, useTheme } from "./ui";
import { useState } from "react";
import { GlobalSearch } from "./Search";

const NAV: { group: string; items: { to: string; label: string; icon: any; accent?: string }[] }[] = [
  { group: "Overview", items: [
    { to: "/", label: "Workspace", icon: LayoutDashboard },
  ] },
  { group: "Current state", items: [
    { to: "/as-is", label: "As-Is Workflows", icon: GitBranch, accent: "text-red-600 dark:text-red-400" },
    { to: "/asis-diagrams", label: "As-Is Flow Diagrams", icon: Waypoints, accent: "text-red-600 dark:text-red-400" },
    { to: "/asis-flows", label: "As-Is Workflow Flows", icon: Route, accent: "text-red-600 dark:text-red-400" },
    { to: "/inventory", label: "Field Inventory", icon: Boxes },
  ] },
  { group: "Target", items: [
    { to: "/to-be", label: "To-Be Workflows", icon: Workflow, accent: "text-emerald-600 dark:text-emerald-400" },
    { to: "/wf-diagrams", label: "WF Flow Diagrams", icon: Share2, accent: "text-violet-600 dark:text-violet-400" },
    { to: "/diagrams", label: "Architecture", icon: Network },
    { to: "/messages", label: "Message Library", icon: MessagesSquare },
    { to: "/pcc-form", label: "PCC Sales Form", icon: ClipboardList },
  ] },
  { group: "Execution", items: [
    { to: "/plan", label: "Migration Plan", icon: ListChecks },
    { to: "/prompts", label: "Execution Prompts", icon: Terminal },
  ] },
  { group: "Governance", items: [
    { to: "/gaps", label: "Audit Gaps", icon: SearchCheck },
    { to: "/tags", label: "Tag Library", icon: Tag, accent: "text-amber-600 dark:text-amber-400" },
    { to: "/custom-fields", label: "Custom Fields", icon: Database, accent: "text-sky-600 dark:text-sky-400" },
    { to: "/decisions", label: "Decisions", icon: Gavel },
    { to: "/risks", label: "Risk Register", icon: ShieldAlert },
  ] },
  { group: "Virginia Online (Telemed)", items: [
    { to: "/telemed", label: "Overview", icon: Video, accent: "text-sky-600 dark:text-sky-400" },
    { to: "/telemed/workflows", label: "Workflows", icon: Workflow, accent: "text-sky-600 dark:text-sky-400" },
    { to: "/telemed/portal", label: "Portal & App", icon: Smartphone, accent: "text-violet-600 dark:text-violet-400" },
    { to: "/telemed/ghl", label: "GHL Feature Map", icon: LayoutGrid, accent: "text-sky-600 dark:text-sky-400" },
    { to: "/telemed/config", label: "Config", icon: SlidersHorizontal, accent: "text-sky-600 dark:text-sky-400" },
    { to: "/telemed/messages", label: "Messages", icon: Send, accent: "text-sky-600 dark:text-sky-400" },
    { to: "/telemed/plan", label: "Build Plan", icon: CalendarClock, accent: "text-sky-600 dark:text-sky-400" },
  ] },
];

function Sidebar({ onNav }: { onNav?: () => void }) {
  return (
    <nav className="flex h-full flex-col gap-5 p-3">
      <div className="px-2 pt-1">
        <div className="flex items-center gap-2 text-sm font-bold"><Network className="h-4 w-4" /> MWC GHL Refactor</div>
        <div className="truncate font-mono text-[10px] text-muted-foreground">Ghstz8eIsHWLeXek47dk</div>
      </div>
      <div className="flex flex-col gap-4 overflow-y-auto">
        {NAV.map((g) => (
          <div key={g.group}>
            <div className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{g.group}</div>
            <div className="flex flex-col gap-0.5">
              {g.items.map((it) => (
                <NavLink key={it.to} to={it.to} end={it.to === "/"} onClick={onNav}
                  className={({ isActive }) => cn(
                    "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                    isActive ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground")}>
                  <it.icon className={cn("h-4 w-4 shrink-0", it.accent)} />
                  <span className="truncate">{it.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </div>
    </nav>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const { dark, toggle } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 border-r bg-card md:block"><Sidebar /></aside>
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-60 border-r bg-card"><Sidebar onNav={() => setOpen(false)} /></aside>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-12 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur">
          <button className="md:hidden" onClick={() => setOpen(true)} aria-label="Menu"><Menu className="h-5 w-5" /></button>
          <div className="flex-1"><GlobalSearch /></div>
          <div>
            <button onClick={toggle} aria-label="Toggle theme" className="rounded-md border p-1.5 hover:bg-muted">
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}

export function PageShell({ title, subtitle, actions, children }: { title: string; subtitle?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}
