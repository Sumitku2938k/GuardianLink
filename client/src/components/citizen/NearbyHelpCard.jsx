import React from "react";
import { Building2, PhoneCall, MapPin, Shield, HeartPulse, Navigation } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export const NearbyHelpCard = () => {
  const nearbyStations = [
    {
      id: 1,
      type: "police",
      name: "Sector 14 Police Protection Post",
      distance: "0.4 km away",
      address: "Gate 3 Metro Kiosk Area, Sector 14",
      phone: "+91 11 2301 0000",
      status: "Open 24x7"
    },
    {
      id: 2,
      type: "ngo",
      name: "Bachpan Bachao Verified Shelter Kiosk",
      distance: "1.2 km away",
      address: "Community Center, Sector 12",
      phone: "+91 11 2617 2000",
      status: "Active Verified NGO"
    },
    {
      id: 3,
      type: "hospital",
      name: "City Civil Emergency Hospital",
      distance: "1.8 km away",
      address: "Main Ring Road, Sector 10",
      phone: "+91 11 2578 3000",
      status: "Emergency Trauma Unit"
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
          <Shield className="w-4.5 h-4.5 text-teal-500" />
          <span>Nearby Emergency Responders</span>
        </h3>
        <span className="text-[11px] text-gray-400">Mock Location Data</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {nearbyStations.map((st) => (
          <Card key={st.id} className="p-4 space-y-3 hover:border-teal-500/40 transition-colors">
            <div className="flex justify-between items-start">
              <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-500 flex items-center justify-center shrink-0">
                {st.type === "police" ? <Building2 className="w-4.5 h-4.5" /> : st.type === "ngo" ? <Shield className="w-4.5 h-4.5" /> : <HeartPulse className="w-4.5 h-4.5" />}
              </div>
              <Badge variant="secondary" size="sm" className="text-[10px]">
                {st.distance}
              </Badge>
            </div>

            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-gray-900 dark:text-white leading-tight">{st.name}</h4>
              <span className="text-[10px] text-gray-400 block truncate">{st.address}</span>
            </div>

            <div className="pt-2 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-[10px] font-semibold text-emerald-500">{st.status}</span>
              <a href={`tel:${st.phone}`} className="text-teal-600 dark:text-teal-400 font-bold hover:underline flex items-center gap-1">
                <PhoneCall className="w-3 h-3" /> Call Desk
              </a>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
