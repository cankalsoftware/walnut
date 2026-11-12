import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../src/theme/colors';
import {
  GROWTH_CURVE_SERIES,
  INITIAL_TREES,
  TUYA_SENSOR_NODES,
  TuyaSensorNode,
} from '../../src/data/walnutLifecycle';
import {
  INITIAL_LOCAL_CACHE,
  LOCAL_RETENTION_DAYS,
  LocalCachedRecord,
  purgeExpiredSyncedCache,
} from '../../src/services/offlineSyncService';

export default function AnalyticsAndSyncScreen() {
  const [sensors, setSensors] = useState<TuyaSensorNode[]>(TUYA_SENSOR_NODES);
  const [localCache, setLocalCache] =
    useState<LocalCachedRecord[]>(INITIAL_LOCAL_CACHE);
  const [lastPurgeSummary, setLastPurgeSummary] = useState<string | null>(null);

  const toggleSensorDisplay = (id: string) => {
    setSensors((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, enabledOnFrontDisplay: !s.enabledOnFrontDisplay }
          : s
      )
    );
  };

  const handleRunAutoPurge = () => {
    const result = purgeExpiredSyncedCache(localCache);
    setLocalCache(result.retained);
    setLastPurgeSummary(
      `Purged ${result.purgedCount} synced records older than ${LOCAL_RETENTION_DAYS} days (${result.freedMb} MB freed). Unsynced field data kept safe.`
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Analytics, Tuya Sensors & Cloud Sync</Text>
        <Text style={styles.subtitle}>
          WalnutIQ: Tree Care & AI Count • Hybrid Convex Sync & Sensor Settings
        </Text>

        {/* Hybrid Architecture + 14-Day Auto-Purge Engine Card */}
        <View style={styles.syncCard}>
          <View style={styles.syncHeader}>
            <Ionicons
              name="cloud-done"
              size={22}
              color={Colors.walnutGreen[800]}
            />
            <Text style={styles.syncTitle}>
              Hybrid Offline + Convex Sync ({LOCAL_RETENTION_DAYS}-Day Auto-Purge)
            </Text>
          </View>
          <Text style={styles.syncDesc}>
            • Field Mode: Captures YOLO scans & care logs offline when cell signal drops.{'\n'}
            • Cloud Sync: Auto-syncs to Convex + Clerk (Google & Email) for Web App & Chat.{'\n'}
            • Storage Rule: Synced local cache older than {LOCAL_RETENTION_DAYS} days is automatically purged to save phone space.
          </Text>

          <View style={styles.cacheListBox}>
            {localCache.map((rec) => (
              <View key={rec.id} style={styles.cacheRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cacheTitle}>{rec.title}</Text>
                  <Text style={styles.cacheMeta}>
                    {(rec.sizeKb / 1024).toFixed(2)} MB •{' '}
                    {rec.syncStatus === 'SYNCED'
                      ? 'Synced to Convex'
                      : 'Pending Upload (Offline Safe)'}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    rec.syncStatus === 'PENDING_UPLOAD' &&
                      styles.statusBadgePending,
                  ]}
                >
                  <Text style={styles.statusBadgeText}>
                    {rec.syncStatus === 'SYNCED' ? 'SYNCED' : 'OFFLINE'}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {lastPurgeSummary && (
            <Text style={styles.purgeNotice}>{lastPurgeSummary}</Text>
          )}

          <TouchableOpacity
            style={styles.purgeBtn}
            onPress={handleRunAutoPurge}
          >
            <Ionicons name="trash-bin-outline" size={16} color="#FFFFFF" />
            <Text style={styles.purgeBtnText}>
              Run {LOCAL_RETENTION_DAYS}-Day Post-Sync Local Cleanup Now
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tuya Smart Orchard Sensor Plugin Menu */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View>
              <Text style={styles.cardTitle}>
                Tuya Smart Orchard Sensor Plugin
              </Text>
              <Text style={styles.cardSub}>
                Choose which Tuya sensors appear on the front Orchard display
              </Text>
            </View>
            <View style={styles.pluginTag}>
              <Text style={styles.pluginTagText}>TUYA READY</Text>
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
        </View>

        {/* Nut Diameter Growth Progression Chart */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Seasonal Walnut Sizing Curve (May – Oct)
          </Text>
          <Text style={styles.cardSub}>
            Compares YOLO visual diameter (mm) against target Chandler variety curve
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
                  {t.variety} • Tuya Soil Moisture {t.soilMoisturePct}%
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
