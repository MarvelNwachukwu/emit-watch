"use client";

import { getEventColor } from "@/lib/utils";

export function EventFilter({
  eventNames,
  activeFilter,
  onFilter,
}: {
  eventNames: string[];
  activeFilter: string | null;
  onFilter: (name: string | null) => void;
}) {
  if (eventNames.length <= 1) return null;

  return (
    <div className="animate-fade-up flex flex-wrap gap-2" style={{ animationDelay: "50ms" }}>
      <button
        onClick={() => onFilter(null)}
        className={`rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all ${
          activeFilter === null
            ? "bg-accent text-white shadow-[0_1px_8px_-2px] shadow-accent/40"
            : "border border-border bg-surface text-muted hover:border-accent/30 hover:text-foreground"
        }`}
      >
        All Events
      </button>
      {eventNames.map((name) => {
        const color = getEventColor(name);
        const isActive = activeFilter === name;
        return (
          <button
            key={name}
            onClick={() => onFilter(isActive ? null : name)}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all ${
              isActive
                ? "text-white shadow-[0_1px_8px_-2px]"
                : "border border-border bg-surface text-muted hover:border-accent/30 hover:text-foreground"
            }`}
            style={
              isActive
                ? {
                    backgroundColor: color,
                    boxShadow: `0 1px 8px -2px ${color}60`,
                  }
                : undefined
            }
          >
            {!isActive && (
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: color }}
              />
            )}
            {name}
          </button>
        );
      })}
    </div>
  );
}
