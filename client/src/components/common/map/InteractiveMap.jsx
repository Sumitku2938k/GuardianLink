import React, { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import { AlertTriangle, WifiOff } from "lucide-react";

/**
 * Controller subcomponent to dynamically update view center/bounds
 */
function MapViewController({ center, zoom, bounds }) {
  const map = useMap();

  useEffect(() => {
    if (bounds && bounds.length > 0) {
      try {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
      } catch {
        if (center) map.setView(center, zoom || 14);
      }
    } else if (center && Number.isFinite(center[0]) && Number.isFinite(center[1])) {
      map.setView(center, zoom || 14);
    }
  }, [center, zoom, bounds, map]);

  return null;
}

/**
 * Robust base interactive map wrapper using OpenStreetMap tiles
 */
export const InteractiveMap = ({
  center = [20.5937, 78.9629], // Geographic center of India as neutral default
  zoom = 13,
  bounds = null,
  height = "320px",
  className = "",
  children,
  scrollWheelZoom = false
}) => {
  const [tileError, setTileError] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const validCenter =
    Array.isArray(center) &&
    center.length === 2 &&
    Number.isFinite(center[0]) &&
    Number.isFinite(center[1])
      ? center
      : [20.5937, 78.9629];

  return (
    <div
      className={`relative w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-inner bg-slate-100 dark:bg-slate-900 ${className}`}
      style={{ height }}
    >
      {/* Offline / Tile Fallback Warning Banner */}
      {(isOffline || tileError) && (
        <div className="absolute top-2 left-2 right-2 z-[1000] bg-amber-500/90 text-white text-xs px-3 py-2 rounded-xl backdrop-blur-md flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            {isOffline ? <WifiOff className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
            <span>
              {isOffline
                ? "Network offline. Stored coordinates are preserved."
                : "Map tiles temporarily unavailable. Coordinates remain recorded."}
            </span>
          </div>
        </div>
      )}

      <MapContainer
        center={validCenter}
        zoom={zoom}
        scrollWheelZoom={scrollWheelZoom}
        style={{ height: "100%", width: "100%" }}
        attributionControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
          eventHandlers={{
            tileerror: () => setTileError(true),
            tileload: () => setTileError(false)
          }}
        />
        <MapViewController center={validCenter} zoom={zoom} bounds={bounds} />
        {children}
      </MapContainer>
    </div>
  );
};

