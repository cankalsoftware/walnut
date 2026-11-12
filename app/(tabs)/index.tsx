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
  INITIAL_TREES,
  PHENOLOGY_STAGES,
  TUYA_SENSOR_NODES,
} from '../../src/data/walnutLifecycle';

export default function OrchardDashboardScreen() {
  const router = useRouter();
  const [tasks, setTasks] = useState(INITIAL_CARE_TASKS.slice(0, 3));
  const [activePopup, setActivePopup] = useState<'daily' | 'weekly' | null>(null);

  const totalEstimatedNuts = INITIAL_TREES.reduce(
    (acc, t) => acc + t.estimatedTotalNuts,
    0
  );
  const totalEstimatedKg = INITIAL_TREES.reduce(
    (acc, t) => acc + t.estimatedWeightKg,
    0
  ).toFixed(1);

  const toggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const currentPopupData = activePopup ? GUIDANCE_POPUPS[activePopup] : null;

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
            <View style={styles.badgePill}>
              <Ionicons name="leaf" size={13} color={Colors.walnutGreen[700]} />
              <Text style={styles.badgePillText}>
                WALNUT TREE CARE & AI COUNTER
              </Text>
            </View>
            <Text style={styles.title}>WalnutIQ: Tree Care & AI Count</Text>
            <Text style={styles.subtitle}>
              Offline-First + Convex Sync (14d Auto-Purge) • 3 Bearing Trees
            </Text>
          </View>
          <TouchableOpacity
            style={styles.syncChip}
            onPress={() => router.push('/(tabs)/analytics')}
          >
            <Ionicons
              name="hardware-chip-outline"
              size={16}
              color={Colors.walnutGreen[700]}
            />
            <Text style={styles.syncChipText}>Sensors & Sync</Text>
          </TouchableOpacity>
        </View>

        {/* Daily & Weekly Guidance Popup Bar */}
        <View style={styles.popupBar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.popupBarTitle}>
              Care Guidance & Cycle Popups
            </Text>
            <Text style={styles.popupBarSub}>
              Watering, feeding & winter care countdown briefings
            </Text>
          </View>
          <TouchableOpacity
            style={styles.popupTriggerBtn}
            onPress={() => setActivePopup('daily')}
          >
            <Ionicons name="sunny" size={14} color="#FFFFFF" />
            <Text style={styles.popupTriggerText}>Daily Popup</Text>
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

        {/* TUYA SMART ORCHARD SENSORS FRONT DISPLAY STRIP */}
        <View style={styles.sectionHeader}>
          <View style={styles.sensorHeaderLeft}>
            <Ionicons name="pulse" size={18} color={Colors.walnutGreen[700]} />
            <Text style={styles.sectionTitle}>
              Tuya Orchard Sensors (Live Telemetry)
            </Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/(tabs)/analytics')}>
            <Text style={styles.sectionLink}>Configure Tuya →</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sensorGrid}>
          {TUYA_SENSOR_NODES.map((sensor) => (
            <TouchableOpacity
              key={sensor.id}
              style={styles.sensorCard}
              onPress={() => router.push('/(tabs)/analytics')}
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

        {/* Active Care Cycles & Live Countdowns */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Active Care Cycles & Countdowns
          </Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/calendar')}>
            <Text style={styles.sectionLink}>All Cycles →</Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.stageRow}
        >
          {CARE_CYCLES_COUNTDOWNS.map((cycle) => (
            <View key={cycle.id} style={styles.countdownCard}>
              <View style={styles.countdownTopRow}>
                <Text style={styles.countdownCategory}>{cycle.title}</Text>
                <View style={styles.countdownBadge}>
                  <Ionicons
                    name="timer-outline"
                    size={12}
                    color={Colors.walnutShell[700]}
                  />
                  <Text style={styles.countdownBadgeText}>
                    {cycle.countdownText}
                  </Text>
                </View>
              </View>
              <Text style={styles.countdownCycleName}>{cycle.cycleName}</Text>
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${cycle.progressPct}%` },
                  ]}
                />
              </View>
              <Text style={styles.countdownNextText}>
                {cycle.nextActionText}
              </Text>
            </View>
          ))}
        </ScrollView>

        {/* Active Season & YOLO Yield Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroEyebrow}>AI VISION & SEASON STATUS</Text>
              <Text style={styles.heroStageTitle}>
                Post-Harvest & Winter Care Prep
              </Text>
              <Text style={styles.heroDesc}>
                Scan trees for canopy yield calibration or use Ground Picker to
                spot fallen walnuts hidden under autumn leaves.
              </Text>
            </View>
            <View style={styles.yieldSummaryBox}>
              <Text style={styles.yieldValue}>{totalEstimatedNuts}</Text>
              <Text style={styles.yieldLabel}>YOLO Est. Nuts</Text>
              <View style={styles.yieldDivider} />
              <Text style={styles.yieldKg}>{totalEstimatedKg} kg</Text>
            </View>
          </View>

          {/* Dual Quick Camera CTAs */}
          <View style={styles.heroActionsRow}>
            <TouchableOpacity
              style={styles.primaryActionBtn}
              onPress={() => router.push('/(tabs)/scanner')}
            >
              <Ionicons name="camera" size={18} color="#FFFFFF" />
              <Text style={styles.primaryActionText}>Canopy Nut Counter</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryActionBtn}
              onPress={() => router.push('/(tabs)/scanner')}
            >
              <Ionicons
                name="locate"
                size={18}
                color={Colors.walnutGreen[900]}
              />
              <Text style={styles.secondaryActionText}>Ground Nut Finder</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Annual Lifecycle Progress Strip */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Year-Round Walnut Cycle</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/calendar')}>
            <Text style={styles.sectionLink}>Full Calendar →</Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.stageRow}
        >
          {PHENOLOGY_STAGES.map((stage) => (
            <View
              key={stage.id}
              style={[
                styles.stageCard,
                stage.active && styles.stageCardActive,
              ]}
            >
              <Text style={styles.stageMonths}>{stage.months}</Text>
              <Text style={styles.stageName}>{stage.title}</Text>
              <Text style={styles.stageSummary} numberOfLines={3}>
                {stage.summary}
              </Text>
            </View>
          ))}
        </ScrollView>

        {/* Priority Care & Notification Queue */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Upcoming Care & Push Alerts</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/calendar')}>
            <Text style={styles.sectionLink}>Manage Alerts →</Text>
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
          <Text style={styles.sectionTitle}>My Walnut Trees (YOLO Tracked)</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/analytics')}>
            <Text style={styles.sectionLink}>All Trees →</Text>
          </TouchableOpacity>
        </View>
        {INITIAL_TREES.map((tree) => (
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
