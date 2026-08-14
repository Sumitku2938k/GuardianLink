import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Bell, Menu, Shield, Building2, User, LogOut, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { GlobalSearchModal } from "./GlobalSearchModal";

export const PoliceTopNavbar = ({ onOpenMobileSidebar, currentOfficer, currentStation, onLogout }) => {
  const navigate = useNavigate();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  return (
    <>
      <header className="h-16 bg-slate-900 border-b border-slate-800 text-white px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-md">
        {/* Left Section: Mobile Menu & Station Selector */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMobileSidebar}
            className="lg:hidden p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs font-semibold text-slate-200">
            <Building2 className="w-4 h-4 text-teal-400 shrink-0" />
            <select
              value={currentStation}
              onChange={(e) => {}}
              className="bg-transparent outline-none cursor-pointer text-xs font-bold text-white pr-2"
            >
              <option value="Delhi Central Metro Police Post - Sector 12" className="bg-slate-900 text-white">
                Delhi Central Metro Police Post - Sector 12
              </option>
              <option value="Sector 18 Crime Branch - Noida" className="bg-slate-900 text-white">
                Sector 18 Crime Branch - Noida
              </option>
              <option value="Railway Protection Force Control Post" className="bg-slate-900 text-white">
                Railway Protection Force Control Post
              </option>
            </select>
          </div>
        </div>

        {/* Center: Global Search Trigger Button */}
        <div className="flex-1 max-w-md mx-4">
          <button
            onClick={() => setIsSearchOpen(true)}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs bg-slate-800/80 hover:bg-slate-800 text-slate-400 rounded-xl border border-slate-700 transition-colors"
          >
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="truncate text-slate-400">Search Case ID, Child Name, Location, or Officer...</span>
            <span className="hidden sm:inline-block ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">
              Ctrl+K
            </span>
          </button>
        </div>

        {/* Right Section: Duty Status, Notifications & Profile */}
        <div className="flex items-center gap-3">
          {/* Duty Status Badge */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Active Duty</span>
          </div>

          {/* Notifications */}
          <button
            onClick={() => navigate("/police/notifications")}
            className="relative p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-slate-900" />
          </button>

          {/* Officer Profile Menu Trigger */}
          <div className="relative">
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-800 transition-colors"
            >
              <img
                src={currentOfficer.avatar}
                alt={currentOfficer.name}
                className="w-8 h-8 rounded-xl object-cover ring-2 ring-blue-500/30"
              />
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
            </button>

            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-slate-900 rounded-xl shadow-2xl border border-slate-800 z-50 py-1.5 text-xs text-slate-200">
                <div className="px-3 py-2 border-b border-slate-800">
                  <strong className="block text-white font-bold">{currentOfficer.name}</strong>
                  <span className="text-[10px] text-teal-400 font-mono">{currentOfficer.badgeNumber}</span>
                </div>

                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    navigate("/police/profile");
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-800 flex items-center gap-2"
                >
                  <User className="w-4 h-4 text-blue-400" /> Officer Profile
                </button>

                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    onLogout();
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-800 text-rose-400 flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" /> Logout Duty
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Global Search Overlay Modal */}
      <GlobalSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
};
