import React, { useEffect, useRef, useState } from 'react';
import {
  Show,
  SignInButton,
  SignOutButton,
  UserButton,
  useUser,
} from '@clerk/react';
import { useConvexAuth, useMutation } from 'convex/react';
import { anyApi } from 'convex/server';
import ShopAdminTab from './components/ShopAdminTab';
import LegalPages, {
  LegalRoute,
  detectLegalRoute,
} from './components/LegalPages';
import { WebHelpButton } from './components/HelpModal';

const ADMIN_EMAIL = 'pinarlik99@gmail.com';

type AdminTab = 'setup' | 'training' | 'analytics' | 'endpoints' | 'shop';

interface PipelineStatusResponse {
  job: {
    activeJob: string | null;
    status: string;
    startedAt?: string | null;
    finishedAt?: string | null;
    logs: string[];
  };
  counts: {
    rawScrapedTotal: number;
    curatedTotal: number;
    rejectedByClip: number;
    datasetCanopyImages: number;
    datasetCanopyLabels: number;
    datasetGroundImages: number;
    datasetGroundLabels: number;
  };
  defaultDownloadsDir?: string;
  activeScrapeDir?: string;
}

interface CareDefaultsConfig {
  irrigationIntervalDays: number;
  targetSoilMoisturePct: number;
  chillHoursTarget: number;
  nitrogenCutoffDate: string;
  harvestHullSplitPct: number;
  dailyGuidanceNote: string;
}

const DEFAULT_WORKER_URL =
  (import.meta as any).env?.VITE_ML_WORKER_URL || 'http://127.0.0.1:8000';

const STORAGE_WORKER_KEY = 'walnutiq_worker_url';
const STORAGE_TOKEN_KEY = 'walnutiq_worker_token';
const STORAGE_COLAB_KEY = 'walnutiq_colab_url';
const STORAGE_CARE_KEY = 'walnutiq_care_defaults';

const INITIAL_CARE_DEFAULTS: CareDefaultsConfig = {
  irrigationIntervalDays: 7,
  targetSoilMoisturePct: 65,
  chillHoursTarget: 800,
  nitrogenCutoffDate: 'July 1',
  harvestHullSplitPct: 80,
  dailyGuidanceNote:
    'Check 30cm root zone moisture before irrigation; clear dark hulls around young trunks.',
};

const SCRAPE_QUERY_OPTIONS: Record<
  'ground' | 'canopy',
  { className: string; label: string; queries: string[] }[]
> = {
  ground: [
    {
      className: 'walnut_in_shell',
      label: 'Ground • Walnut in Shell',
      queries: [
        'fallen walnuts on ground grass harvest',
        'walnuts on soil autumn leaves orchard',
        'harvested walnuts on ground under tree',
        'english walnut shells on ground orchard',
        'walnut shaking harvest nuts on orchard floor',
        'chandler walnuts on ground before sweeping',
        'persian walnut nuts scattered on dirt ground',
      ],
    },
    {
      className: 'walnut_in_hull',
      label: 'Ground • Walnut in Hull',
      queries: [
        'fallen green walnut hull on ground',
        'walnut in split green husk on ground',
        'black and green walnut hulls fallen on grass',
        'juglans regia fallen nuts with husks on soil',
        'dropped green walnuts under tree autumn',
        'rotting walnut husks on orchard floor',
        'walnuts with cracked green hulls on dirt',
      ],
    },
    {
      className: 'background_no_walnut',
      label: 'Ground • Blank Background (No Walnuts)',
      queries: [
        'empty orchard grass and soil ground',
        'dry autumn leaves on soil ground',
        'bare orchard dirt floor under trees',
        'green lawn grass and weeds close up',
      ],
    },
  ],
  canopy: [
    {
      className: 'walnut_hull_split',
      label: 'Canopy • Hull Split',
      queries: [
        'walnut hull split on tree branch',
        'ripening walnut green husk cracking on tree',
        'juglans regia hull split harvest readiness',
        'walnut husk splitting open on tree',
        'mature walnut kernel visible in split hull on branch',
      ],
    },
    {
      className: 'walnut_blight_damaged',
      label: 'Canopy • Blight Damaged',
      queries: [
        'walnut blight xanthomonas arboricola fruit damage',
        'walnut husk fly blackened walnut on tree',
        'diseased blighted walnut on tree branch',
        'walnut anthracnose black spots on green nut',
        'sunburn and blight lesions on walnut canopy',
      ],
    },
    {
      className: 'walnut_green',
      label: 'Canopy • Green Walnuts',
      queries: [
        'green walnuts growing on tree branch',
        'juglans regia green fruit cluster canopy',
        'unripe green walnut cluster on tree leaves',
        'chandler walnut tree canopy fruiting branch',
      ],
    },
    {
      className: 'background_no_walnut',
      label: 'Canopy • Blank Background (No Walnuts)',
      queries: [
        'tree branches with green leaves no fruit',
        'walnut tree foliage leaves canopy close up',
        'deciduous orchard tree canopy leaves sunlight',
        'empty green tree branches and twigs',
      ],
    },
  ],
};

const ALL_SCRAPE_QUERIES = [
  ...SCRAPE_QUERY_OPTIONS.ground.flatMap((g) => g.queries),
  ...SCRAPE_QUERY_OPTIONS.canopy.flatMap((c) => c.queries),
];

const SCRAPE_ENGINE_OPTIONS = [
  { id: 'bing', label: 'Bing Images' },
  { id: 'ddg', label: 'DuckDuckGo' },
  { id: 'google', label: 'Google Images' },
  { id: 'yahoo', label: 'Yahoo Images' },
  { id: 'yandex', label: 'Yandex Images' },
  { id: 'wikimedia', label: 'Wikimedia Commons' },
  { id: 'instagram', label: 'Instagram (Public Index)' },
  { id: 'flickr', label: 'Flickr API' },
] as const;

const CLIP_POSITIVE_PROMPTS = [
  {
    target: 'canopy' as const,
    className: 'walnut_green',
    prompt:
      'a photo of intact green walnuts hanging on a walnut tree branch with green leaves in an orchard',
  },
  {
    target: 'canopy' as const,
    className: 'walnut_hull_split',
    prompt:
      'a photo of a ripening walnut on a tree with its green outer hull cracking or splitting open',
  },
  {
    target: 'canopy' as const,
    className: 'walnut_blight_damaged',
    prompt:
      'a photo of a diseased walnut on a tree with black blight spots or rotten dark husk damage',
  },
  {
    target: 'ground' as const,
    className: 'walnut_in_shell',
    prompt:
      'a photo of fallen brown walnuts in their hard wrinkled shells lying on soil, grass, or autumn leaves',
  },
  {
    target: 'ground' as const,
    className: 'walnut_in_hull',
    prompt:
      'a photo of fallen walnuts on the ground still inside green or dark decaying husks among leaves',
  },
];

const CLIP_NEGATIVE_PROMPTS = [
  'a photo of wooden furniture, walnut wood planks, tables, or flooring',
  'a photo of baked food, walnut cake, brownies, salad, or kitchen recipes',
  'a photo of plastic retail packaging, nutrition labels, charts, or text documents',
  'a studio product photo of shelled walnut kernels in a white bowl',
];

