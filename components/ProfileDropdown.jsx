import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FaSignOutAlt, FaSchool, FaChevronDown } from "react-icons/fa";
import { getRoleLabel } from "@/lib/permissions";

function getInitials(username) {
  const cleaned = String(username || "").trim();

  if (!cleaned) {
    return "U";
  }

  return cleaned
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default function ProfileDropdown({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const closeTimerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  function openMenu() {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
    }

    setOpen(true);
  }

  function closeMenuDelayed() {
    closeTimerRef.current = setTimeout(() => setOpen(false), 120);
  }

  const role = getRoleLabel(user?.role);

  return (
    <div
      ref={rootRef}
      className="relative"
      onMouseEnter={openMenu}
      onMouseLeave={closeMenuDelayed}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 bg-white px-2 py-2 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 sm:gap-3 sm:px-3"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white sm:h-10 sm:w-10">
          {getInitials(user?.username)}
        </span>
        <span className="hidden text-left sm:block">
          <span className="block text-sm font-semibold text-slate-900">
            {user?.username || "User"}
          </span>
          <span className="mt-0.5 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
            {role}
          </span>
        </span>
        <FaChevronDown className={`text-slate-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <div
        className={`absolute right-0 top-[calc(100%+0.75rem)] w-[calc(100vw-1.5rem)] max-w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all duration-200 sm:w-72 ${
          open
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-2 opacity-0"
        }`}
        role="menu"
      >
        <div className="border-b border-slate-100 px-4 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
              {getInitials(user?.username)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">
                {user?.username || "User"}
              </p>
              <p className="text-xs uppercase tracking-wide text-slate-500">
                {role}
              </p>
            </div>
          </div>
        </div>

        <div className="p-2">
          <Link
            href="/school-profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            role="menuitem"
          >
            <FaSchool className="text-slate-500" />
            School Profile
          </Link>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onLogout?.();
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
            role="menuitem"
          >
            <FaSignOutAlt />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
