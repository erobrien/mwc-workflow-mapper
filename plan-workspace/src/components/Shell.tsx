import { type ReactNode } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, Boxes, Workflow, Network,
  Gavel, ShieldAlert, Moon, Sun, Menu, SearchCheck, ClipboardList, Tag,
  Database, Waypoints, Route, History, ChevronRight, ChevronDown, Target, ListChecks, Radar, MessagesSquare, PhoneForwarded, Clock,
} from "lucide-react";
import { cn, useTheme } from "./ui";
import { useState } from "react";
import { GlobalSearch } from "./Search";
import { BUILD_TIME_LABEL, BUILD_COMMIT } from "../lib/build-info";

const NAV: { group: string; accent?: string; dot?: string; collapsible?: boolean; items: { to: string; label: string; icon: any; accent?: string }[] }[] = [
  { group: "Overview", accent: "text-primary", dot: "bg-primary", items: [
    { to: "/", label: "Workspace", icon: LayoutDashboard, accent: "text-primary" },
    { to: "/daily-log", label: "Daily Log", icon: History, accent: "text-primary" },
    { to: "/systems", label: "Systems Architecture", icon: Boxes, accent: "text-primary" },
  ] },
  { group: "Current state", accent: "text-red-600 dark:text-red-400", dot: "bg-red-500", items: [
    { to: "/as-is", label: "As-Is Workflows", icon: Workflow, accent: "text-red-600 dark:text-red-400" },
    { to: "/asis-diagrams", label: "As-Is Flow Diagrams", icon: Waypoints, accent: "text-red-600 dark:text-red-400" },
    { to: "/asis-flows", label: "As-Is Workflow Flows", icon: Route, accent: "text-red-600 dark:text-red-400" },
    { to: "/inventory", label: "Field Inventory", icon: Boxes, accent: "text-red-600 dark:text-red-400" },
    { to: "/priority-changes", label: "Priority Changes", icon: ListChecks, accent: "text-red-600 dark:text-red-400" },
    { to: "/attribution-audit", label: "Attribution Audit", icon: Radar, accent: "text-red-600 dark:text-red-400" },
    { to: "/lifecycle-playbook", label: "Lifecycle Playbook", icon: MessagesSquare, accent: "text-red-600 dark:text-red-400" },
    { to: "/call-connect", label: "Call Connect (SDR Routing)", icon: PhoneForwarded, accent: "text-red-600 dark:text-red-400" },
  ] },
  { group: "Target (locked v2)", accent: "text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-500", items: [
    { to: "/to-be", label: "To-Be Workflows", icon: Workflow, accent: "text-emerald-600 dark:text-emerald-400" },
    { to: "/to-be-2bv2", label: "To-Be 2bv2 (Live Export)", icon: Network, accent: "text-emerald-600 dark:text-emerald-400" },
    { to: "/to-be-review", label: "Design Review", icon: SearchCheck, accent: "text-emerald-600 dark:text-emerald-400" },
    { to: "/wf-diagrams", label: "WF Flow Diagrams", icon: Waypoints, accent: "text-emerald-600 dark:text-emerald-400" },
    { to: "/diagrams", label: "Architecture", icon: Network, accent: "text-emerald-600 dark:text-emerald-400" },
    { to: "/pcc-form", label: "PCC Sales Form", icon: ClipboardList, accent: "text-emerald-600 dark:text-emerald-400" },
  ] },
  { group: "Archive · dropped plans", accent: "text-muted-foreground", dot: "bg-muted-foreground/50", collapsible: true, items: [
    { to: "/final-target", label: "Final Target Plan (dropped)", icon: Workflow, accent: "text-muted-foreground" },
    { to: "/final-target-sac", label: "SAC Attribution (dropped)", icon: Waypoints, accent: "text-muted-foreground" },
    { to: "/minimal-plan", label: "Minimal Plan (dropped)", icon: Target, accent: "text-muted-foreground" },
  ] },
  { group: "Governance", accent: "text-violet-600 dark:text-violet-400", dot: "bg-violet-500", items: [
    { to: "/gaps", label: "Audit Gaps", icon: SearchCheck, accent: "text-violet-600 dark:text-violet-400" },
    { to: "/tags", label: "Tag Library", icon: Tag, accent: "text-violet-600 dark:text-violet-400" },
    { to: "/custom-fields", label: "Custom Fields", icon: Database, accent: "text-violet-600 dark:text-violet-400" },
    { to: "/decisions", label: "Decisions", icon: Gavel, accent: "text-violet-600 dark:text-violet-400" },
    { to: "/risks", label: "Risk Register", icon: ShieldAlert, accent: "text-violet-600 dark:text-violet-400" },
  ] },
  { group: "Cody Archive", accent: "text-muted-foreground", dot: "bg-muted-foreground/50", collapsible: true, items: [
    { to: "/cody", label: "Cody Workflows", icon: Workflow, accent: "text-muted-foreground" },
    { to: "/cody-flows", label: "Cody Flow Diagrams", icon: Waypoints, accent: "text-muted-foreground" },
    { to: "/cody-inventory", label: "Cody Inventory", icon: Boxes, accent: "text-muted-foreground" },
    { to: "/cody-neo", label: "Cody Neo Workflows", icon: Workflow, accent: "text-muted-foreground" },
    { to: "/cody-neo-flows", label: "Cody Neo Flow Diagrams", icon: Waypoints, accent: "text-muted-foreground" },
    { to: "/cody-neo-inventory", label: "Cody Neo Inventory", icon: Boxes, accent: "text-muted-foreground" },
    { to: "/cody-neo-field-diff", label: "Field Diff", icon: Database, accent: "text-muted-foreground" },
  ] },
];

