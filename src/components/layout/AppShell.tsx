import { NavLink, Outlet } from "react-router-dom";
import { Wind } from "lucide-react";
import { useIsDesktop } from "../../hooks/useMediaQuery";
import { NAV } from "./nav";

export function AppShell() {
  const desktop = useIsDesktop();
  return desktop ? <DesktopShell /> : <MobileShell />;
}

function DesktopShell() {
  return (
    <div className="min-h-screen px-4 py-4 md:px-6 md:py-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-[1400px] overflow-hidden rounded-[36px] bg-shell shadow-[0_40px_80px_rgba(0,0,0,0.18)] ring-1 ring-line">
        <aside className="flex w-[88px] flex-col items-center gap-2 bg-nav py-6">
          <div className="mb-6 grid h-12 w-12 place-items-center rounded-2xl bg-panel-2 text-accent">
            <Wind size={22} />
          </div>
          {NAV.map((item) => (
            <NavLink
              key={item.id}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex w-[72px] flex-col items-center gap-1 rounded-2xl px-2 py-3 text-[11px] ${
                  isActive ? "bg-soft text-ink" : "text-muted hover:text-ink"
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </aside>
        <main className="min-w-0 flex-1 overflow-y-auto p-5 md:p-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function MobileShell() {
  return (
    <div className="min-h-dvh bg-surface">
      <main className="px-4 pb-28 pt-[max(1rem,env(safe-area-inset-top))]">
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-nav/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div
          className="mx-auto grid max-w-lg"
          style={{ gridTemplateColumns: `repeat(${NAV.length}, minmax(0, 1fr))` }}
        >
          {NAV.map((item) => (
            <NavLink
              key={item.id}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-3 text-[10px] ${
                  isActive ? "text-ink" : "text-muted"
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
