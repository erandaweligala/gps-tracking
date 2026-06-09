import jwt from "jsonwebtoken";
import { config } from "./config.js";

export type Role = "device" | "viewer";

export interface TokenPayload {
  role: Role;
  /** Present when role === "device": the device this token may write for. */
  deviceId?: string;
}

export function signToken(
  payload: TokenPayload,
  expiresIn: jwt.SignOptions["expiresIn"] = "365d"
): string {
  return jwt.sign(payload, config.jwtSecret, { expiresIn });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, config.jwtSecret) as TokenPayload;
  } catch {
    return null;
  }
}

/** Extract a bearer token from an Authorization header. */
export function bearer(header?: string): string | null {
  if (!header) return null;
  const [scheme, value] = header.split(" ");
  return scheme === "Bearer" && value ? value : null;
}