function Sidebar({ onNav }: { onNav?: () => void }) {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  return (
    <nav className="flex h-full flex-col gap-5 p-3">
      <div className="px-2 pt-1">
        <div className="flex items-center gap-2 text-sm font-bold text-foreground">
          <span className="flex h-7 w-7 items-center justify-center rounded-sm border-2 border-border bg-primary text-primary-foreground">
            <Network className="h-3.5 w-3.5" />
          </span>
          MWC GHL Refactor
        </div>
        <div className="truncate font-mono text-[10px] font-semibold text-foreground/70">Ghstz8eIsHWLeXek47dk</div>
      </div>
      <div className="flex flex-col gap-4 overflow-y-auto">
        {NAV.map((g) => {
          const collapsed = g.collapsible && !openGroups[g.group];
          return (
          <div key={g.group}>
            {g.collapsible ? (
              <button onClick={() => setOpenGroups((s) => ({ ...s, [g.group]: !s[g.group] }))}
                className="mb-1 flex w-full items-center gap-1.5 rounded-sm border-b border-border/60 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-foreground/80 hover:bg-muted">
                <span className={cn("h-2 w-2 rounded-sm", g.dot)} />{g.group}
                {collapsed ? <ChevronRight className="ms-auto h-3 w-3" /> : <ChevronDown className="ms-auto h-3 w-3" />}
              </button>
            ) : (
              <div className="mb-1 flex items-center gap-1.5 border-b border-border/60 px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-foreground/80">
                <span className={cn("h-2 w-2 rounded-sm", g.dot)} />{g.group}
              </div>
            )}
            <div className={cn("flex flex-col gap-0.5", collapsed && "hidden")}>
              {g.items.map((it) => (
                <NavLink key={it.to} to={it.to} end={it.to === "/"} onClick={onNav}
                  className={({ isActive }) => cn(
                    "flex items-center gap-2 rounded-sm border-l-[3px] px-2 py-1.5 text-sm transition-colors",
                    isActive
                      ? "border-accent bg-muted font-bold text-foreground"
                      : "border-transparent font-medium text-foreground/80 hover:border-border hover:bg-muted hover:text-foreground")}>
                  <it.icon className={cn("h-4 w-4 shrink-0", it.accent)} />
                  <span className="truncate">{it.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ); })}
      </div>
    </nav>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const { dark, toggle } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 border-r-2 border-border bg-card md:block"><Sidebar /></aside>
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 border-r-2 border-border bg-card"><Sidebar onNav={() => setOpen(false)} /></aside>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b-2 border-border bg-background px-4">
          <button className="rounded-sm border-2 border-border p-1 md:hidden" onClick={() => setOpen(true)} aria-label="Menu"><Menu className="h-5 w-5" /></button>
          <div className="flex-1"><GlobalSearch /></div>
          <div>
            <button onClick={toggle} aria-label="Toggle theme" className="rounded-sm border-2 border-border bg-card p-1.5 text-foreground hover:bg-muted">
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1800px] flex-1 px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}

export function LastUpdated({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border-2 border-border bg-muted/60 px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-foreground",
        className,
      )}
      title={BUILD_COMMIT ? `Build commit ${BUILD_COMMIT}` : undefined}
    >
      <Clock className="h-3 w-3" aria-hidden />
      <span className="text-muted-foreground">Last updated</span>
      <span className="normal-case tracking-normal">{BUILD_TIME_LABEL}</span>
      {BUILD_COMMIT && (
        <span className="ms-1 font-mono text-[10px] font-normal normal-case text-muted-foreground">
          · {BUILD_COMMIT}
        </span>
      )}
    </div>
  );
}

export function PageShell({ title, subtitle, actions, children }: { title: string; subtitle?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-border pb-4">
        <div className="border-l-4 border-accent pl-3">
          <h1 className="text-xl font-bold tracking-tight text-foreground">{title}</h1>
          {subtitle && <p className="mt-1 max-w-3xl text-sm text-foreground/80">{subtitle}</p>}
          <div className="mt-2"><LastUpdated /></div>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}
