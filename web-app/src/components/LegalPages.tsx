import React from 'react';

export type LegalRoute = 'privacy' | 'cookies' | 'terms' | 'account-deletion';

export function detectLegalRoute(pathname: string, search: string): LegalRoute | null {
  const path = pathname.toLowerCase().replace(/\/+$/, '');
  const params = new URLSearchParams(search);
  const pageParam = (params.get('page') || '').toLowerCase();

  if (path === '/privacy' || pageParam === 'privacy') return 'privacy';
  if (path === '/cookies' || pageParam === 'cookies') return 'cookies';
  if (path === '/terms' || pageParam === 'terms') return 'terms';
  if (path === '/account-deletion' || pageParam === 'account-deletion') {
    return 'account-deletion';
  }
  return null;
}

export default function LegalPages({
  route,
  onNavigate,
}: {
  route: LegalRoute;
  onNavigate: (next: LegalRoute | null) => void;
}) {
  return (
    <div style={legalStyles.page}>
      <div style={legalStyles.card}>
        <div style={legalStyles.navRow}>
          <button style={legalStyles.backBtn} onClick={() => onNavigate(null)}>
            ← Back to WalnutIQ Portal
          </button>
          <div style={legalStyles.tabs}>
            {(
              [
                { id: 'privacy', label: 'Privacy Policy' },
                { id: 'cookies', label: 'Cookie Policy' },
                { id: 'terms', label: 'Terms & Conditions' },
                { id: 'account-deletion', label: 'Account Deletion' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                style={{
                  ...legalStyles.tabBtn,
                  ...(route === t.id ? legalStyles.tabBtnActive : {}),
                }}
                onClick={() => onNavigate(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {route === 'privacy' && (
          <article>
            <h1 style={legalStyles.title}>
              Privacy Policy — WalnutIQ: Tree Care & AI Count
            </h1>
            <p style={legalStyles.meta}>
              Last updated: November 2026 • Contact: pinarlik99@gmail.com
            </p>
            <p style={legalStyles.p}>
              WalnutIQ ("we", "our") provides orchard tree care guidance,
              on-device walnut detection, sensor telemetry, and hardware ordering
              services.
            </p>
            <h2 style={legalStyles.h2}>1. Data We Collect & Legal Basis (GDPR)</h2>
            <ul style={legalStyles.ul}>
              <li>
                <strong>Account Information (Clerk)</strong>: Email address,
                name, and Clerk User ID when signing in via Google or Email
                (GDPR Art. 6(1)(b) Contract Performance).
              </li>
              <li>
                <strong>Field Location & Climate Tracking</strong>: Field
                coordinates/zone used to deliver accurate local weather, frost
                warnings, winter chill hours, and soil-specific treatment
                schedules (GDPR Art. 6(1)(a) Consent).
              </li>
              <li>
                <strong>Orchard & Sensor Data</strong>: Registered trees, soil
                type, care logs, and Tuya sensor snapshots stored in Convex
                over encrypted TLS/HTTPS/WSS.
              </li>
              <li>
                <strong>Camera Frames</strong>: Processed locally on your device
                for walnut counting; images are uploaded only when you
                explicitly share a scan card or upload a product photo.
              </li>
              <li>
                <strong>Local SQLite & 14-Day Auto-Purge</strong>: Offline
                records are persisted locally in SQLite (`walnutiq_cache.db`).
                Once synced to Convex (Auto by default, or Manual in Settings),
                synced local copies are automatically purged after{' '}
                <strong>14 days</strong>.
              </li>
            </ul>
            <h2 style={legalStyles.h2}>2. Security & Encryption</h2>
            <p style={legalStyles.p}>
              All communications between the mobile app, web portal, Clerk, and
              Convex use encrypted HTTPS/WSS. Auth tokens are stored in
              hardware-backed SecureStore on iOS/Android. We do not sell
              personal or field data to third parties.
            </p>
            <h2 style={legalStyles.h2}>
              3. Your GDPR / UK-GDPR Rights & Right to Delete
            </h2>
            <p style={legalStyles.p}>
              You have the right to access, rectify, export, or erase your
              field details and full account at any time via{' '}
              <strong>Account → Delete Account & Data</strong> in the mobile
              app, or by emailing <strong>pinarlik99@gmail.com</strong>.
            </p>
          </article>
        )}

        {route === 'cookies' && (
          <article>
            <h1 style={legalStyles.title}>
              Cookie, Google Analytics & Location Tracking Policy — WalnutIQ
            </h1>
            <p style={legalStyles.meta}>Last updated: November 2026</p>
            <p style={legalStyles.p}>
              WalnutIQ uses strictly necessary session storage, optional Google
              Analytics telemetry, and field location data strictly to operate
              and improve orchard services:
            </p>
            <ul style={legalStyles.ul}>
              <li>
                <strong>Clerk Session Cookies & Mobile SecureStore</strong>:
                Strictly necessary to verify your sign-in session and protect
                your account.
              </li>
              <li>
                <strong>Analytics & Performance Telemetry</strong>: No
                third-party advertising trackers or Google Analytics SDKs are
                loaded without explicit opt-in consent. Only essential Clerk
                authentication cookies/tokens are used to maintain your session.
              </li>
              <li>
                <strong>Field Location Tracking</strong>: Used to calibrate
                accurate local weather, frost alerts, chill hours, and soil
                treatment schedules for your orchard. Never sold to advertisers.
              </li>
            </ul>
          </article>
        )}

        {route === 'terms' && (
          <article>
            <h1 style={legalStyles.title}>
              Terms & Conditions — WalnutIQ: Tree Care & AI Count
            </h1>
            <p style={legalStyles.meta}>Last updated: November 2026</p>
            <ul style={legalStyles.ul}>
              <li>
                <strong>Agronomic Guidance</strong>: Care schedules, watering
                intervals, and yield counts are decision-support estimates and
                should be verified against local orchard conditions.
              </li>
              <li>
                <strong>Account Responsibility</strong>: You are responsible for
                keeping your Google/Email login credentials secure.
              </li>
              <li>
                <strong>Hardware Shop Orders</strong>: Sensor and switch orders
                placed in the app are subject to stock availability and payment
                confirmation.
              </li>
              <li>
                <strong>Termination</strong>: You may stop using the service and
                delete your account data at any time.
              </li>
            </ul>
          </article>
        )}

        {route === 'account-deletion' && (
          <article>
            <h1 style={legalStyles.title}>
              Account & Data Deletion — WalnutIQ
            </h1>
            <p style={legalStyles.meta}>
              Google Play Data Safety Compliance • Contact: pinarlik99@gmail.com
            </p>
            <p style={legalStyles.p}>
              You can permanently delete your WalnutIQ account and all
              associated orchard data in either of two ways:
            </p>
            <ol style={legalStyles.ul}>
              <li>
                <strong>In the Mobile App (Instant)</strong>: Open{' '}
                <strong>WalnutIQ → Account → Delete Account & Data</strong>.
                This immediately purges your trees, scans, care logs, sensor
                snapshots, and local SQLite cache, and deletes your Clerk user
                profile.
              </li>
              <li>
                <strong>By Email Request</strong>: Send a request from your
                registered email address to{' '}
                <strong>pinarlik99@gmail.com</strong> with the subject{' '}
                <code>Delete WalnutIQ Account</code>.
              </li>
            </ol>
          </article>
        )}
      </div>
    </div>
  );
}

const legalStyles: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: 880,
    margin: '0 auto',
    padding: '28px 20px 60px',
    color: '#1a2616',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    border: '1px solid #c5dbba',
    padding: 28,
  },
  navRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
    paddingBottom: 14,
    borderBottom: '1px solid #e4f0dc',
  },
  backBtn: {
    padding: '8px 14px',
    borderRadius: 8,
    border: '1px solid #b5d4a3',
    backgroundColor: '#f3f8ef',
    color: '#2e5125',
    fontWeight: 700,
    cursor: 'pointer',
  },
  tabs: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  },
  tabBtn: {
    padding: '7px 12px',
    borderRadius: 8,
    border: '1px solid #c5dbba',
    backgroundColor: '#ffffff',
    color: '#2e5125',
    fontWeight: 600,
    fontSize: 13,
    cursor: 'pointer',
  },
  tabBtnActive: {
    backgroundColor: '#2e5125',
    color: '#ffffff',
    borderColor: '#2e5125',
  },
  title: {
    margin: '0 0 6px',
    fontSize: 24,
    color: '#183014',
  },
  meta: {
    margin: '0 0 18px',
    fontSize: 13,
    color: '#5a6b53',
  },
  h2: {
    marginTop: 20,
    marginBottom: 8,
    fontSize: 17,
    color: '#23441b',
  },
  p: {
    fontSize: 14,
    lineHeight: 1.65,
    color: '#2d3b27',
  },
  ul: {
    fontSize: 14,
    lineHeight: 1.7,
    color: '#2d3b27',
    paddingLeft: 20,
  },
};
