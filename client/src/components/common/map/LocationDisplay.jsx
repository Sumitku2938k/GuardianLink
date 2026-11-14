import React, { useMemo } from "react";
import { Marker, Popup, Circle } from "react-leaflet";
import { ShieldAlert, MapPin, Eye, Home, Calendar, Clock } from "lucide-react";
import { InteractiveMap } from "./InteractiveMap";
import {
  childLastSeenIcon,
  sightingIcon,
  policeIcon,
  shelterIcon,
  currentGpsIcon
} from "./mapIcons";

/**
 * Maps marker type string to custom SVG DivIcon
 */
const getMarkerIcon = (type) => {
  switch (type) {
    case "child":
    case "lastSeen":
      return childLastSeenIcon;
    case "sighting":
      return sightingIcon;
    case "police":
      return policeIcon;
    case "shelter":
      return shelterIcon;
    default:
      return currentGpsIcon;
  }
};

/**
 * Universal read-only interactive map component for displaying single or multi-marker cases/sightings
 */
export const LocationDisplay = ({
  location = null, // Single location object { latitude, longitude, address, city, state, pinCode, accuracy, source }
  markers = [], // Array of { id, latitude, longitude, type, title, subtitle, address, date, accuracy }
  height = "320px",
  title = "Location Intelligence",
  isPrivacyRedacted = false,
  className = ""
}) => {
  // Normalize single location into markers array if markers not explicitly provided
  const activeMarkers = useMemo(() => {
    if (markers && markers.length > 0) {
      return markers.filter(
        (m) =>
          m &&
          Number.isFinite(Number(m.latitude)) &&
          Number.isFinite(Number(m.longitude))
      );
    }
    if (
      location &&
      Number.isFinite(Number(location.latitude)) &&
      Number.isFinite(Number(location.longitude))
    ) {
      return [
        {
          id: "single-loc",
          latitude: Number(location.latitude),
          longitude: Number(location.longitude),
          type: location.type || "child",
          title: location.title || location.address || "Reported Location",
          subtitle: location.city ? `${location.city}, ${location.state || ""}` : "",
          address: location.address,
          accuracy: location.accuracy,
          source: location.source
        }
      ];
    }
    return [];
  }, [location, markers]);

  // Compute bounding box if multiple markers exist
  const bounds = useMemo(() => {
    if (activeMarkers.length <= 1) return null;
    return activeMarkers.map((m) => [m.latitude, m.longitude]);
  }, [activeMarkers]);

  const defaultCenter = useMemo(() => {
    if (activeMarkers.length > 0) {
      return [activeMarkers[0].latitude, activeMarkers[0].longitude];
    }
    return [20.5937, 78.9629];
  }, [activeMarkers]);

  // If coordinates are privacy-redacted or absent
  if (activeMarkers.length === 0) {
    const fallbackText =
      location?.city || location?.address
        ? `${location.address ? location.address + " • " : ""}${location.city || ""}`
        : "Vicinity restricted for child safety";

    return (
      <div
        className={`w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-6 flex flex-col items-center justify-center text-center space-y-3 shadow-inner ${className}`}
        style={{ minHeight: height }}
      >
        <div className="w-12 h-12 rounded-full bg-amber-500/10 dark:bg-amber-500/20 text-amber-500 flex items-center justify-center">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div className="max-w-md space-y-1">
          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            {isPrivacyRedacted ? "Exact Coordinates Restricted" : "No GPS Coordinates Available"}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isPrivacyRedacted
              ? "Under child safety and privacy protocols, exact geographic coordinates are only accessible to assigned law enforcement and the verified reporting guardian."
              : "No high-precision geographic coordinates have been attached to this record."}
          </p>
          <div className="pt-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-mono font-medium px-3 py-1 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <MapPin className="w-3.5 h-3.5 text-rose-500" />
              {fallbackText}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <InteractiveMap
        center={defaultCenter}
        zoom={activeMarkers.length > 1 ? 12 : 15}
        bounds={bounds}
        height={height}
      >
        {activeMarkers.map((marker) => (
          <React.Fragment key={marker.id || `${marker.latitude}-${marker.longitude}`}>
            <Marker
              position={[marker.latitude, marker.longitude]}
              icon={getMarkerIcon(marker.type)}
            >
              <Popup>
                <div className="p-1 space-y-1.5 max-w-[220px] text-xs">
                  <div className="flex items-center justify-between gap-1 border-b pb-1">
                    <span className="font-bold text-slate-900 truncate">
                      {marker.title || "Location Point"}
                    </span>
                    <span className="uppercase text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                      {marker.type}
                    </span>
                  </div>

                  {marker.subtitle && (
                    <p className="text-slate-600 font-medium">{marker.subtitle}</p>
                  )}

                  {marker.address && (
                    <p className="text-slate-500 text-[11px] leading-tight">
                      {marker.address}
                    </p>
                  )}

                  {marker.date && (
                    <div className="flex items-center gap-1 text-[10px] text-slate-400">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(marker.date).toLocaleString()}</span>
                    </div>
                  )}

                  <div className="pt-1 font-mono text-[10px] text-slate-500 border-t">
                    {marker.latitude.toFixed(5)}°, {marker.longitude.toFixed(5)}°
                  </div>
                </div>
              </Popup>
            </Marker>

            {marker.accuracy && marker.accuracy > 0 && (
              <Circle
                center={[marker.latitude, marker.longitude]}
                radius={marker.accuracy}
                pathOptions={{
                  color: marker.type === "child" ? "#e11d48" : "#0d9488",
                  fillColor: marker.type === "child" ? "#e11d48" : "#0d9488",
                  fillOpacity: 0.12,
                  weight: 1
                }}
              />
            )}
          </React.Fragment>
        ))}
      </InteractiveMap>

      {/* Footer Info Pill for Multiple Markers */}
      {activeMarkers.length > 1 && (
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
          <span>Displaying {activeMarkers.length} mapped points</span>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> Child Last Seen
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-500 inline-block" /> Sightings
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

