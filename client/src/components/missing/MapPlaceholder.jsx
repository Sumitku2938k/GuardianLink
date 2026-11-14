import React from "react";
import { LocationPicker } from "@/components/common/map/LocationPicker";
import { LocationDisplay } from "@/components/common/map/LocationDisplay";

/**
 * Backward compatibility wrapper for legacy MapPlaceholder references.
 * Automatically delegates to LocationPicker or LocationDisplay with real Leaflet maps.
 */
export const MapPlaceholder = ({
  locationName = "",
  latitude = undefined,
  longitude = undefined,
  onSelectLocation
}) => {
  const hasCoordinates =
    latitude !== undefined &&
    longitude !== undefined &&
    latitude !== "" &&
    longitude !== "" &&
    Number.isFinite(Number(latitude)) &&
    Number.isFinite(Number(longitude));

  // If callback provided, render real interactive LocationPicker
  if (onSelectLocation) {
    return (
      <LocationPicker
        label="Select Location on Map"
        initialLocation={
          hasCoordinates
            ? {
                latitude: Number(latitude),
                longitude: Number(longitude),
                address: locationName
              }
            : null
        }
        onLocationSelect={(loc) => {
          onSelectLocation({
            name: loc.address || locationName || `Selected Location (${loc.latitude}°, ${loc.longitude}°)`,
            lat: String(loc.latitude),
            lng: String(loc.longitude),
            accuracy: loc.accuracy,
            source: loc.source,
            capturedAt: loc.capturedAt
          });
        }}
      />
    );
  }

  // Otherwise, render real read-only LocationDisplay
  return (
    <LocationDisplay
      location={{
        latitude: hasCoordinates ? Number(latitude) : undefined,
        longitude: hasCoordinates ? Number(longitude) : undefined,
        address: locationName
      }}
      height="260px"
    />
  );
};