export default function App({
  hasClerk,
  hasConvex,
}: {
  hasClerk: boolean;
  hasConvex: boolean;
}) {
  const [legalRoute, setLegalRoute] = useState<LegalRoute | null>(() =>
    detectLegalRoute(window.location.pathname, window.location.search)
  );

  const navigateLegal = (next: LegalRoute | null) => {
    setLegalRoute(next);
    const targetUrl = next ? `/${next}` : '/';
    window.history.pushState({}, '', targetUrl);
  };

  useEffect(() => {
    const onPopState = () => {
      setLegalRoute(
        detectLegalRoute(window.location.pathname, window.location.search)
      );
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  if (legalRoute) {
    return <LegalPages route={legalRoute} onNavigate={navigateLegal} />;
  }

  return (
    <AdminPortalApp
      hasClerk={hasClerk}
      hasConvex={hasConvex}
      navigateLegal={navigateLegal}
    />
  );
}

function AdminPortalApp({
  hasClerk,
  hasConvex,
  navigateLegal,
}: {
  hasClerk: boolean;
  hasConvex: boolean;
  navigateLegal: (next: LegalRoute | null) => void;
}) {
  const [activeTab, setActiveTab] = useState<AdminTab>('setup');

  // Configurable VPS / Worker Endpoints (persisted in localStorage so no redeploy is needed)
  const [workerUrl, setWorkerUrl] = useState<string>(
    () => localStorage.getItem(STORAGE_WORKER_KEY) || DEFAULT_WORKER_URL
  );
  const [workerToken, setWorkerToken] = useState<string>(
    () => localStorage.getItem(STORAGE_TOKEN_KEY) || ''
  );
  const [colabUrl, setColabUrl] = useState<string>(
    () =>
      localStorage.getItem(STORAGE_COLAB_KEY) ||
      'https://colab.research.google.com/'
  );

  // Admin-Controlled Mobile App Care Defaults
  const [careDefaults, setCareDefaults] = useState<CareDefaultsConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CARE_KEY);
      return saved ? JSON.parse(saved) : INITIAL_CARE_DEFAULTS;
    } catch {
      return INITIAL_CARE_DEFAULTS;
    }
  });

  // Background Worker Status & Dataset Counts
  const [workerOnline, setWorkerOnline] = useState(false);
  const [statusData, setStatusData] = useState<PipelineStatusResponse | null>(
    null
  );
  const [scrapeTarget, setScrapeTarget] = useState<'ground' | 'canopy' | 'all'>(
    'ground'
  );
  const [selectedQueries, setSelectedQueries] =
    useState<string[]>(ALL_SCRAPE_QUERIES);
  const [selectedEngines, setSelectedEngines] = useState<string[]>([
    'bing',
    'ddg',
    'google',
    'yahoo',
    'wikimedia',
  ]);
  const [queriesExpanded, setQueriesExpanded] = useState(false);
  const [enginesExpanded, setEnginesExpanded] = useState(false);
  const [maxPerQuery, setMaxPerQuery] = useState<string>('40');
  const [clipTarget, setClipTarget] = useState<'all' | 'ground' | 'canopy'>(
    'all'
  );
  const [clipConfidence, setClipConfidence] = useState<string>('0.28');
  const [clipInputDir, setClipInputDir] = useState<string>('');
  const [clipPromptsExpanded, setClipPromptsExpanded] = useState(false);
  const [labelTarget, setLabelTarget] = useState<'all' | 'ground' | 'canopy'>(
    'all'
  );
  const [pipelineStepTab, setPipelineStepTab] = useState<
    'scrape' | 'clip' | 'label' | 'import'
  >('scrape');
  const [scrapeModalOpen, setScrapeModalOpen] = useState(false);
  const [scrapeOutputDir, setScrapeOutputDir] = useState<string>('');
  const [folderExplorerOpen, setFolderExplorerOpen] = useState(false);
  const [explorerData, setExplorerData] = useState<{
    currentPath: string;
    parentPath: string | null;
    dirs: { name: string; path: string }[];
    shortcuts: { label: string; path: string }[];
  } | null>(null);
  const [explorerError, setExplorerError] = useState<string | null>(null);
  const [walnutDataPath, setWalnutDataPath] = useState<string>('./WalnutData');
  const [trainTarget, setTrainTarget] = useState<'vps' | 'colab'>('vps');
  const [notice, setNotice] = useState<string | null>(null);
  const [spinnerIdx, setSpinnerIdx] = useState(0);

  useEffect(() => {
    if (statusData?.job.status !== 'RUNNING') return;
    const timer = setInterval(() => {
      setSpinnerIdx((prev) => (prev + 1) % 4);
    }, 200);
    return () => clearInterval(timer);
  }, [statusData?.job.status]);

  const fetchWorkerStatus = async () => {
    try {
      const headers: Record<string, string> = {};
      if (workerToken.trim()) headers['x-admin-token'] = workerToken.trim();
      const res = await fetch(`${workerUrl}/api/status`, { headers });
      if (!res.ok) throw new Error('Worker offline');
      const json: PipelineStatusResponse = await res.json();
      setStatusData(json);
      setWorkerOnline(true);
    } catch {
      setWorkerOnline(false);
    }
  };

  const defaultScrapeFolder =
    statusData?.defaultDownloadsDir ||
    'backend/yolo/dataset_builder/raw_scraped';

  const loadExplorerPath = async (targetPath: string) => {
    setExplorerError(null);
    try {
      const headers: Record<string, string> = {};
      if (workerToken.trim()) headers['x-admin-token'] = workerToken.trim();
      const res = await fetch(
        `${workerUrl}/api/fs/list?path=${encodeURIComponent(targetPath)}`,
        { headers }
      );
      if (!res.ok) {
        if (res.status === 404) {
          setExplorerError(
            `Folder browser endpoint (/api/fs/list) returned 404. Please restart backend/server.py so it loads the latest routes, or type a path manually.`
          );
          return;
        }
        throw new Error(`HTTP ${res.status}`);
      }
      const json = await res.json();
      setExplorerData(json);
    } catch (err) {
      setExplorerError(
        `Cannot reach backend worker at ${workerUrl} (${err instanceof Error ? err.message : 'offline'}). Start/restart backend/server.py or type a path manually.`
      );
    }
  };

  const renderStepProgress = (
    title: string,
    keywords: string[],
    idleText: string
  ) => {
    const activeJob = statusData?.job.activeJob ?? '';
    const isStepActive = keywords.some((k) =>
      activeJob.toLowerCase().includes(k.toLowerCase())
    );
    const stepStatus = isStepActive
      ? (statusData?.job.status ?? 'IDLE')
      : 'IDLE';
    const matchingLogs = (statusData?.job.logs ?? []).filter((line) =>
      keywords.some((k) => line.toLowerCase().includes(k.toLowerCase()))
    );
    const spinnerChars = ['◐', '◓', '◑', '◒'];
    const isRunning = stepStatus === 'RUNNING';

    // Parse latest progress line (e.g. "[CLIP] Progress 45/354 (13%) | Accepted: 30 | Rejected: 15 | ...")
    let progressInfo: {
      current: number;
      total: number;
      pct: number;
      detail: string;
    } | null = null;
    for (let i = matchingLogs.length - 1; i >= 0; i -= 1) {
      const m = matchingLogs[i].match(
        /Progress\s+(\d+)\/(\d+)\s+\((\d+)%\)(?:\s*\|\s*(.+))?/i
      );
      if (m) {
        progressInfo = {
          current: Number(m[1]),
          total: Number(m[2]),
          pct: Math.min(100, Math.max(0, Number(m[3]))),
          detail: m[4] ? m[4].trim() : '',
        };
        break;
      }
    }

    return (
      <div
        style={{
          marginTop: 14,
          padding: 12,
          borderRadius: 8,
          backgroundColor: '#F4F8F1',
          border: '1px solid #CFE3C4',
          fontSize: 12,
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 6,
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          <strong style={{ color: '#294A1F', display: 'flex', alignItems: 'center', gap: 6 }}>
            {isRunning && (
              <span
                style={{
                  display: 'inline-block',
                  color: '#1B5E20',
                  fontSize: 14,
                  fontWeight: 800,
                }}
                aria-label="Running"
              >
                {spinnerChars[spinnerIdx]}
              </span>
            )}
            <span>
              {title} ({stepStatus})
            </span>
            {progressInfo && (
              <span
                style={{
                  backgroundColor: '#E1F0D8',
                  color: '#1E4620',
                  padding: '2px 8px',
                  borderRadius: 12,
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {progressInfo.current}/{progressInfo.total} ({progressInfo.pct}%)
              </span>
            )}
          </strong>
          <span style={{ color: '#6B7D65', fontSize: 11 }}>
            Drag bottom-right corner to resize
          </span>
        </div>
        {(isRunning || progressInfo) && (
          <div style={{ marginBottom: 8 }}>
            <div
              style={{
                width: '100%',
                height: 8,
                backgroundColor: '#DCEAD3',
                borderRadius: 999,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${progressInfo ? progressInfo.pct : 15}%`,
                  height: '100%',
                  backgroundColor: isRunning ? '#2E7D32' : '#558B2F',
                  transition: 'width 0.25s ease',
                }}
              />
            </div>
            {progressInfo?.detail && (
              <div style={{ fontSize: 11, color: '#3F5A34', marginTop: 4 }}>
                {progressInfo.detail}
              </div>
            )}
          </div>
        )}
        <div
          style={{
            fontFamily: 'monospace',
            fontSize: 12,
            lineHeight: 1.45,
            color: '#1A2616',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E6F0E0',
            borderRadius: 6,
            padding: 10,
            minHeight: 140,
            height: 200,
            resize: 'vertical',
            overflowY: 'auto',
          }}
        >
          {matchingLogs.length > 0 ? (
            matchingLogs.map((line, i) => <div key={i}>{line}</div>)
          ) : (
            <div style={{ color: '#6B7D65' }}>{idleText}</div>
          )}
        </div>
      </div>
    );
  };

  useEffect(() => {
    fetchWorkerStatus();
    const intervalMs = statusData?.job.status === 'RUNNING' ? 1200 : 3500;
    const id = setInterval(fetchWorkerStatus, intervalMs);
    return () => clearInterval(id);
  }, [workerUrl, workerToken, statusData?.job.status]);

  const runJob = async (
    endpoint: string,
    payload: Record<string, unknown>,
    label: string
  ) => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (workerToken.trim()) headers['x-admin-token'] = workerToken.trim();

      const res = await fetch(`${workerUrl}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Request failed');
      setStatusData((prev) =>
        prev
          ? {
              ...prev,
              job: {
                ...prev.job,
                activeJob: label,
                status: 'RUNNING',
                logs: [],
              },
            }
          : prev
      );
      setNotice(`Started: ${label}`);
      fetchWorkerStatus();
    } catch {
      setNotice(
        `Worker not reachable at ${workerUrl}. Start it on your VPS/PC or update the URL in Setup & Links.`
      );
    }
  };

  const saveCareDefaults = () => {
    localStorage.setItem(STORAGE_CARE_KEY, JSON.stringify(careDefaults));
    setNotice(
      'Saved optimal Care Defaults. New and synced mobile growers receive these baseline values.'
    );
  };

  const saveEndpoints = () => {
    localStorage.setItem(STORAGE_WORKER_KEY, workerUrl.trim());
    localStorage.setItem(STORAGE_TOKEN_KEY, workerToken.trim());
    localStorage.setItem(STORAGE_COLAB_KEY, colabUrl.trim());
    setNotice(`Saved worker endpoint (${workerUrl.trim()}) and links.`);
    fetchWorkerStatus();
  };

  const counts = statusData?.counts ?? {
    rawScrapedTotal: 0,
    curatedTotal: 0,
    rejectedByClip: 0,
    datasetCanopyImages: 0,
    datasetCanopyLabels: 0,
    datasetGroundImages: 0,
    datasetGroundLabels: 0,
  };

  const renderAdminWorkspace = () => (
    <div style={styles.page}>
      {hasConvex && (
        <ConvexPipelineLogger
          statusData={statusData}
          scrapeTarget={scrapeTarget}
          selectedEngines={selectedEngines}
        />
      )}
      {/* Clean Header */}
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>WalnutIQ Admin</h1>
          <p style={styles.subtitle}>
            walnut.pinarlik.com • Mobile Care Parameters, Analytics & Dataset
            Studio
          </p>
        </div>

        <div style={styles.headerRight}>
          <span
            style={{
              ...styles.workerBadge,
              backgroundColor: workerOnline ? '#cfe3c4' : '#f7e6d4',
            }}
          >
            {workerOnline
              ? `● Worker Online (${statusData?.job.status})`
              : '○ Worker Offline'}
          </span>
          {hasClerk && <UserButton />}
        </div>
      </header>

      {/* Clean Navigation Tabs */}
      <nav style={styles.tabBar}>
        {(
          [
            { id: 'setup', label: '1. Mobile Care Setup' },
            { id: 'training', label: '2. Dataset & Training' },
            { id: 'analytics', label: '3. Users & Analytics' },
            { id: 'endpoints', label: '4. VPS & Links Setup' },
            { id: 'shop', label: '5. Sensors & Switches Shop' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            style={{
              ...styles.tabBtn,
              ...(activeTab === tab.id ? styles.tabBtnActive : {}),
            }}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {notice && <div style={styles.banner}>{notice}</div>}

      {/* TAB 1: MOBILE CARE SETUP */}
      {activeTab === 'setup' && (
        <section style={styles.card}>
          <h2 style={styles.cardTitle}>
            Optimal Walnut Care Defaults (Synced to Mobile App)
            <WebHelpButton
              help={{
                title: 'Optimal Walnut Care Defaults',
                whatItDoes:
                  'Sets the default watering interval, target soil moisture, chill-hour goal, and nitrogen cutoff pushed to growers.',
                howToDoIt: [
                  'Adjust the numeric defaults and daily guidance banner.',
                  'Click "Save & Publish Care Defaults to Mobile App".',
                ],
                whatToExpect:
                  'Saved defaults are stored immediately and apply to growers unless they customize their own orchard settings.',
              }}
            />
          </h2>
          <p style={styles.cardDesc}>
            Set the baseline agronomic parameters pushed to the mobile app.
            Growers can override soil type and location on their own device.
          </p>

          <div style={styles.formGrid}>
            <div>
              <label style={styles.label}>Default Watering Interval (Days)</label>
              <input
                type="number"
                style={styles.input}
                value={careDefaults.irrigationIntervalDays}
                onChange={(e) =>
                  setCareDefaults({
                    ...careDefaults,
                    irrigationIntervalDays: Number(e.target.value) || 7,
                  })
                }
              />
            </div>

            <div>
              <label style={styles.label}>Target Soil Moisture (%)</label>
              <input
                type="number"
                style={styles.input}
                value={careDefaults.targetSoilMoisturePct}
                onChange={(e) =>
                  setCareDefaults({
                    ...careDefaults,
                    targetSoilMoisturePct: Number(e.target.value) || 65,
                  })
                }
              />
            </div>

            <div>
              <label style={styles.label}>Winter Chill Target (Hours)</label>
              <input
                type="number"
                style={styles.input}
                value={careDefaults.chillHoursTarget}
                onChange={(e) =>
                  setCareDefaults({
                    ...careDefaults,
                    chillHoursTarget: Number(e.target.value) || 800,
                  })
                }
              />
            </div>

            <div>
              <label style={styles.label}>Summer Nitrogen Cutoff</label>
              <input
                type="text"
                style={styles.input}
                value={careDefaults.nitrogenCutoffDate}
                onChange={(e) =>
                  setCareDefaults({
                    ...careDefaults,
                    nitrogenCutoffDate: e.target.value,
                  })
                }
              />
            </div>
          </div>

          <label style={styles.label}>Daily Mobile Guidance Banner</label>
          <textarea
            style={styles.textarea}
            rows={3}
            value={careDefaults.dailyGuidanceNote}
            onChange={(e) =>
              setCareDefaults({
                ...careDefaults,
                dailyGuidanceNote: e.target.value,
              })
            }
          />

          <button style={styles.primaryBtn} onClick={saveCareDefaults}>
            Save & Publish Care Defaults to Mobile App
          </button>
        </section>
      )}

      {/* TAB 2: DATASET GATHERING, CLIP, LABELING & YOLO11 TRAINING */}
      {activeTab === 'training' && (
        <>
          <div style={styles.kpiRow}>
            <div style={styles.kpiBox}>
              <div style={styles.kpiVal}>{counts.rawScrapedTotal}</div>
              <div style={styles.kpiLbl}>Raw Scraped</div>
            </div>
            <div style={styles.kpiBox}>
              <div style={styles.kpiVal}>{counts.curatedTotal}</div>
              <div style={styles.kpiLbl}>CLIP Curated</div>
            </div>
            <div style={styles.kpiBox}>
              <div style={styles.kpiVal}>{counts.rejectedByClip}</div>
              <div style={styles.kpiLbl}>CLIP Rejected</div>
            </div>
            <div style={styles.kpiBox}>
              <div style={styles.kpiVal}>
                {counts.datasetCanopyImages + counts.datasetGroundImages}
              </div>
              <div style={styles.kpiLbl}>Training Ready</div>
            </div>
          </div>

          <section style={styles.card}>
            <h2 style={styles.cardTitle}>
              Dataset Gathering & Preparation Pipeline
            </h2>
            <div
              style={{
                display: 'flex',
                gap: 8,
                flexWrap: 'wrap',
                marginBottom: 14,
              }}
            >
              {(
                [
                  { id: 'scrape', label: '1. Web Image Scraper' },
                  { id: 'clip', label: '2. CLIP Auto-Filter' },
                  { id: 'label', label: '3. Labeling & Split' },
                  { id: 'import', label: '4. Import WalnutData (30k)' },
                ] as const
              ).map((step) => (
                <button
                  key={step.id}
                  type="button"
                  style={{
                    ...styles.pillSwitch,
                    ...(pipelineStepTab === step.id
                      ? styles.pillSwitchActive
                      : {}),
                  }}
                  onClick={() => setPipelineStepTab(step.id)}
                >
                  {step.label}
                </button>
              ))}
            </div>
            <div>
              {pipelineStepTab === 'scrape' && (
              <div style={{ ...styles.stepBox, width: '100%', boxSizing: 'border-box' }}>
                <h3 style={styles.stepTitle}>
                  1. Web Image Scraper
                  <WebHelpButton
                    help={{
                      title: '1. Web Image Scraper',
                      whatItDoes:
                        'Downloads walnut photos from selected web search engines into raw_scraped/ (or a custom folder) so you can build a training dataset.',
                      howToDoIt: [
                        'Select a category: "Ground Walnuts", "Canopy Walnuts", or "All Categories".',
                        'Set the number box (Max Images per Category per Engine, default 40). For example, 40 downloads up to 40 photos for each selected category from each selected search engine.',
                        'Optionally expand "Search Queries" and "Search Engines" to pick specific queries or engines (Bing, DuckDuckGo, Google, Yahoo, Yandex, Wikimedia, Instagram, Flickr), or set a custom Download Folder.',
                        'Make sure your Python Backend Worker is online (Tab 4), then click "Run Scraper".',
                      ],
                      whatToExpect:
                        'Previous job logs clear on each new search, full scrollable logs stream below (and save to Convex for 30 days), and the "Raw Scraped" counter climbs as images download. Next, run Step 2 (CLIP Auto-Filter).',
                    }}
                  />
                </h3>
                <p style={styles.stepDesc}>
                  Collects ground walnuts & canopy hull-split / blight photos.
                </p>
                <div style={styles.row}>
                  <select
                    style={styles.select}
                    value={scrapeTarget}
                    onChange={(e) => setScrapeTarget(e.target.value as any)}
                  >
                    <option value="ground">Ground Walnuts</option>
                    <option value="canopy">Canopy Walnuts</option>
                    <option value="all">All Categories</option>
                  </select>
                  <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                    <input
                      type="number"
                      min={1}
                      max={2000}
                      title="Max images per category per search engine"
                      placeholder="40"
                      style={styles.numInput}
                      value={maxPerQuery}
                      onChange={(e) => setMaxPerQuery(e.target.value)}
                      onBlur={() => {
                        const parsed = parseInt(maxPerQuery, 10);
                        setMaxPerQuery(
                          Number.isFinite(parsed) && parsed > 0
                            ? String(parsed)
                            : '40'
                        );
                      }}
                    />
                    <WebHelpButton
                      help={{
                        title: 'Dataset Image Count Guide (Per Category & Engine)',
                        whatItDoes:
                          'Sets how many NEW images to download per category from each selected search engine. Remember: with 8 engines selected, 50 = up to 400 raw images per category.',
                        howToDoIt: [
                          '• 5 (Quick Test): ~40 raw/category across 8 engines. Best for smoke-testing scraping, CLIP, and labelImg.',
                          '• 50 (Good Starter): ~400 raw/category (~200–280 after CLIP). Solid baseline when combined with Step 4 WalnutData.',
                          '• 200–250 (Ultralytics Gold Standard): ~1,600–2,000 raw/category (~1,000–1,500+ curated/class). Matches Ultralytics’ >=1,500 images/class recommendation for high accuracy. Colab T4: ~1.5–2.5 hrs (~$0.25–$0.45).',
                          '• 500–1,000+ (Heavy / Multi-Run): 4,000–8,000+ raw/category. Expect long scrape/CLIP/labeling times; best trained on Colab L4/A100 (~$1–$3.50/run). Keep 5–10% blank background images to reduce false positives.',
                        ],
                        whatToExpect:
                          '350K-image datasets are for 80–600 classes; for 2–3 classes, 1,500+ curated images (and >=10,000 labeled boxes) per class is Ultralytics’ sweet spot.',
                        tables: [
                          {
                            title: 'Sample Scrape Count Table (8 Search Engines Selected)',
                            headers: [
                              'Count Box',
                              'Raw / Category',
                              'Est. After CLIP / Class',
                              'Quality Tier',
                            ],
                            rows: [
                              [
                                '5',
                                '~40',
                                '~20–28',
                                'Quick Test (smoke-test queries, CLIP & labelImg)',
                              ],
                              [
                                '50',
                                '~400',
                                '~200–280',
                                'Good Starter (solid baseline + Step 4 WalnutData)',
                              ],
                              [
                                '200–250',
                                '~1,600–2,000',
                                '~1,000–1,500+',
                                'Ultralytics Gold Standard (high-accuracy production)',
                              ],
                              [
                                '500–1,000+',
                                '~4,000–8,000+',
                                '~2,500–5,500+',
                                'Extreme / Heavy (long scrape, CLIP & labeling time)',
                              ],
                            ],
                          },
                          {
                            title: 'Google Colab GPU Cost & Time Reference (~$0.10 / Compute Unit)',
                            headers: [
                              'Colab GPU',
                              'Burn Rate / Cost',
                              '3K–5K Images (~100 epochs)',
                              'Best Use Case',
                            ],
                            rows: [
                              [
                                'NVIDIA T4',
                                '~1.6–1.8 units/hr (~$0.16–$0.18/hr, or Free tier)',
                                '~1.5–2.5 hrs (~$0.25–$0.45)',
                                'Starter & Gold Standard up to ~5K–8K images',
                              ],
                              [
                                'NVIDIA L4',
                                '~3.0–4.8 units/hr (~$0.30–$0.48/hr)',
                                '~45–75 mins (~$0.25–$0.60)',
                                'Faster training for 5K–15K images',
                              ],
                              [
                                'NVIDIA A100',
                                '~10.6–15 units/hr (~$1.05–$1.50/hr)',
                                '~20–35 mins (~$0.40–$0.90)',
                                'Large 15K–30K+ image runs (~1–2.5 hrs, ~$1.50–$3.75)',
                              ],
                            ],
                          },
                        ],
                      }}
                    />
                  </span>
                </div>
                  <div
                    style={{
                      marginTop: 10,
                      marginBottom: 8,
                      padding: 10,
                      borderRadius: 8,
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #CFE3C4',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer',
                      }}
                      onClick={() => setQueriesExpanded((prev) => !prev)}
                    >
                      <strong style={{ fontSize: 12, color: '#294A1F' }}>
                        Search Queries ({scrapeTarget} •{' '}
                        {
                          selectedQueries.filter((q) =>
                            (scrapeTarget === 'all'
                              ? ALL_SCRAPE_QUERIES
                              : SCRAPE_QUERY_OPTIONS[scrapeTarget].flatMap(
                                  (g) => g.queries
                                )
                            ).includes(q)
                          ).length
                        }{' '}
                        selected)
                      </strong>
                      <div
                        style={{ display: 'flex', gap: 6, alignItems: 'center' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {queriesExpanded && (
                          <>
                            <button
                              type="button"
                              style={{ ...styles.secondaryBtn, fontSize: 11, padding: '3px 8px' }}
                              onClick={() => {
                                const visible = (
                                  scrapeTarget === 'all'
                                    ? [...SCRAPE_QUERY_OPTIONS.ground, ...SCRAPE_QUERY_OPTIONS.canopy]
                                    : SCRAPE_QUERY_OPTIONS[scrapeTarget]
                                ).flatMap((g) => g.queries);
                                setSelectedQueries((prev) =>
                                  Array.from(new Set([...prev, ...visible]))
                                );
                              }}
                            >
                              Select All
                            </button>
                            <button
                              type="button"
                              style={{ ...styles.secondaryBtn, fontSize: 11, padding: '3px 8px' }}
                              onClick={() => {
                                const visible = new Set(
                                  (scrapeTarget === 'all'
                                    ? [...SCRAPE_QUERY_OPTIONS.ground, ...SCRAPE_QUERY_OPTIONS.canopy]
                                    : SCRAPE_QUERY_OPTIONS[scrapeTarget]
                                  ).flatMap((g) => g.queries)
                                );
                                setSelectedQueries((prev) =>
                                  prev.filter((q) => !visible.has(q))
                                );
                              }}
                            >
                              Clear
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          style={{ ...styles.secondaryBtn, fontSize: 11, padding: '3px 8px' }}
                          onClick={() => setQueriesExpanded((prev) => !prev)}
                        >
                          {queriesExpanded ? 'Hide ▲' : 'Show ▼'}
                        </button>
                      </div>
                    </div>
                    {queriesExpanded && (
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                          gap: 8,
                          marginTop: 8,
                        }}
                      >
                        {(scrapeTarget === 'all'
                          ? [...SCRAPE_QUERY_OPTIONS.ground, ...SCRAPE_QUERY_OPTIONS.canopy]
                          : SCRAPE_QUERY_OPTIONS[scrapeTarget]
                        ).map((group) => (
                          <div key={group.className} style={{ fontSize: 12 }}>
                            <div style={{ fontWeight: 700, color: '#3E6B30', marginBottom: 4 }}>
                              {group.label}
                            </div>
                            {group.queries.map((q) => {
                              const checked = selectedQueries.includes(q);
                              return (
                                <label
                                  key={q}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    marginBottom: 3,
                                    cursor: 'pointer',
                                    color: '#1A2616',
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() =>
                                      setSelectedQueries((prev) =>
                                        checked
                                          ? prev.filter((item) => item !== q)
                                          : [...prev, q]
                                      )
                                    }
                                  />
                                  <span>{q}</span>
                                </label>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      marginBottom: 10,
                      padding: 10,
                      borderRadius: 8,
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #CFE3C4',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer',
                      }}
                      onClick={() => setEnginesExpanded((prev) => !prev)}
                    >
                      <strong style={{ fontSize: 12, color: '#294A1F' }}>
                        Search Sources ({selectedEngines.length}/
                        {SCRAPE_ENGINE_OPTIONS.length} selected)
                      </strong>
                      <div
                        style={{ display: 'flex', gap: 6, alignItems: 'center' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {enginesExpanded && (
                          <>
                            <button
                              type="button"
                              style={{ ...styles.secondaryBtn, fontSize: 11, padding: '3px 8px' }}
                              onClick={() =>
                                setSelectedEngines(
                                  SCRAPE_ENGINE_OPTIONS.map((e) => e.id)
                                )
                              }
                            >
                              All Sources
                            </button>
                            <button
                              type="button"
                              style={{ ...styles.secondaryBtn, fontSize: 11, padding: '3px 8px' }}
                              onClick={() => setSelectedEngines(['bing', 'ddg'])}
                            >
                              Reset Default
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          style={{ ...styles.secondaryBtn, fontSize: 11, padding: '3px 8px' }}
                          onClick={() => setEnginesExpanded((prev) => !prev)}
                        >
                          {enginesExpanded ? 'Hide ▲' : 'Show ▼'}
                        </button>
                      </div>
                    </div>
                    {enginesExpanded && (
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 10,
                          fontSize: 12,
                          marginTop: 8,
                        }}
                      >
                        {SCRAPE_ENGINE_OPTIONS.map((eng) => {
                          const checked = selectedEngines.includes(eng.id);
                          return (
                            <label
                              key={eng.id}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                cursor: 'pointer',
                                color: '#1A2616',
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() =>
                                  setSelectedEngines((prev) =>
                                    checked
                                      ? prev.filter((item) => item !== eng.id)
                                      : [...prev, eng.id]
                                  )
                                }
                              />
                              <span>{eng.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                <p
                  style={{
                    margin: '6px 0 8px',
                    fontSize: 11,
                    color: '#4A5D43',
                  }}
                >
                  Default save location:{' '}
                  <code>
                    backend/yolo/dataset_builder/raw_scraped/&lt;target&gt;/&lt;class_name&gt;/
                  </code>
                </p>
                <button
                  style={styles.primaryBtn}
                  onClick={() => {
                    if (!scrapeOutputDir.trim()) {
                      setScrapeOutputDir(defaultScrapeFolder);
                    }
                    setScrapeModalOpen(true);
                  }}
                >
                  Run Scraper
                </button>

                <div
                  style={{
                    marginTop: 14,
                    padding: 12,
                    borderRadius: 8,
                    backgroundColor: '#F4F8F1',
                    border: '1px solid #CFE3C4',
                    fontSize: 12,
                    width: '100%',
                    boxSizing: 'border-box',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 4,
                    }}
                  >
                    <strong style={{ color: '#294A1F' }}>
                      Search Progress ({statusData?.job.status ?? 'IDLE'})
                    </strong>
                    <span style={{ color: '#538442', fontSize: 11 }}>
                      {counts.rawScrapedTotal} images • Drag bottom-right corner to resize
                    </span>
                  </div>
                  <div style={{ color: '#4A5D43', fontSize: 11, marginBottom: 6 }}>
                    Save folder:{' '}
                    <code>
                      {statusData?.activeScrapeDir ||
                        statusData?.defaultDownloadsDir ||
                        'backend/yolo/dataset_builder/raw_scraped'}
                    </code>
                  </div>
                  <div
                    style={{
                      fontFamily: 'monospace',
                      fontSize: 12,
                      lineHeight: 1.45,
                      color: '#1A2616',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E6F0E0',
                      borderRadius: 6,
                      padding: 10,
                      minHeight: 160,
                      height: 240,
                      resize: 'vertical',
                      overflowY: 'auto',
                      overflowX: 'auto',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {(statusData?.job.logs ?? [])
                      .filter((line) => line.includes('[Scraper]') || line.includes('START JOB') || line.includes('COMPLETED') || line.includes('FAILED'))
                      .map((line, i) => (
                        <div key={i}>{line}</div>
                      ))}
                    {(statusData?.job.logs ?? []).filter((line) =>
                      line.includes('[Scraper]')
                    ).length === 0 && (
                      <div style={{ color: '#6B7D65' }}>
                        Ready. Click &quot;Run Scraper&quot; to choose folder &amp; start.
                      </div>
                    )}
                  </div>
                </div>

                {scrapeModalOpen && (
                  <div
                    role="dialog"
                    aria-modal="true"
                    onClick={() => setScrapeModalOpen(false)}
                    style={{
                      position: 'fixed',
                      inset: 0,
                      backgroundColor: 'rgba(26, 38, 22, 0.45)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 16,
                      zIndex: 9999,
                    }}
                  >
                    <div
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: 14,
                        border: '1px solid #CFE3C4',
                        maxWidth: 460,
                        width: '100%',
                        padding: 20,
                        boxShadow: '0 12px 32px rgba(26, 38, 22, 0.2)',
                      }}
                    >
                      <h3 style={{ margin: '0 0 8px', fontSize: 16, color: '#294A1F' }}>
                        Confirm Scraper Download Folder
                      </h3>
                      <p style={{ margin: '0 0 12px', fontSize: 13, color: '#4A5D43' }}>
                        Images download by default to{' '}
                        <code>
                          backend/yolo/dataset_builder/raw_scraped/&lt;target&gt;/&lt;class_name&gt;/
                        </code>{' '}
                        (used automatically by Step 2 CLIP Auto-Filter), or you can enter a different folder path below.
                      </p>
                      <label style={styles.label}>Download Folder Path</label>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input
                          style={{ ...styles.input, flex: 1, marginBottom: 0 }}
                          value={scrapeOutputDir}
                          placeholder={defaultScrapeFolder}
                          onChange={(e) => setScrapeOutputDir(e.target.value)}
                        />
                        <button
                          type="button"
                          style={styles.secondaryBtn}
                          onClick={() => {
                            setFolderExplorerOpen(true);
                            void loadExplorerPath(
                              scrapeOutputDir.trim() || defaultScrapeFolder
                            );
                          }}
                        >
                          Browse Folders...
                        </button>
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          style={styles.secondaryBtn}
                          onClick={() => setScrapeOutputDir(defaultScrapeFolder)}
                        >
                          Use Default Folder
                        </button>
                        <button
                          type="button"
                          style={styles.secondaryBtn}
                          onClick={() => setScrapeModalOpen(false)}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          style={styles.primaryBtn}
                          onClick={() => {
                            setScrapeModalOpen(false);
                            void runJob(
                              '/api/jobs/scrape',
                              {
                                target: scrapeTarget,
                                engine:
                                  selectedEngines.length > 0
                                    ? selectedEngines.join(',')
                                    : 'bing,ddg',
                                max_per_query: Math.max(
                                  1,
                                  parseInt(maxPerQuery, 10) || 40
                                ),
                                max_total: Math.max(
                                  1,
                                  parseInt(maxPerQuery, 10) || 40
                                ),
                                output_dir: scrapeOutputDir.trim(),
                                selected_queries: selectedQueries.filter((q) =>
                                  (scrapeTarget === 'all'
                                    ? ALL_SCRAPE_QUERIES
                                    : SCRAPE_QUERY_OPTIONS[scrapeTarget].flatMap(
                                        (g) => g.queries
                                      )
                                  ).includes(q)
                                ),
                              },
                              `Scrape ${scrapeTarget} images`
                            );
                          }}
                        >
                          Start Scraping
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {folderExplorerOpen && (
                  <div
                    role="dialog"
                    aria-modal="true"
                    onClick={() => setFolderExplorerOpen(false)}
                    style={{
                      position: 'fixed',
                      inset: 0,
                      backgroundColor: 'rgba(26, 38, 22, 0.55)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 16,
                      zIndex: 10000,
                    }}
                  >
                    <div
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: 14,
                        border: '1px solid #CFE3C4',
                        maxWidth: 540,
                        width: '100%',
                        padding: 20,
                        boxShadow: '0 14px 36px rgba(26, 38, 22, 0.25)',
                      }}
                    >
                      <h3 style={{ margin: '0 0 8px', fontSize: 16, color: '#294A1F' }}>
                        Select Download Directory
                      </h3>

                      {explorerError ? (
                        <p style={{ fontSize: 13, color: '#9B1C1C', margin: '8px 0 12px' }}>
                          {explorerError}
                        </p>
                      ) : (
                        <>
                          {explorerData?.shortcuts && (
                            <div
                              style={{
                                display: 'flex',
                                gap: 6,
                                flexWrap: 'wrap',
                                marginBottom: 10,
                              }}
                            >
                              {explorerData.shortcuts.map((sc) => (
                                <button
                                  key={sc.path}
                                  type="button"
                                  style={{
                                    ...styles.secondaryBtn,
                                    fontSize: 11,
                                    padding: '4px 8px',
                                  }}
                                  onClick={() => void loadExplorerPath(sc.path)}
                                >
                                  {sc.label}
                                </button>
                              ))}
                            </div>
                          )}

                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              gap: 8,
                              padding: '6px 10px',
                              backgroundColor: '#F4F8F1',
                              border: '1px solid #CFE3C4',
                              borderRadius: 8,
                              marginBottom: 8,
                              fontSize: 12,
                            }}
                          >
                            <code style={{ wordBreak: 'break-all' }}>
                              {explorerData?.currentPath || 'Loading...'}
                            </code>
                            {explorerData?.parentPath && (
                              <button
                                type="button"
                                style={{
                                  ...styles.secondaryBtn,
                                  fontSize: 11,
                                  padding: '4px 8px',
                                }}
                                onClick={() =>
                                  void loadExplorerPath(
                                    explorerData.parentPath!
                                  )
                                }
                              >
                                Up (..)
                              </button>
                            )}
                          </div>

                          <div
                            style={{
                              maxHeight: 220,
                              overflowY: 'auto',
                              border: '1px solid #E6F0E0',
                              borderRadius: 8,
                              padding: 6,
                              marginBottom: 12,
                            }}
                          >
                            {(explorerData?.dirs ?? []).length === 0 ? (
                              <div style={{ fontSize: 12, color: '#6B7D65', padding: 8 }}>
                                No subfolders in this directory.
                              </div>
                            ) : (
                              explorerData?.dirs.map((d) => (
                                <button
                                  key={d.path}
                                  type="button"
                                  onClick={() => void loadExplorerPath(d.path)}
                                  style={{
                                    display: 'block',
                                    width: '100%',
                                    textAlign: 'left',
                                    padding: '6px 10px',
                                    border: 'none',
                                    backgroundColor: 'transparent',
                                    cursor: 'pointer',
                                    fontSize: 13,
                                    color: '#1A2616',
                                    borderRadius: 6,
                                  }}
                                >
                                  📁 {d.name}
                                </button>
                              ))
                            )}
                          </div>
                        </>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        <button
                          type="button"
                          style={styles.secondaryBtn}
                          onClick={() => setFolderExplorerOpen(false)}
                        >
                          Cancel
                        </button>
                        {explorerData?.currentPath && (
                          <button
                            type="button"
                            style={styles.primaryBtn}
                            onClick={() => {
                              setScrapeOutputDir(explorerData.currentPath);
                              setFolderExplorerOpen(false);
                            }}
                          >
                            Select This Folder
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              )}

              {pipelineStepTab === 'clip' && (
              <div style={{ ...styles.stepBox, width: '100%', boxSizing: 'border-box' }}>
                <h3 style={styles.stepTitle}>
                  2. CLIP Auto-Filter
                  <WebHelpButton
                    help={{
                      title: '2. CLIP Auto-Filter',
                      whatItDoes:
                        'Uses OpenAI CLIP to score scraped or local photos, reject off-topic junk (furniture, food, charts), and sort real walnut photos into canopy/ground class folders.',
                      howToDoIt: [
                        'Choose "Section Target" (all, ground, or canopy) to filter everything or only one section.',
                        'Adjust "Min Confidence" (default 0.28) — raise it for stricter filtering or lower it to keep more borderline images.',
                        'Leave "Source Folder" blank to use default raw_scraped/, or enter a custom folder path (or click "Use Step 1 Folder").',
                        'Click "Run CLIP Filter".',
                      ],
                      whatToExpect:
                        'Valid orchard photos copy to CLIP_Curated/ ("CLIP Curated") and export to datasets/walnut_classify/, while off-topic photos copy to rejected_by_clip/ ("CLIP Rejected"). Full logs stream below and save to Convex.',
                    }}
                  />
                </h3>
                <p style={styles.stepDesc}>
                  Removes non-orchard images and sorts valid walnut photos into
                  class folders. Choose All, Ground only, or Canopy only.
                </p>
                <div
                  style={{
                    marginTop: 8,
                    marginBottom: 12,
                    padding: 10,
                    borderRadius: 8,
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #CFE3C4',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                    }}
                    onClick={() => setClipPromptsExpanded((prev) => !prev)}
                  >
                    <strong style={{ fontSize: 12, color: '#294A1F' }}>
                      CLIP Prompts (
                      {
                        CLIP_POSITIVE_PROMPTS.filter(
                          (p) => clipTarget === 'all' || p.target === clipTarget
                        ).length
                      }{' '}
                      positive + {CLIP_NEGATIVE_PROMPTS.length} negative active for{' '}
                      {clipTarget})
                    </strong>
                    <span style={{ fontSize: 11, color: '#4B633F', fontWeight: 600 }}>
                      {clipPromptsExpanded ? '▴ Hide' : '▾ Show'}
                    </span>
                  </div>
                  {clipPromptsExpanded && (
                    <div
                      style={{
                        marginTop: 10,
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                        gap: 12,
                        fontSize: 12,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontWeight: 700,
                            color: '#2F4625',
                            marginBottom: 6,
                          }}
                        >
                          Positive Prompts (Accepted Classes)
                        </div>
                        <ul
                          style={{
                            margin: 0,
                            paddingLeft: 18,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 6,
                          }}
                        >
                          {CLIP_POSITIVE_PROMPTS.map((item) => {
                            const active =
                              clipTarget === 'all' || item.target === clipTarget;
                            return (
                              <li
                                key={`${item.target}/${item.className}`}
                                style={{
                                  opacity: active ? 1 : 0.45,
                                  color: '#1F2F18',
                                }}
                              >
                                <strong>
                                  {item.target}/{item.className}
                                </strong>
                                {!active && ' (inactive for current target)'}:{' '}
                                <span style={{ color: '#4B633F' }}>
                                  "{item.prompt}"
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                      <div>
                        <div
                          style={{
                            fontWeight: 700,
                            color: '#7A2E2E',
                            marginBottom: 6,
                          }}
                        >
                          Negative Prompts (Always Rejected)
                        </div>
                        <ul
                          style={{
                            margin: 0,
                            paddingLeft: 18,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 6,
                            color: '#4A2B2B',
                          }}
                        >
                          {CLIP_NEGATIVE_PROMPTS.map((prompt) => (
                            <li key={prompt}>"{prompt}"</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 12,
                    alignItems: 'flex-end',
                    marginBottom: 10,
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label
                      htmlFor="clip-target-select"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        fontSize: 12,
                        fontWeight: 700,
                        color: '#2F4625',
                      }}
                    >
                      Section Target
                      <WebHelpButton
                        help={{
                          title: 'CLIP Section Target',
                          whatItDoes:
                            'Controls which scraped folder and CLIP prompts are evaluated during filtering.',
                          howToDoIt: [
                            'Select "all (ground + canopy)" to filter every image against all 5 walnut classes.',
                            'Select "ground" to scan raw_scraped/ground/ using only ground walnut prompts (in-shell and in-hull).',
                            'Select "canopy" to scan raw_scraped/canopy/ using only canopy prompts (green, hull-split, blight-damaged).',
                          ],
                          whatToExpect:
                            'Running ground and canopy separately prevents cross-misclassification and preserves the other section in clip_classification_report.json.',
                        }}
                      />
                    </label>
                    <select
                      id="clip-target-select"
                      value={clipTarget}
                      onChange={(e) =>
                        setClipTarget(
                          e.target.value as 'all' | 'ground' | 'canopy'
                        )
                      }
                      style={styles.select}
                      aria-label="CLIP target section"
                    >
                      <option value="all">all (ground + canopy)</option>
                      <option value="ground">ground</option>
                      <option value="canopy">canopy</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label
                      htmlFor="clip-confidence-input"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        fontSize: 12,
                        fontWeight: 700,
                        color: '#2F4625',
                      }}
                    >
                      Min Confidence
                      <WebHelpButton
                        help={{
                          title: 'CLIP Minimum Confidence',
                          whatItDoes:
                            'Sets the minimum CLIP probability score (0.05 to 0.95) required to accept an image into Curated.',
                          howToDoIt: [
                            'Default is 0.28. Increase (e.g. 0.35–0.45) to be stricter and reject ambiguous photos.',
                            'Decrease (e.g. 0.20) if too many valid walnut photos are being rejected.',
                          ],
                          whatToExpect:
                            'Any image scoring below this threshold—or matching a negative junk prompt (wood, food, packaging)—is copied to rejected_by_clip/.',
                        }}
                      />
                    </label>
                    <input
                      id="clip-confidence-input"
                      type="number"
                      min="0.05"
                      max="0.95"
                      step="0.02"
                      value={clipConfidence}
                      onChange={(e) => setClipConfidence(e.target.value)}
                      style={{ ...styles.numInput, width: 96 }}
                      title="Minimum CLIP confidence (default 0.28)"
                      aria-label="CLIP confidence threshold"
                    />
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                      flex: 1,
                      minWidth: 240,
                    }}
                  >
                    <label
                      htmlFor="clip-source-folder-input"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        fontSize: 12,
                        fontWeight: 700,
                        color: '#2F4625',
                      }}
                    >
                      Source Folder (optional)
                      <WebHelpButton
                        help={{
                          title: 'CLIP Source Folder',
                          whatItDoes:
                            'Specifies which folder CLIP reads raw images from.',
                          howToDoIt: [
                            'Leave blank to use the default backend/yolo/dataset_builder/raw_scraped folder.',
                            'Or paste any local folder path (or click "Use Step 1 Folder" if you set a custom Download Folder in Step 1).',
                          ],
                          whatToExpect:
                            'CLIP scans the selected folder (or its /ground or /canopy subfolder when Section Target is set) recursively for .jpg, .jpeg, .png, and .webp files.',
                        }}
                      />
                    </label>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        id="clip-source-folder-input"
                        type="text"
                        value={clipInputDir}
                        onChange={(e) => setClipInputDir(e.target.value)}
                        placeholder="Blank = default raw_scraped"
                        style={{ ...styles.input, marginBottom: 0, flex: 1 }}
                        aria-label="CLIP source folder"
                      />
                      {scrapeOutputDir.trim() && clipInputDir !== scrapeOutputDir && (
                        <button
                          type="button"
                          style={styles.secondaryBtn}
                          onClick={() => setClipInputDir(scrapeOutputDir)}
                        >
                          Use Step 1 Folder
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  style={styles.primaryBtn}
                  onClick={() =>
                    runJob(
                      '/api/jobs/clip-filter',
                      {
                        target: clipTarget,
                        confidence: Number(clipConfidence) || 0.28,
                        export_yolo_cls: true,
                        input_dir: clipInputDir.trim() || undefined,
                      },
                      `CLIP Auto-Filter (${clipTarget})`
                    )
                  }
                >
                  Run CLIP Filter ({clipTarget})
                </button>
                {renderStepProgress(
                  'CLIP Filter Progress',
                  ['CLIP', '2_clip_filter'],
                  'Ready. Click "Run CLIP Filter" to sort raw scraped images.'
                )}
              </div>
              )}

              {pipelineStepTab === 'label' && (
              <div style={{ ...styles.stepBox, width: '100%', boxSizing: 'border-box' }}>
                <h3 style={styles.stepTitle}>
                  3. Labeling & Split
                  <WebHelpButton
                    help={{
                      title: '3. Labeling & Split',
                      whatItDoes:
                        'Prepares classes.txt, opens labelImg to draw bounding boxes on CLIP_Curated walnut photos, and splits labeled pairs 80% train / 15% val / 5% test for YOLO11.',
                      howToDoIt: [
                        'Choose "Section Target" (all, ground, or canopy) to work on both sections or one folder individually.',
                        'Click "Launch labelImg" to open the desktop annotator (classes.txt is generated automatically if missing).',
                        'After saving YOLO .txt annotations, click "Finalize Splits" to export the train/val/test dataset.',
                      ],
                      whatToExpect:
                        'The "Training Ready" counter updates with the total number of labeled images ready for YOLO11 training.',
                    }}
                  />
                </h3>
                <p style={styles.stepDesc}>
                  Select a section (All, Ground, or Canopy), launch{' '}
                  <code>labelImg</code>, or finalize 80/15/5 train/val/test
                  splits.
                </p>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 12,
                    alignItems: 'flex-end',
                    marginBottom: 10,
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label
                      htmlFor="label-target-select"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        fontSize: 12,
                        fontWeight: 700,
                        color: '#2F4625',
                      }}
                    >
                      Section Target
                      <WebHelpButton
                        help={{
                          title: 'Labeling Section Target',
                          whatItDoes:
                            'Selects which CLIP_Curated folder to label and split.',
                          howToDoIt: [
                            'Choose "all (ground + canopy)" to open CLIP_Curated/ or split both datasets.',
                            'Choose "ground" to label and split CLIP_Curated/ground/ only.',
                            'Choose "canopy" to label and split CLIP_Curated/canopy/ only.',
                          ],
                          whatToExpect:
                            'Launch labelImg opens the selected folder with its matching classes.txt; Finalize Splits exports only the chosen section.',
                        }}
                      />
                    </label>
                    <select
                      id="label-target-select"
                      value={labelTarget}
                      onChange={(e) =>
                        setLabelTarget(
                          e.target.value as 'all' | 'ground' | 'canopy'
                        )
                      }
                      style={styles.select}
                      aria-label="Labeling target section"
                    >
                      <option value="all">all (ground + canopy)</option>
                      <option value="ground">ground</option>
                      <option value="canopy">canopy</option>
                    </select>
                  </div>
                </div>
                <div style={styles.row}>
                  <button
                    style={styles.secondaryBtn}
                    onClick={() =>
                      runJob(
                        '/api/jobs/labeling',
                        { action: 'setup_classes', target_folder: labelTarget },
                        `Setup classes.txt (${labelTarget})`
                      )
                    }
                  >
                    Setup classes.txt ({labelTarget})
                  </button>
                  <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                    <button
                      style={styles.primaryBtn}
                      onClick={() =>
                        runJob(
                          '/api/jobs/labeling',
                          { action: 'launch_labelimg', target_folder: labelTarget },
                          `Launch labelImg (${labelTarget})`
                        )
                      }
                    >
                      Launch labelImg ({labelTarget})
                    </button>
                    <WebHelpButton
                      help={{
                        title: 'How to Use labelImg (First-Time Guide)',
                        whatItDoes:
                          'Opens the labelImg desktop window pre-loaded with your CLIP_Curated images and walnut class names.',
                        howToDoIt: [
                          '1. Switch format to YOLO: On the left toolbar, click "PascalVOC" until it changes to "YOLO" (this ensures .txt files are saved instead of .xml).',
                          '2. Check Save Location: Save labels in the SAME folder as the image (e.g. CLIP_Curated/ground/walnut_in_shell/image_01.txt right next to image_01.jpg). If labelImg opens a subfolder, use "Open Dir" on a class subfolder so images and .txt files stay together.',
                          '3. Draw boxes: Press W to draw a bounding box around each walnut, pick the class from the popup, then press D (Next) and Ctrl+S (Save)—or turn on View → Auto Save Mode.',
                          '4. No walnuts in image (Background / Negative sample): If an orchard photo has zero walnuts and you want YOLO to learn "no nuts here", turn on View → Auto Save Mode and press D (or press Space to Verify) — labelImg will write a blank 0-byte .txt file even though Save is grayed out. (If the photo is off-topic junk, delete the image instead.)',
                          '5. Split for YOLO: Close labelImg when done and click "Finalize Splits" to automatically copy paired images into images/{train,val,test}/ and .txt files into labels/{train,val,test}/.',
                        ],
                        whatToExpect:
                          'Each labeled photo gets a matching .txt file next to it in CLIP_Curated/, and "Finalize Splits" builds the final YOLO images/ and labels/ folders inside backend/yolo/datasets/.',
                      }}
                    />
                  </span>
                  <button
                    style={styles.secondaryBtn}
                    onClick={() =>
                      runJob(
                        '/api/jobs/labeling',
                        { action: 'finalize_splits', target_folder: labelTarget },
                        `Finalize Splits (${labelTarget})`
                      )
                    }
                  >
                    Finalize Splits ({labelTarget})
                  </button>
                </div>
                {renderStepProgress(
                  'Labeling & Split Progress',
                  ['Labeling', 'labelImg', 'Splits', '3_prepare_for_labeling'],
                  'Ready. Select a section and launch labelImg or click "Finalize Splits".'
                )}
              </div>
              )}

              {pipelineStepTab === 'import' && (
              <div style={{ ...styles.stepBox, width: '100%', boxSizing: 'border-box' }}>
                <h3 style={styles.stepTitle}>
                  4. Import WalnutData (30k)
                  <WebHelpButton
                    help={{
                      title: '4. Import WalnutData (30k)',
                      whatItDoes:
                        'Imports the pre-labeled 1wuming/WalnutData dataset from a local folder or Hugging Face to boost training accuracy.',
                      howToDoIt: [
                        'Enter your local folder path and click "Import Local", or click "Download HF" to fetch directly from Hugging Face.',
                      ],
                      whatToExpect:
                        'Up to 3,000 labeled walnut samples are remapped and added to your training-ready dataset.',
                    }}
                  />
                </h3>
                <p style={styles.stepDesc}>
                  Import <code>1wuming/WalnutData</code> from local folder or
                  Hugging Face.
                </p>
                <input
                  style={styles.input}
                  value={walnutDataPath}
                  onChange={(e) => setWalnutDataPath(e.target.value)}
                />
                <div style={styles.row}>
                  <button
                    style={styles.secondaryBtn}
                    onClick={() =>
                      runJob(
                        '/api/jobs/import-walnutdata',
                        {
                          source_path: walnutDataPath,
                          download_hf: false,
                          remap_mode: 'unified',
                          max_samples: 3000,
                        },
                        'Import Local WalnutData'
                      )
                    }
                  >
                    Import Local
                  </button>
                  <button
                    style={styles.secondaryBtn}
                    onClick={() =>
                      runJob(
                        '/api/jobs/import-walnutdata',
                        {
                          source_path: '',
                          download_hf: true,
                          remap_mode: 'unified',
                          max_samples: 3000,
                        },
                        'Download from Hugging Face'
                      )
                    }
                  >
                    Download HF
                  </button>
                </div>
                {renderStepProgress(
                  'WalnutData Import Progress',
                  ['WalnutData', '4_import_walnutdata'],
                  'Ready. Import from local folder or Hugging Face.'
                )}
              </div>
              )}
            </div>
          </section>

          <section style={styles.card}>
            <div style={styles.rowBetween}>
              <h2 style={styles.cardTitle}>
                YOLO11 Model Training
                <WebHelpButton
                  help={{
                    title: 'YOLO11 Model Training',
                    whatItDoes:
                      'Trains the Canopy Counter (yolo11s), Ground Picker (yolo11n), or Health Classifier (yolo11n-cls) model on your Training Ready dataset.',
                    howToDoIt: [
                      'Ensure "Training Ready" > 0 from Steps 1-4.',
                      'Choose "Run on VPS Docker" (local/server GPU) or "Run on Google Colab" (free/cloud GPU).',
                      'Click the model button you want to train (e.g., Train Canopy Counter).',
                    ],
                    whatToExpect:
                      'Training logs stream in the console below and export .pt weights upon completion.',
                  }}
                />
              </h2>
              <div style={styles.row}>
                <button
                  style={{
                    ...styles.pillSwitch,
                    ...(trainTarget === 'vps' ? styles.pillSwitchActive : {}),
                  }}
                  onClick={() => setTrainTarget('vps')}
                >
                  Run on VPS Docker
                </button>
                <button
                  style={{
                    ...styles.pillSwitch,
                    ...(trainTarget === 'colab' ? styles.pillSwitchActive : {}),
                  }}
                  onClick={() => setTrainTarget('colab')}
                >
                  Run on Google Colab
                </button>
              </div>
            </div>

            {trainTarget === 'vps' ? (
              <>
                <div style={styles.row}>
                  <button
                    style={styles.trainBtn}
                    onClick={() =>
                      runJob(
                        '/api/jobs/train-yolo11',
                        { mode: 'canopy', arch: 'yolo11', epochs: 50, batch: 16 },
                        'Train Canopy (yolo11s.pt)'
                      )
                    }
                  >
                    Train Canopy Counter (yolo11s)
                  </button>
                  <button
                    style={styles.trainBtn}
                    onClick={() =>
                      runJob(
                        '/api/jobs/train-yolo11',
                        { mode: 'ground', arch: 'yolo11', epochs: 50, batch: 16 },
                        'Train Ground (yolo11n.pt)'
                      )
                    }
                  >
                    Train Ground Picker (yolo11n)
                  </button>
                  <button
                    style={styles.trainBtn}
                    onClick={() =>
                      runJob(
                        '/api/jobs/train-yolo11',
                        {
                          mode: 'classify',
                          arch: 'yolo11',
                          epochs: 30,
                          batch: 32,
                        },
                        'Train Classifier (yolo11n-cls.pt)'
                      )
                    }
                  >
                    Train Classifier (yolo11n-cls)
                  </button>
                </div>

                <pre style={styles.console}>
                  {(() => {
                    if (!workerOnline) {
                      return `[Worker Offline] Waiting for worker at ${workerUrl}`;
                    }
                    const trainingLogs = (statusData?.job.logs ?? []).filter(
                      (line) =>
                        line.includes('Train ') ||
                        line.includes('train.py') ||
                        line.toLowerCase().includes('epoch') ||
                        line.toLowerCase().includes('yolo11') ||
                        line.toLowerCase().includes('ultralytics')
                    );
                    if (trainingLogs.length > 0) {
                      return trainingLogs.join('\n');
                    }
                    return '[YOLO11 Training Console] Ready. Click a Train button above to stream training progress.';
                  })()}
                </pre>
              </>
            ) : (
              <div style={styles.colabBox}>
                <p style={styles.cardDesc}>
                  For fast GPU training, run these two commands inside your{' '}
                  <a href={colabUrl} target="_blank" rel="noreferrer">
                    Google Colab Notebook
                  </a>
                  , then copy <code>best.pt</code> into <code>/weights</code>:
                </p>
                <pre style={styles.console}>
                  {`!pip install ultralytics\n!yolo detect train data=walnut_canopy.yaml model=yolo11s.pt epochs=100 imgsz=640\n!yolo detect train data=walnut_ground.yaml model=yolo11n.pt epochs=100 imgsz=640`}
                </pre>
              </div>
            )}
          </section>
        </>
      )}

      {/* TAB 3: USERS & ORCHARD ANALYTICS */}
      {activeTab === 'analytics' && (
        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Orchard Users & Yield Analytics</h2>
          <p style={styles.cardDesc}>
            Overview of registered walnut growers, orchard areas, and synced
            field scans.
          </p>

          <div style={styles.kpiRow}>
            <div style={styles.kpiBox}>
              <div style={styles.kpiVal}>1,133</div>
              <div style={styles.kpiLbl}>Est. Tracked Nuts</div>
            </div>
            <div style={styles.kpiBox}>
              <div style={styles.kpiVal}>14.2 kg</div>
              <div style={styles.kpiLbl}>Est. Orchard Yield</div>
            </div>
            <div style={styles.kpiBox}>
              <div style={styles.kpiVal}>36.5 mm</div>
              <div style={styles.kpiLbl}>Avg Nut Diameter</div>
            </div>
            <div style={styles.kpiBox}>
              <div style={styles.kpiVal}>95%</div>
              <div style={styles.kpiLbl}>Avg Tree Health</div>
            </div>
          </div>

          <div style={styles.tableBox}>
            <div style={styles.tableRow}>
              <strong>Tree #01 • North Grove (Chandler)</strong>
              <span>384 nuts • 4.8 kg • 68% Moisture</span>
            </div>
            <div style={styles.tableRow}>
              <strong>Tree #02 • Creek Side (Hartley)</strong>
              <span>560 nuts • 7.1 kg • 74% Moisture</span>
            </div>
            <div style={styles.tableRow}>
              <strong>Tree #03 • Sunny Slope (Franquette)</strong>
              <span>189 nuts • 2.3 kg • 61% Moisture</span>
            </div>
          </div>
        </section>
      )}

      {/* TAB 4: VPS WORKER & ENDPOINT LINKS SETUP */}
      {activeTab === 'endpoints' && (
        <section style={styles.card}>
          <h2 style={styles.cardTitle}>
            VPS Worker IP / Domain & Training Links Setup
          </h2>
          <p style={styles.cardDesc}>
            Update your background worker URL, VPS IP, or Google Colab notebook
            link anytime without redeploying the web app.
          </p>

          <label style={styles.label}>
            Background ML Worker URL (Local PC or VPS HTTPS Domain)
          </label>
          <input
            style={styles.input}
            value={workerUrl}
            onChange={(e) => setWorkerUrl(e.target.value)}
            placeholder="https://ml-walnut.pinarlik.com or http://127.0.0.1:8000"
          />

          <label style={styles.label}>
            Optional Admin Worker Token (x-admin-token)
          </label>
          <input
            type="password"
            style={styles.input}
            value={workerToken}
            onChange={(e) => setWorkerToken(e.target.value)}
            placeholder="Matches ADMIN_WORKER_TOKEN on your VPS"
          />

          <label style={styles.label}>Google Colab Training Notebook URL</label>
          <input
            style={styles.input}
            value={colabUrl}
            onChange={(e) => setColabUrl(e.target.value)}
            placeholder="https://colab.research.google.com/..."
          />

          <button style={styles.primaryBtn} onClick={saveEndpoints}>
            Save Endpoint & Link Settings
          </button>
        </section>
      )}

      {/* TAB 5: SENSORS & SWITCHES SHOP */}
      {activeTab === 'shop' && (
        <ShopAdminTab
          hasConvex={hasConvex}
          onNotice={setNotice}
          styles={styles}
        />
      )}

      <footer
        style={{
          marginTop: 28,
          paddingTop: 14,
          borderTop: '1px solid #d5e5cc',
          display: 'flex',
          gap: 14,
          flexWrap: 'wrap',
          fontSize: 12,
          color: '#4d5d47',
        }}
      >
        <button
          style={{ ...styles.secondaryBtn, padding: '4px 10px', fontSize: 12 }}
          onClick={() => navigateLegal('privacy')}
        >
          Privacy Policy
        </button>
        <button
          style={{ ...styles.secondaryBtn, padding: '4px 10px', fontSize: 12 }}
          onClick={() => navigateLegal('cookies')}
        >
          Cookie Policy
        </button>
        <button
          style={{ ...styles.secondaryBtn, padding: '4px 10px', fontSize: 12 }}
          onClick={() => navigateLegal('terms')}
        >
          Terms & Conditions
        </button>
        <button
          style={{ ...styles.secondaryBtn, padding: '4px 10px', fontSize: 12 }}
          onClick={() => navigateLegal('account-deletion')}
        >
          Account Deletion
        </button>
      </footer>
    </div>
  );

  if (!hasClerk) {
    if (import.meta.env.PROD) {
      return (
        <div style={styles.authGate}>
          <div style={styles.authCard}>
            <h1 style={styles.title}>Authentication Not Configured</h1>
            <p style={styles.subtitle}>
              Clerk authentication is required in production. Set{' '}
              <code>VITE_CLERK_PUBLISHABLE_KEY</code> to enable admin access.
            </p>
          </div>
        </div>
      );
    }
    return renderAdminWorkspace();
  }

  return (
    <>
      <Show when="signed-in">
        <AdminRoleGate
          hasConvex={hasConvex}
          authCardStyle={styles.authCard}
          authGateStyle={styles.authGate}
          titleStyle={styles.title}
          subtitleStyle={styles.subtitle}
          primaryBtnStyle={styles.primaryBtn}
        >
          {renderAdminWorkspace()}
        </AdminRoleGate>
      </Show>
      <Show when="signed-out">
        <div style={styles.authGate}>
          <div style={styles.authCard}>
            <h1 style={styles.title}>WalnutIQ Admin Portal</h1>
            <p style={styles.subtitle}>
              Authorized administrator access only. Sign in to manage mobile app
              care defaults, orchard analytics, and dataset training.
            </p>
            <SignInButton mode="modal">
              <button style={styles.primaryBtn}>Sign In to Admin Portal</button>
            </SignInButton>
            <div
              style={{
                marginTop: 18,
                display: 'flex',
                justifyContent: 'center',
                gap: 10,
                flexWrap: 'wrap',
              }}
            >
              <button
                style={{ ...styles.secondaryBtn, fontSize: 11, padding: '4px 8px' }}
                onClick={() => navigateLegal('privacy')}
              >
                Privacy Policy
              </button>
              <button
                style={{ ...styles.secondaryBtn, fontSize: 11, padding: '4px 8px' }}
                onClick={() => navigateLegal('cookies')}
              >
                Cookies
              </button>
              <button
                style={{ ...styles.secondaryBtn, fontSize: 11, padding: '4px 8px' }}
                onClick={() => navigateLegal('terms')}
              >
                Terms
              </button>
              <button
                style={{ ...styles.secondaryBtn, fontSize: 11, padding: '4px 8px' }}
                onClick={() => navigateLegal('account-deletion')}
              >
                Data Deletion
              </button>
            </div>
          </div>
        </div>
      </Show>
    </>
  );
}

function ConvexPipelineLogger({
  statusData,
  scrapeTarget,
  selectedEngines,
}: {
  statusData: PipelineStatusResponse | null;
  scrapeTarget: string;
  selectedEngines: string[];
}) {
  const { isAuthenticated } = useConvexAuth();
  const savePipelineLog = useMutation(anyApi.logs.savePipelineLog);
  const lastSavedKeyRef = useRef<string>('');

  useEffect(() => {
    const job = statusData?.job;
    if (!isAuthenticated || !job || !job.activeJob) return;
    if (job.status !== 'COMPLETED' && job.status !== 'FAILED') return;

    const key = `${job.activeJob}:${job.finishedAt ?? job.startedAt ?? job.logs.length}`;
    if (lastSavedKeyRef.current === key) return;
    lastSavedKeyRef.current = key;

    const lower = job.activeJob.toLowerCase();
    const category = lower.includes('scrape')
      ? 'scrape'
      : lower.includes('clip')
        ? 'clip'
        : lower.includes('label') || lower.includes('split')
          ? 'labeling'
          : lower.includes('walnutdata')
            ? 'import'
            : 'training';

    void savePipelineLog({
      category,
      jobName: job.activeJob,
      status: job.status,
      target: category === 'scrape' ? scrapeTarget : undefined,
      engines: category === 'scrape' ? selectedEngines : undefined,
      logs: job.logs,
    }).catch((err) => {
      console.warn('Convex pipeline log save failed:', err);
    });
  }, [
    isAuthenticated,
    statusData,
    scrapeTarget,
    selectedEngines,
    savePipelineLog,
  ]);

  return null;
}

function ConvexSyncAdminRole({
  displayName,
}: {
  displayName: string;
}) {
  const { isAuthenticated } = useConvexAuth();
  const syncUser = useMutation(anyApi.users.syncCurrentUser);
  useEffect(() => {
    if (!isAuthenticated) return;
    syncUser({
      displayName,
      authProvider: 'google',
    }).catch((err) => {
      console.warn('Admin role sync failed:', err);
    });
  }, [isAuthenticated, displayName, syncUser]);
  return null;
}

function AdminRoleGate({
  hasConvex,
  children,
  authGateStyle,
  authCardStyle,
  titleStyle,
  subtitleStyle,
  primaryBtnStyle,
}: {
  hasConvex: boolean;
  children: React.ReactNode;
  authGateStyle: React.CSSProperties;
  authCardStyle: React.CSSProperties;
  titleStyle: React.CSSProperties;
  subtitleStyle: React.CSSProperties;
  primaryBtnStyle: React.CSSProperties;
}) {
  const { isLoaded, user } = useUser();

  if (!isLoaded) {
    return (
      <div style={authGateStyle}>
        <div style={authCardStyle}>
          <p style={subtitleStyle}>Verifying admin permissions...</p>
        </div>
      </div>
    );
  }

  const email = (user?.primaryEmailAddress?.emailAddress || '')
    .trim()
    .toLowerCase();
  const isAdmin = email === ADMIN_EMAIL;

  if (!isAdmin) {
    return (
      <div style={authGateStyle}>
        <div style={authCardStyle}>
          {hasConvex && user && (
            <ConvexSyncAdminRole
              displayName={user.fullName || email || 'Grower'}
            />
          )}
          <h1 style={titleStyle}>Admin Access Restricted</h1>
          <p style={subtitleStyle}>
            Signed in as <strong>{email || 'Unknown user'}</strong>. This
            account does not have administrator permissions for this portal.
          </p>
          <SignOutButton>
            <button style={primaryBtnStyle}>Sign Out</button>
          </SignOutButton>
        </div>
      </div>
    );
  }

  return (
    <>
      {hasConvex && user && (
        <ConvexSyncAdminRole
          displayName={user.fullName || 'WalnutIQ Admin'}
        />
      )}
      {children}
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: 1100,
    margin: '0 auto',
    padding: '24px 20px 60px',
    color: '#1a2616',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    backgroundColor: '#e4f0dc',
    padding: '18px 22px',
    borderRadius: 16,
    border: '1px solid #b5d4a3',
    marginBottom: 16,
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    margin: 0,
    fontSize: 22,
    fontWeight: 800,
  },
  subtitle: {
    margin: '4px 0 0',
    fontSize: 13,
    color: '#465e3e',
  },
  workerBadge: {
    padding: '6px 12px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
  },
  tabBar: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  tabBtn: {
    backgroundColor: '#ffffff',
    border: '1px solid #cfe3c4',
    color: '#25421b',
    padding: '10px 16px',
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 800,
    cursor: 'pointer',
  },
  tabBtnActive: {
    backgroundColor: '#568844',
    borderColor: '#467036',
    color: '#ffffff',
  },
  banner: {
    backgroundColor: '#cfe3c4',
    border: '1px solid #6b9e58',
    padding: '10px 14px',
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    border: '1px solid #d5e6cb',
    marginBottom: 16,
  },
  cardTitle: {
    margin: '0 0 6px',
    fontSize: 17,
    fontWeight: 800,
  },
  cardDesc: {
    margin: '0 0 14px',
    fontSize: 13,
    color: '#465e3e',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 12,
    marginBottom: 12,
  },
  label: {
    display: 'block',
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 4,
    color: '#25421b',
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '9px 11px',
    borderRadius: 8,
    border: '1px solid #b5d4a3',
    fontSize: 13,
    marginBottom: 12,
  },
  textarea: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '9px 11px',
    borderRadius: 8,
    border: '1px solid #b5d4a3',
    fontSize: 13,
    marginBottom: 14,
    fontFamily: 'inherit',
  },
  kpiRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 10,
    marginBottom: 16,
  },
  kpiBox: {
    backgroundColor: '#ffffff',
    border: '1px solid #cfe3c4',
    borderRadius: 12,
    padding: '12px 10px',
    textAlign: 'center',
  },
  kpiVal: {
    fontSize: 18,
    fontWeight: 900,
  },
  kpiLbl: {
    fontSize: 11,
    color: '#465e3e',
    fontWeight: 600,
    marginTop: 2,
  },
  stepsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 12,
  },
  stepBox: {
    backgroundColor: '#f3f8ef',
    border: '1px solid #cfe3c4',
    borderRadius: 12,
    padding: 14,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  stepTitle: {
    margin: '0 0 6px',
    fontSize: 14,
    fontWeight: 800,
  },
  stepDesc: {
    margin: '0 0 10px',
    fontSize: 12,
    color: '#465e3e',
    lineHeight: 1.45,
  },
  row: {
    display: 'flex',
    gap: 8,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  rowBetween: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  select: {
    flex: 1,
    padding: '8px',
    borderRadius: 8,
    border: '1px solid #b5d4a3',
    fontSize: 12,
  },
  numInput: {
    width: 60,
    padding: '8px',
    borderRadius: 8,
    border: '1px solid #b5d4a3',
    fontSize: 12,
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: '#568844',
    color: '#ffffff',
    border: 'none',
    borderRadius: 9,
    padding: '10px 14px',
    fontSize: 13,
    fontWeight: 800,
    cursor: 'pointer',
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: '#cfe3c4',
    color: '#1a2616',
    border: '1px solid #9bc486',
    borderRadius: 8,
    padding: '8px 10px',
    fontSize: 11,
    fontWeight: 800,
    cursor: 'pointer',
  },
  pillSwitch: {
    backgroundColor: '#f3f8ef',
    border: '1px solid #b5d4a3',
    borderRadius: 8,
    padding: '7px 12px',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
  },
  pillSwitchActive: {
    backgroundColor: '#25421b',
    color: '#ffffff',
    borderColor: '#25421b',
  },
  trainBtn: {
    flex: 1,
    backgroundColor: '#8c5a32',
    color: '#ffffff',
    border: 'none',
    borderRadius: 10,
    padding: '11px 12px',
    fontSize: 12,
    fontWeight: 800,
    cursor: 'pointer',
  },
  console: {
    marginTop: 12,
    backgroundColor: '#131d10',
    color: '#e2f1dc',
    padding: 14,
    borderRadius: 12,
    fontSize: 12,
    lineHeight: 1.5,
    maxHeight: 240,
    overflowY: 'auto',
    fontFamily: 'Consolas, monospace',
  },
  colabBox: {
    marginTop: 8,
  },
  tableBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  tableRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '10px 14px',
    backgroundColor: '#f3f8ef',
    borderRadius: 10,
    border: '1px solid #d5e6cb',
    fontSize: 13,
  },
  authGate: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  authCard: {
    maxWidth: 420,
    width: '100%',
    backgroundColor: '#ffffff',
    padding: 28,
    borderRadius: 16,
    border: '1px solid #b5d4a3',
    textAlign: 'center',
  },
};
