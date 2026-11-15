import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../src/theme/colors';
import {
  CARE_CYCLES_COUNTDOWNS,
  GUIDANCE_POPUPS,
  INITIAL_CARE_TASKS,
  PHENOLOGY_STAGES,
  TUYA_SENSOR_NODES,
} from '../../src/data/walnutLifecycle';
import { useWalnutCloud } from '../../src/providers/ConvexClerkProvider';
import { HelpButton } from '../../src/components/HelpModal';

export default function OrchardDashboardScreen() {
  const router = useRouter();
  const { isSignedIn, trees, addOrchardTree, careSetup, userProfile } =
    useWalnutCloud();
  const [tasks, setTasks] = useState(INITIAL_CARE_TASKS.slice(0, 2));
  const [activePopup, setActivePopup] = useState<'daily' | 'weekly' | null>(null);

  const totalEstimatedNuts = trees.reduce(
    (acc, t) => acc + t.estimatedTotalNuts,
    0
  );
  const totalEstimatedKg = trees
    .reduce((acc, t) => acc + t.estimatedWeightKg, 0)
    .toFixed(1);

  const toggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const getSoilGuidance = (soil: typeof careSetup.soilType) => {
    if (soil === 'sandy') {
      return 'Sandy soil drains fast — use shorter, more frequent drip pulses to keep root moisture steady.';
    }
    if (soil === 'clay') {
      return 'Clay soil holds water longer — use slower, deeper soak intervals and watch for root-zone saturation.';
    }
    return 'Loam soil holds balanced moisture — follow your standard drip schedule and check 30cm depth.';
  };

  const currentPopupData = activePopup
    ? !isSignedIn
      ? {
          ...GUIDANCE_POPUPS[activePopup],
          badge: `DEMO ${GUIDANCE_POPUPS[activePopup].badge}`,
          subtitle: 'Sample Demo Orchard • Sign in to calibrate to your location',
        }
      : activePopup === 'daily'
        ? {
            ...GUIDANCE_POPUPS.daily,
            badge: 'YOUR ORCHARD DAILY',
            title: `${userProfile.orchardName} Daily Guide`,
            subtitle: `${careSetup.locationZone} • ${careSetup.soilType.toUpperCase()} soil • ${trees.length} Trees`,
            cycleHighlight: `Water every ${careSetup.irrigationIntervalDays} days • Target ${careSetup.targetSoilMoisturePct}% root moisture`,
            actionItems: [
              getSoilGuidance(careSetup.soilType),
              `Inspect your ${trees.length} registered tree(s) (${totalEstimatedNuts} est. nuts / ${totalEstimatedKg} kg) for dark hulls or moisture stress.`,
              `Keep 30cm root zone near ${careSetup.targetSoilMoisturePct}% moisture before your next scheduled drip cycle.`,
            ],
          }
        : {
            ...GUIDANCE_POPUPS.weekly,
            badge: 'YOUR ORCHARD WEEKLY',
            title: `${userProfile.orchardName} Weekly Plan`,
            subtitle: `${careSetup.locationZone} • Chill Target: ${careSetup.chillHoursTarget} hrs`,
            cycleHighlight: `Chill Target: ${careSetup.chillHoursTarget} hrs • ${trees.length} Tree(s) Tracked`,
            actionItems: [
              `Review weekly moisture trends for your ${careSetup.soilType} soil in ${careSetup.locationZone}.`,
              `Log any new nut counts or area updates across your ${trees.length} registered tree(s).`,
              `Confirm irrigation interval (${careSetup.irrigationIntervalDays} days) matches local weather this week.`,
            ],
          }
    : null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Orchard Header */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>WalnutIQ</Text>
            <Text style={styles.subtitle}>
              {isSignedIn
                ? `${userProfile.orchardName} • ${careSetup.locationZone} • ${trees.length} Trees`
                : `Demo Orchard • Sign in to unlock menus & your location guide`}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <HelpButton
              help={{
                title: 'Orchard Home & Yield Overview',
                whatItDoes:
                  'Shows your walnut trees, estimated nut counts, seasonal guidance, and quick actions.',
                howToDoIt: [
                  'Sign in via the Account / Sign In button to unlock Care Calendar, Camera AI, Community, and Setup & Data.',
                  'Tap Daily or Weekly guides to see tasks calibrated to your soil and location.',
                  'Use the Camera button in the bottom bar to count canopy or ground walnuts.',
                ],
                whatToExpect:
                  'Your orchard counts and care logs save locally in SQLite even offline, and sync to the cloud when signed in.',
              }}
            />
            <TouchableOpacity
              style={styles.syncChip}
              onPress={() => router.push('/auth')}
            >
              <Ionicons
                name={isSignedIn ? 'person-circle' : 'log-in-outline'}
                size={18}
                color={Colors.walnutGreen[800]}
              />
              <Text style={styles.syncChipText}>
                {isSignedIn ? 'Account' : 'Sign In'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Demo Mode Banner for Signed-Out Users */}
        {!isSignedIn && (
          <TouchableOpacity
            style={styles.demoBanner}
            onPress={() => router.push('/auth')}
          >
            <Ionicons name="lock-closed" size={16} color="#FFFFFF" />
            <View style={{ flex: 1 }}>
              <Text style={styles.demoBannerTitle}>
                DEMO DATA MODE • 4 Bottom Menus Locked
              </Text>
              <Text style={styles.demoBannerSub}>
                Showing sample orchard data. Sign in to unlock Care Plan, Camera
                AI, Community & Setup and get your location-calibrated guide.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        )}

        {/* Daily & Weekly Care Briefing */}
        <View style={styles.popupBar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.popupBarTitle}>
              {isSignedIn
                ? 'Your Orchard Care Briefing'
                : 'Demo Orchard Care Briefing'}
            </Text>
            <Text style={styles.popupBarSub}>
              {isSignedIn
                ? `${careSetup.locationZone} • ${careSetup.soilType.toUpperCase()} soil`
                : 'Sample watering, feeding & winter countdowns'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.popupTriggerBtn}
            onPress={() => setActivePopup('daily')}
          >
            <Ionicons name="sunny" size={14} color="#FFFFFF" />
            <Text style={styles.popupTriggerText}>Daily</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.popupTriggerBtnSecondary}
            onPress={() => setActivePopup('weekly')}
          >
            <Ionicons
              name="calendar"
              size={14}
              color={Colors.walnutGreen[900]}
            />
            <Text style={styles.popupTriggerTextSecondary}>Weekly</Text>
          </TouchableOpacity>
        </View>

        {/* AI Camera & Season Yield Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroEyebrow}>CAMERA AI & SEASON YIELD</Text>
              <Text style={styles.heroStageTitle}>
                Post-Harvest & Winter Prep
              </Text>
              <Text style={styles.heroDesc}>
                Count walnuts in the tree canopy or spot fallen nuts hidden under
                autumn leaves.
              </Text>
            </View>
            <View style={styles.yieldSummaryBox}>
              <Text style={styles.yieldValue}>{totalEstimatedNuts}</Text>
              <Text style={styles.yieldLabel}>Est. Nuts</Text>
              <View style={styles.yieldDivider} />
              <Text style={styles.yieldKg}>{totalEstimatedKg} kg</Text>
            </View>
          </View>

          <View style={styles.heroActionsRow}>
            <TouchableOpacity
              style={styles.primaryActionBtn}
              onPress={() =>
                router.push(
                  isSignedIn ? '/(tabs)/scanner?mode=canopy' : '/auth'
                )
              }
            >
              <Ionicons
                name={isSignedIn ? 'camera' : 'lock-closed'}
                size={17}
                color="#FFFFFF"
              />
              <Text style={styles.primaryActionText}>
                {isSignedIn ? 'Count Tree Nuts' : 'Sign In to Count'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryActionBtn}
              onPress={() =>
                router.push(
                  isSignedIn ? '/(tabs)/scanner?mode=ground' : '/auth'
                )
              }
            >
              <Ionicons
                name={isSignedIn ? 'locate' : 'lock-closed'}
                size={17}
                color={Colors.walnutGreen[900]}
              />
              <Text style={styles.secondaryActionText}>
                {isSignedIn ? 'Find Fallen Nuts' : 'Sign In to Pick'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* WALNUTS ORCHARD SENSORS FRONT DISPLAY STRIP */}
        <View style={styles.sectionHeader}>
          <View style={styles.sensorHeaderLeft}>
            <Ionicons name="pulse" size={18} color={Colors.walnutGreen[700]} />
            <Text style={styles.sectionTitle}>
              {isSignedIn
                ? 'Walnuts Orchard Sensors (Live Telemetry)'
                : 'Demo Orchard Sensors (Sample)'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity onPress={() => router.push('/shop')}>
              <Text style={styles.sectionLink}>Shop Sensors →</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() =>
                router.push(isSignedIn ? '/(tabs)/analytics' : '/auth')
              }
            >
              <Text style={styles.sectionLink}>
                {isSignedIn ? 'Settings →' : 'Sign In →'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sensorGrid}>
          {TUYA_SENSOR_NODES.map((sensor) => (
            <TouchableOpacity
              key={sensor.id}
              style={styles.sensorCard}
              onPress={() =>
                router.push(isSignedIn ? '/(tabs)/analytics' : '/auth')
              }
            >
              <View style={styles.sensorCardTop}>
                <View style={styles.sensorIconCircle}>
                  <Ionicons
                    name={sensor.iconName as any}
                    size={16}
                    color={Colors.walnutGreen[700]}
                  />
                </View>
                <View style={styles.sensorStatusPill}>
                  <Text style={styles.sensorStatusText}>
                    {sensor.statusLabel}
                  </Text>
                </View>
              </View>
              <Text style={styles.sensorValue}>{sensor.valueDisplay}</Text>
              <Text style={styles.sensorLabel}>{sensor.label}</Text>
              <Text style={styles.sensorSub} numberOfLines={1}>
                {sensor.subValueDisplay}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Priority Care Queue */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {isSignedIn ? 'Upcoming Care' : 'Demo Upcoming Care'}
          </Text>
          <TouchableOpacity
            onPress={() =>
              router.push(isSignedIn ? '/(tabs)/calendar' : '/auth')
            }
          >
            <Text style={styles.sectionLink}>
              {isSignedIn ? 'Full Care Plan →' : 'Unlock Care Plan →'}
            </Text>
          </TouchableOpacity>
        </View>
        {tasks.map((task) => (
          <TouchableOpacity
            key={task.id}
            style={styles.taskCard}
            onPress={() => toggleTask(task.id)}
          >
            <Ionicons
              name={task.completed ? 'checkbox' : 'square-outline'}
              size={24}
              color={
                task.completed
                  ? Colors.walnutGreen[600]
                  : Colors.walnutShell[500]
              }
            />
            <View style={styles.taskBody}>
              <View style={styles.taskMetaRow}>
                <Text style={styles.taskCategoryBadge}>
                  {task.category.toUpperCase()} • {task.countdownLabel}
                </Text>
                <Text style={styles.taskDue}>{task.dueDateLabel}</Text>
              </View>
              <Text
                style={[
                  styles.taskTitle,
                  task.completed && styles.taskTitleDone,
                ]}
              >
                {task.title}
              </Text>
              <Text style={styles.taskTip}>{task.dosageOrTip}</Text>
            </View>
          </TouchableOpacity>
        ))}

        {/* Registered Walnut Trees */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {isSignedIn ? 'My Walnut Trees' : 'Demo Walnut Trees'}
          </Text>
          <TouchableOpacity
            onPress={() => {
              if (!isSignedIn) {
                router.push('/auth');
              } else {
                addOrchardTree(
                  `Tree #0${trees.length + 1} • New Orchard Area`,
                  'Chandler'
                );
              }
            }}
          >
            <Text style={styles.sectionLink}>
              {isSignedIn ? '+ Add Area / Tree' : 'Sign in to Add →'}
            </Text>
          </TouchableOpacity>
        </View>
        {trees.map((tree) => (
          <View key={tree.id} style={styles.treeCard}>
            <View style={styles.treeCardHeader}>
              <View>
                <Text style={styles.treeName}>{tree.name}</Text>
                <Text style={styles.treeMeta}>
                  Variety: {tree.variety} • Planted {tree.plantedYear} •{' '}
                  {tree.canopyDensity.toUpperCase()} Canopy
                </Text>
              </View>
              <View style={styles.healthBadge}>
                <Text style={styles.healthBadgeText}>
                  {tree.healthScore}% Health
                </Text>
              </View>
            </View>
            <View style={styles.treeMetricsGrid}>
              <View style={styles.metricPill}>
                <Text style={styles.metricLabel}>Frame Count</Text>
                <Text style={styles.metricValue}>{tree.lastCanopyCount}</Text>
              </View>
              <View style={styles.metricPill}>
                <Text style={styles.metricLabel}>Est. Tree Yield</Text>
                <Text style={styles.metricValue}>
                  {tree.estimatedTotalNuts} ({tree.estimatedWeightKg} kg)
                </Text>
              </View>
              <View style={styles.metricPill}>
                <Text style={styles.metricLabel}>Avg Size</Text>
                <Text style={styles.metricValue}>{tree.avgNutDiameterMm} mm</Text>
              </View>
            </View>
          </View>
        ))}

        {/* Legal & Google Play Safety Footer */}
        <TouchableOpacity
          style={{
            marginTop: 8,
            marginBottom: 12,
            paddingVertical: 12,
            borderRadius: 12,
            backgroundColor: Colors.surface.card,
            borderWidth: 1,
            borderColor: Colors.walnutGreen[200],
            alignItems: 'center',
          }}
          onPress={() => router.push('/legal')}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: '700',
              color: Colors.walnutGreen[800],
            }}
          >
            Privacy Policy • Cookie Policy • Terms & Data Safety →
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Daily & Weekly Care Guidance Popup Modal */}
      <Modal
        visible={activePopup !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setActivePopup(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {currentPopupData && (
              <>
                <View style={styles.modalBadgeRow}>
                  <View style={styles.modalBadge}>
                    <Text style={styles.modalBadgeText}>
                      {currentPopupData.badge}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setActivePopup(null)}>
                    <Ionicons
                      name="close-circle"
                      size={24}
                      color={Colors.walnutGreen[800]}
                    />
                  </TouchableOpacity>
                </View>

                <Text style={styles.modalTitle}>{currentPopupData.title}</Text>
                <Text style={styles.modalSub}>{currentPopupData.subtitle}</Text>

                <View style={styles.modalCountdownHighlight}>
                  <Ionicons
                    name="timer"
                    size={18}
                    color={Colors.walnutGreen[800]}
                  />
                  <Text style={styles.modalCountdownText}>
                    {currentPopupData.cycleHighlight}
                  </Text>
                </View>

                {currentPopupData.actionItems.map((item, idx) => (
                  <View key={idx} style={styles.modalBulletRow}>
                    <Text style={styles.modalBulletText}>{item}</Text>
                  </View>
                ))}

                <View style={styles.modalSensorBox}>
                  <Ionicons
                    name="hardware-chip"
                    size={16}
                    color={Colors.walnutShell[700]}
                  />
                  <Text style={styles.modalSensorText}>
                    {currentPopupData.sensorTip}
                  </Text>
                </View>

                <View style={styles.modalFooterBtns}>
                  <TouchableOpacity
                    style={styles.modalSwitchBtn}
                    onPress={() =>
                      setActivePopup(activePopup === 'daily' ? 'weekly' : 'daily')
                    }
                  >
                    <Text style={styles.modalSwitchBtnText}>
                      Switch to {activePopup === 'daily' ? 'Weekly' : 'Daily'}{' '}
                      Popup
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalCloseBtn}
                    onPress={() => setActivePopup(null)}
                  >
                    <Text style={styles.modalCloseBtnText}>Got It</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  demoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.walnutShell[700],
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  demoBannerTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  demoBannerSub: {
    fontSize: 11,
    color: '#F5EBE0',
    marginTop: 2,
    lineHeight: 15,
  },
  safeArea: {
    flex: 1,
    backgroundColor: Colors.walnutGreen[50],
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 8,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.walnutGreen[200],
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    gap: 5,
    marginBottom: 6,
  },
  badgePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.walnutGreen[800],
    letterSpacing: 0.4,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.walnutGreen[900],
  },
  subtitle: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  syncChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.walnutGreen[200],
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    gap: 5,
  },
  syncChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.walnutGreen[800],
  },
  popupBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface.card,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.walnutGreen[300],
    marginBottom: 16,
    gap: 8,
  },
  popupBarTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.walnutGreen[900],
  },
  popupBarSub: {
    fontSize: 11,
    color: Colors.text.secondary,
  },
  popupTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.walnutGreen[600],
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  popupTriggerText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  popupTriggerBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.walnutGreen[200],
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  popupTriggerTextSecondary: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.walnutGreen[900],
  },
  sensorHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sensorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 18,
  },
  sensorCard: {
    width: '48%',
    backgroundColor: Colors.surface.card,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.walnutGreen[200],
  },
  sensorCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  sensorIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.walnutGreen[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  sensorStatusPill: {
    backgroundColor: Colors.walnutGreen[200],
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  sensorStatusText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.walnutGreen[800],
  },
  sensorValue: {
    fontSize: 19,
    fontWeight: '900',
    color: Colors.walnutGreen[900],
  },
  sensorLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.walnutGreen[800],
    marginTop: 1,
  },
  sensorSub: {
    fontSize: 10,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  countdownCard: {
    width: 225,
    backgroundColor: Colors.surface.card,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.walnutGreen[300],
  },
  countdownTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  countdownCategory: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.walnutGreen[700],
  },
  countdownBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.walnutShell[100],
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  countdownBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.walnutShell[700],
  },
  countdownCycleName: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.walnutGreen[900],
    marginBottom: 8,
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: Colors.walnutGreen[100],
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.walnutGreen[500],
  },
  countdownNextText: {
    fontSize: 11,
    color: Colors.text.secondary,
  },
  heroCard: {
    backgroundColor: Colors.walnutGreen[200],
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.walnutGreen[300],
    marginBottom: 20,
  },
  heroTopRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.walnutGreen[700],
    letterSpacing: 0.6,
  },
  heroStageTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.walnutGreen[900],
    marginVertical: 4,
  },
  heroDesc: {
    fontSize: 12,
    color: Colors.walnutGreen[800],
    lineHeight: 17,
  },
  yieldSummaryBox: {
    backgroundColor: Colors.surface.card,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
    borderWidth: 1,
    borderColor: Colors.walnutGreen[300],
  },
  yieldValue: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.walnutGreen[700],
  },
  yieldLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  yieldDivider: {
    height: 1,
    backgroundColor: Colors.walnutGreen[200],
    width: '80%',
    marginVertical: 6,
  },
  yieldKg: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.walnutShell[500],
  },
  heroActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.walnutGreen[600],
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface.card,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.walnutGreen[400],
    gap: 6,
  },
  secondaryActionText: {
    color: Colors.walnutGreen[900],
    fontWeight: '700',
    fontSize: 13,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.walnutGreen[900],
  },
  sectionLink: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.walnutGreen[700],
  },
  stageRow: {
    gap: 10,
    paddingBottom: 14,
  },
  stageCard: {
    width: 210,
    backgroundColor: Colors.surface.card,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.surface.border,
  },
  stageCardActive: {
    backgroundColor: Colors.walnutGreen[100],
    borderColor: Colors.walnutGreen[500],
    borderWidth: 1.5,
  },
  stageMonths: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.walnutShell[500],
  },
  stageName: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.walnutGreen[900],
    marginVertical: 4,
  },
  stageSummary: {
    fontSize: 12,
    color: Colors.text.secondary,
    lineHeight: 16,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surface.card,
    borderRadius: 14,
    padding: 13,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.surface.border,
    gap: 10,
  },
  taskBody: {
    flex: 1,
  },
  taskMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  taskCategoryBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.walnutGreen[700],
    backgroundColor: Colors.walnutGreen[100],
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  taskDue: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.walnutShell[500],
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.walnutGreen[900],
  },
  taskTitleDone: {
    textDecorationLine: 'line-through',
    color: Colors.text.muted,
  },
  taskTip: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 4,
  },
  treeCard: {
    backgroundColor: Colors.surface.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.surface.border,
  },
  treeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  treeName: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.walnutGreen[900],
  },
  treeMeta: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  healthBadge: {
    backgroundColor: Colors.walnutGreen[200],
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  healthBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.walnutGreen[800],
  },
  treeMetricsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  metricPill: {
    flex: 1,
    backgroundColor: Colors.walnutGreen[50],
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.walnutGreen[200],
  },
  metricLabel: {
    fontSize: 10,
    color: Colors.text.secondary,
    fontWeight: '600',
  },
  metricValue: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.walnutGreen[900],
    marginTop: 2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 15, 0.65)',
    justifyContent: 'center',
    padding: 18,
  },
  modalCard: {
    backgroundColor: Colors.walnutGreen[50],
    borderRadius: 20,
    padding: 18,
    borderWidth: 2,
    borderColor: Colors.walnutGreen[400],
  },
  modalBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalBadge: {
    backgroundColor: Colors.walnutGreen[200],
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  modalBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: Colors.walnutGreen[900],
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: Colors.walnutGreen[900],
  },
  modalSub: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 2,
    marginBottom: 12,
  },
  modalCountdownHighlight: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.walnutGreen[200],
    padding: 10,
    borderRadius: 12,
    gap: 8,
    marginBottom: 12,
  },
  modalCountdownText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
    color: Colors.walnutGreen[900],
  },
  modalBulletRow: {
    backgroundColor: Colors.surface.card,
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.surface.border,
  },
  modalBulletText: {
    fontSize: 12,
    color: Colors.walnutGreen[900],
    lineHeight: 18,
  },
  modalSensorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.walnutShell[50],
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.walnutShell[200],
    gap: 8,
    marginTop: 4,
    marginBottom: 14,
  },
  modalSensorText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    color: Colors.walnutShell[700],
  },
  modalFooterBtns: {
    flexDirection: 'row',
    gap: 10,
  },
  modalSwitchBtn: {
    flex: 1,
    backgroundColor: Colors.walnutGreen[200],
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalSwitchBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.walnutGreen[900],
  },
  modalCloseBtn: {
    flex: 1,
    backgroundColor: Colors.walnutGreen[600],
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCloseBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
