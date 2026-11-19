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
import { HelpButton } from '../../src/components/HelpModal';

export default function OrchardSetupAndAnalyticsScreen() {
  const router = useRouter();
  const {
    isSignedIn,
    userProfile,
    myWholesalerProfile,
    buyRequests,
    marketplaceListings,
    marketplaceThreads,
    marketPulse,
    setEnableOrchardTools,
    careSetup,
    updateCareSetup,
    resetCareSetupToDefaults,
    syncMode,
    setSyncMode,
    pendingUploadCount,
    syncPendingToConvex,
  } = useWalnutCloud();
  const [sensors, setSensors] = useState<TuyaSensorNode[]>(TUYA_SENSOR_NODES);
  const [dualViewMode, setDualViewMode] = useState<'buyer' | 'orchard'>('buyer');

  if (!isSignedIn) {
    return (
      <LockedTabNotice
        title="Sign In Required for Setup & Trade Data"
        description="Sign in to access your Wholesaler Buyer Desk or Orchard care parameters and trade analytics."
      />
    );
  }

  const isPureWholesaler =
    userProfile.accountType === 'wholesaler' && !userProfile.enableOrchardTools;
  const isDualRole =
    userProfile.accountType === 'wholesaler' && userProfile.enableOrchardTools;
  const myActiveRequestsCount = buyRequests.filter(
    (r) => r.userId === userProfile.clerkId && r.status === 'active'
  ).length;

  const renderBuyerDeskCards = () => (
    <>
      {/* Buyer Profile & "How We Work" Status */}
      <View style={styles.buyerDeskHero}>
        <View style={styles.cardHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.buyerDeskTitle}>
              {myWholesalerProfile?.companyName || userProfile.displayName}
            </Text>
            <Text style={styles.buyerDeskSub}>
              {myWholesalerProfile?.region || userProfile.region}
            </Text>
          </View>
          <View
            style={[
              styles.statusPillBadge,
              userProfile.isWholesalerProfileComplete
                ? styles.statusPillActive
                : styles.statusPillPending,
            ]}
          >
            <Text style={styles.statusPillBadgeText}>
              {userProfile.isWholesalerProfileComplete ? 'ACTIVE' : 'SETUP REQUIRED'}
            </Text>
          </View>
        </View>

        <Text style={styles.howWeWorkPreview}>
          {myWholesalerProfile?.howWeWork ||
            'Add your weighing, sampling, and payment settlement process ("How We Work") so walnut growers can trade with confidence.'}
        </Text>

        {myWholesalerProfile && (
          <Text style={styles.buyerDeskMeta}>
            Varieties: {myWholesalerProfile.preferredVarieties.join(', ')} • Volume:{' '}
            {myWholesalerProfile.minPurchaseKg
              ? `${(myWholesalerProfile.minPurchaseKg / 1000).toFixed(1)}T`
              : 'Any'}{' '}
            –{' '}
            {myWholesalerProfile.maxPurchaseKg
              ? `${(myWholesalerProfile.maxPurchaseKg / 1000).toFixed(0)}T`
              : 'No cap'}
          </Text>
        )}

        <TouchableOpacity
          style={styles.purgeBtn}
          onPress={() => router.push('/(tabs)/marketplace')}
        >
          <Ionicons name="storefront-outline" size={16} color="#FFFFFF" />
          <Text style={styles.purgeBtnText}>
            Manage Buyer Profile & Buy Requests →
          </Text>
        </TouchableOpacity>
      </View>

      {/* Wholesale Trade KPIs */}
      <View style={styles.buyerKpiGrid}>
        <View style={styles.buyerKpiCard}>
          <Text style={styles.buyerKpiVal}>{myActiveRequestsCount}</Text>
          <Text style={styles.buyerKpiLbl}>My Buy Requests</Text>
        </View>
        <View style={styles.buyerKpiCard}>
          <Text style={styles.buyerKpiVal}>{marketplaceThreads.length}</Text>
          <Text style={styles.buyerKpiLbl}>Open B2B Threads</Text>
        </View>
        <View style={styles.buyerKpiCard}>
          <Text style={styles.buyerKpiVal}>{marketplaceListings.length}</Text>
          <Text style={styles.buyerKpiLbl}>Market Lots Live</Text>
        </View>
        <View style={styles.buyerKpiCard}>
          <Text style={styles.buyerKpiVal}>{userProfile.trustedBuyerCount}</Text>
          <Text style={styles.buyerKpiLbl}>Trusted Buyer</Text>
        </View>
      </View>

      {/* Regional Walnut Supply Breakdown */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          Regional Walnut Supply Breakdown (Live Pulse)
        </Text>
        <Text style={styles.cardSub}>
          Active producer volumes and ask ranges across listed varieties
        </Text>
        {marketPulse.length === 0 ? (
          <Text style={styles.buyerDeskMeta}>
            No regional supply buckets recorded yet.
          </Text>
        ) : (
          marketPulse.map((bucket) => (
            <View key={bucket.key} style={styles.pulseRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.treeName}>
                  {bucket.variety} •{' '}
                  {bucket.form === 'in_shell' ? 'In-Shell' : 'Shelled Kernel'}
                </Text>
                <Text style={styles.treeSub}>
                  {bucket.activeListingCount} lot(s) •{' '}
                  {(bucket.totalAvailableKg / 1000).toFixed(1)}T available
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.treeYield}>
                  {bucket.minPricePerKg !== undefined &&
                  bucket.maxPricePerKg !== undefined
                    ? `${bucket.currency} ${bucket.minPricePerKg.toFixed(2)}–${bucket.maxPricePerKg.toFixed(2)}/kg`
                    : 'Quote Only'}
                </Text>
                <Text style={styles.treeSub}>
                  {bucket.activeBuyRequestCount} active buyer demand
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Mode Switch Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          {isPureWholesaler
            ? 'Do You Also Manage Walnut Orchards?'
            : 'Dual-Role Mode Controls'}
        </Text>
        <Text style={styles.cardSub}>
          {isPureWholesaler
            ? 'Enable Grower / Orchard Mode anytime to unlock field tracking, care calendars, and Camera AI yield scanning alongside buying.'
            : 'Orchard, Care Plan, and Camera AI tabs are currently enabled alongside Buyer Desk & Buyers Hall.'}
        </Text>
        <TouchableOpacity
          style={styles.secondaryActionBtn}
          onPress={() => void setEnableOrchardTools(isPureWholesaler)}
        >
          <Ionicons
            name={isPureWholesaler ? 'leaf-outline' : 'briefcase-outline'}
            size={16}
            color={Colors.walnutGreen[900]}
          />
          <Text style={styles.secondaryActionBtnText}>
            {isPureWholesaler
              ? 'Also Grow Walnuts? Enable Orchard & Care Mode'
              : 'Switch Back to Buyer-Only Mode'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Account, Backup & Privacy */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Account, Export & Privacy</Text>
        <Text style={styles.cardSub}>
          Manage mobile sign-in, GDPR JSON data export, or account deletion.
        </Text>
        <View style={{ gap: 8 }}>
          <TouchableOpacity
            style={styles.secondaryActionBtn}
            onPress={() => router.push('/auth')}
          >
            <Ionicons name="settings-outline" size={16} color={Colors.walnutGreen[900]} />
            <Text style={styles.secondaryActionBtnText}>
              Account Settings, Mobile & GDPR Export
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryActionBtn}
            onPress={() => router.push('/legal')}
          >
            <Ionicons name="document-text-outline" size={16} color={Colors.walnutGreen[900]} />
            <Text style={styles.secondaryActionBtnText}>
              Privacy Policy & Terms
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );

  if (isPureWholesaler) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerActionRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Buyer Desk & Trade Setup</Text>
              <Text style={styles.subtitle}>
                Wholesale purchasing status, regional walnut supply & account tools
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <HelpButton
                help={{
                  title: 'Wholesaler Buyer Desk',
                  whatItDoes:
                    'Summarizes your wholesale buyer profile, active Buy Requests, regional walnut supply pulse, and account controls.',
                  howToDoIt: [
                    'Verify your "How We Work" profile status is Active before revealing seller numbers.',
                    'Review Regional Market Pulse supply volumes and price ranges across varieties.',
                    'If you also own walnut trees, enable Orchard & Care Mode below anytime.',
                  ],
                  whatToExpect:
                    'Grower-only soil, watering, and Tuya sensor screens stay hidden while you operate in Buyer-Only mode.',
                }}
              />
              <TouchableOpacity
                style={styles.accountHeaderBtn}
                onPress={() => router.push('/auth')}
              >
                <Ionicons name="person-circle" size={18} color={Colors.walnutGreen[800]} />
                <Text style={styles.accountHeaderBtnText}>Account</Text>
              </TouchableOpacity>
            </View>
          </View>

          {renderBuyerDeskCards()}
        </ScrollView>
      </SafeAreaView>
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
        <View style={styles.headerActionRow}>
          <TouchableOpacity
            style={styles.backHeaderBtn}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={18} color={Colors.walnutGreen[900]} />
          </TouchableOpacity>
          <Text style={[styles.title, { flex: 1 }]}>
            {isDualRole ? 'Buyer Desk & Orchard Setup' : 'Orchard Setup & Analytics'}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <HelpButton
              help={{
                title: isDualRole
                  ? 'Dual-Role Buyer Desk & Orchard Setup'
                  : 'Orchard Setup & SQLite Sync',
                whatItDoes: isDualRole
                  ? 'Lets Dual-Role users switch cleanly between their Wholesaler Buyer Desk and personal Orchard Setup & Sensors.'
                  : 'Configures your soil type, location zone, Tuya sensors, and Auto/Manual Convex cloud sync.',
                howToDoIt: isDualRole
                  ? [
                      'Use the switcher below to view Buyer Desk metrics or customize Orchard soil, sensors, and sync.',
                      'Open Marketplace or Buyers Hall directly from the bottom bar.',
                    ]
                  : [
                      'Select your soil type (Loam, Clay, or Sandy) to calibrate watering intervals.',
                      'Leave Sync Mode on "Auto" (default) for automatic cloud backup when signed in, or switch to "Manual" in low-signal areas.',
                    ],
                whatToExpect:
                  'Both wholesale trade settings and personal orchard sync controls stay accessible without hiding either workflow.',
              }}
            />
            <TouchableOpacity
              style={styles.accountHeaderBtn}
              onPress={() => router.push('/auth')}
            >
              <Ionicons name="person-circle" size={18} color={Colors.walnutGreen[800]} />
              <Text style={styles.accountHeaderBtnText}>Account</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.subtitle}>
          {isDualRole
            ? 'Switch between your Wholesale Buyer Desk and personal Orchard Setup & Sensors'
            : 'Customize care parameters for your soil & location, manage sensors, and track nut sizing'}
        </Text>

        {isDualRole && (
          <View style={[styles.soilRow, { marginBottom: 14 }]}>
            <TouchableOpacity
              style={[
                styles.soilChip,
                dualViewMode === 'buyer' && styles.soilChipActive,
              ]}
              onPress={() => setDualViewMode('buyer')}
            >
              <Text
                style={[
                  styles.soilChipText,
                  dualViewMode === 'buyer' && styles.soilChipTextActive,
                ]}
              >
                Buyer Desk
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.soilChip,
                dualViewMode === 'orchard' && styles.soilChipActive,
              ]}
              onPress={() => setDualViewMode('orchard')}
            >
              <Text
                style={[
                  styles.soilChipText,
                  dualViewMode === 'orchard' && styles.soilChipTextActive,
                ]}
              >
                Orchard Setup & Sensors
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {isDualRole && dualViewMode === 'buyer' ? (
          renderBuyerDeskCards()
        ) : (
          <>

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

          <Text style={styles.overrideLabel}>Location / Climate Zone *</Text>
          <TextInput
            style={[
              styles.overrideInput,
              !careSetup.locationZone.trim() && styles.overrideInputError,
            ]}
            value={careSetup.locationZone}
            onChangeText={(text) => updateCareSetup({ locationZone: text })}
            placeholder="e.g. Zone 8b • Temperate Orchard"
            placeholderTextColor={Colors.text.muted}
          />
          {!careSetup.locationZone.trim() && (
            <Text style={styles.fieldErrorText}>
              Required: enter your orchard region / climate zone
            </Text>
          )}

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
          </>
        )}
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
  headerActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  backHeaderBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Colors.surface.card,
    borderWidth: 1,
    borderColor: Colors.surface.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.walnutGreen[100],
    borderWidth: 1,
    borderColor: Colors.walnutGreen[300],
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  accountHeaderBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.walnutGreen[800],
  },
  buyerDeskHero: {
    backgroundColor: Colors.walnutShell[50],
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.walnutShell[200],
    gap: 8,
  },
  buyerDeskTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.walnutShell[700],
  },
  buyerDeskSub: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginTop: 2,
  },
  statusPillBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusPillActive: {
    backgroundColor: '#DCFCE7',
  },
  statusPillPending: {
    backgroundColor: '#FEF3C7',
  },
  statusPillBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: Colors.walnutGreen[900],
  },
  howWeWorkPreview: {
    fontSize: 13,
    color: Colors.walnutGreen[900],
    lineHeight: 19,
  },
  buyerDeskMeta: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  buyerKpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  buyerKpiCard: {
    width: '48%',
    backgroundColor: Colors.surface.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.surface.border,
    alignItems: 'center',
  },
  buyerKpiVal: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.walnutGreen[800],
  },
  buyerKpiLbl: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.text.secondary,
    marginTop: 2,
  },
  pulseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.walnutGreen[100],
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.walnutGreen[100],
    borderWidth: 1,
    borderColor: Colors.walnutGreen[300],
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  secondaryActionBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.walnutGreen[900],
  },
  dualRoleCard: {
    backgroundColor: Colors.walnutShell[50],
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.walnutShell[200],
  },
  dualRoleTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.walnutShell[700],
  },
  dualRoleSub: {
    fontSize: 11,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  overrideInputError: {
    borderColor: '#DC2626',
    borderWidth: 1.5,
    backgroundColor: '#FEF2F2',
  },
  fieldErrorText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B91C1C',
    marginTop: -6,
    marginBottom: 8,
  },
});
