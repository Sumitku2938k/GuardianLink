import React, { useState, useMemo, useRef } from "react";
import { Marker, Popup, Circle, useMapEvents } from "react-leaflet";
import { Navigation, MapPin, CheckCircle2, AlertCircle, Loader2, Crosshair } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { InteractiveMap } from "./InteractiveMap";
import { currentGpsIcon } from "./mapIcons";

/**
 * Click handler subcomponent inside Leaflet context
 */
function MapClickHandler({ onSelectCoordinates }) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      onSelectCoordinates(Number(lat.toFixed(6)), Number(lng.toFixed(6)), "manual");
    }
  });
  return null;
}

/**
 * Interactive Location Picker with GPS capture, manual map click/drag, and explicit confirmation
 */
export const LocationPicker = ({
  initialLocation = null, // { latitude, longitude, address, city, state, pinCode, accuracy, source }
  onLocationSelect,
  label = "Select Incident / Sighting Location",
  height = "340px",
  required = false
}) => {
  const [coords, setCoords] = useState(() => {
    if (
      initialLocation &&
      Number.isFinite(Number(initialLocation.latitude)) &&
      Number.isFinite(Number(initialLocation.longitude))
    ) {
      return {
        lat: Number(initialLocation.latitude),
        lng: Number(initialLocation.longitude),
        accuracy: initialLocation.accuracy !== undefined ? Number(initialLocation.accuracy) : null,
        source: initialLocation.source || "manual",
        address: initialLocation.address || ""
      };
    }
    return null;
  });

  const [isLocating, setIsLocating] = useState(false);
  const [gpsError, setGpsError] = useState("");
  const [isConfirmed, setIsConfirmed] = useState(() => !!coords);
  const markerRef = useRef(null);

  // Handle GPS location request (ONLY triggered on user click)
  const handleUseCurrentGPS = () => {
    setGpsError("");
    setIsLocating(true);

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGpsError("Geolocation is not supported by your browser. Please click on the map to select.");
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const rawLat = pos.coords.latitude;
        const rawLng = pos.coords.longitude;
        const accuracy = Math.round(pos.coords.accuracy);

        const newCoords = {
          lat: Number(rawLat.toFixed(6)),
          lng: Number(rawLng.toFixed(6)),
          accuracy,
          source: "gps",
          address: coords?.address || ""
        };

        setCoords(newCoords);
        setIsConfirmed(false); // User must confirm
        setIsLocating(false);
      },
      (err) => {
        let msg = "Could not retrieve GPS coordinates. Please select your position on the map.";
        if (err.code === 1) {
          msg = "Location permission denied. Please click on the map to pinpoint manually.";
        } else if (err.code === 2) {
          msg = "Position unavailable. Please click on the map to pinpoint manually.";
        } else if (err.code === 3) {
          msg = "GPS request timed out. Please click on the map to pinpoint manually.";
        }
        setGpsError(msg);
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  // Handle manual map click coordinate selection
  const handleCoordinateSelect = (lat, lng, source = "manual") => {
    setGpsError("");
    setCoords((prev) => ({
      lat,
      lng,
      accuracy: null,
      source,
      address: prev?.address || ""
    }));
    setIsConfirmed(false); // Unconfirm upon repositioning
  };

  // Marker drag event
  const markerEventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const { lat, lng } = marker.getLatLng();
          handleCoordinateSelect(Number(lat.toFixed(6)), Number(lng.toFixed(6)), "manual");
        }
      }
    }),
    []
  );

  // Explicit confirmation commit
  const handleConfirmLocation = () => {
    if (!coords) return;
    setIsConfirmed(true);
    if (onLocationSelect) {
      onLocationSelect({
        latitude: coords.lat,
        longitude: coords.lng,
        accuracy: coords.accuracy || undefined,
        source: coords.source,
        capturedAt: new Date().toISOString()
      });
    }
  };

  const center = coords ? [coords.lat, coords.lng] : [20.5937, 78.9629];
  const zoom = coords ? 15 : 5;

  // Accuracy indicator computation
  const getAccuracyBadge = (accuracy) => {
    if (accuracy === null || accuracy === undefined) {
      return (
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
          Manual Pin
        </span>
      );
    }
    if (accuracy < 25) {
      return (
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700/50 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          High Accuracy (±{accuracy}m)
        </span>
      );
    }
    if (accuracy <= 100) {
      return (
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-700/50 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
          Medium Accuracy (±{accuracy}m)
        </span>
      );
    }
    return (
      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-700/50 flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
        Low Accuracy (±{accuracy}m)
      </span>
    );
  };

  return (
    <div className="space-y-3">
      {/* Top Controls Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-rose-500" />
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
            {label} {required && <span className="text-rose-500">*</span>}
          </span>
        </div>

        <Button
          type="button"
          onClick={handleUseCurrentGPS}
          disabled={isLocating}
          variant="outline"
          size="sm"
          className="text-xs border-teal-500/40 text-teal-600 dark:text-teal-400 hover:bg-teal-500/10"
        >
          {isLocating ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
              Acquiring GPS...
            </>
          ) : (
            <>
              <Navigation className="w-3.5 h-3.5 mr-1.5" />
              Use My Current GPS
            </>
          )}
        </Button>
      </div>

      {/* GPS Error Alert */}
      {gpsError && (
        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{gpsError}</span>
        </div>
      )}

      {/* Map Canvas */}
      <InteractiveMap center={center} zoom={zoom} height={height}>
        <MapClickHandler onSelectCoordinates={handleCoordinateSelect} />

        {coords && (
          <>
            <Marker
              position={[coords.lat, coords.lng]}
              icon={currentGpsIcon}
              draggable={true}
              eventHandlers={markerEventHandlers}
              ref={markerRef}
            >
              <Popup>
                <div className="text-xs space-y-1">
                  <p className="font-bold text-slate-800">Selected Coordinate</p>
                  <p className="font-mono text-slate-600">
                    {coords.lat.toFixed(6)}°, {coords.lng.toFixed(6)}°
                  </p>
                  <p className="text-[10px] text-slate-500">Drag pin to adjust precision</p>
                </div>
              </Popup>
            </Marker>

            {coords.accuracy && coords.accuracy > 0 && (
              <Circle
                center={[coords.lat, coords.lng]}
                radius={coords.accuracy}
                pathOptions={{
                  color: "#f59e0b",
                  fillColor: "#f59e0b",
                  fillOpacity: 0.15,
                  weight: 1.5,
                  dashArray: "4 4"
                }}
              />
            )}
          </>
        )}
      </InteractiveMap>

      {/* Coordinate Readout & Confirmation Panel */}
      {coords ? (
        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Crosshair className="w-4 h-4 text-amber-400" />
              <span className="font-mono text-[11px] text-slate-200">
                Lat: <strong className="text-teal-300">{coords.lat.toFixed(6)}°</strong> • Lng:{" "}
                <strong className="text-teal-300">{coords.lng.toFixed(6)}°</strong>
              </span>
            </div>
            {getAccuracyBadge(coords.accuracy)}
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-slate-800">
            <span className="text-[11px] text-slate-400">
              Source: <span className="uppercase font-semibold text-slate-300">{coords.source}</span>
            </span>

            {isConfirmed ? (
              <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Coordinates Confirmed</span>
              </div>
            ) : (
              <Button
                type="button"
                onClick={handleConfirmLocation}
                size="sm"
                className="bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold px-3 py-1.5"
              >
                Confirm Location
              </Button>
            )}
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-500 italic">
          Click anywhere on the map or click &quot;Use My Current GPS&quot; to set the precise incident location.
        </p>
      )}
    </div>
  );
};

