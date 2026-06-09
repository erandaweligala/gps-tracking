import 'dart:async';
import 'dart:convert';

import 'package:background_locator_2/location_dto.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import 'config.dart';

/// Top-level callbacks invoked by background_locator_2 in a *separate isolate*.
/// They must be static/top-level and cannot touch the UI.
class LocationCallbackHandler {
  static const String _bufferKey = 'pending_locations';

  /// Called once when the background isolate starts.
  static Future<void> initCallback(Map<dynamic, dynamic> params) async {}

  /// Called when location tracking is disposed.
  static Future<void> disposeCallback() async {}

  /// Called on every new location fix.
  static Future<void> callback(LocationDto location) async {
    final point = {
      'lat': location.latitude,
      'lng': location.longitude,
      'accuracy': location.accuracy,
      'speed': location.speed,
      'heading': location.heading,
      'altitude': location.altitude,
      'recordedAt': location.time.toInt(),
    };
    await _send([point]);
  }

  /// POST points to the backend; on failure, buffer them locally and retry
  /// the whole buffer next time (at-least-once delivery).
  static Future<void> _send(List<Map<String, dynamic>> newPoints) async {
    final prefs = await SharedPreferences.getInstance();
    final buffered = prefs.getStringList(_bufferKey) ?? <String>[];

    final batch = <Map<String, dynamic>>[
      ...buffered.map((s) => jsonDecode(s) as Map<String, dynamic>),
      ...newPoints,
    ];

    try {
      final res = await http
          .post(
            Uri.parse('${Config.backendUrl}/api/locations'),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ${Config.deviceToken}',
            },
            body: jsonEncode(batch),
          )
          .timeout(const Duration(seconds: 15));

      if (res.statusCode >= 200 && res.statusCode < 300) {
        await prefs.remove(_bufferKey); // flushed successfully
      } else {
        await _buffer(prefs, batch);
      }
    } catch (_) {
      await _buffer(prefs, batch);
    }
  }

  static Future<void> _buffer(
    SharedPreferences prefs,
    List<Map<String, dynamic>> batch,
  ) async {
    // Cap the buffer so it can't grow unbounded offline.
    final capped = batch.length > 500
        ? batch.sublist(batch.length - 500)
        : batch;
    await prefs.setStringList(
      _bufferKey,
      capped.map((p) => jsonEncode(p)).toList(),
    );
  }
}
