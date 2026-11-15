import React, { useEffect, useState } from 'react';
import {
  Show,
  SignInButton,
  SignOutButton,
  UserButton,
  useUser,
} from '@clerk/react';
import { useMutation } from 'convex/react';
import { anyApi } from 'convex/server';
import ShopAdminTab from './components/ShopAdminTab';
import LegalPages, {
  LegalRoute,
  detectLegalRoute,
} from './components/LegalPages';

const ADMIN_EMAIL = 'pinarlik99@gmail.com';

type AdminTab = 'setup' | 'training' | 'analytics' | 'endpoints' | 'shop';

interface PipelineStatusResponse {
  job: {
    activeJob: string | null;
    status: string;
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
  const [maxPerQuery, setMaxPerQuery] = useState<number>(40);
  const [walnutDataPath, setWalnutDataPath] = useState<string>('./WalnutData');
  const [trainTarget, setTrainTarget] = useState<'vps' | 'colab'>('vps');
  const [notice, setNotice] = useState<string | null>(null);

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

  useEffect(() => {
    fetchWorkerStatus();
    const id = setInterval(fetchWorkerStatus, 3500);
    return () => clearInterval(id);
  }, [workerUrl, workerToken]);

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
            <div style={styles.stepsGrid}>
              <div style={styles.stepBox}>
                <h3 style={styles.stepTitle}>1. Web Image Scraper</h3>
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
                  <input
                    type="number"
                    style={styles.numInput}
                    value={maxPerQuery}
                    onChange={(e) =>
                      setMaxPerQuery(Number(e.target.value) || 40)
                    }
                  />
                </div>
                <button
                  style={styles.primaryBtn}
                  onClick={() =>
                    runJob(
                      '/api/jobs/scrape',
                      {
                        target: scrapeTarget,
                        engine: 'all',
                        max_per_query: maxPerQuery,
                      },
                      `Scrape ${scrapeTarget} images`
                    )
                  }
                >
                  Run Scraper
                </button>
              </div>

              <div style={styles.stepBox}>
                <h3 style={styles.stepTitle}>2. CLIP Auto-Filter</h3>
                <p style={styles.stepDesc}>
                  Removes non-orchard images and sorts valid walnut photos into
                  class folders.
                </p>
                <button
                  style={styles.primaryBtn}
                  onClick={() =>
                    runJob(
                      '/api/jobs/clip-filter',
                      { confidence: 0.28, export_yolo_cls: true },
                      'CLIP Auto-Filter'
                    )
                  }
                >
                  Run CLIP Filter
                </button>
              </div>

              <div style={styles.stepBox}>
                <h3 style={styles.stepTitle}>3. Labeling & Split</h3>
                <p style={styles.stepDesc}>
                  Launch <code>labelImg</code> or finalize 80/15/5 train/val/test
                  splits.
                </p>
                <div style={styles.row}>
                  <button
                    style={styles.secondaryBtn}
                    onClick={() =>
                      runJob(
                        '/api/jobs/labeling',
                        { action: 'launch_labelimg', target_folder: 'ground' },
                        'Launch labelImg (Ground)'
                      )
                    }
                  >
                    Label Ground
                  </button>
                  <button
                    style={styles.secondaryBtn}
                    onClick={() =>
                      runJob(
                        '/api/jobs/labeling',
                        { action: 'launch_labelimg', target_folder: 'canopy' },
                        'Launch labelImg (Canopy)'
                      )
                    }
                  >
                    Label Canopy
                  </button>
                </div>
                <button
                  style={styles.secondaryBtn}
                  onClick={() =>
                    runJob(
                      '/api/jobs/labeling',
                      { action: 'finalize_splits' },
                      'Finalize Splits'
                    )
                  }
                >
                  Finalize Splits
                </button>
              </div>

              <div style={styles.stepBox}>
                <h3 style={styles.stepTitle}>4. Import WalnutData (30k)</h3>
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
              </div>
            </div>
          </section>

          <section style={styles.card}>
            <div style={styles.rowBetween}>
              <h2 style={styles.cardTitle}>YOLO11 Model Training</h2>
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
                  {(
                    statusData?.job.logs ?? [
                      `[Worker Offline] Waiting for worker at ${workerUrl}`,
                    ]
                  ).join('\n')}
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

function ConvexSyncAdminRole({
  displayName,
}: {
  displayName: string;
}) {
  const syncUser = useMutation(anyApi.users.syncCurrentUser);
  useEffect(() => {
    syncUser({
      displayName,
      authProvider: 'google',
    }).catch((err) => {
      console.warn('Admin role sync failed:', err);
    });
  }, [displayName, syncUser]);
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
