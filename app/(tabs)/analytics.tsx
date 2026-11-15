import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Switch,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '../../src/theme/colors';
import {
  GROWTH_CURVE_SERIES,
  INITIAL_TREES,
  TUYA_SENSOR_NODES,
  TuyaSensorNode,
} from '../../src/data/walnutLifecycle';
import { useWalnutCloud } from '../../src/providers/ConvexClerkProvider';
import { LockedTabNotice } from '../../src/components/LockedTabNotice';

export default function OrchardSetupAndAnalyticsScreen() {
  const router = useRouter();
  const {
    isSignedIn,
    careSetup,
    updateCareSetup,
    resetCareSetupToDefaults,
    syncMode,
    setSyncMode,
    pendingUploadCount,
    syncPendingToConvex,
  } = useWalnutCloud();
  const [sensors, setSensors] = useState<TuyaSensorNode[]>(TUYA_SENSOR_NODES);

  if (!isSignedIn) {
    return (
      <LockedTabNotice
        title="Sign In Required for Sensors & Setup"
        description="Sign in to configure your orchard soil, location zone, and live sensor settings."
      />
    );
  }

  const toggleSensorDisplay = (id: string) => {
    setSensors((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, enabledOnFrontDisplay: !s.enabledOnFrontDisplay }
          : s
      )
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Orchard Setup & Analytics</Text>
        <Text style={styles.subtitle}>
          Customize care parameters for your soil & location, manage sensors, and
          track nut sizing
        </Text>

        {/* Soil & Location Care Setup (Admin Defaults + Grower Overrides) */}
        <View style={styles.syncCard}>
          <View style={styles.syncHeader}>
            <Ionicons
              name="leaf"
              size={20}
              color={Colors.walnutGreen[800]}
            />
            <Text style={styles.syncTitle}>
              Soil & Location Care Parameters
            </Text>
          </View>
          <Text style={styles.syncDesc}>
            {careSetup.isCustomizedByUser
              ? 'Using your custom orchard overrides below.'
              : 'Using optimal default walnut care values. Tap any setting to customize for your soil and region.'}
          </Text>

          <Text style={styles.overrideLabel}>Orchard Soil Type</Text>
          <View style={styles.soilRow}>
            {(['loam', 'clay', 'sandy'] as const).map((soil) => {
              const active = careSetup.soilType === soil;
              const defaultInterval =
                soil === 'sandy' ? 5 : soil === 'clay' ? 10 : 7;
              return (
                <TouchableOpacity
                  key={soil}
                  style={[
                    styles.soilChip,
                    active && styles.soilChipActive,
                  ]}
                  onPress={() =>
                    updateCareSetup({
                      soilType: soil,
                      irrigationIntervalDays: defaultInterval,
                    })
                  }
                >
                  <Text
                    style={[
                      styles.soilChipText,
                      active && styles.soilChipTextActive,
                    ]}
                  >
                    {soil.charAt(0).toUpperCase() + soil.slice(1)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.overrideLabel}>Location / Climate Zone</Text>
          <TextInput
            style={styles.overrideInput}
            value={careSetup.locationZone}
            onChangeText={(text) => updateCareSetup({ locationZone: text })}
            placeholder="e.g. Zone 8b • Temperate Orchard"
            placeholderTextColor={Colors.text.muted}
          />

          <View style={styles.overrideMetricsRow}>
            <View style={styles.overrideMetricBox}>
              <Text style={styles.overrideMetricVal}>
                Every {careSetup.irrigationIntervalDays}d
              </Text>
              <Text style={styles.overrideMetricLbl}>Watering Cycle</Text>
            </View>
            <View style={styles.overrideMetricBox}>
              <Text style={styles.overrideMetricVal}>
                {careSetup.targetSoilMoisturePct}%
              </Text>
              <Text style={styles.overrideMetricLbl}>Target Moisture</Text>
            </View>
            <View style={styles.overrideMetricBox}>
              <Text style={styles.overrideMetricVal}>
                {careSetup.chillHoursTarget} hrs
              </Text>
              <Text style={styles.overrideMetricLbl}>Chill Target</Text>
            </View>
          </View>

          {careSetup.isCustomizedByUser && (
            <TouchableOpacity
              style={styles.purgeBtn}
              onPress={resetCareSetupToDefaults}
            >
              <Ionicons name="refresh" size={16} color="#FFFFFF" />
              <Text style={styles.purgeBtnText}>
                Reset to Optimal Orchard Defaults
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Local SQLite to Cloud Sync Setting (Default: Auto) */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Orchard Data Sync</Text>
              <Text style={styles.cardSub}>
                Saved in local SQLite (14-day post-sync retention). Pending:{' '}
                {pendingUploadCount}
              </Text>
            </View>
            <View style={styles.pluginTag}>
              <Text style={styles.pluginTagText}>
                {syncMode === 'auto' ? 'AUTO' : 'MANUAL'}
              </Text>
            </View>
          </View>

          <View style={styles.soilRow}>
            {(['auto', 'manual'] as const).map((mode) => {
              const active = syncMode === mode;
              return (
                <TouchableOpacity
                  key={mode}
                  style={[styles.soilChip, active && styles.soilChipActive]}
                  onPress={() => setSyncMode(mode)}
                >
                  <Text
                    style={[
                      styles.soilChipText,
                      active && styles.soilChipTextActive,
                    ]}
                  >
                    {mode === 'auto' ? 'Auto Sync (Default)' : 'Manual Sync'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={styles.purgeBtn}
            onPress={() => syncPendingToConvex()}
          >
            <Ionicons name="cloud-upload-outline" size={16} color="#FFFFFF" />
            <Text style={styles.purgeBtnText}>
              Sync Pending Records Now ({pendingUploadCount})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Walnuts Orchard Sensors Menu */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Walnuts Orchard Sensors</Text>
              <Text style={styles.cardSub}>
                Choose which live sensors appear on your Orchard screen
              </Text>
            </View>
            <View style={styles.pluginTag}>
              <Text style={styles.pluginTagText}>CONNECTED</Text>
            </View>
          </View>

          {sensors.map((sensor) => (
            <View key={sensor.id} style={styles.sensorSettingRow}>
              <View style={styles.sensorIconBox}>
                <Ionicons
                  name={sensor.iconName as any}
                  size={18}
                  color={Colors.walnutGreen[700]}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sensorSettingName}>
                  {sensor.label} ({sensor.valueDisplay})
                </Text>
                <Text style={styles.sensorSettingModel}>
                  {sensor.deviceModel} • {sensor.subValueDisplay}
                </Text>
              </View>
              <Switch
                value={sensor.enabledOnFrontDisplay}
                onValueChange={() => toggleSensorDisplay(sensor.id)}
                trackColor={{
                  false: '#CBD5C0',
                  true: Colors.walnutGreen[500],
                }}
              />
            </View>
          ))}

          <TouchableOpacity
            style={{
              marginTop: 10,
              backgroundColor: Colors.walnutGreen[700],
              borderRadius: 10,
              paddingVertical: 11,
              paddingHorizontal: 14,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
            onPress={() => router.push('/shop')}
          >
            <Ionicons name="cart-outline" size={16} color="#FFFFFF" />
            <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>
              Buy Compatible Sensors & Switches →
            </Text>
          </TouchableOpacity>
        </View>

        {/* Nut Diameter Growth Progression Chart */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Seasonal Walnut Sizing Curve (May – Oct)
          </Text>
          <Text style={styles.cardSub}>
            Compares measured nut diameter (mm) against target Chandler variety curve
          </Text>

          <View style={styles.barsContainer}>
            {GROWTH_CURVE_SERIES.map((item) => {
              const barHeight = Math.round((item.actualMm / 40) * 120);
              return (
                <View key={item.month} style={styles.barColumn}>
                  <Text style={styles.barValue}>{item.actualMm}mm</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { height: barHeight }]} />
                  </View>
                  <Text style={styles.barMonth}>{item.month}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Tree-by-Tree Yield Table */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Orchard Yield Breakdown</Text>
          {INITIAL_TREES.map((t) => (
            <View key={t.id} style={styles.treeRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.treeName}>{t.name}</Text>
                <Text style={styles.treeSub}>
                  {t.variety} • Soil Moisture {t.soilMoisturePct}%
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.treeYield}>
                  {t.estimatedTotalNuts} nuts ({t.estimatedWeightKg} kg)
                </Text>
                <Text style={styles.treeSub}>
                  Avg {t.avgNutDiameterMm} mm
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.walnutGreen[50],
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  title: {
    fontSize: 23,
    fontWeight: '800',
    color: Colors.walnutGreen[900],
  },
  subtitle: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 2,
    marginBottom: 14,
  },
  syncCard: {
    backgroundColor: Colors.walnutGreen[200],
    borderRadius: 16,
    padding: 15,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.walnutGreen[400],
  },
  syncHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  syncTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.walnutGreen[900],
  },
  syncDesc: {
    fontSize: 12,
    color: Colors.walnutGreen[900],
    lineHeight: 18,
    marginBottom: 10,
  },
  overrideLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.walnutGreen[900],
    marginBottom: 5,
  },
  soilRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  soilChip: {
    flex: 1,
    backgroundColor: Colors.surface.card,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.walnutGreen[300],
  },
  soilChipActive: {
    backgroundColor: Colors.walnutGreen[700],
    borderColor: Colors.walnutGreen[800],
  },
  soilChipText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.walnutGreen[900],
  },
  soilChipTextActive: {
    color: '#FFFFFF',
  },
  overrideInput: {
    backgroundColor: Colors.surface.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.walnutGreen[300],
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    color: Colors.walnutGreen[900],
    marginBottom: 10,
  },
  overrideMetricsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  overrideMetricBox: {
    flex: 1,
    backgroundColor: Colors.surface.card,
    borderRadius: 10,
    padding: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.walnutGreen[200],
  },
  overrideMetricVal: {
    fontSize: 13,
    fontWeight: '900',
    color: Colors.walnutGreen[900],
  },
  overrideMetricLbl: {
    fontSize: 10,
    color: Colors.text.secondary,
    marginTop: 2,
    fontWeight: '600',
  },
  cacheListBox: {
    backgroundColor: Colors.surface.card,
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    gap: 8,
  },
  cacheRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: Colors.walnutGreen[100],
    paddingBottom: 6,
  },
  cacheTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.walnutGreen[900],
  },
  cacheMeta: {
    fontSize: 10,
    color: Colors.text.secondary,
  },
  statusBadge: {
    backgroundColor: Colors.walnutGreen[200],
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgePending: {
    backgroundColor: Colors.walnutShell[200],
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.walnutGreen[900],
  },
  purgeNotice: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.walnutGreen[800],
    marginBottom: 8,
  },
  purgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.walnutGreen[600],
    paddingVertical: 11,
    borderRadius: 12,
    gap: 6,
  },
  purgeBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  card: {
    backgroundColor: Colors.surface.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.surface.border,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.walnutGreen[900],
  },
  cardSub: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 2,
    marginBottom: 12,
  },
  pluginTag: {
    backgroundColor: Colors.walnutGreen[200],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pluginTagText: {
    fontSize: 9,
    fontWeight: '900',
    color: Colors.walnutGreen[900],
  },
  sensorSettingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.walnutGreen[100],
    gap: 10,
  },
  sensorIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.walnutGreen[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  sensorSettingName: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.walnutGreen[900],
  },
  sensorSettingModel: {
    fontSize: 11,
    color: Colors.text.secondary,
    marginTop: 1,
  },
  barsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingTop: 10,
  },
  barColumn: {
    alignItems: 'center',
    flex: 1,
  },
  barValue: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.walnutGreen[800],
    marginBottom: 4,
  },
  barTrack: {
    width: 24,
    height: 120,
    backgroundColor: Colors.walnutGreen[100],
    borderRadius: 8,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    backgroundColor: Colors.walnutGreen[500],
    borderRadius: 8,
  },
  barMonth: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.text.secondary,
    marginTop: 6,
  },
  treeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.walnutGreen[100],
  },
  treeName: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.walnutGreen[900],
  },
  treeSub: {
    fontSize: 11,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  treeYield: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.walnutGreen[700],
  },
});
