import React from "react";
import { useNavigate } from "react-router-dom";
import { User, ShieldCheck, Lock, Bell, Mail, Phone, Clock, ArrowLeft } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export default function AdminProfile() {
  const navigate = useNavigate();
  const { currentAdmin } = useAdmin();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 border border-indigo-100">
            <User className="w-4.5 h-4.5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900">Administrator Profile & Security Credentials</h1>
            <p className="text-xs text-slate-500">Government Portal Master Clearance.</p>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={() => navigate("/admin/dashboard")} leftIcon={ArrowLeft}>
          Back to Dashboard
        </Button>
      </div>

      <Card className="p-6 bg-white border-gray-200 text-slate-900 space-y-6 shadow-sm">
        <div className="flex items-center gap-4">
          <img
            src={currentAdmin.avatar}
            alt={currentAdmin.name}
            className="w-20 h-20 rounded-full object-cover ring-4 ring-indigo-500/20 shrink-0"
          />

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">{currentAdmin.name}</h2>
              <Badge variant="success" size="sm" className="bg-indigo-100 text-indigo-800 font-bold border border-indigo-200">
                {currentAdmin.role}
              </Badge>
            </div>
            <span className="text-xs text-slate-500 block font-mono">Admin ID #{currentAdmin.id}</span>
            <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1 pt-1 font-mono">
              <ShieldCheck className="w-3.5 h-3.5" /> {currentAdmin.securityStatus}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-4 border-t border-gray-150">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-mono">Official Email</span>
            <strong className="text-slate-900 text-sm block mt-0.5">{currentAdmin.email}</strong>
          </div>

          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-mono">Contact Phone & Last Login</span>
            <strong className="text-indigo-700 text-sm block mt-0.5">{currentAdmin.phone}</strong>
            <span className="text-[10px] text-slate-500 block font-mono">Last Session: {currentAdmin.lastLogin}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
