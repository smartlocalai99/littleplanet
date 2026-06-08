

import "@/styles/globals.css";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { useRouter } from "next/router";
import { useMemo } from "react";

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const isPublicPage = router.pathname === "/login" || Component.publicPage;
  const title = useMemo(() => {
    if (router.pathname === "/dashboard") return "Dashboard";
    if (router.pathname === "/admissions") return "Admissions";
    if (router.pathname === "/parents") return "Parents";
    if (router.pathname === "/students") return "Students";
    if (router.pathname === "/staff") return "Staff";
    if (router.pathname === "/payroll") return "Staff";
    if (router.pathname === "/fees") return "Fees";
    if (router.pathname === "/transactions") return "Transactions";
    if (router.pathname === "/bank-cash") return "Cash / Bank";
    if (router.pathname === "/reconciliation") return "Reconciliation";
    if (router.pathname === "/expenses") return "Expenses";
    if (router.pathname === "/assets") return "Assets";
    if (router.pathname === "/reports") return "Reports";
    if (router.pathname === "/alerts") return "Alerts";
    if (router.pathname === "/user-management") return "User Management";
    if (router.pathname === "/school-profile") return "School Profile";
    return "Quantum Admissions";
  }, [router.pathname]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    await router.replace("/login");
  }

  if (isPublicPage) {
    return <Component {...pageProps} />;
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar user={pageProps.user} />
      <main className="flex-1 min-w-0 md:ml-64">
        <Navbar user={pageProps.user} onLogout={handleLogout} title={title} />
        <Component {...pageProps} />
      </main>
    </div>
  );
}
