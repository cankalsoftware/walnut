/**
 * Complete Agronomic Data Model for WalnutIQ: Tree Care & AI Count
 * Includes:
 * - Annual Phenology & Care Calendar
 * - Active Care Cycles & Live Countdowns (Watering, Feeding, Pruning/Chill)
 * - Regular Daily & Weekly Guidance Popups
 * - Tuya Smart Orchard Sensor Plugin Nodes (Moisture, Temp, Sun/UV, Weather/Humidity)
 * - Orchard Tree Registry & Grower Community Chat
 */

export type CareCategory = 'pruning' | 'watering' | 'feeding' | 'harvest' | 'winter';

export interface CareTask {
  id: string;
  title: string;
  category: CareCategory;
  seasonLabel: string;
  monthRange: string;
  dueDateLabel: string;
  countdownLabel: string;
  cycleIntervalLabel: string;
  completed: boolean;
  pushNotificationEnabled: boolean;
  priority: 'high' | 'medium' | 'normal';
  description: string;
  dosageOrTip: string;
}

export interface CareCycleCountdown {
  id: string;
  category: CareCategory;
  title: string;
  cycleName: string;
  countdownText: string;
  progressPct: number;
  nextActionText: string;
}

export interface GuidancePopupData {
  id: 'daily' | 'weekly';
  badge: string;
  title: string;
  subtitle: string;
  cycleHighlight: string;
  actionItems: string[];
  sensorTip: string;
}

export interface TuyaSensorNode {
  id: string;
  metricKey: 'moisture' | 'temperature' | 'sunlight' | 'weather';
  label: string;
  valueDisplay: string;
  subValueDisplay: string;
  statusLabel: 'Optimal' | 'Watch' | 'Alert';
  iconName: string;
  deviceModel: string;
  enabledOnFrontDisplay: boolean;
}

export interface WalnutTree {
  id: string;
  name: string;
  variety: 'Chandler' | 'Hartley' | 'Franquette' | 'Howard' | 'Tulare' | 'English Seedling';
  plantedYear: number;
  canopyDensity: 'open' | 'standard' | 'dense';
  healthScore: number;
  lastCanopyCount: number;
  estimatedTotalNuts: number;
  estimatedWeightKg: number;
  avgNutDiameterMm: number;
  soilMoisturePct: number;
  lastScannedLabel: string;
}

export interface SharedTreeCardData {
  treeName: string;
  variety: string;
  treeAgeYears: number;
  scanMode: 'Canopy Yield Count' | 'Ground Harvest Finder' | 'Leaf & Husk Health';
  detectedInFrame: number;
  estimatedTotalNuts: number;
  estimatedYieldKg: number;
  avgNutSizeMm: number;
  careNote: string;
}

export interface ChatMessage {
  id: string;
  channelId: string;
  senderName: string;
  senderRole: string;
  senderRegion: string;
  timestamp: string;
  text: string;
  isOwn?: boolean;
  sharedCard?: SharedTreeCardData;
}

export interface CommunityChannel {
  id: string;
  name: string;
  topic: string;
  unreadCount: number;
}

export const TUYA_SENSOR_NODES: TuyaSensorNode[] = [
  {
    id: 'tuya-moisture-01',
    metricKey: 'moisture',
    label: 'Soil Moisture',
    valueDisplay: '68%',
    subValueDisplay: '30cm Root Zone',
    statusLabel: 'Optimal',
    iconName: 'water',
    deviceModel: 'Tuya Zigbee Soil Probe ZG-302',
    enabledOnFrontDisplay: true,
  },
  {
    id: 'tuya-temp-01',
    metricKey: 'temperature',
    label: 'Orchard Temp',
    valueDisplay: '14.2°C',
    subValueDisplay: 'Soil: 11.8°C • Chill Active',
    statusLabel: 'Optimal',
    iconName: 'thermometer',
    deviceModel: 'Tuya TH-Sensor Pro',
    enabledOnFrontDisplay: true,
  },
  {
    id: 'tuya-sun-01',
    metricKey: 'sunlight',
    label: 'Sunlight & UV',
    valueDisplay: '48.5 klux',
    subValueDisplay: 'UV Index 4 • Canopy Clear',
    statusLabel: 'Optimal',
    iconName: 'sunny',
    deviceModel: 'Tuya Solar Lux & UV Meter',
    enabledOnFrontDisplay: true,
  },
  {
    id: 'tuya-weather-01',
    metricKey: 'weather',
    label: 'Weather & RH',
    valueDisplay: '62% RH',
    subValueDisplay: 'No Frost 72h • 1016 hPa',
    statusLabel: 'Watch',
    iconName: 'partly-sunny',
    deviceModel: 'Tuya Smart Weather Station',
    enabledOnFrontDisplay: true,
  },
];

