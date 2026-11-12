import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../src/theme/colors';
import {
  CARE_CYCLES_COUNTDOWNS,
  CareCategory,
  CareTask,
  INITIAL_CARE_TASKS,
} from '../../src/data/walnutLifecycle';

const FILTERS: { key: 'all' | CareCategory; label: string; icon: string }[] = [
  { key: 'all', label: 'All Year', icon: 'calendar-outline' },
  { key: 'pruning', label: 'Pruning', icon: 'cut-outline' },
  { key: 'watering', label: 'Watering', icon: 'water-outline' },
  { key: 'feeding', label: 'Feeding', icon: 'flask-outline' },
  { key: 'harvest', label: 'Harvest', icon: 'basket-outline' },
  { key: 'winter', label: 'Winter Care', icon: 'snow-outline' },
];

export default function CareCalendarScreen() {
  const [selectedFilter, setSelectedFilter] = useState<'all' | CareCategory>('all');
  const [tasks, setTasks] = useState<CareTask[]>(INITIAL_CARE_TASKS);
  const [masterPushEnabled, setMasterPushEnabled] = useState(true);
  const [dailyWeeklyPopupsEnabled, setDailyWeeklyPopupsEnabled] = useState(true);

  const visibleTasks =
    selectedFilter === 'all'
      ? tasks
      : tasks.filter((t) => t.category === selectedFilter);

  const toggleCompleted = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const togglePushAlert = (id: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, pushNotificationEnabled: !t.pushNotificationEnabled }
          : t
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
        <Text style={styles.title}>Walnut Care Calendar & Cycles</Text>
        <Text style={styles.subtitle}>
          Pruning, watering, feeding, harvest & winter countdowns with daily/weekly popups
        </Text>

        {/* Push Notifications & Daily/Weekly Guidance Toggle Card */}
        <View style={styles.pushBanner}>
          <View style={styles.pushRow}>
            <View style={styles.pushBannerLeft}>
              <View style={styles.bellCircle}>
                <Ionicons
                  name="notifications"
                  size={20}
                  color={Colors.walnutGreen[800]}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.pushTitle}>
                  Seasonal Push Notifications
                </Text>
                <Text style={styles.pushDesc}>
                  Alerts for feeding windows, frost watch & watering countdowns
                </Text>
              </View>
            </View>
            <Switch
              value={masterPushEnabled}
              onValueChange={setMasterPushEnabled}
              trackColor={{
                false: '#CBD5C0',
                true: Colors.walnutGreen[500],
              }}
            />
          </View>

          <View style={styles.bannerDivider} />

          <View style={styles.pushRow}>
            <View style={styles.pushBannerLeft}>
              <View style={styles.bellCircle}>
                <Ionicons
                  name="timer"
                  size={20}
                  color={Colors.walnutShell[700]}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.pushTitle}>
                  Daily & Weekly Guidance Popups
                </Text>
                <Text style={styles.pushDesc}>
                  Morning daily check-in & Sunday weekly care cycle countdown summary
                </Text>
              </View>
            </View>
            <Switch
              value={dailyWeeklyPopupsEnabled}
              onValueChange={setDailyWeeklyPopupsEnabled}
              trackColor={{
                false: '#CBD5C0',
                true: Colors.walnutGreen[500],
              }}
            />
          </View>
        </View>

        {/* Active Cycle Countdowns Summary */}
        <View style={styles.cycleStrip}>
          {CARE_CYCLES_COUNTDOWNS.map((c) => (
            <View key={c.id} style={styles.cycleMiniCard}>
              <Text style={styles.cycleMiniTitle}>{c.title}</Text>
              <Text style={styles.cycleMiniCountdown}>{c.countdownText}</Text>
              <Text style={styles.cycleMiniSub} numberOfLines={1}>
                {c.cycleName}
              </Text>
            </View>
          ))}
        </View>

        {/* Category Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTERS.map((f) => {
            const active = selectedFilter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterPill, active && styles.filterPillActive]}
                onPress={() => setSelectedFilter(f.key)}
              >
                <Ionicons
                  name={f.icon as any}
                  size={15}
                  color={active ? Colors.walnutGreen[900] : Colors.text.secondary}
                />
                <Text
                  style={[
                    styles.filterPillText,
                    active && styles.filterPillTextActive,
                  ]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Task Cards */}
        {visibleTasks.map((task) => (
          <View key={task.id} style={styles.card}>
            <View style={styles.cardTopRow}>
              <View style={styles.seasonTag}>
                <Text style={styles.seasonTagText}>
                  {task.category.toUpperCase()} • {task.cycleIntervalLabel}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.notifyChip}
                onPress={() => togglePushAlert(task.id)}
              >
                <Ionicons
                  name={
                    task.pushNotificationEnabled && masterPushEnabled
                      ? 'notifications'
                      : 'notifications-off-outline'
                  }
                  size={15}
                  color={
                    task.pushNotificationEnabled && masterPushEnabled
                      ? Colors.walnutGreen[700]
                      : Colors.text.muted
                  }
                />
                <Text style={styles.notifyChipText}>
                  {task.countdownLabel}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.titleCheckRow}
              onPress={() => toggleCompleted(task.id)}
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
              <Text
                style={[
                  styles.cardTitle,
                  task.completed && styles.cardTitleDone,
                ]}
              >
                {task.title}
              </Text>
            </TouchableOpacity>

            <Text style={styles.cardDescription}>{task.description}</Text>

            <View style={styles.tipBox}>
              <Ionicons
                name="bulb-outline"
                size={16}
                color={Colors.walnutShell[500]}
              />
              <Text style={styles.tipText}>{task.dosageOrTip}</Text>
            </View>
          </View>
        ))}
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
    fontSize: 24,
    fontWeight: '800',
    color: Colors.walnutGreen[900],
  },
  subtitle: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 3,
    marginBottom: 14,
  },
  pushBanner: {
    backgroundColor: Colors.walnutGreen[200],
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.walnutGreen[300],
    marginBottom: 14,
  },
  pushRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bannerDivider: {
    height: 1,
    backgroundColor: Colors.walnutGreen[300],
    marginVertical: 10,
  },
  pushBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
    paddingRight: 8,
  },
  bellCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pushTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.walnutGreen[900],
  },
  pushDesc: {
    fontSize: 11,
    color: Colors.walnutGreen[800],
    marginTop: 1,
  },
  cycleStrip: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  cycleMiniCard: {
    flex: 1,
    backgroundColor: Colors.surface.card,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.walnutGreen[200],
  },
  cycleMiniTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.walnutGreen[700],
  },
  cycleMiniCountdown: {
    fontSize: 14,
    fontWeight: '900',
    color: Colors.walnutShell[700],
    marginVertical: 2,
  },
  cycleMiniSub: {
    fontSize: 10,
    color: Colors.text.secondary,
  },
  filterRow: {
    gap: 8,
    paddingBottom: 14,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface.card,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.surface.border,
    gap: 6,
  },
  filterPillActive: {
    backgroundColor: Colors.walnutGreen[200],
    borderColor: Colors.walnutGreen[500],
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  filterPillTextActive: {
    color: Colors.walnutGreen[900],
    fontWeight: '800',
  },
  card: {
    backgroundColor: Colors.surface.card,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.surface.border,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  seasonTag: {
    backgroundColor: Colors.walnutGreen[100],
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  seasonTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.walnutGreen[800],
  },
  notifyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.walnutShell[50],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  notifyChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.walnutShell[700],
  },
  titleCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  cardTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: Colors.walnutGreen[900],
  },
  cardTitleDone: {
    textDecorationLine: 'line-through',
    color: Colors.text.muted,
  },
  cardDescription: {
    fontSize: 13,
    color: Colors.text.secondary,
    lineHeight: 18,
    marginBottom: 10,
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.walnutShell[50],
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.walnutShell[200],
    gap: 8,
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    color: Colors.walnutShell[700],
    fontWeight: '600',
    lineHeight: 16,
  },
});
