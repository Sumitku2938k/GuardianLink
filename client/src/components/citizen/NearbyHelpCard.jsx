import React, { useEffect, useMemo } from "react";
import { Building2, PhoneCall, Shield, HeartPulse, Info, MapPin, RefreshCw, Home } from "lucide-react";
import { useCitizen } from "@/context/CitizenContext";
import { LocationDisplay } from "@/components/common/map/LocationDisplay";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export const NearbyHelpCard = () => {
  const { facilities, isLoadingFacilities, loadNearbyFacilities } = useCitizen();

  useEffect(() => {
    loadNearbyFacilities();
  }, [loadNearbyFacilities]);

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

  // Map markers for shelters with valid coordinates
  const shelterMarkers = useMemo(() => {
    return facilities
      .filter((f) => Number.isFinite(Number(f.latitude)) && Number.isFinite(Number(f.longitude)))
      .map((f) => ({
        id: f.id,
        latitude: Number(f.latitude),
        longitude: Number(f.longitude),
        type: "shelter",
        title: f.name,
        subtitle: `${f.availableBeds} beds available`,
        address: f.address
      }));
  }, [facilities]);

  return (
    <div className="space-y-6">
      {/* SECTION 1: REGISTERED ASSISTANCE FACILITIES */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <Home className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                Registered Assistance Facilities & Shelters
              </h3>
              <p className="text-xs text-gray-500">
                Verified child-care institutions, shelters, and government assistance points.
              </p>
            </div>
          </div>

          <Badge variant="outline" size="sm" className="text-[10px] text-purple-600 dark:text-purple-400 border-purple-500/30">
            {isLoadingFacilities ? "Loading..." : `${facilities.length} Verified Facilities`}
          </Badge>
        </div>

        {/* Interactive Leaflet Map for Shelters with GPS */}
        {shelterMarkers.length > 0 && (
          <div className="rounded-2xl overflow-hidden border border-gray-100 dark:border-slate-800 shadow-sm">
            <LocationDisplay
              markers={shelterMarkers}
              height="240px"
              title="Registered Assistance Facilities"
            />
          </div>
        )}

        {/* Facilities Grid */}
        {isLoadingFacilities && facilities.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800">
            <RefreshCw className="w-6 h-6 animate-spin text-purple-500 mx-auto mb-2" />
            <p className="text-xs text-gray-400">Loading verified facilities from registry...</p>
          </div>
        ) : facilities.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {facilities.map((fac) => (
              <Card key={fac.id} className="p-4 space-y-3 hover:border-purple-500/40 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                    <Home className="w-4.5 h-4.5" />
                  </div>
                  <Badge variant="secondary" size="sm" className="text-[10px] font-mono font-bold text-purple-600 dark:text-purple-400">
                    {fac.availableBeds} beds free
                  </Badge>
                </div>

                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-gray-900 dark:text-white leading-tight">
                    {fac.name}
                  </h4>
                  <div className="text-[11px] text-gray-500 dark:text-gray-400 flex items-start gap-1">
                    <MapPin className="w-3 h-3 text-rose-500 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{fac.address}</span>
                  </div>
                  <span className="text-[10px] text-gray-400 block">
                    Capacity: {fac.totalCapacity} beds total
                  </span>
                </div>

                <div className="pt-2 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-[10px] font-semibold text-slate-400">Public Contact</span>
                  {fac.phone && fac.phone !== "N/A" ? (
                    <a
                      href={`tel:${fac.phone}`}
                      className="text-purple-600 dark:text-purple-400 font-bold hover:underline flex items-center gap-1 text-[11px]"
                    >
                      <PhoneCall className="w-3 h-3" /> Call {fac.phone}
                    </a>
                  ) : (
                    <span className="text-gray-400 text-[11px]">Via Police Desk</span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center text-xs text-gray-500 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800">
            No registered assistance facilities are currently available in this area.
          </div>
        )}
      </div>

      {/* SECTION 2: OFFICIAL 24x7 GOVERNMENT HELPLINES */}
      <div className="space-y-3">
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
    </div>
  );
};
