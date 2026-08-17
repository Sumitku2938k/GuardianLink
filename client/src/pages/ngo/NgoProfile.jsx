import React from "react";
import { useNavigate } from "react-router-dom";
import { User, Building2, ShieldCheck, Heart, ArrowLeft } from "lucide-react";
import { useNgo } from "@/context/NgoContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export default function NgoProfile() {
  const navigate = useNavigate();
  const { currentNgo } = useNgo();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-655 dark:text-teal-400 flex items-center justify-center shrink-0">
            <User className="w-4.5 h-4.5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-850 dark:text-white">NGO Organization Profile & License</h1>
            <p className="text-xs text-slate-550 dark:text-slate-400">Verified Non-Profit Child Shelter Credentials.</p>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={() => navigate("/ngo/dashboard")} leftIcon={ArrowLeft}>
          Back to Dashboard
        </Button>
      </div>

      <Card className="p-6 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-slate-850 dark:text-white space-y-6 shadow-md">
        <div className="flex items-center gap-4">
          <img
            src={currentNgo.logo}
            alt={currentNgo.name}
            className="w-20 h-20 rounded-2xl object-cover ring-4 ring-white dark:ring-slate-900 shrink-0"
          />

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">{currentNgo.name}</h2>
              <Badge variant="success" size="sm" className="bg-teal-500/20 text-teal-650 dark:text-teal-350 font-bold border border-teal-500/30">
                Verified NGO
              </Badge>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400 block font-mono">Reg #{currentNgo.registrationNumber}</span>
            <span className="text-[11px] text-teal-650 dark:text-teal-300 font-bold flex items-center gap-1 pt-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Certified Child Shelter Care Provider
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2 border-t border-gray-150 dark:border-slate-800">
          <div>
            <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-mono">Shelter Address</span>
            <strong className="text-slate-850 dark:text-white text-sm block mt-0.5">{currentNgo.address}</strong>
          </div>

          <div>
            <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-mono">Contact Phone & Email</span>
            <strong className="text-teal-655 text-sm block mt-0.5">{currentNgo.phone}</strong>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-mono">{currentNgo.email}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
