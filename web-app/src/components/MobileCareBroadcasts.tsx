import React, { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { anyApi } from 'convex/server';
import { WebHelpButton } from './HelpModal';

interface CareCardItem {
  _id?: string;
  slug: string;
  title: string;
  season: 'spring' | 'summer' | 'fall' | 'winter' | 'all';
  category: string;
  targetLevel: 'all' | 'beginner' | 'experienced' | 'expert';
  summary: string;
  actionChecklist: string[];
  defaultNotificationTitle: string;
  defaultNotificationBody: string;
}

const DEFAULT_EXPERT_CARDS: CareCardItem[] = [
  {
    slug: 'spring-blight-copper-window',
    title: 'Spring Blight & Copper Spray Window',
    season: 'spring',
    category: 'blight_pest',
    targetLevel: 'all',
    summary:
      'Protect emerging catkins and young nutlets from Xanthomonas walnut blight during spring rains (54°F–63°F).',
    actionChecklist: [
      'Apply protective copper spray at 10%–20% bud break.',
      'Re-apply every 7–10 days if spring rain persists.',
      'Hang codling moth pheromone traps in SE canopy quadrant at biofix.',
    ],
    defaultNotificationTitle: 'Blight Alert: Spring Copper Spray Window Open',
    defaultNotificationBody:
      'Bud break + spring moisture favor walnut blight. Apply protective copper coverage and check codling moth traps.',
  },
  {
    slug: 'spring-summer-nitrogen-feeding',
    title: 'Fertilizing Season: Split Nitrogen & Leaf Sampling',
    season: 'spring',
    category: 'fertilizing',
    targetLevel: 'all',
    summary:
      'Support rapid leaf-out and nut sizing with split nitrogen applications, guided by mid-summer leaf tissue targets (2.2%–2.5% N).',
    actionChecklist: [
      'Split nitrogen doses across spring through early summer to prevent leaching.',
      'Check zinc and boron levels if shoot growth or leaf size looks weak.',
      'Stop nitrogen applications before late summer/early fall.',
    ],
    defaultNotificationTitle: 'Fertilizing Season Reminder: Split Nitrogen Window',
    defaultNotificationBody:
      'Time for scheduled spring/early-summer nitrogen feeding. Split applications to maximize uptake and avoid root leaching.',
  },
  {
    slug: 'summer-swp-irrigation',
    title: 'Summer Heat & Stem Water Potential Irrigation',
    season: 'summer',
    category: 'irrigation',
    targetLevel: 'experienced',
    summary:
      'Balance peak summer ET demand (June–August) using midday stem water potential (2–3 bars below baseline) and weed-free strips.',
    actionChecklist: [
      'Avoid over-watering in heavy spring soils so roots stay oxygenated.',
      'Track soil moisture or pressure-chamber SWP during peak summer heat.',
      'Keep under-canopy strips weed-free to prevent water/nutrient competition.',
    ],
    defaultNotificationTitle: 'Summer Irrigation Check: Heat & Soil Moisture',
    defaultNotificationBody:
      'Peak ET demand is here. Verify root-zone moisture (target ~65%) and avoid water stress during nut sizing.',
  },
  {
    slug: 'fall-hull-split-harvest-drying',
    title: 'Hull Split, Harvest Timing & Rapid 8–10% Drying',
    season: 'fall',
    category: 'harvest',
    targetLevel: 'all',
    summary:
      'Protect kernel pellicle color and prevent mold by monitoring Packing Tissue Brown (PTB), shaking at hull split, and drying promptly.',
    actionChecklist: [
      'Inspect Packing Tissue Brown (PTB) maturity before shaking.',
      'Avoid cutting off irrigation too early (shriveled kernels) or over-watering late.',
      'Pick up, hull, and dry nuts down to 8%–10% internal moisture immediately.',
    ],
    defaultNotificationTitle: 'Harvest Readiness: Hull Split & Rapid Drying',
    defaultNotificationBody:
      'Check Packing Tissue Brown and hull split %. Shake, pick up, and dry to 8%–10% moisture quickly to protect kernel color.',
  },
  {
    slug: 'post-harvest-dry-pruning-sanitation',
    title: 'Post-Harvest Sanitation & Dry-Weather Pruning',
    season: 'winter',
    category: 'pruning',
    targetLevel: 'beginner',
    summary:
      'Remove deadwood and Botryosphaeria-blighted branches while leaves help identify dead limbs, and prune during dry weather forecasts.',
    actionChecklist: [
      'Cut out blighted/dead branches while remaining leaves show contrast.',
      'Thin overcrowded interior branches so sunlight reaches fruiting spurs.',
      'Prune only during dry weather so spores do not enter fresh cuts.',
    ],
    defaultNotificationTitle: 'Pruning & Sanitation: Pick a Dry Weather Window',
    defaultNotificationBody:
      'Remove dead or blighted wood during dry weather to protect pruning wounds and open the canopy for next season.',
  },
  {
    slug: 'winter-dormant-oil-freeze-prep',
    title: 'Winter Hardening Off, Chill Hours & Dormant Oil',
    season: 'winter',
    category: 'maintenance',
    targetLevel: 'expert',
    summary:
      'Ensure adequate baseline soil moisture before hard freezes, track winter chill accumulation, and time dormant oils safely.',
    actionChecklist: [
      'Let young trees harden off before frost, then maintain baseline winter soil moisture.',
      'Track winter chill hours toward your orchard target (e.g. 800 hrs).',
      'Apply dormant oil at bud-swell only when soils are not overly dry.',
    ],
    defaultNotificationTitle: 'Winter Care: Freeze Moisture & Dormant Prep',
    defaultNotificationBody:
      'Ensure baseline soil moisture before hard freezes and review winter chill hour progress in WalnutIQ Analytics.',
  },
];

const TOPIC_CATEGORIES = [
  { id: 'weather', label: 'Upcoming Weather News' },
  { id: 'fertilizing', label: 'Fertilizing Season' },
  { id: 'blight_pest', label: 'Blight & Pest Alert' },
  { id: 'seminars_expo', label: 'Seminars & Expo Shares' },
  { id: 'maintenance', label: 'Pruning & Maintenance' },
  { id: 'news', label: 'Community Info & News' },
];

export function CareDefaultsPublishButton({
  hasConvex,
  careDefaults,
  onSaveLocal,
  onNotice,
  style,
}: {
  hasConvex: boolean;
  careDefaults: {
    irrigationIntervalDays: number;
    targetSoilMoisturePct: number;
    chillHoursTarget: number;
    nitrogenCutoffDate: string;
    harvestHullSplitPct: number;
    dailyGuidanceNote: string;
  };
  onSaveLocal: () => void;
  onNotice: (msg: string) => void;
  style: React.CSSProperties;
}) {
  if (hasConvex) {
    return (
      <LiveCareDefaultsPublishButton
        careDefaults={careDefaults}
        onSaveLocal={onSaveLocal}
        onNotice={onNotice}
        style={style}
      />
    );
  }
  return (
    <button
      style={style}
      onClick={() => {
        onSaveLocal();
        onNotice(
          'Saved Care Defaults locally (connect Convex to push banner & notifications live to mobile).'
        );
      }}
    >
      Save & Publish Care Defaults to Mobile App
    </button>
  );
}

function LiveCareDefaultsPublishButton({
  careDefaults,
  onSaveLocal,
  onNotice,
  style,
}: {
  careDefaults: {
    irrigationIntervalDays: number;
    targetSoilMoisturePct: number;
    chillHoursTarget: number;
    nitrogenCutoffDate: string;
    harvestHullSplitPct: number;
    dailyGuidanceNote: string;
  };
  onSaveLocal: () => void;
  onNotice: (msg: string) => void;
  style: React.CSSProperties;
}) {
  const publishMutation = useMutation(anyApi.careBroadcasts.publishCareDefaults);

  return (
    <button
      style={style}
      onClick={async () => {
        onSaveLocal();
        try {
          const res = await publishMutation({
            irrigationIntervalDays: careDefaults.irrigationIntervalDays,
            targetSoilMoisturePct: careDefaults.targetSoilMoisturePct,
            chillHoursTarget: careDefaults.chillHoursTarget,
            nitrogenCutoffMonthDay: careDefaults.nitrogenCutoffDate,
            harvestHullSplitPct: careDefaults.harvestHullSplitPct,
            dailyGuidanceNote: careDefaults.dailyGuidanceNote,
          });
          onNotice(
            res.pushedBannerNotification
              ? 'Published Care Defaults + Daily Guidance Banner & Mobile Notification to Convex.'
              : 'Published Care Defaults to Convex for all mobile growers.'
          );
        } catch (err) {
          onNotice(
            `Saved locally, but Convex publish failed: ${err instanceof Error ? err.message : 'error'}`
          );
        }
      }}
    >
      Save & Publish Care Defaults to Mobile App
    </button>
  );
}

export function MobileCareBroadcasts({
  hasConvex,
  onNotice,
  styles,
}: {
  hasConvex: boolean;
  onNotice: (msg: string) => void;
  styles: Record<string, React.CSSProperties>;
}) {
  if (hasConvex) {
    return (
      <LiveConvexMobileCareBroadcasts onNotice={onNotice} styles={styles} />
    );
  }
  return (
    <LocalFallbackMobileCareBroadcasts onNotice={onNotice} styles={styles} />
  );
}

function LiveConvexMobileCareBroadcasts({
  onNotice,
  styles,
}: {
  onNotice: (msg: string) => void;
  styles: Record<string, React.CSSProperties>;
}) {
  const convexCards = useQuery(anyApi.careBroadcasts.listCareCards) as
    | CareCardItem[]
    | undefined;
  const growers = useQuery(anyApi.users.listGrowersForAdmin) as
    | {
        clerkId: string;
        displayName: string;
        email: string;
        experienceLevel: string;
      }[]
    | undefined;
  const notifications = useQuery(
    anyApi.careBroadcasts.listNotificationsForAdmin
  ) as any[] | undefined;

  const seedMutation = useMutation(anyApi.careBroadcasts.seedExpertCareCards);
  const upsertCardMutation = useMutation(anyApi.careBroadcasts.upsertCareCard);
  const deleteCardMutation = useMutation(anyApi.careBroadcasts.deleteCareCard);
  const sendOrScheduleMutation = useMutation(
    anyApi.careBroadcasts.sendOrScheduleNotification
  );
  const cancelMutation = useMutation(
    anyApi.careBroadcasts.cancelScheduledNotification
  );

  const cards =
    convexCards && convexCards.length > 0 ? convexCards : DEFAULT_EXPERT_CARDS;
  const isSeeded = Boolean(convexCards && convexCards.length > 0);

  return (
    <MobileCareBroadcastsUI
      cards={cards}
      isSeeded={isSeeded}
      growers={growers ?? []}
      notifications={notifications ?? []}
      onSeedPresets={async () => {
        const res = await seedMutation({});
        onNotice(
          `Seeded ${res.inserted} expert walnut care card(s) into Convex.`
        );
      }}
      onSaveCard={async (card) => {
        await upsertCardMutation(card);
        onNotice(`Saved care card "${card.title}" to Convex.`);
      }}
      onDeleteCard={async (id) => {
        if (!id) return;
        await deleteCardMutation({ id: id as any });
        onNotice('Removed care card from Convex.');
      }}
      onSendOrSchedule={async (payload) => {
        const res = await sendOrScheduleMutation(payload);
        onNotice(
          res.status === 'scheduled'
            ? `Scheduled notification "${payload.title}".`
            : `Pushed notification "${payload.title}" to growers.`
        );
      }}
      onCancelNotification={async (id) => {
        await cancelMutation({ id: id as any });
        onNotice('Cancelled scheduled notification.');
      }}
      styles={styles}
    />
  );
}

function LocalFallbackMobileCareBroadcasts({
  onNotice,
  styles,
}: {
  onNotice: (msg: string) => void;
  styles: Record<string, React.CSSProperties>;
}) {
  const [cards, setCards] = useState<CareCardItem[]>(DEFAULT_EXPERT_CARDS);
  const [notifications, setNotifications] = useState<any[]>([]);

  return (
    <MobileCareBroadcastsUI
      cards={cards}
      isSeeded={true}
      growers={[]}
      notifications={notifications}
      onSeedPresets={async () => {
        setCards(DEFAULT_EXPERT_CARDS);
        onNotice('Loaded expert walnut care presets locally.');
      }}
      onSaveCard={async (card) => {
        setCards((prev) => [{ ...card, _id: `local-${Date.now()}` }, ...prev]);
        onNotice(`Added local care card "${card.title}".`);
      }}
      onDeleteCard={async (id) => {
        setCards((prev) => prev.filter((c) => c._id !== id));
        onNotice('Removed local care card.');
      }}
      onSendOrSchedule={async (payload) => {
        const now = Date.now();
        const isScheduled =
          typeof payload.scheduledForMs === 'number' &&
          payload.scheduledForMs > now;
        setNotifications((prev) => [
          {
            _id: `notif-${now}`,
            ...payload,
            status: isScheduled ? 'scheduled' : 'sent',
            createdAtMs: now,
          },
          ...prev,
        ]);
        onNotice(
          isScheduled
            ? `Scheduled "${payload.title}" (connect Convex to push live).`
            : `Queued "${payload.title}" locally (connect Convex to push live).`
        );
      }}
      onCancelNotification={async (id) => {
        setNotifications((prev) =>
          prev.map((n) => (n._id === id ? { ...n, status: 'cancelled' } : n))
        );
      }}
      styles={styles}
    />
  );
}

function MobileCareBroadcastsUI({
  cards,
  isSeeded,
  growers,
  notifications,
  onSeedPresets,
  onSaveCard,
  onDeleteCard,
  onSendOrSchedule,
  onCancelNotification,
  styles,
}: {
  cards: CareCardItem[];
  isSeeded: boolean;
  growers: {
    clerkId: string;
    displayName: string;
    email: string;
    experienceLevel: string;
  }[];
  notifications: any[];
  onSeedPresets: () => Promise<void>;
  onSaveCard: (card: Omit<CareCardItem, '_id'>) => Promise<void>;
  onDeleteCard: (id?: string) => Promise<void>;
  onSendOrSchedule: (payload: {
    title: string;
    body: string;
    category: string;
    targetAudience: 'all' | 'level' | 'selected_users';
    targetLevel?: 'beginner' | 'experienced' | 'expert';
    targetUserIds?: string[];
    scheduledForMs?: number;
  }) => Promise<void>;
  onCancelNotification: (id: string) => Promise<void>;
  styles: Record<string, React.CSSProperties>;
}) {
  const [showAddCard, setShowAddCard] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSeason, setNewSeason] = useState<CareCardItem['season']>('spring');
  const [newCategory, setNewCategory] = useState('maintenance');
  const [newTargetLevel, setNewTargetLevel] =
    useState<CareCardItem['targetLevel']>('all');
  const [newSummary, setNewSummary] = useState('');
  const [newChecklistText, setNewChecklistText] = useState('');

  // Notification Composer State
  const [notifTitle, setNotifTitle] = useState('');
  const [notifBody, setNotifBody] = useState('');
  const [notifCategory, setNotifCategory] = useState('weather');
  const [targetAudience, setTargetAudience] = useState<
    'all' | 'level' | 'selected_users'
  >('all');
  const [targetLevel, setTargetLevel] = useState<
    'beginner' | 'experienced' | 'expert'
  >('beginner');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [deliveryMode, setDeliveryMode] = useState<'now' | 'schedule'>('now');
  const [scheduledDateTime, setScheduledDateTime] = useState('');

  const handleAddCard = async () => {
    if (!newTitle.trim() || !newSummary.trim()) return;
    const checklist = newChecklistText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const slug = newTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    await onSaveCard({
      slug: `${slug}-${Date.now()}`,
      title: newTitle.trim(),
      season: newSeason,
      category: newCategory,
      targetLevel: newTargetLevel,
      summary: newSummary.trim(),
      actionChecklist:
        checklist.length > 0 ? checklist : [newSummary.trim()],
      defaultNotificationTitle: newTitle.trim(),
      defaultNotificationBody: newSummary.trim(),
    });
    setNewTitle('');
    setNewSummary('');
    setNewChecklistText('');
    setShowAddCard(false);
  };

  const handleSendNotification = async () => {
    if (!notifTitle.trim() || !notifBody.trim()) return;
    const scheduledForMs =
      deliveryMode === 'schedule' && scheduledDateTime
        ? new Date(scheduledDateTime).getTime()
        : undefined;
    await onSendOrSchedule({
      title: notifTitle.trim(),
      body: notifBody.trim(),
      category: notifCategory,
      targetAudience,
      targetLevel: targetAudience === 'level' ? targetLevel : undefined,
      targetUserIds:
        targetAudience === 'selected_users' ? selectedUserIds : undefined,
      scheduledForMs,
    });
    setNotifTitle('');
    setNotifBody('');
  };

  return (
    <>
      {/* Expert Walnut Care & Maintenance Cards */}
      <section style={styles.card}>
        <div style={styles.rowBetween}>
          <h2 style={styles.cardTitle}>
            Expert Walnut Care & Maintenance Cards
            <WebHelpButton
              help={{
                title: 'Expert Walnut Care & Maintenance Cards',
                whatItDoes:
                  'Provides seasonal best-practice walnut care cards (spring blight, fertilizing, irrigation, hull split, dry pruning, winter chill) with one-click push to growers.',
                howToDoIt: [
                  'Click "Push Now to All" on any card to broadcast its alert immediately.',
                  'Click "Load in Composer" to customize the message, target Beginner/Experienced/Expert users, or schedule it.',
                  'Click "+ Add New Care Card" to expand your library as the community grows.',
                ],
                whatToExpect:
                  'Cards stored in Convex sync across admin sessions and power grower notifications.',
              }}
            />
          </h2>
          <div style={styles.row}>
            {!isSeeded && (
              <button
                style={styles.secondaryBtn}
                onClick={() => void onSeedPresets()}
              >
                Seed Presets to Convex
              </button>
            )}
            <button
              style={styles.primaryBtn}
              onClick={() => setShowAddCard((p) => !p)}
            >
              {showAddCard ? 'Close Form' : '+ Add New Care Card'}
            </button>
          </div>
        </div>
        <p style={styles.cardDesc}>
          Agronomic walnut care cards tailored for Beginner, Experienced, and Expert
          growers. Push any card in one click or add new community cards below.
        </p>

        {showAddCard && (
          <div
            style={{
              padding: 14,
              borderRadius: 10,
              backgroundColor: '#F4F8F1',
              border: '1px solid #CFE3C4',
              marginBottom: 14,
            }}
          >
            <div style={styles.grid2}>
              <div>
                <label style={styles.label}>Card Title</label>
                <input
                  style={styles.input}
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Walnut Husk Fly Monitoring Window"
                />
              </div>
              <div style={styles.row}>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Season</label>
                  <select
                    style={{ ...styles.select, width: '100%' }}
                    value={newSeason}
                    onChange={(e) =>
                      setNewSeason(e.target.value as CareCardItem['season'])
                    }
                  >
                    <option value="spring">Spring</option>
                    <option value="summer">Summer</option>
                    <option value="fall">Fall</option>
                    <option value="winter">Winter</option>
                    <option value="all">All Year</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Target Level</label>
                  <select
                    style={{ ...styles.select, width: '100%' }}
                    value={newTargetLevel}
                    onChange={(e) =>
                      setNewTargetLevel(
                        e.target.value as CareCardItem['targetLevel']
                      )
                    }
                  >
                    <option value="all">All Levels</option>
                    <option value="beginner">Beginner</option>
                    <option value="experienced">Experienced</option>
                    <option value="expert">Expert</option>
                  </select>
                </div>
              </div>
            </div>
            <label style={styles.label}>Category</label>
            <select
              style={{ ...styles.select, marginBottom: 10 }}
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
            >
              {TOPIC_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
            <label style={styles.label}>Expert Summary & Recommendation</label>
            <textarea
              style={{ ...styles.input, minHeight: 56 }}
              value={newSummary}
              onChange={(e) => setNewSummary(e.target.value)}
              placeholder="Concise actionable advice for orchard growers..."
            />
            <label style={styles.label}>
              Action Checklist (one step per line)
            </label>
            <textarea
              style={{ ...styles.input, minHeight: 68 }}
              value={newChecklistText}
              onChange={(e) => setNewChecklistText(e.target.value)}
              placeholder={'Step 1...\nStep 2...'}
            />
            <button style={styles.primaryBtn} onClick={() => void handleAddCard()}>
              Save Care Card
            </button>
          </div>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
            gap: 12,
          }}
        >
          {cards.map((card) => (
            <div
              key={card._id ?? card.slug}
              style={{
                border: '1px solid #CFE3C4',
                borderRadius: 10,
                padding: 14,
                backgroundColor: '#FAFDF8',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 8,
              }}
            >
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 6,
                    marginBottom: 6,
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 999,
                      backgroundColor: '#E1F0D8',
                      color: '#1E4620',
                      textTransform: 'uppercase',
                    }}
                  >
                    {card.season} • {card.targetLevel}
                  </span>
                  <span style={{ fontSize: 11, color: '#556B4E' }}>
                    {card.category}
                  </span>
                </div>
                <strong style={{ fontSize: 14, color: '#294A1F' }}>
                  {card.title}
                </strong>
                <p
                  style={{
                    fontSize: 12,
                    color: '#3F5A34',
                    margin: '6px 0 8px',
                    lineHeight: 1.45,
                  }}
                >
                  {card.summary}
                </p>
                <ul
                  style={{
                    margin: 0,
                    paddingLeft: 18,
                    fontSize: 11.5,
                    color: '#2F4625',
                  }}
                >
                  {card.actionChecklist.map((step, i) => (
                    <li key={i} style={{ marginBottom: 3 }}>
                      {step}
                    </li>
                  ))}
                </ul>
              </div>
              <div style={{ ...styles.row, marginTop: 6 }}>
                <button
                  style={{ ...styles.primaryBtn, fontSize: 11, padding: '6px 10px' }}
                  onClick={() =>
                    void onSendOrSchedule({
                      title: card.defaultNotificationTitle,
                      body: card.defaultNotificationBody,
                      category: card.category,
                      targetAudience:
                        card.targetLevel === 'all' ? 'all' : 'level',
                      targetLevel:
                        card.targetLevel === 'all'
                          ? undefined
                          : card.targetLevel,
                    })
                  }
                >
                  Push Now ({card.targetLevel})
                </button>
                <button
                  style={{
                    ...styles.secondaryBtn,
                    fontSize: 11,
                    padding: '6px 10px',
                  }}
                  onClick={() => {
                    setNotifTitle(card.defaultNotificationTitle);
                    setNotifBody(card.defaultNotificationBody);
                    setNotifCategory(
                      TOPIC_CATEGORIES.some((t) => t.id === card.category)
                        ? card.category
                        : 'maintenance'
                    );
                    if (card.targetLevel !== 'all') {
                      setTargetAudience('level');
                      setTargetLevel(card.targetLevel);
                    } else {
                      setTargetAudience('all');
                    }
                  }}
                >
                  Load in Composer
                </button>
                {card._id && (
                  <button
                    style={{
                      ...styles.secondaryBtn,
                      fontSize: 11,
                      padding: '6px 10px',
                      color: '#8B2626',
                    }}
                    onClick={() => void onDeleteCard(card._id)}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Push & Schedule Grower Notifications */}
      <section style={styles.card}>
        <h2 style={styles.cardTitle}>
          Push & Schedule Grower Notifications
          <WebHelpButton
            help={{
              title: 'Push & Schedule Grower Notifications',
              whatItDoes:
                'Broadcasts weather warnings, fertilizing season reminders, seminars, expo shares, and community news to all users, specific experience tiers, or selected growers.',
              howToDoIt: [
                'Pick a topic category (or click a Quick Template).',
                'Select Audience: All Users, Experience Level (Beginner/Experienced/Expert), or Selected Users.',
                'Choose "Push Now" for immediate delivery or "Schedule" with a future date/time.',
              ],
              whatToExpect:
                'Notifications appear in the history log below and filter automatically in the mobile app by each grower’s level and opted-in topics.',
            }}
          />
        </h2>
        <p style={styles.cardDesc}>
          Send instant one-click updates or schedule upcoming weather alerts,
          fertilizing reminders, seminars, and expo shares.
        </p>

        <div style={{ ...styles.row, marginBottom: 10 }}>
          {[
            {
              label: 'Upcoming Weather Alert',
              category: 'weather',
              title: 'Weather Advisory: Spring Rain & Frost Watch',
              body: 'Wet weather & cool temps forecast in the next 48 hours. Check blight copper coverage and hold dry-weather pruning.',
            },
            {
              label: 'Fertilizing Season Open',
              category: 'fertilizing',
              title: 'Fertilizing Season: Time for Split Nitrogen',
              body: 'Orchard soil temperatures are optimal for spring split nitrogen uptake. Review your WalnutIQ feeding checklist.',
            },
            {
              label: 'Seminar / Expo Invite',
              category: 'seminars_expo',
              title: 'Walnut Grower Seminar & Orchard Tech Expo',
              body: 'Join our live walnut pruning, irrigation, and AI yield-counting session this Saturday. Tap for details & Q&A.',
            },
          ].map((preset) => (
            <button
              key={preset.label}
              type="button"
              style={{ ...styles.secondaryBtn, fontSize: 11, padding: '5px 10px' }}
              onClick={() => {
                setNotifCategory(preset.category);
                setNotifTitle(preset.title);
                setNotifBody(preset.body);
              }}
            >
              + {preset.label}
            </button>
          ))}
        </div>

        <div style={styles.grid2}>
          <div>
            <label style={styles.label}>Notification Title</label>
            <input
              style={styles.input}
              value={notifTitle}
              onChange={(e) => setNotifTitle(e.target.value)}
              placeholder="e.g. Upcoming Weather Alert: Frost Warning"
            />
          </div>
          <div>
            <label style={styles.label}>Topic Category</label>
            <select
              style={{ ...styles.select, width: '100%' }}
              value={notifCategory}
              onChange={(e) => setNotifCategory(e.target.value)}
            >
              {TOPIC_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <label style={styles.label}>Message Body</label>
        <textarea
          style={{ ...styles.input, minHeight: 70 }}
          value={notifBody}
          onChange={(e) => setNotifBody(e.target.value)}
          placeholder="Write actionable walnut care news, weather info, or seminar details..."
        />

        <div style={styles.grid2}>
          <div>
            <label style={styles.label}>Target Audience</label>
            <select
              style={{ ...styles.select, width: '100%', marginBottom: 8 }}
              value={targetAudience}
              onChange={(e) =>
                setTargetAudience(
                  e.target.value as 'all' | 'level' | 'selected_users'
                )
              }
            >
              <option value="all">All Mobile Users</option>
              <option value="level">By Experience Level</option>
              <option value="selected_users">Selected Users</option>
            </select>

            {targetAudience === 'level' && (
              <select
                style={{ ...styles.select, width: '100%' }}
                value={targetLevel}
                onChange={(e) =>
                  setTargetLevel(
                    e.target.value as 'beginner' | 'experienced' | 'expert'
                  )
                }
              >
                <option value="beginner">Beginner Growers</option>
                <option value="experienced">Experienced Growers</option>
                <option value="expert">Expert Growers</option>
              </select>
            )}

            {targetAudience === 'selected_users' && (
              <div
                style={{
                  maxHeight: 130,
                  overflowY: 'auto',
                  border: '1px solid #CFE3C4',
                  borderRadius: 8,
                  padding: 8,
                  backgroundColor: '#FAFDF8',
                }}
              >
                {growers.length === 0 ? (
                  <div style={{ fontSize: 12, color: '#6B7D65' }}>
                    No synced growers found yet.
                  </div>
                ) : (
                  growers.map((g) => (
                    <label
                      key={g.clerkId}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontSize: 12,
                        marginBottom: 4,
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedUserIds.includes(g.clerkId)}
                        onChange={(e) =>
                          setSelectedUserIds((prev) =>
                            e.target.checked
                              ? [...prev, g.clerkId]
                              : prev.filter((id) => id !== g.clerkId)
                          )
                        }
                      />
                      <span>
                        <strong>{g.displayName}</strong> ({g.email}) —{' '}
                        {g.experienceLevel}
                      </span>
                    </label>
                  ))
                )}
              </div>
            )}
          </div>

          <div>
            <label style={styles.label}>Delivery Timing</label>
            <div style={{ ...styles.row, marginBottom: 8 }}>
              <button
                type="button"
                style={{
                  ...styles.pillSwitch,
                  ...(deliveryMode === 'now' ? styles.pillSwitchActive : {}),
                }}
                onClick={() => setDeliveryMode('now')}
              >
                Push Now
              </button>
              <button
                type="button"
                style={{
                  ...styles.pillSwitch,
                  ...(deliveryMode === 'schedule'
                    ? styles.pillSwitchActive
                    : {}),
                }}
                onClick={() => setDeliveryMode('schedule')}
              >
                Schedule Later
              </button>
            </div>
            {deliveryMode === 'schedule' && (
              <input
                type="datetime-local"
                style={styles.input}
                value={scheduledDateTime}
                onChange={(e) => setScheduledDateTime(e.target.value)}
              />
            )}
          </div>
        </div>

        <button
          style={{ ...styles.primaryBtn, marginTop: 10 }}
          onClick={() => void handleSendNotification()}
        >
          {deliveryMode === 'schedule'
            ? 'Schedule Notification'
            : 'Push Notification Now'}
        </button>

        {notifications.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <strong style={{ fontSize: 13, color: '#294A1F' }}>
              Recent & Scheduled Broadcasts ({notifications.length})
            </strong>
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {notifications.slice(0, 10).map((item) => (
                <div
                  key={item._id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 10px',
                    borderRadius: 8,
                    border: '1px solid #E6F0E0',
                    backgroundColor: '#FAFDF8',
                    fontSize: 12,
                  }}
                >
                  <div>
                    <strong>{item.title}</strong>{' '}
                    <span style={{ color: '#556B4E' }}>
                      [{item.status.toUpperCase()} • {item.category} •{' '}
                      {item.targetAudience}
                      {item.targetLevel ? `:${item.targetLevel}` : ''}]
                    </span>
                    <div style={{ color: '#4B633F', fontSize: 11.5 }}>
                      {item.body}
                    </div>
                  </div>
                  {item.status === 'scheduled' && (
                    <button
                      style={{ ...styles.secondaryBtn, fontSize: 11 }}
                      onClick={() => void onCancelNotification(item._id)}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </>
  );
}
