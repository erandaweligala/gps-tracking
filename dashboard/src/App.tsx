import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import { io, Socket } from "socket.io-client";
import {
  API_URL,
  fetchDevices,
  fetchHistory,
  type Device,
  type LocationPoint,
} from "./api";

const STORAGE_KEY = "gps_viewer_token";

/** Recenters the map when the latest point changes. */
function Follow({ point }: { point: LocationPoint | null }) {
  const map = useMap();
  useEffect(() => {
    if (point) map.setView([point.lat, point.lng]);
  }, [point, map]);
  return null;
}

export function App() {
  const [token, setToken] = useState(
    () => localStorage.getItem(STORAGE_KEY) ?? ""
  );
  const [devices, setDevices] = useState<Device[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [points, setPoints] = useState<LocationPoint[]>([]);
  const [error, setError] = useState<string>("");

  // Load device list once authenticated.
  useEffect(() => {
    if (!token) return;
    fetchDevices(token)
      .then((d) => {
        setDevices(d);
        if (d.length && !selected) setSelected(d[0].id);
      })
      .catch((e) => setError(String(e)));
  }, [token]);

  // Load history + open live socket for the selected device.
  useEffect(() => {
    if (!token || !selected) return;
    let socket: Socket | undefined;
    setPoints([]);

    fetchHistory(token, selected)
      .then(setPoints)
      .catch((e) => setError(String(e)));

    socket = io(API_URL, { auth: { token } });
    socket.emit("watch", selected);
    socket.on("location", (p: LocationPoint) => {
      setPoints((prev) => [...prev, p]);
    });
    socket.on("connect_error", (e) => setError(`socket: ${e.message}`));

    return () => {
      socket?.emit("unwatch", selected);
      socket?.disconnect();
    };
  }, [token, selected]);

  const latest = points.length ? points[points.length - 1] : null;
  const trail = useMemo(
    () => points.map((p) => [p.lat, p.lng] as [number, number]),
    [points]
  );

  if (!token) return <Login onToken={(t) => {
    localStorage.setItem(STORAGE_KEY, t);
    setToken(t);
  }} />;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <header style={bar}>
        <strong>GPS Monitor</strong>
        <select value={selected} onChange={(e) => setSelected(e.target.value)}>
          {devices.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name || d.id} {d.last_seen ? "" : "(no data)"}
            </option>
          ))}
        </select>
        {latest && (
          <span style={{ fontSize: 13 }}>
            {latest.lat.toFixed(5)}, {latest.lng.toFixed(5)}
            {latest.speed != null && ` · ${(latest.speed * 3.6).toFixed(1)} km/h`}
            {latest.battery != null && ` · 🔋 ${latest.battery.toFixed(0)}%`}
          </span>
        )}
        <button onClick={() => { localStorage.removeItem(STORAGE_KEY); setToken(""); }}>
          Log out
        </button>
        {error && <span style={{ color: "crimson" }}>{error}</span>}
      </header>

      <MapContainer
        center={[latest?.lat ?? 0, latest?.lng ?? 0]}
        zoom={latest ? 15 : 2}
        style={{ flex: 1 }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {trail.length > 1 && <Polyline positions={trail} />}
        {latest && <Marker position={[latest.lat, latest.lng]} />}
        <Follow point={latest} />
      </MapContainer>
    </div>
  );
}

function Login({ onToken }: { onToken: (t: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <div style={{ display: "grid", placeItems: "center", height: "100vh" }}>
      <div style={{ display: "grid", gap: 8, width: 360 }}>
        <h2>GPS Monitor</h2>
        <p style={{ fontSize: 13, color: "#555" }}>
          Paste a viewer token (printed by the backend on startup, or via
          <code> npm run token -- viewer</code>).
        </p>
        <textarea
          rows={4}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="eyJhbGci..."
        />
        <button onClick={() => value && onToken(value.trim())}>Connect</button>
      </div>
    </div>
  );
}

const bar: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "8px 12px",
  borderBottom: "1px solid #ddd",
  fontFamily: "system-ui, sans-serif",
};
