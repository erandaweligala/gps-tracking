/// App configuration. Point this at your backend and paste the device token
/// the backend prints on startup (or generate one with
/// `npm run token -- device <deviceId>`).
class Config {
  /// Base URL of the backend. Use your machine's LAN IP when testing on a
  /// physical phone (e.g. http://192.168.1.20:4000), or your deployed URL.
  static const String backendUrl = 'http://10.0.2.2:4000';

  /// Long-lived device JWT issued by the backend.
  static const String deviceToken = 'PASTE_DEVICE_TOKEN_HERE';

  /// Minimum distance (metres) the device must move before a new fix is
  /// reported. Higher = better battery, lower = more granular track.
  static const double distanceFilterMeters = 25;
}
