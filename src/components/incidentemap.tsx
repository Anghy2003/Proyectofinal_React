import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";
import { useEffect, useState } from "react";

type HeatPoint = {
  lat: number;
  lng: number;
  intensity: number;
};

function HeatLayer({ points }: { points: HeatPoint[] }) {
  const map = useMap();

  useEffect(() => {
    if (!map || points.length === 0) return;

    const heatPoints = points.map((p) => [p.lat, p.lng, p.intensity]);

    const heatLayer = (L as any).heatLayer(heatPoints, {
      radius: 30,
      blur: 20,
      maxZoom: 17,
    });

    heatLayer.addTo(map);

    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, points]);

  return null;
}

export default function IncidentHeatmap() {
  const [points, setPoints] = useState<HeatPoint[]>([]);

 /* useEffect(() => {
    fetch("http://localhost:8080/api/mapacalor")
      .then((res) => res.json())
      .then((data) => setPoints(data))
      .catch(() => setPoints([]));
  }, []);*/

  return (
    <MapContainer
      center={[-2.9005, -79.0046]}
      zoom={13}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution="© OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <HeatLayer points={points} />
    </MapContainer>
  );
}
//