import ProfileDropdown from "@/components/ProfileDropdown";
import { getRoleLabel } from "@/lib/permissions";

export default function Navbar({ user, onLogout, title = "Dashboard" }) {
  const role = getRoleLabel(user?.role);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <div className="flex items-center justify-between gap-3 py-3 pl-16 pr-3 md:gap-4 md:px-6 md:py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="truncate text-base font-bold text-slate-900 sm:text-lg md:text-2xl">{title}</h1>
            <span className="hidden rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 sm:inline-flex">
              {role}
            </span>
          </div>
          <p className="mt-1 hidden text-sm text-slate-500 sm:block">
            Signed in as <span className="font-semibold text-slate-700">{user?.username || "User"}</span>
          </p>
        </div>

        <ProfileDropdown user={user} onLogout={onLogout} />
      </div>
    </header>
  );
}
