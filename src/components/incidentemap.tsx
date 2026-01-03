import { useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";

import type { IncidenteResponseDTO } from "../services/incidentesService";

/* ===============================
   Helpers de coordenadas (MEJORADO)
   Soporta:
   - lat/lng, latitud/longitud, latitude/longitude
   - ubicacion.lat / ubicacion.lng
   - GeoJSON: ubicacion.coordinates = [lng, lat]
   - strings con coma decimal
   =============================== */
function toNum(v: any) {
  if (typeof v === "string") {
    const cleaned = v.trim().replace(",", ".");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : NaN;
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

function extractLatLng(i: any): [number, number] | null {
  const latDirect =
    i.lat ??
    i.latitud ??
    i.latitude ??
    i.ubicacionLat ??
    i?.ubicacion?.lat ??
    i?.ubicacion?.latitude;

  const lngDirect =
    i.lng ??
    i.longitud ??
    i.longitude ??
    i.ubicacionLng ??
    i?.ubicacion?.lng ??
    i?.ubicacion?.longitude;

  const lat1 = toNum(latDirect);
  const lng1 = toNum(lngDirect);
  if (Number.isFinite(lat1) && Number.isFinite(lng1)) return [lat1, lng1];

  // GeoJSON MongoDB: [lng, lat]
  const coords =
    i?.ubicacion?.coordinates ??
    i?.location?.coordinates ??
    i?.geo?.coordinates ??
    i?.coordenadas ??
    i?.coordinates;

  if (Array.isArray(coords) && coords.length >= 2) {
    const lng2 = toNum(coords[0]);
    const lat2 = toNum(coords[1]);
    if (Number.isFinite(lat2) && Number.isFinite(lng2)) return [lat2, lng2];
  }

  return null;
}

function getWeight(i: any): number {
  const w = Number(i.gravedad ?? i.prioridad ?? i.riesgo ?? 1);
  return Math.min(Math.max(w / 5, 0.4), 1);
}

/* ===============================
   Heat layer + auto zoom
   =============================== */
function HeatLayer({ incidentes }: { incidentes: IncidenteResponseDTO[] }) {
  const map = useMap();
  const layerRef = useRef<L.Layer | null>(null);

  const points = useMemo(() => {
    return incidentes
      .map((i) => {
        const p = extractLatLng(i);
        if (!p) return null;
        return [p[0], p[1], getWeight(i)] as [number, number, number];
      })
      .filter(Boolean) as [number, number, number][];
  }, [incidentes]);

  // ✅ LOG para ver si llegan puntos al mapa
  useEffect(() => {
    console.log("=== HEATMAP DEBUG ===");
    console.log("incidentes recibidos:", incidentes.length);
    console.log("points generados:", points.length);
    console.log("sample incidente:", incidentes[0]);
  }, [incidentes, points]);

  useEffect(() => {
    // ✅ siempre limpia anterior
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }

    // ✅ si no hay puntos, no dibuja heatmap
    if (!points.length) return;

    // @ts-ignore
    const heat = L.heatLayer(points, {
      radius: 28,
      blur: 22,
      maxZoom: 17,
    }).addTo(map);

    layerRef.current = heat;

    const bounds = L.latLngBounds(points.map((p) => [p[0], p[1]]));
    map.fitBounds(bounds, {
      padding: [40, 40],
      maxZoom: 15,
      animate: true,
    });

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [map, points]);

  return null;
}

/* ===============================
   Componente principal
   =============================== */
export default function IncidentHeatmap({
  incidentes = [],
}: {
  incidentes: IncidenteResponseDTO[];
}) {
  return (
    <MapContainer
      center={[-0.1807, -78.4678]} // Quito SOLO como fallback
      zoom={12}
      style={{ width: "100%", height: "100%" }}
      scrollWheelZoom
    >
      <TileLayer
        attribution="© OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <HeatLayer incidentes={incidentes} />
    </MapContainer>
  );
}