export const CARE_CYCLES_COUNTDOWNS: CareCycleCountdown[] = [
  {
    id: 'cycle-water',
    category: 'watering',
    title: 'Watering Cycle',
    cycleName: 'Deep Root Moisture Check',
    countdownText: 'In 2d 14h',
    progressPct: 72,
    nextActionText: 'Tuya probe at 68% — next deep soak in 2 days',
  },
  {
    id: 'cycle-feed',
    category: 'feeding',
    title: 'Feeding Cycle',
    cycleName: 'Autumn Root Potash & Mulch',
    countdownText: 'In 5 Days',
    progressPct: 55,
    nextActionText: 'Potassium sulfate + organic compost ring',
  },
  {
    id: 'cycle-winter',
    category: 'winter',
    title: 'Winter & Pruning',
    cycleName: 'Trunk Whitewash & Chill Hours',
    countdownText: 'In 3 Days',
    progressPct: 80,
    nextActionText: '184 / 800 Chill Hrs • Paint young trunks before frost',
  },
];

export const GUIDANCE_POPUPS: Record<'daily' | 'weekly', GuidancePopupData> = {
  daily: {
    id: 'daily',
    badge: 'DAILY ORCHARD BRIEFING POPUP',
    title: 'Today’s Walnut Care & Sensor Guidance',
    subtitle: 'Automated Morning Check-in • Light Walnut Green Field Mode',
    cycleHighlight: 'Watering Countdown: 2d 14h remaining • Winter Whitewash in 3 days',
    actionItems: [
      '💧 Watering: Soil moisture is 68% at 30cm depth (Tuya Probe #1). No irrigation needed today.',
      '❄️ Winter Prep: Clear remaining dark walnut hulls around Tree #01 & #02 to reduce overwintering husk fly pupae.',
      '📷 AI Tip: Use Ground Picker mode if any late windfall walnuts remain under fallen leaves.',
    ],
    sensorTip: 'Tuya Weather Station reports dry conditions (62% RH, 14.2°C) — ideal window for trunk whitewashing.',
  },
  weekly: {
    id: 'weekly',
    badge: 'WEEKLY CARE & COUNTDOWN DIGEST',
    title: '7-Day Walnut Care Cycle & Feed Plan',
    subtitle: 'Weekly Orchard Schedule & Countdown Summary',
    cycleHighlight: '3 Active Care Countdowns • 14-Day Cloud Sync Clean',
    actionItems: [
      '📅 Day 3 Countdown: Apply 50/50 white latex sunscald paint on southwest trunks of young trees.',
      '🧪 Day 5 Countdown: Apply post-harvest Potassium & compost mulch around drip line before winter rains.',
      '✂️ Pruning Lookahead: Do not prune during wet November days; wait for mid-winter dry dormancy window.',
    ],
    sensorTip: 'Cumulative Winter Chill Hours increased by +38 hrs this week (Total: 184 / 800 hrs for Chandler).',
  },
};

export const PHENOLOGY_STAGES = [
  {
    id: 'winter_dormancy',
    title: 'Winter Care & Dormancy',
    months: 'Dec – Feb',
    summary: 'Chill hour accumulation (700–1,000 hrs), structural dormant pruning, trunk sunscald whitewashing & delayed-dormant oil spray.',
    progressPct: 100,
    active: true,
  },
  {
    id: 'spring_budbreak',
    title: 'Budbreak, Pollination & Spring Feed',
    months: 'Mar – May',
    summary: 'Catkin elongation, pistillate bloom, Frost Watch alerts, Nitrogen + Zinc + Boron foliar feeding & Walnut Blight protection.',
    progressPct: 0,
    active: false,
  },
  {
    id: 'summer_sizing',
    title: 'Nut Sizing, Shell Hardening & Deep Watering',
    months: 'Jun – Aug',
    summary: 'Peak evapotranspiration water demand, kernel fill, Husk Fly trap checks, and mid-summer NPK split feeding.',
    progressPct: 0,
    active: false,
  },
  {
    id: 'autumn_harvest',
    title: 'Hull Split, Harvest & Ground Picking',
    months: 'Sep – Nov',
    summary: 'YOLO Canopy Yield final count, shaking at 80% hull split, YOLO Ground Harvest Finder picking & warm-air nut drying (<43°C).',
    progressPct: 0,
    active: false,
  },
] as const;

