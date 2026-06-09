/**
 * Generate a JWT for a device or viewer.
 *
 *   npm run token -- device demo-device
 *   npm run token -- viewer
 */
import { signToken } from "../auth.js";

const role = process.argv[2] as "device" | "viewer" | undefined;
const deviceId = process.argv[3];

if (role !== "device" && role !== "viewer") {
  console.error("Usage: npm run token -- <device|viewer> [deviceId]");
  process.exit(1);
}
if (role === "device" && !deviceId) {
  console.error("A deviceId is required for device tokens.");
  process.exit(1);
}

const token = signToken(
  role === "device" ? { role, deviceId } : { role }
);
console.log(token);
