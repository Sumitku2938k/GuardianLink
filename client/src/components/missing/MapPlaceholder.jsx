import React, { useState } from "react";
import { MapPin, Navigation, Compass, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

export const MapPlaceholder = ({
  locationName = "Central Metro Station Gate #3, Sector 12",
  latitude = "28.6139",
  longitude = "77.2090",
  onSelectLocation
}) => {
  const [currentLocActive, setCurrentLocActive] = useState(false);
  const [mapLoc, setMapLoc] = useState({
    name: locationName,
    lat: latitude,
    lng: longitude
  });

  const handleUseCurrentLocation = () => {
    setCurrentLocActive(true);
    if (typeof navigator !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude.toFixed(4);
          const lng = pos.coords.longitude.toFixed(4);
          const updated = {
            name: `Current Location (${lat}° N, ${lng}° E)`,
            lat,
            lng
          };
          setMapLoc(updated);
          if (onSelectLocation) onSelectLocation(updated);
          setCurrentLocActive(false);
        },
        () => {
          const fallback = {
            name: "GPS Location (28.6142° N, 77.2095° E)",
            lat: "28.6142",
            lng: "77.2095"
          };
          setMapLoc(fallback);
          if (onSelectLocation) onSelectLocation(fallback);
          setCurrentLocActive(false);
        },
        { timeout: 5000 }
      );
    } else {
      setCurrentLocActive(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative w-full h-56 sm:h-64 rounded-2xl overflow-hidden bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-inner flex flex-col justify-between p-4 group">
        {/* Map Grid Pattern Graphic */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(#38bdf8 1px, transparent 1px)`,
            backgroundSize: "20px 20px"
          }}
        />

        {/* Center Marker Pin */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center pointer-events-none">
          <div className="w-10 h-10 rounded-full bg-rose-500/20 text-rose-500 flex items-center justify-center animate-bounce ring-4 ring-rose-500/30">
            <MapPin className="w-6 h-6 fill-current" />
          </div>
          <span className="bg-black/80 text-white text-[10px] font-mono px-2 py-0.5 rounded-full backdrop-blur-sm shadow-md mt-1">
            TARGET GPS MARKER
          </span>
        </div>

        {/* Top Controls Overlay */}
        <div className="relative z-10 flex justify-between items-start">
          <span className="text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-1 rounded-lg bg-black/60 text-teal-400 border border-teal-500/30 backdrop-blur-md flex items-center gap-1">
            <Compass className="w-3.5 h-3.5" /> Interactive Map UI Simulation
          </span>

          <Button
            onClick={handleUseCurrentLocation}
            variant="glass"
            size="sm"
            leftIcon={Navigation}
            className="text-xs bg-white/90 dark:bg-slate-900/90 text-gray-900 dark:text-white"
          >
            {currentLocActive ? "Locating GPS..." : "Use My Current Location"}
          </Button>
        </div>

        {/* Bottom Coordinates Box */}
        <div className="relative z-10 p-3 rounded-xl bg-slate-950/80 backdrop-blur-md border border-slate-800 text-white text-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-bold text-teal-300 truncate">{mapLoc.name}</span>
            <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
          </div>
          <p className="text-[10px] text-slate-400 font-mono">
            Lat: {mapLoc.lat}° N • Long: {mapLoc.lng}° E • Accuracy: 5 meters
          </p>
        </div>
      </div>
    </div>
  );
};