export const INITIAL_TREES: WalnutTree[] = [
  {
    id: 'tree-01',
    name: 'Tree #01 • North Grove',
    variety: 'Chandler',
    plantedYear: 2019,
    canopyDensity: 'standard',
    healthScore: 96,
    lastCanopyCount: 248,
    estimatedTotalNuts: 384,
    estimatedWeightKg: 4.8,
    avgNutDiameterMm: 36.4,
    soilMoisturePct: 68,
    lastScannedLabel: '2 days ago',
  },
  {
    id: 'tree-02',
    name: 'Tree #02 • Creek Side',
    variety: 'Hartley',
    plantedYear: 2017,
    canopyDensity: 'dense',
    healthScore: 92,
    lastCanopyCount: 312,
    estimatedTotalNuts: 560,
    estimatedWeightKg: 7.1,
    avgNutDiameterMm: 38.1,
    soilMoisturePct: 74,
    lastScannedLabel: '4 days ago',
  },
  {
    id: 'tree-03',
    name: 'Tree #03 • Sunny Slope',
    variety: 'Franquette',
    plantedYear: 2021,
    canopyDensity: 'open',
    healthScore: 98,
    lastCanopyCount: 140,
    estimatedTotalNuts: 189,
    estimatedWeightKg: 2.3,
    avgNutDiameterMm: 35.0,
    soilMoisturePct: 61,
    lastScannedLabel: 'Yesterday',
  },
];

export const INITIAL_CARE_TASKS: CareTask[] = [
  {
    id: 'task-winter-1',
    title: 'Post-Harvest Leaf Sanitation & Winter Trunk Whitewash',
    category: 'winter',
    seasonLabel: 'Winter Care',
    monthRange: 'Nov – Dec',
    dueDateLabel: 'Nov 15 • 08:00 AM',
    countdownLabel: 'Countdown: 3 Days',
    cycleIntervalLabel: 'Annual Winter Prep Cycle',
    completed: false,
    pushNotificationEnabled: true,
    priority: 'high',
    description: 'Clear fallen blighted hulls/leaves and paint southwest-facing trunks of young trees to prevent winter sunscald cracking.',
    dosageOrTip: '50% white interior water-based latex paint + 50% water on trunk up to first scaffold.',
  },
  {
    id: 'task-pruning-1',
    title: 'Dormant Structural & Canopy Light Pruning',
    category: 'pruning',
    seasonLabel: 'Winter Dormancy',
    monthRange: 'Jan – Feb',
    dueDateLabel: 'Jan 20 • 09:00 AM',
    countdownLabel: 'Countdown: 68 Days',
    cycleIntervalLabel: 'Annual Dormant Cycle',
    completed: false,
    pushNotificationEnabled: true,
    priority: 'high',
    description: 'Thin crowded interior branches to improve sunlight penetration to fruiting spurs. Prune only during dry, frost-free days.',
    dosageOrTip: 'Select 4–6 primary scaffolds spaced 20–30cm vertically; sterilize shears with 70% alcohol between trees.',
  },
  {
    id: 'task-feeding-1',
    title: 'Spring Budbreak Nitrogen + Zinc Foliar Boost',
    category: 'feeding',
    seasonLabel: 'Spring Awakening',
    monthRange: 'Mar – Apr',
    dueDateLabel: 'Mar 28 • 07:30 AM',
    countdownLabel: 'Feed Cycle #1 (Spring)',
    cycleIntervalLabel: 'Split Feed Cycle (1 of 4)',
    completed: false,
    pushNotificationEnabled: true,
    priority: 'high',
    description: 'Apply first split of Nitrogen (40% of annual N) plus chelated Zinc spray as shoots reach 5–10 cm to prevent walnut rosette.',
    dosageOrTip: 'Soil: Ammonium sulfate or composted manure + Foliar: Zinc sulfate / chelated Zn + Boron at bloom.',
  },
  {
    id: 'task-watering-1',
    title: 'Deep Root Irrigation — Rapid Nut Sizing Window',
    category: 'watering',
    seasonLabel: 'Summer Growth',
    monthRange: 'Jun – Aug',
    dueDateLabel: 'Every 7–10 Days • 06:30 AM',
    countdownLabel: 'Next Cycle: 2d 14h',
    cycleIntervalLabel: '7-Day Deep Soak Cycle',
    completed: false,
    pushNotificationEnabled: true,
    priority: 'high',
    description: 'Walnuts achieve full shell size by early July. Maintain deep moisture at 30–90 cm root zone to maximize nut diameter.',
    dosageOrTip: 'Deep soak every 7–10 days (keep water 30cm away from root crown to prevent Phytophthora crown rot).',
  },
  {
    id: 'task-feeding-2',
    title: 'Mid-Summer Kernel Fill NPK Feeding (Cutoff Jul 1)',
    category: 'feeding',
    seasonLabel: 'Summer Growth',
    monthRange: 'Jun',
    dueDateLabel: 'Jun 22 • 08:00 AM',
    countdownLabel: 'Feed Cycle #3 (Summer)',
    cycleIntervalLabel: 'Split Feed Cycle (3 of 4)',
    completed: false,
    pushNotificationEnabled: true,
    priority: 'medium',
    description: 'Final nitrogen & potassium feeding to support kernel weight fill. Do not apply nitrogen after early July so wood hardens before winter.',
    dosageOrTip: 'Remaining 60% annual Nitrogen + Potassium sulfate watered deeply into drip line.',
  },
  {
    id: 'task-harvest-1',
    title: 'Hull Split Check & YOLO Ground Harvest Picking',
    category: 'harvest',
    seasonLabel: 'Autumn Harvest',
    monthRange: 'Sep – Oct',
    dueDateLabel: 'Oct 05 • 08:30 AM',
    countdownLabel: 'Completed for Season',
    cycleIntervalLabel: 'Harvest & Curing Cycle',
    completed: true,
    pushNotificationEnabled: true,
    priority: 'high',
    description: 'Begin harvest when 80% of green hulls split. Shake branches and use the YOLO Ground Finder mode to pick fallen walnuts promptly.',
    dosageOrTip: 'Hull and wash within 24 hours of picking; dry in shade/dehydrator below 43°C (110°F) to 8% moisture.',
  },
];

