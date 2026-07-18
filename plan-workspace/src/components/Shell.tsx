import { type ReactNode } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, Boxes, Workflow, Network,
  Gavel, ShieldAlert, Moon, Sun, Menu, SearchCheck, ClipboardList, Tag,
  Database, Waypoints, Route, History,
} from "lucide-react";
import { cn, useTheme } from "./ui";
import { useState } from "react";
import { GlobalSearch } from "./Search";

const NAV: { group: string; accent?: string; dot?: string; items: { to: string; label: string; icon: any; accent?: string }[] }[] = [
  { group: "Overview", accent: "text-primary", dot: "bg-primary", items: [
    { to: "/", label: "Workspace", icon: LayoutDashboard, accent: "text-primary" },
    { to: "/daily-log", label: "Daily Log", icon: History, accent: "text-primary" },
  ] },
  { group: "Current state", accent: "text-red-600 dark:text-red-400", dot: "bg-red-500", items: [
    { to: "/as-is", label: "As-Is Workflows", icon: Workflow, accent: "text-red-600 dark:text-red-400" },
    { to: "/asis-diagrams", label: "As-Is Flow Diagrams", icon: Waypoints, accent: "text-red-600 dark:text-red-400" },
    { to: "/asis-flows", label: "As-Is Workflow Flows", icon: Route, accent: "text-red-600 dark:text-red-400" },
    { to: "/inventory", label: "Field Inventory", icon: Boxes, accent: "text-red-600 dark:text-red-400" },
  ] },
  { group: "Cody build", accent: "text-sky-600 dark:text-sky-400", dot: "bg-sky-500", items: [
    { to: "/cody", label: "Cody Workflows", icon: Workflow, accent: "text-sky-600 dark:text-sky-400" },
    { to: "/cody-flows", label: "Cody Flow Diagrams", icon: Waypoints, accent: "text-sky-600 dark:text-sky-400" },
    { to: "/cody-inventory", label: "Cody Inventory", icon: Boxes, accent: "text-sky-600 dark:text-sky-400" },
  ] },
  { group: "Cody Neo build", accent: "text-amber-600 dark:text-amber-400", dot: "bg-amber-500", items: [
    { to: "/cody-neo", label: "Cody Neo Workflows", icon: Workflow, accent: "text-amber-600 dark:text-amber-400" },
    { to: "/cody-neo-flows", label: "Cody Neo Flow Diagrams", icon: Waypoints, accent: "text-amber-600 dark:text-amber-400" },
    { to: "/cody-neo-inventory", label: "Cody Neo Inventory", icon: Boxes, accent: "text-amber-600 dark:text-amber-400" },
  ] },
  { group: "Target", accent: "text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-500", items: [
    { to: "/to-be", label: "To-Be Workflows", icon: Workflow, accent: "text-emerald-600 dark:text-emerald-400" },
    { to: "/wf-diagrams", label: "WF Flow Diagrams", icon: Waypoints, accent: "text-emerald-600 dark:text-emerald-400" },
    { to: "/diagrams", label: "Architecture", icon: Network, accent: "text-emerald-600 dark:text-emerald-400" },
    { to: "/pcc-form", label: "PCC Sales Form", icon: ClipboardList, accent: "text-emerald-600 dark:text-emerald-400" },
  ] },
  { group: "Governance", accent: "text-violet-600 dark:text-violet-400", dot: "bg-violet-500", items: [
    { to: "/gaps", label: "Audit Gaps", icon: SearchCheck, accent: "text-violet-600 dark:text-violet-400" },
    { to: "/tags", label: "Tag Library", icon: Tag, accent: "text-violet-600 dark:text-violet-400" },
    { to: "/custom-fields", label: "Custom Fields", icon: Database, accent: "text-violet-600 dark:text-violet-400" },
    { to: "/decisions", label: "Decisions", icon: Gavel, accent: "text-violet-600 dark:text-violet-400" },
    { to: "/risks", label: "Risk Register", icon: ShieldAlert, accent: "text-violet-600 dark:text-violet-400" },
  ] },
];

function Sidebar({ onNav }: { onNav?: () => void }) {
  return (
    <nav className="flex h-full flex-col gap-5 p-3">
      <div className="px-2 pt-1">
        <div className="flex items-center gap-2 text-sm font-bold"><span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground"><Network className="h-3.5 w-3.5" /></span> MWC GHL Refactor</div>
        <div className="truncate font-mono text-[10px] text-muted-foreground">Ghstz8eIsHWLeXek47dk</div>
      </div>
      <div className="flex flex-col gap-4 overflow-y-auto">
        {NAV.map((g) => (
          <div key={g.group}>
            <div className="mb-1 flex items-center gap-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <span className={cn("h-1.5 w-1.5 rounded-full", g.dot)} />{g.group}
            </div>
            <div className="flex flex-col gap-0.5">
              {g.items.map((it) => (
                <NavLink key={it.to} to={it.to} end={it.to === "/"} onClick={onNav}
                  className={({ isActive }) => cn(
                    "flex items-center gap-2 rounded-md border-l-2 px-2 py-1.5 text-sm transition-colors",
                    isActive
                      ? "border-current bg-muted font-semibold text-foreground"
                      : "border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground")}>
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
      <aside className="hidden w-60 shrink-0 border-r border-primary/10 bg-gradient-to-b from-primary/[0.04] to-transparent bg-card md:block"><Sidebar /></aside>
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
        <div className="border-l-4 border-primary pl-3">
          <h1 className="text-xl font-bold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}
