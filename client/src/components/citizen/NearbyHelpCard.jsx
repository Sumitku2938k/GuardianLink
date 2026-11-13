import React from "react";
import { Building2, PhoneCall, Shield, HeartPulse, Info } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export const NearbyHelpCard = () => {
  const nationalHelplines = [
    {
      id: "childline",
      type: "ngo",
      name: "Childline Emergency Support",
      authority: "Ministry of Women & Child Development",
      description: "24x7 toll-free emergency service for children in need of care and protection.",
      phone: "1098",
      displayPhone: "1098 (Toll-Free)",
      status: "Available 24x7"
    },
    {
      id: "police",
      type: "police",
      name: "National Emergency Response Support (ERSS)",
      authority: "Emergency Police Dispatch",
      description: "Unified emergency helpline for immediate law enforcement and emergency response.",
      phone: "112",
      displayPhone: "112 (National Helpline)",
      status: "Immediate Dispatch"
    },
    {
      id: "women_child",
      type: "hospital",
      name: "Women & Child Protection Cell",
      authority: "State Police Special Juvenile Units",
      description: "Specialized assistance for vulnerable women and children in public spaces.",
      phone: "1091",
      displayPhone: "1091 (State Helpline)",
      status: "Active Duty"
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
          <Shield className="w-4.5 h-4.5 text-teal-500" />
          <span>Official Emergency Responder Helplines</span>
        </h3>
        <Badge variant="outline" size="sm" className="text-[10px] text-teal-600 dark:text-teal-400 border-teal-500/30">
          Official Govt Helplines
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {nationalHelplines.map((st) => (
          <Card key={st.id} className="p-4 space-y-3 hover:border-teal-500/40 transition-colors">
            <div className="flex justify-between items-start">
              <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-500 flex items-center justify-center shrink-0">
                {st.type === "police" ? (
                  <Building2 className="w-4.5 h-4.5" />
                ) : st.type === "ngo" ? (
                  <Shield className="w-4.5 h-4.5" />
                ) : (
                  <HeartPulse className="w-4.5 h-4.5" />
                )}
              </div>
              <Badge variant="secondary" size="sm" className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {st.status}
              </Badge>
            </div>

            <div className="space-y-1">
              <h4 className="text-xs font-bold text-gray-900 dark:text-white leading-tight">{st.name}</h4>
              <span className="text-[10px] text-gray-400 block">{st.authority}</span>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug">{st.description}</p>
            </div>

            <div className="pt-2 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-[10px] font-semibold text-slate-400">Priority Dial</span>
              <a
                href={`tel:${st.phone}`}
                className="text-teal-600 dark:text-teal-400 font-bold hover:underline flex items-center gap-1"
              >
                <PhoneCall className="w-3 h-3" /> Call {st.displayPhone}
              </a>
            </div>
          </Card>
        ))}
      </div>

      <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-gray-200 dark:border-slate-800 text-[11px] text-gray-500 dark:text-gray-400 flex items-start gap-2">
        <Info className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
        <span>
          <strong>Protocol Note:</strong> Local police station and NGO shelter dispatch is initiated through official channels when you submit a verified Sighting Report. For active medical or safety emergencies, dial <strong>112</strong> or <strong>1098</strong> directly.
        </span>
      </div>
    </div>
  );
};
