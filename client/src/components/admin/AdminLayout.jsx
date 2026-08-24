import React, { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { AdminSidebar } from "./AdminSidebar";
import { AdminTopNavbar } from "./AdminTopNavbar";

export const AdminLayout = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col antialiased selection:bg-indigo-500 selection:text-white">
      {/* Admin Sidebar */}
      <AdminSidebar
        isOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Body */}
      <div className="lg:pl-64 flex flex-col flex-1 min-w-0">
        {/* Top Navbar */}
        <AdminTopNavbar
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
        />

        {/* Dynamic Page Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          <Outlet />
        </main>

        {/* Light Console Footer */}
        <footer className="border-t border-gray-200 bg-white py-4 px-6 text-center text-xs text-slate-500">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 max-w-7xl mx-auto">
            <span>
              GuardianLink Platform Administration & Oversight System • Govt. Certified Child Safety Portal
            </span>
            <span className="font-mono text-[11px] text-indigo-600 font-bold">
              v2.5.0 Production
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
};
