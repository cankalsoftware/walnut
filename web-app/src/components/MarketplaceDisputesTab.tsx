import React, { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { anyApi } from 'convex/server';

export interface TrustDisputeRow {
  _id: string;
  recipientUserId: string;
  recipientRole: string;
  authorUserId: string;
  authorRole: string;
  badgeType: 'trusted_seller' | 'trusted_buyer';
  threadId: string;
  comment: string;
  visibilityStatus:
    | 'published'
    | 'dispute_pending'
    | 'cleared_unfounded'
    | 'policy_removed';
  hiddenFromPublication: boolean;
  disputeReason?: string;
  reDisputeLocked?: boolean;
  createdAtMs: number;
}

export interface ContentReportRow {
  _id: string;
  reporterUserId: string;
  targetType:
    | 'listing'
    | 'wholesaler_profile'
    | 'buy_request'
    | 'thread_message'
    | 'group_message';
  targetId: string;
  reportedUserId: string;
  reason: string;
  status: 'open' | 'actioned' | 'dismissed';
  createdAtMs: number;
}

interface MarketplaceDisputesTabProps {
  hasConvex: boolean;
  onNotice: (msg: string | null) => void;
  styles: Record<string, React.CSSProperties>;
}

const DEMO_DISPUTES: TrustDisputeRow[] = [
  {
    _id: 'demo-dispute-1',
    recipientUserId: 'user_buyer_demo_01',
    recipientRole: 'wholesaler',
    authorUserId: 'user_grower_demo_01',
    authorRole: 'producer',
    badgeType: 'trusted_buyer',
    threadId: 'demo-thread-1',
    comment: 'Fast Payment: Paid within 2 hours of loading, however weighbridge receipt differed slightly.',
    visibilityStatus: 'dispute_pending',
    hiddenFromPublication: false,
    disputeReason: 'Certified municipal weighbridge ticket attached showing exact weight match.',
    reDisputeLocked: false,
    createdAtMs: Date.now() - 86400000,
  },
];

const DEMO_REPORTS: ContentReportRow[] = [
  {
    _id: 'demo-report-1',
    reporterUserId: 'user_grower_demo_02',
    targetType: 'listing',
    targetId: 'demo-listing-flagged',
    reportedUserId: 'user_seller_spam_01',
    reason: 'Suspected duplicate stock photos not matching lot caliber.',
    status: 'open',
    createdAtMs: Date.now() - 3600000,
  },
];

function ConvexMarketplaceDisputesInner({
  onNotice,
  styles,
}: Omit<MarketplaceDisputesTabProps, 'hasConvex'>) {
  const data = useQuery(anyApi.marketplace.listDisputesForAdmin) as
    | {
        disputes: TrustDisputeRow[];
        reports: ContentReportRow[];
      }
    | undefined;

  const resolveDisputeMutation = useMutation(
    anyApi.marketplace.adminResolveTrustDispute
  );
  const moderateContentMutation = useMutation(
    anyApi.marketplace.adminModerateContent
  );
  const recomputePulseMutation = useMutation(
    anyApi.marketplace.recomputeMarketPulseStats
  );

  return (
    <MarketplaceDisputesView
      isConvexConnected={true}
      disputes={data?.disputes ?? []}
      reports={data?.reports ?? []}
      onResolveDispute={async (feedbackId, decision) => {
        await resolveDisputeMutation({ feedbackId: feedbackId as any, decision });
      }}
      onModerateReport={async (reportId, action) => {
        await moderateContentMutation({ reportId: reportId as any, action });
      }}
      onRebuildPulse={async () => {
        return (await recomputePulseMutation({})) as { bucketsRebuilt: number };
      }}
      onNotice={onNotice}
      styles={styles}
    />
  );
}

function MarketplaceDisputesView({
  isConvexConnected,
  disputes,
  reports,
  onResolveDispute,
  onModerateReport,
  onRebuildPulse,
  onNotice,
  styles,
}: {
  isConvexConnected: boolean;
  disputes: TrustDisputeRow[];
  reports: ContentReportRow[];
  onResolveDispute: (
    feedbackId: string,
    decision: 'keep_published' | 'cleared_unfounded' | 'policy_removed'
  ) => Promise<void>;
  onModerateReport: (
    reportId: string,
    action: 'hide_target' | 'dismiss'
  ) => Promise<void>;
  onRebuildPulse?: () => Promise<{ bucketsRebuilt: number }>;
  onNotice: (msg: string | null) => void;
  styles: Record<string, React.CSSProperties>;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);

  const pendingDisputes = disputes.filter(
    (d) => d.visibilityStatus === 'dispute_pending'
  ).length;
  const openReports = reports.filter((r) => r.status === 'open').length;

  const handleResolve = async (
    feedbackId: string,
    decision: 'keep_published' | 'cleared_unfounded' | 'policy_removed'
  ) => {
    setBusyId(feedbackId);
    try {
      await onResolveDispute(feedbackId, decision);
      onNotice(`Dispute resolved as "${decision}" and recipient badge totals synced.`);
    } catch (err: any) {
      onNotice(`Error resolving dispute: ${err?.message ?? String(err)}`);
    } finally {
      setBusyId(null);
    }
  };

  const handleModerate = async (
    reportId: string,
    action: 'hide_target' | 'dismiss'
  ) => {
    setBusyId(reportId);
    try {
      await onModerateReport(reportId, action);
      onNotice(`Content report updated with action "${action}".`);
    } catch (err: any) {
      onNotice(`Error moderating report: ${err?.message ?? String(err)}`);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      {/* Summary KPI Row */}
      <div style={styles.kpiRow}>
        <div style={styles.kpiBox}>
          <div style={styles.kpiVal}>{pendingDisputes}</div>
          <div style={styles.kpiLbl}>Pending Trust Disputes</div>
        </div>
        <div style={styles.kpiBox}>
          <div style={styles.kpiVal}>{disputes.length}</div>
          <div style={styles.kpiLbl}>Total Reviewed Feedback</div>
        </div>
        <div style={styles.kpiBox}>
          <div style={styles.kpiVal}>{openReports}</div>
          <div style={styles.kpiLbl}>Open UGC Reports</div>
        </div>
        <div style={styles.kpiBox}>
          <div style={styles.kpiVal}>{isConvexConnected ? 'Live' : 'Demo'}</div>
          <div style={styles.kpiLbl}>Moderation Mode</div>
        </div>
      </div>

      {/* Trust Badge Disputes Section */}
      <section style={styles.card}>
        <div style={styles.rowBetween}>
          <div>
            <h2 style={styles.cardTitle}>
              Marketplace Trust Badge Disputes
            </h2>
            <p style={styles.cardDesc}>
              Audit challenged Trusted Seller / Trusted Buyer feedback before locking a
              permanent resolution.
            </p>
          </div>
          {onRebuildPulse && (
            <button
              style={{ ...styles.secondaryBtn, flex: '0 0 auto' }}
              onClick={async () => {
                try {
                  const res = await onRebuildPulse();
                  onNotice(
                    `Rebuilt ${res.bucketsRebuilt} materialized Market Pulse bucket(s).`
                  );
                } catch (err: any) {
                  onNotice(`Pulse rebuild failed: ${err?.message ?? String(err)}`);
                }
              }}
            >
              Rebuild Market Pulse Cache
            </button>
          )}
        </div>

        {disputes.length === 0 ? (
          <p style={styles.stepDesc}>No Trust Badge disputes found.</p>
        ) : (
          <div style={styles.tableBox}>
            {disputes.map((d) => (
              <div
                key={d._id}
                style={{
                  ...styles.stepBox,
                  marginBottom: 8,
                  backgroundColor:
                    d.visibilityStatus === 'dispute_pending' ? '#fff8eb' : '#f3f8ef',
                }}
              >
                <div style={styles.rowBetween}>
                  <strong>
                    {d.badgeType === 'trusted_seller'
                      ? 'Trusted Seller Badge'
                      : 'Trusted Buyer Badge'}{' '}
                    • Recipient ({d.recipientRole}): {d.recipientUserId}
                  </strong>
                  <span style={styles.workerBadge}>
                    {d.visibilityStatus.toUpperCase()}
                    {d.reDisputeLocked ? ' • LOCKED' : ''}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: '#465e3e', marginBottom: 6 }}>
                  Issued by ({d.authorRole}): {d.authorUserId} • Thread: {d.threadId}
                </div>
                <div style={{ fontSize: 13, marginBottom: 6 }}>
                  <strong>Feedback Comment:</strong> {d.comment}
                </div>
                {d.disputeReason && (
                  <div
                    style={{
                      fontSize: 12,
                      padding: '8px 10px',
                      borderRadius: 8,
                      backgroundColor: '#ffffff',
                      border: '1px solid #d5e6cb',
                      marginBottom: 10,
                    }}
                  >
                    <strong>Dispute Reason & Evidence:</strong> {d.disputeReason}
                  </div>
                )}

                <div style={styles.row}>
                  <button
                    style={styles.secondaryBtn}
                    disabled={busyId === d._id}
                    onClick={() => handleResolve(d._id, 'keep_published')}
                  >
                    Keep Published
                  </button>
                  <button
                    style={styles.secondaryBtn}
                    disabled={busyId === d._id}
                    onClick={() => handleResolve(d._id, 'cleared_unfounded')}
                  >
                    Clear Unfounded (Silent)
                  </button>
                  <button
                    style={{
                      ...styles.secondaryBtn,
                      backgroundColor: '#fde8e8',
                      borderColor: '#f5b5b5',
                      color: '#8b1e1e',
                    }}
                    disabled={busyId === d._id}
                    onClick={() => handleResolve(d._id, 'policy_removed')}
                  >
                    Policy Remove ("Trust Badge Removed")
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* UGC Content Reports Section */}
      <section style={styles.card}>
        <h2 style={styles.cardTitle}>
          UGC Content Reports (Google Play Compliance)
        </h2>
        <p style={styles.cardDesc}>
          Review flagged listings, wholesaler profiles, buy requests, B2B messages, and
          role hall posts.
        </p>

        {reports.length === 0 ? (
          <p style={styles.stepDesc}>No UGC moderation reports recorded.</p>
        ) : (
          <div style={styles.tableBox}>
            {reports.map((r) => (
              <div key={r._id} style={styles.stepBox}>
                <div style={styles.rowBetween}>
                  <strong>
                    [{r.targetType}] Target ID: {r.targetId}
                  </strong>
                  <span style={styles.workerBadge}>{r.status.toUpperCase()}</span>
                </div>
                <div style={{ fontSize: 12, color: '#465e3e', marginBottom: 6 }}>
                  Reported User: {r.reportedUserId} • Reporter: {r.reporterUserId}
                </div>
                <div style={{ fontSize: 13, marginBottom: 10 }}>
                  <strong>Reason:</strong> {r.reason}
                </div>
                <div style={styles.row}>
                  <button
                    style={{
                      ...styles.secondaryBtn,
                      backgroundColor: '#fde8e8',
                      borderColor: '#f5b5b5',
                      color: '#8b1e1e',
                    }}
                    disabled={busyId === r._id || r.status === 'actioned'}
                    onClick={() => handleModerate(r._id, 'hide_target')}
                  >
                    Hide Target Content
                  </button>
                  <button
                    style={styles.secondaryBtn}
                    disabled={busyId === r._id || r.status === 'dismissed'}
                    onClick={() => handleModerate(r._id, 'dismiss')}
                  >
                    Dismiss Report
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default function MarketplaceDisputesTab({
  hasConvex,
  onNotice,
  styles,
}: MarketplaceDisputesTabProps) {
  const [demoDisputes, setDemoDisputes] = useState<TrustDisputeRow[]>(DEMO_DISPUTES);
  const [demoReports, setDemoReports] = useState<ContentReportRow[]>(DEMO_REPORTS);

  if (hasConvex) {
    return (
      <ConvexMarketplaceDisputesInner onNotice={onNotice} styles={styles} />
    );
  }

  return (
    <MarketplaceDisputesView
      isConvexConnected={false}
      disputes={demoDisputes}
      reports={demoReports}
      onResolveDispute={async (feedbackId, decision) => {
        setDemoDisputes((prev) =>
          prev.map((d) =>
            d._id === feedbackId
              ? {
                  ...d,
                  visibilityStatus:
                    decision === 'keep_published' ? 'published' : decision,
                  hiddenFromPublication: decision !== 'keep_published',
                  reDisputeLocked: true,
                }
              : d
          )
        );
      }}
      onModerateReport={async (reportId, action) => {
        setDemoReports((prev) =>
          prev.map((r) =>
            r._id === reportId
              ? {
                  ...r,
                  status: action === 'hide_target' ? 'actioned' : 'dismissed',
                }
              : r
          )
        );
      }}
      onNotice={onNotice}
      styles={styles}
    />
  );
}
