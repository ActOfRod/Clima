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
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-[1400px] overflow-hidden rounded-[36px] bg-[#0e1728] shadow-[0_40px_80px_rgba(0,0,0,0.35)] ring-1 ring-white/5">
        <aside className="flex w-[88px] flex-col items-center gap-2 bg-[#121c2e] py-6">
          <div className="mb-6 grid h-12 w-12 place-items-center rounded-2xl bg-[#1b2a40] text-[#7ec8ff]">
            <Wind size={22} />
          </div>
          {NAV.map((item) => (
            <NavLink
              key={item.id}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex w-[72px] flex-col items-center gap-1 rounded-2xl px-2 py-3 text-[11px] ${
                  isActive ? "bg-white/8 text-white" : "text-[#8b9cb3] hover:text-white"
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
    <div className="min-h-dvh bg-[#0b1220]">
      <main className="px-4 pb-28 pt-[max(1rem,env(safe-area-inset-top))]">
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/5 bg-[#121c2e]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto grid max-w-lg grid-cols-6">
          {NAV.map((item) => (
            <NavLink
              key={item.id}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-3 text-[10px] ${
                  isActive ? "text-white" : "text-[#8b9cb3]"
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
