import { useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";

import type { IncidenteResponseDTO } from "../services/incidentesService";

/* ===============================
   Helpers de coordenadas
   =============================== */
function extractLatLng(i: any): [number, number] | null {
  const lat =
    i.lat ??
    i.latitud ??
    i.latitude ??
    i.ubicacionLat ??
    i?.ubicacion?.lat ??
    i?.ubicacion?.latitude;

  const lng =
    i.lng ??
    i.longitud ??
    i.longitude ??
    i.ubicacionLng ??
    i?.ubicacion?.lng ??
    i?.ubicacion?.longitude;

  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return [Number(lat), Number(lng)];
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

  useEffect(() => {
    if (!points.length) return;

    // 🔥 LIMPIA HEATMAP ANTERIOR
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }

    // 🔥 CREA HEATMAP
    // @ts-ignore
    const heat = L.heatLayer(points, {
      radius: 28,
      blur: 22,
      maxZoom: 17,
    }).addTo(map);

    layerRef.current = heat;

    // 🔥 AUTO-CENTER + AUTO-ZOOM A LOS PUNTOS
    const bounds = L.latLngBounds(points.map((p) => [p[0], p[1]]));
    map.fitBounds(bounds, {
      padding: [40, 40],
      maxZoom: 15,
      animate: true,
    });

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
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
