import 'dart:async';

import 'package:background_locator_2/background_locator.dart';
import 'package:background_locator_2/settings/android_settings.dart';
import 'package:background_locator_2/settings/ios_settings.dart';
import 'package:background_locator_2/settings/locator_settings.dart';
import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';

import 'config.dart';
import 'location_callback.dart';

void main() => runApp(const TrackerApp());

class TrackerApp extends StatelessWidget {
  const TrackerApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'GPS Tracker',
      theme: ThemeData(colorSchemeSeed: Colors.indigo, useMaterial3: true),
      home: const TrackerHome(),
    );
  }
}

class TrackerHome extends StatefulWidget {
  const TrackerHome({super.key});

  @override
  State<TrackerHome> createState() => _TrackerHomeState();
}

class _TrackerHomeState extends State<TrackerHome> {
  bool _running = false;
  String _status = 'Stopped';

  Future<bool> _ensurePermissions() async {
    // Foreground location first, then "always" (background) on a second prompt.
    var status = await Permission.locationWhenInUse.request();
    if (!status.isGranted) return false;
    status = await Permission.locationAlways.request();
    return status.isGranted;
  }

  Future<void> _start() async {
    if (!await _ensurePermissions()) {
      setState(() => _status = 'Location permission denied');
      return;
    }

    await BackgroundLocator.initialize();
    await BackgroundLocator.registerLocationUpdate(
      LocationCallbackHandler.callback,
      initCallback: LocationCallbackHandler.initCallback,
      disposeCallback: LocationCallbackHandler.disposeCallback,
      autoStop: false,
      androidSettings: AndroidSettings(
        accuracy: LocationAccuracy.NAVIGATION,
        interval: 5,
        distanceFilter: Config.distanceFilterMeters,
        androidNotificationSettings: const AndroidNotificationSettings(
          notificationChannelName: 'GPS Tracking',
          notificationTitle: 'Tracking active',
          notificationMsg: 'Reporting your location in the background',
          notificationBigMsg:
              'This app is sharing your location with the monitor.',
          notificationIcon: '',
        ),
      ),
      iosSettings: const IOSSettings(
        accuracy: LocationAccuracy.NAVIGATION,
        distanceFilter: Config.distanceFilterMeters,
        showsBackgroundLocationIndicator: true,
      ),
    );

    setState(() {
      _running = true;
      _status = 'Tracking in background';
    });
  }

  Future<void> _stop() async {
    await BackgroundLocator.unRegisterLocationUpdate();
    setState(() {
      _running = false;
      _status = 'Stopped';
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('GPS Tracker')),
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              _running ? Icons.location_on : Icons.location_off,
              size: 96,
              color: _running ? Colors.green : Colors.grey,
            ),
            const SizedBox(height: 16),
            Text(_status, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 32),
            FilledButton.icon(
              onPressed: _running ? _stop : _start,
              icon: Icon(_running ? Icons.stop : Icons.play_arrow),
              label: Text(_running ? 'Stop tracking' : 'Start tracking'),
            ),
          ],
        ),
      ),
    );
  }
}
