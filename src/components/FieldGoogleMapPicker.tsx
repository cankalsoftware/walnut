import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MapView, {
  Marker,
  Polygon,
  Polyline,
  PROVIDER_GOOGLE,
  MapPressEvent,
  MarkerDragStartEndEvent,
} from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import {
  BoundaryPin,
  MAX_TREES_PER_SECTION,
  SUBSECTION_TREE_CAPACITY,
} from '../utils/orchardGeometry';

interface FieldGoogleMapPickerProps {
  pins: BoundaryPin[];
  onChangePins: (pins: BoundaryPin[]) => void;
  initialCenter: { latitude: number; longitude: number };
  treeCount: number;
}

const PIN_LABELS = ['NW', 'NE', 'SE', 'SW'];

function midpoint(a: BoundaryPin, b: BoundaryPin): BoundaryPin {
  return {
    latitude: (a.latitude + b.latitude) / 2,
    longitude: (a.longitude + b.longitude) / 2,
  };
}

function lerpPin(a: BoundaryPin, b: BoundaryPin, t: number): BoundaryPin {
  return {
    latitude: a.latitude + (b.latitude - a.latitude) * t,
    longitude: a.longitude + (b.longitude - a.longitude) * t,
  };
}

export function FieldGoogleMapPicker({
  pins,
  onChangePins,
  initialCenter,
  treeCount,
}: FieldGoogleMapPickerProps) {
  const apiKeyMissing = !process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

  const region = useMemo(() => {
    if (pins.length > 0) {
      const avgLat =
        pins.reduce((s, p) => s + p.latitude, 0) / pins.length;
      const avgLng =
        pins.reduce((s, p) => s + p.longitude, 0) / pins.length;
      return {
        latitude: avgLat,
        longitude: avgLng,
        latitudeDelta: 0.004,
        longitudeDelta: 0.004,
      };
    }
    return {
      latitude: initialCenter.latitude,
      longitude: initialCenter.longitude,
      latitudeDelta: 0.005,
      longitudeDelta: 0.005,
    };
  }, [pins.length === 0 ? initialCenter.latitude : pins[0].latitude]);

  // Compute the 4-section cross lines & optional 14x14 sub-area lines
  const gridLines = useMemo(() => {
    if (pins.length < 3) return [];
    const lines: Array<[BoundaryPin, BoundaryPin]> = [];

    if (pins.length >= 4) {
      const [nw, ne, se, sw] = pins;
      const topMid = midpoint(nw, ne);
      const bottomMid = midpoint(sw, se);
      const leftMid = midpoint(nw, sw);
      const rightMid = midpoint(ne, se);
      const center = midpoint(topMid, bottomMid);

      // Primary 4-section cross
      lines.push([topMid, bottomMid], [leftMid, rightMid]);

      // If any section > 200 trees, draw 14x14 sub-area splits inside each quarter
      const perQuarter = Math.ceil(Math.max(4, treeCount) / 4);
      if (perQuarter > MAX_TREES_PER_SECTION) {
        const subCount = Math.ceil(perQuarter / SUBSECTION_TREE_CAPACITY);
        const quarters: Array<[BoundaryPin, BoundaryPin, BoundaryPin, BoundaryPin]> = [
          [nw, topMid, center, leftMid],
          [topMid, ne, rightMid, center],
          [leftMid, center, bottomMid, sw],
          [center, rightMid, se, bottomMid],
        ];
        quarters.forEach(([qTL, qTR, qBR, qBL]) => {
          for (let i = 1; i < subCount; i++) {
            const t = i / subCount;
            lines.push([lerpPin(qTL, qBL, t), lerpPin(qTR, qBR, t)]);
          }
        });
      }
      return lines;
    }

    // Fallback bounding-box cross for 3 or 5+ pins
    const lats = pins.map((p) => p.latitude);
    const lngs = pins.map((p) => p.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const midLat = (minLat + maxLat) / 2;
    const midLng = (minLng + maxLng) / 2;

    lines.push(
      [
        { latitude: maxLat, longitude: midLng },
        { latitude: minLat, longitude: midLng },
      ],
      [
        { latitude: midLat, longitude: minLng },
        { latitude: midLat, longitude: maxLng },
      ]
    );
    return lines;
  }, [pins, treeCount]);

  const handleMapPress = (e: MapPressEvent) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    const idx = pins.length;
    const newPin: BoundaryPin = {
      latitude: Number(latitude.toFixed(6)),
      longitude: Number(longitude.toFixed(6)),
      label: PIN_LABELS[idx] ?? `Pin ${idx + 1}`,
    };
    onChangePins([...pins, newPin]);
  };

  const handleMarkerDragEnd = (idx: number, e: MarkerDragStartEndEvent) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    onChangePins(
      pins.map((p, i) =>
        i === idx
          ? {
              ...p,
              latitude: Number(latitude.toFixed(6)),
              longitude: Number(longitude.toFixed(6)),
            }
          : p
      )
    );
  };

  return (
    <View style={styles.container}>
      {apiKeyMissing && (
        <View style={styles.keyBanner}>
          <Ionicons name="key-outline" size={14} color="#8A4B08" />
          <Text style={styles.keyBannerText}>
            Add EXPO_PUBLIC_GOOGLE_MAPS_API_KEY to .env.local for live Google
            Maps satellite tiles.
          </Text>
        </View>
      )}

      <View style={styles.mapFrame}>
        <MapView
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          mapType="hybrid"
          initialRegion={region}
          onPress={handleMapPress}
        >
          {pins.length >= 3 && (
            <Polygon
              coordinates={pins}
              strokeColor="#4CAF50"
              fillColor="rgba(107, 158, 88, 0.25)"
              strokeWidth={2.5}
            />
          )}

          {gridLines.map((line, i) => (
            <Polyline
              key={`grid-${i}`}
              coordinates={line}
              strokeColor="#FFD54F"
              strokeWidth={2}
              lineDashPattern={[6, 4]}
            />
          ))}

          {pins.map((pin, idx) => (
            <Marker
              key={`pin-${idx}`}
              coordinate={{
                latitude: pin.latitude,
                longitude: pin.longitude,
              }}
              title={pin.label ?? `Pin ${idx + 1}`}
              description="Drag to adjust field corner"
              draggable
              onDragEnd={(e) => handleMarkerDragEnd(idx, e)}
              pinColor={idx < 4 ? '#2E7D32' : '#D97706'}
            />
          ))}
        </MapView>
      </View>

      <View style={styles.toolbar}>
        <Text style={styles.hintText}>
          Tap Google Map to drop corner pins ({pins.length} placed) • Drag pins
          to adjust
        </Text>
        <View style={styles.btnRow}>
          <TouchableOpacity
            style={styles.toolBtn}
            onPress={() => onChangePins(pins.slice(0, -1))}
            disabled={pins.length === 0}
          >
            <Ionicons
              name="arrow-undo-outline"
              size={14}
              color={Colors.walnutGreen[800]}
            />
            <Text style={styles.toolBtnText}>Undo Pin</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.toolBtn}
            onPress={() => onChangePins([])}
            disabled={pins.length === 0}
          >
            <Ionicons
              name="trash-outline"
              size={14}
              color={Colors.walnutShell[700]}
            />
            <Text style={styles.toolBtnText}>Clear Pins</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    marginBottom: 8,
  },
  keyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF5EB',
    borderWidth: 1,
    borderColor: '#E8A87C',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 8,
  },
  keyBannerText: {
    flex: 1,
    fontSize: 11,
    color: '#8A4B08',
    fontWeight: '600',
  },
  mapFrame: {
    height: 260,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.walnutGreen[200],
  },
  map: {
    flex: 1,
  },
  toolbar: {
    marginTop: 6,
    gap: 6,
  },
  hintText: {
    fontSize: 11,
    color: Colors.walnutShell[700],
    fontWeight: '600',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  toolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.walnutGreen[100],
  },
  toolBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.walnutGreen[900],
  },
});
