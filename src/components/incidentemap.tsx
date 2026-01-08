import { useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";

import "../styles/incident-heatmap.css";

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
  const didAutoFitRef = useRef(false);

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
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }

    if (!points.length) return;

    // @ts-ignore
    const heat = L.heatLayer(points, {
      radius: 32,
      blur: 26,
      maxZoom: 17,
      minOpacity: 0.35,
      max: 1.0,
      gradient: {
        0.2: "#ffe08a",
        0.45: "#ffb25c",
        0.7: "#ff6b4a",
        1.0: "#d81b1b",
      },
    }).addTo(map);

    layerRef.current = heat;

    if (!didAutoFitRef.current) {
      const bounds = L.latLngBounds(points.map((p) => [p[0], p[1]]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      didAutoFitRef.current = true;
    }

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [map, points]);

  useEffect(() => {
    didAutoFitRef.current = false;
  }, [incidentes]);

  return null;
}


function HeatHoverLayer({ incidentes }: { incidentes: IncidenteResponseDTO[] }) {
  const map = useMap();
  const layerRef = useRef<L.LayerGroup | null>(null);

  const zones = useMemo(() => {
    const mapZones = new Map<string, {
      lat: number;
      lng: number;
      total: number;
      tipos: Record<string, number>;
    }>();

    incidentes.forEach((i) => {
      const p = extractLatLng(i);
      if (!p) return;

      // 🔹 redondeo para agrupar por zona (≈ 10–15m)
      const lat = Number(p[0].toFixed(4));
      const lng = Number(p[1].toFixed(4));
      const key = `${lat}|${lng}`;

      if (!mapZones.has(key)) {
        mapZones.set(key, {
          lat,
          lng,
          total: 0,
          tipos: {},
        });
      }

      const z = mapZones.get(key)!;
      z.total += 1;
      const tipo = i.tipo || "Sin tipo";
      z.tipos[tipo] = (z.tipos[tipo] || 0) + 1;
    });

    return Array.from(mapZones.values());
  }, [incidentes]);

  useEffect(() => {
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
    }

    const group = L.layerGroup();

    zones.forEach((z) => {
      // ✅ Ordena tipos por cantidad (mayor a menor)
const tiposOrdenados = Object.entries(z.tipos).sort((a, b) => b[1] - a[1]);

// ✅ Construye lista (Top 10 opcional)
const tiposHtml = tiposOrdenados
  .slice(0, 10) // cambia 10 por 5 si quieres más compacto
  .map(
    ([tipo, n]) => `
      <div class="heat-row">
        <span class="heat-pill">${tipo}</span>
        <span class="heat-count">${n}</span>
      </div>
    `
  )
  .join("");

// ✅ Un solo cuadro: total + tipos con conteo
const html = `
  <div class="heat-card">
    <div class="heat-card__title">Zona de incidentes</div>

    <div class="heat-card__meta">
      <div><span class="heat-label">Total de reportes:</span> <b>${z.total}</b></div>
      <div class="heat-sub">${z.lat}, ${z.lng}</div>
    </div>

    <div class="heat-divider"></div>

    <div class="heat-card__section">
      <div class="heat-sec-title">Tipos de reportes</div>
      ${tiposHtml || `<div class="heat-empty">Sin datos</div>`}
    </div>
  </div>
`;

      const marker = L.circleMarker([z.lat, z.lng], {
        radius: 18,
        fillOpacity: 0,
        stroke: false,
        interactive: true,
      });

      marker.bindTooltip(html, {
        direction: "top",
        className: "heat-tooltip",
        sticky: true,
        opacity: 1,
      });

      group.addLayer(marker);
    });

    group.addTo(map);
    layerRef.current = group;

    return () => {
      map.removeLayer(group);
    };
  }, [map, zones]);

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
      <HeatHoverLayer incidentes={incidentes} />
    </MapContainer>
  );
}
