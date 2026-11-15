import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { BoundaryPin } from '../utils/orchardGeometry';

interface FieldGoogleMapPickerProps {
  pins: BoundaryPin[];
  onChangePins: (pins: BoundaryPin[]) => void;
  initialCenter: { latitude: number; longitude: number };
  treeCount: number;
}

export function FieldGoogleMapPicker({
  pins,
  onChangePins,
  initialCenter,
}: FieldGoogleMapPickerProps) {
  const lat = pins[0]?.latitude ?? initialCenter.latitude;
  const lng = pins[0]?.longitude ?? initialCenter.longitude;

  return (
    <View style={styles.container}>
      <View style={styles.webCard}>
        <Ionicons name="map" size={24} color={Colors.walnutGreen[700]} />
        <Text style={styles.title}>
          Interactive Google Maps (Native iOS / Android)
        </Text>
        <Text style={styles.subtitle}>
          On mobile, tap directly on Google Maps Satellite View to drop & drag
          field corner pins. On web, open Google Maps below and paste the 4
          corner coordinates.
        </Text>
        <TouchableOpacity
          style={styles.openBtn}
          onPress={() =>
            void Linking.openURL(
              `https://www.google.com/maps/@${lat},${lng},18z/data=!3m1!1e3`
            )
          }
        >
          <Ionicons name="navigate-circle" size={16} color="#FFFFFF" />
          <Text style={styles.openBtnText}>Open Google Maps Satellite</Text>
        </TouchableOpacity>
        {pins.length > 0 && (
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={() => onChangePins([])}
          >
            <Text style={styles.clearBtnText}>Clear {pins.length} Pins</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 8, marginBottom: 8 },
  webCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.walnutGreen[200],
    backgroundColor: Colors.walnutGreen[50],
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.walnutGreen[900],
  },
  subtitle: {
    fontSize: 11,
    color: Colors.walnutShell[700],
    textAlign: 'center',
    lineHeight: 16,
  },
  openBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1A73E8',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    marginTop: 4,
  },
  openBtnText: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
  clearBtn: { marginTop: 4 },
  clearBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.walnutShell[700],
  },
});
