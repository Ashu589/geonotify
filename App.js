import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TextInput, Button, Alert, Platform } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LOCATION_TASK_NAME = 'BACKGROUND_LOCATION_TASK';
const STORAGE_KEY = 'GEOFENCES';
const DISTANCE_THRESHOLD = 100; // meters

// register background task
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Location task error:', error);
    return;
  }
  if (data) {
    const { locations } = data;
    if (locations && locations.length > 0) {
      const { latitude, longitude } = locations[0].coords;
      // load stored geofences
      try {
        const json = await AsyncStorage.getItem(STORAGE_KEY);
        const list = json ? JSON.parse(json) : [];
        for (const geo of list) {
          const dist = getDistance(latitude, longitude, geo.latitude, geo.longitude);
          if (dist <= DISTANCE_THRESHOLD) {
            // trigger notification
            await Notifications.scheduleNotificationAsync({
              content: {
                title: 'GeoNotify',
                body: `You are within ${Math.round(dist)}m of ${geo.name || 'a saved place'}`,
                sound: true,
              },
              trigger: null,
            });
          }
        }
      } catch (e) {
        console.error('Error reading geofences', e);
      }
    }
  }
});

// simple haversine distance
function getDistance(lat1, lon1, lat2, lon2) {
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371000; // Earth meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function App() {
  const [region, setRegion] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [latInput, setLatInput] = useState('');
  const [lngInput, setLngInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const mapRef = useRef(null);

  useEffect(() => {
    (async () => {
      // request permissions
      const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
      if (fgStatus !== 'granted') {
        Alert.alert('Permission required', 'Location permission is needed.');
        return;
      }
      const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
      if (bgStatus !== 'granted' && Platform.OS === 'android') {
        Alert.alert('Background permission', 'Background location permission required for geofencing.');
      }

      const { status: notifStatus } = await Notifications.requestPermissionsAsync();
      if (notifStatus !== 'granted') {
        Alert.alert('Notifications disabled', 'Cannot send reminders.');
      }

      const loc = await Location.getCurrentPositionAsync({});
      setRegion({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });

      // load markers from storage
      const json = await AsyncStorage.getItem(STORAGE_KEY);
      if (json) {
        setMarkers(JSON.parse(json));
      }

      // start background updates if not already
      const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
      if (!hasStarted) {
        await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
          accuracy: Location.Accuracy.Highest,
          distanceInterval: 50,
          showsBackgroundLocationIndicator: true,
          foregroundService: {
            notificationTitle: 'GeoNotify tracking',
            notificationBody: 'Your location is being tracked for geofences',
            notificationColor: '#FF0000',
          },
        });
      }
    })();
  }, []);

  const addMarker = async (latitude, longitude, name) => {
    const newMarker = { latitude, longitude, name };
    const updated = [...markers, newMarker];
    setMarkers(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const handleAddByInput = () => {
    const lat = parseFloat(latInput);
    const lng = parseFloat(lngInput);
    if (isNaN(lat) || isNaN(lng)) {
      Alert.alert('Invalid coordinates');
      return;
    }
    addMarker(lat, lng, nameInput);
    setLatInput('');
    setLngInput('');
    setNameInput('');
  };

  return (
    <View style={styles.container}>
      {region && (
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={region}
          onLongPress={(e) => {
            const { latitude, longitude } = e.nativeEvent.coordinate;
            addMarker(latitude, longitude, '');
          }}
        >
          {markers.map((m, idx) => (
            <Marker
              key={idx}
              coordinate={{ latitude: m.latitude, longitude: m.longitude }}
              title={m.name || `Point ${idx + 1}`}
            />
          ))}
        </MapView>
      )}

      <View style={styles.controls}>
        <TextInput
          style={styles.input}
          placeholder="Latitude"
          value={latInput}
          onChangeText={setLatInput}
          keyboardType="numeric"
        />
        <TextInput
          style={styles.input}
          placeholder="Longitude"
          value={lngInput}
          onChangeText={setLngInput}
          keyboardType="numeric"
        />
        <TextInput
          style={styles.input}
          placeholder="Name (optional)"
          value={nameInput}
          onChangeText={setNameInput}
        />
        <Button title="Add coordinate" onPress={handleAddByInput} />
        <Text style={styles.tip}>
          Long press on the map to add a point directly.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  controls: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 10,
  },
  input: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    marginVertical: 4,
    paddingHorizontal: 8,
  },
  tip: {
    marginTop: 6,
    fontSize: 12,
    color: '#555',
  },
});