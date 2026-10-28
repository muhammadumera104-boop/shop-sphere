"use client";
import { useId, useState, type ReactNode } from "react";
import { cx } from "./ui";

/** Accessible tabs (arrow keys move between tabs). Panels are rendered on the server and passed in. */
export function ClientTabs({ tabs }: { tabs: { label: string; content: ReactNode }[] }) {
  const [active, setActive] = useState(0);
  const id = useId();
  return (
    <div>
      <div role="tablist" className="flex gap-6 border-b border-line" onKeyDown={(e) => {
        if (e.key === "ArrowRight") setActive((a) => (a + 1) % tabs.length);
        if (e.key === "ArrowLeft") setActive((a) => (a - 1 + tabs.length) % tabs.length);
      }}>
        {tabs.map((t, i) => (
          <button
            key={t.label}
            role="tab"
            id={`${id}-t${i}`}
            aria-selected={i === active}
            aria-controls={`${id}-p${i}`}
            tabIndex={i === active ? 0 : -1}
            onClick={() => setActive(i)}
            className={cx("pb-3 -mb-px text-sm font-medium border-b-2", i === active ? "border-indigo-600 text-indigo-600" : "border-transparent text-muted hover:text-ink")}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t, i) => (
        <div key={t.label} role="tabpanel" id={`${id}-p${i}`} aria-labelledby={`${id}-t${i}`} hidden={i !== active} className="pt-5">
          {t.content}
        </div>
      ))}
    </div>
  );
}
