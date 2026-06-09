export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export interface LocationPoint {
  id: number;
  lat: number;
  lng: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  battery?: number;
  recorded_at?: string;
  recordedAt?: string;
}

export interface Device {
  id: string;
  name: string;
  last_seen: string | null;
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export async function fetchDevices(token: string): Promise<Device[]> {
  const res = await fetch(`${API_URL}/api/devices`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(`devices: ${res.status}`);
  return res.json();
}

export async function fetchHistory(
  token: string,
  deviceId: string,
  limit = 500
): Promise<LocationPoint[]> {
  const res = await fetch(
    `${API_URL}/api/devices/${deviceId}/locations?limit=${limit}`,
    { headers: authHeaders(token) }
  );
  if (!res.ok) throw new Error(`history: ${res.status}`);
  return res.json();
}
