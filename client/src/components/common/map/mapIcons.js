import L from "leaflet";

/**
 * Creates an SVG DivIcon with customizable color, SVG inner content, and pulse animation.
 * Using DivIcon prevents Vite asset resolution errors with default Leaflet PNGs.
 */
export const createDivIcon = ({
  color = "#2563eb",
  svgPath,
  size = 36,
  pulse = false,
  badgeText = ""
}) => {
  const halfSize = size / 2;
  const iconHtml = `
    <div style="position: relative; width: ${size}px; height: ${size}px; display: flex; align-items: center; justify-content: center;">
      ${
        pulse
          ? `<span style="position: absolute; width: ${size + 12}px; height: ${size + 12}px; border-radius: 9999px; background-color: ${color}; opacity: 0.35; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>`
          : ""
      }
      <div style="position: relative; z-index: 10; width: ${size}px; height: ${size}px; border-radius: 9999px; background-color: ${color}; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -2px rgba(0, 0, 0, 0.2); border: 2.5px solid white;">
        <svg xmlns="http://www.w3.org/2000/svg" width="${size * 0.5}" height="${size * 0.5}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          ${svgPath}
        </svg>
      </div>
      ${
        badgeText
          ? `<span style="position: absolute; bottom: -8px; background: rgba(0,0,0,0.85); color: #fff; font-size: 9px; font-weight: 700; padding: 1px 5px; border-radius: 9999px; white-space: nowrap; border: 1px solid rgba(255,255,255,0.2);">${badgeText}</span>`
          : ""
      }
    </div>
  `;

  return L.divIcon({
    html: iconHtml,
    className: "guardian-map-pin",
    iconSize: [size, size],
    iconAnchor: [halfSize, halfSize],
    popupAnchor: [0, -halfSize - 4]
  });
};

// Child Last Seen (Rose / Alert)
export const childLastSeenIcon = createDivIcon({
  color: "#e11d48",
  pulse: true,
  badgeText: "LAST SEEN",
  svgPath: `
    <circle cx="12" cy="7" r="4"/>
    <path d="M5.5 21v-2a6.5 6.5 0 0 1 13 0v2"/>
  `
});

// Citizen Sighting (Teal / Eye)
export const sightingIcon = createDivIcon({
  color: "#0d9488",
  badgeText: "SIGHTING",
  svgPath: `
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
    <circle cx="12" cy="12" r="3"/>
  `
});

// Police Station / Officer (Blue / Shield)
export const policeIcon = createDivIcon({
  color: "#2563eb",
  badgeText: "POLICE",
  svgPath: `
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  `
});

// NGO Shelter (Purple / Home)
export const shelterIcon = createDivIcon({
  color: "#7c3aed",
  badgeText: "SHELTER",
  svgPath: `
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  `
});

// Current GPS / Selected Location (Amber Target Pin)
export const currentGpsIcon = createDivIcon({
  color: "#f59e0b",
  pulse: true,
  badgeText: "PIN",
  svgPath: `
    <circle cx="12" cy="12" r="3"/>
    <path d="M12 2v3m0 14v3M2 12h3m14 0h3"/>
  `
});

