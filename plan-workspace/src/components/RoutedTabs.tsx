import { createContext, useContext, type ReactNode } from "react";
import { NavLink, useParams } from "react-router-dom";
import { cn } from "./ui";

// URL-driven tabs: each tab is a real route (`${base}/${value}`), so every view
// is deep-linkable and back/forward works. The bare `base` route shows the first tab.
const Ctx = createContext<string>("");

export function RoutedTabs({ base, tabs, children }: {
  base: string;
  tabs: { value: string; label: string }[];
  children: ReactNode;
}) {
  const { tab } = useParams();
  const active = tabs.some((t) => t.value === tab) ? (tab as string) : tabs[0].value;
  return (
    <Ctx.Provider value={active}>
      <div className="space-y-4">
        <div className="inline-flex flex-wrap gap-1 rounded-lg border bg-muted/40 p-1">
          {tabs.map((t) => (
            <NavLink key={t.value} to={`${base}/${t.value}`}
              className={cn("rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                active === t.value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              {t.label}
            </NavLink>
          ))}
        </div>
        {children}
      </div>
    </Ctx.Provider>
  );
}

export function RoutedTabPanel({ value, className, children }: { value: string; className?: string; children: ReactNode }) {
  const active = useContext(Ctx);
  if (active !== value) return null;
  return <div className={className}>{children}</div>;
}
