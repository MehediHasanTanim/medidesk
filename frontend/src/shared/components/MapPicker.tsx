import { useCallback, useRef, useState } from "react";
import {
  GoogleMap,
  Marker,
  StandaloneSearchBox,
  useJsApiLoader,
} from "@react-google-maps/api";
import { colors, font, radius } from "@/shared/styles/theme";

// Keep the array reference stable to prevent repeated map reloads
const LIBRARIES: ("places")[] = ["places"];
const DHAKA = { lat: 23.8103, lng: 90.4125 }; // default center for Bangladesh
const MAP_CONTAINER_STYLE = { width: "100%", height: "280px", borderRadius: radius.md };
const MAP_OPTIONS: google.maps.MapOptions = {
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
  zoomControlOptions: { position: 3 /* RIGHT_TOP */ },
};

interface MapPickerProps {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number, address?: string) => void;
}

export default function MapPicker({ lat, lng, onChange }: MapPickerProps) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? "";
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    libraries: LIBRARIES,
  });

  const [mapRef, setMapRef] = useState<google.maps.Map | null>(null);
  const searchBoxRef = useRef<google.maps.places.SearchBox | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);

  const center = lat != null && lng != null ? { lat, lng } : DHAKA;

  // Reverse geocode a LatLng and fire onChange with the resulting address
  const reverseGeocode = useCallback(
    (latVal: number, lngVal: number) => {
      if (!geocoderRef.current) geocoderRef.current = new google.maps.Geocoder();
      geocoderRef.current.geocode(
        { location: { lat: latVal, lng: lngVal } },
        (results, status) => {
          const address = status === "OK" && results?.[0]
            ? results[0].formatted_address
            : undefined;
          onChange(latVal, lngVal, address);
        },
      );
    },
    [onChange],
  );

  const handleMapClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (e.latLng) reverseGeocode(e.latLng.lat(), e.latLng.lng());
    },
    [reverseGeocode],
  );

  const handleMarkerDragEnd = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (e.latLng) reverseGeocode(e.latLng.lat(), e.latLng.lng());
    },
    [reverseGeocode],
  );

  const handlePlacesChanged = useCallback(() => {
    const places = searchBoxRef.current?.getPlaces();
    if (!places?.length) return;
    const place = places[0];
    const loc = place.geometry?.location;
    if (loc) {
      onChange(loc.lat(), loc.lng(), place.formatted_address);
      mapRef?.panTo({ lat: loc.lat(), lng: loc.lng() });
      mapRef?.setZoom(15);
    }
  }, [onChange, mapRef]);

  // ── No API key ────────────────────────────────────────────────────────────
  if (!apiKey) {
    return (
      <div style={{
        padding: "12px 14px",
        background: "#fffbeb",
        border: `1px solid #fbbf24`,
        borderRadius: radius.md,
        fontSize: font.sm,
        color: "#92400e",
        lineHeight: 1.5,
      }}>
        ⚠️ Google Maps API key not configured.
        Add <code style={{ background: "#fef3c7", padding: "1px 4px", borderRadius: 3 }}>VITE_GOOGLE_MAPS_API_KEY</code> to
        your <code style={{ background: "#fef3c7", padding: "1px 4px", borderRadius: 3 }}>.env</code> file,
        then restart the frontend container.
      </div>
    );
  }

  // ── Load error ────────────────────────────────────────────────────────────
  if (loadError) {
    return (
      <div style={{
        padding: "12px 14px",
        background: "#fef2f2",
        border: `1px solid #fecaca`,
        borderRadius: radius.md,
        fontSize: font.sm,
        color: "#b91c1c",
      }}>
        ❌ Failed to load Google Maps. Please check your API key.
      </div>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (!isLoaded) {
    return (
      <div style={{
        height: "280px",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: colors.borderLight,
        borderRadius: radius.md,
        color: colors.textMuted,
        fontSize: font.sm,
      }}>
        Loading map…
      </div>
    );
  }

  // ── Map ───────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Search box */}
      <StandaloneSearchBox
        onLoad={(ref) => { searchBoxRef.current = ref; }}
        onPlacesChanged={handlePlacesChanged}
      >
        <input
          type="text"
          placeholder="Search for a location…"
          style={{
            width: "100%",
            padding: "9px 12px",
            marginBottom: 8,
            border: `1px solid ${colors.border}`,
            borderRadius: radius.md,
            fontSize: font.base,
            boxSizing: "border-box",
            color: colors.text,
            background: colors.bg,
            outline: "none",
          }}
        />
      </StandaloneSearchBox>

      {/* Map */}
      <GoogleMap
        mapContainerStyle={MAP_CONTAINER_STYLE}
        center={center}
        zoom={lat != null ? 14 : 12}
        onClick={handleMapClick}
        onLoad={(map) => setMapRef(map)}
        options={MAP_OPTIONS}
      >
        {lat != null && lng != null && (
          <Marker
            position={{ lat, lng }}
            draggable
            onDragEnd={handleMarkerDragEnd}
          />
        )}
      </GoogleMap>

      {/* Coordinate readout */}
      <div style={{ marginTop: 6, fontSize: font.sm, color: colors.textMuted }}>
        {lat != null && lng != null ? (
          <span style={{ fontFamily: "monospace" }}>
            📍 {lat.toFixed(6)},&nbsp;{lng.toFixed(6)}
          </span>
        ) : (
          <span>Click on the map or drag the pin to set coordinates</span>
        )}
      </div>
    </div>
  );
}
