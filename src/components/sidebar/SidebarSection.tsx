import type { ReactNode } from "react";

type SidebarSectionProps = {
  action?: ReactNode;
  children: ReactNode;
  title: ReactNode;
};

export function SidebarSection({ action, children, title }: SidebarSectionProps) {
  return (
    <section className="mb-5">
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