export const COMMUNITY_CHANNELS: CommunityChannel[] = [
  { id: 'general-growers', name: '#general-growers', topic: 'Orchard introductions, regional weather & daily walnut talk', unreadCount: 3 },
  { id: 'yolo-yield-estimates', name: '#yolo-yield-estimates', topic: 'Share YOLO canopy counts, ground picks & harvest weight checks', unreadCount: 5 },
  { id: 'pruning-and-training', name: '#pruning-and-training', topic: 'Central leader shaping, dormant cuts & canopy light management', unreadCount: 0 },
  { id: 'watering-and-feeding', name: '#watering-and-feeding', topic: 'NPK schedules, Zinc/Boron sprays & soil moisture logs', unreadCount: 2 },
  { id: 'pest-and-blight-sos', name: '#pest-and-blight-sos', topic: 'Walnut blight, husk fly traps & frost damage diagnosis', unreadCount: 1 },
];

export const INITIAL_CHAT_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-1',
    channelId: 'yolo-yield-estimates',
    senderName: 'Emre K.',
    senderRole: 'Chandler Grower • 45 Trees',
    senderRegion: 'Bursa / Zone 8b',
    timestamp: '10:14 AM',
    text: 'Just finished scanning Row 2 with the 4-quadrant Canopy Counter before our final shake! The occlusion estimate was within 4% of our dried crate weight.',
    sharedCard: {
      treeName: 'Tree #01 • North Grove',
      variety: 'Chandler',
      treeAgeYears: 7,
      scanMode: 'Canopy Yield Count',
      detectedInFrame: 248,
      estimatedTotalNuts: 384,
      estimatedYieldKg: 4.8,
      avgNutSizeMm: 36.4,
      careNote: 'Spring Zn+B spray + 10-day summer deep drip schedule',
    },
  },
  {
    id: 'msg-2',
    channelId: 'yolo-yield-estimates',
    senderName: 'Elena V.',
    senderRole: 'Homestead Orchardist',
    senderRegion: 'Sacramento Valley / Zone 9',
    timestamp: '10:22 AM',
    text: 'That 36.4mm average nut size is awesome! The Ground Finder mode saved us at least an hour yesterday spotting dark-hulled walnuts hidden under wet oak and walnut leaves.',
  },
  {
    id: 'msg-3',
    channelId: 'general-growers',
    senderName: 'Marcus D.',
    senderRole: 'Franquette & Hartley Grower',
    senderRegion: 'Oregon / Zone 8a',
    timestamp: 'Yesterday',
    text: 'Starting our post-harvest cleanup and trunk whitewashing this weekend before the first November hard frost arrives. Make sure your winter chill-hour counter is enabled!',
  },
];

export const GROWTH_CURVE_SERIES = [
  { month: 'May', expectedMm: 14, actualMm: 15, stage: 'Pea Size Set' },
  { month: 'Jun', expectedMm: 28, actualMm: 29.5, stage: 'Rapid Sizing' },
  { month: 'Jul', expectedMm: 35, actualMm: 36.0, stage: 'Shell Hardening' },
  { month: 'Aug', expectedMm: 36, actualMm: 36.4, stage: 'Kernel Fill' },
  { month: 'Sep', expectedMm: 36.5, actualMm: 36.8, stage: 'Hull Split' },
  { month: 'Oct', expectedMm: 36.5, actualMm: 36.8, stage: 'Harvest Ready' },
];
