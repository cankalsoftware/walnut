import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../src/theme/colors';

type LegalTab = 'privacy' | 'cookies' | 'terms' | 'gdpr';

export default function LegalAndSafetyScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<LegalTab>('privacy');

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <Ionicons
              name="arrow-back"
              size={18}
              color={Colors.walnutGreen[900]}
            />
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>Privacy, GDPR & Data Safety</Text>
        <Text style={styles.subtitle}>
          WalnutIQ: Tree Care & AI Count • Controller: WalnutIQ (pinarlik99@gmail.com)
        </Text>

        <View style={styles.tabsRow}>
          {(
            [
              { id: 'privacy', label: 'Privacy' },
              { id: 'cookies', label: 'Cookies & GA' },
              { id: 'terms', label: 'Terms' },
              { id: 'gdpr', label: 'GDPR & Delete' },
            ] as const
          ).map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.tabChip, tab === item.id && styles.tabChipActive]}
              onPress={() => setTab(item.id)}
            >
              <Text
                style={[
                  styles.tabChipText,
                  tab === item.id && styles.tabChipTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.card}>
          {tab === 'privacy' && (
            <>
              <Text style={styles.cardTitle}>
                1. Privacy Policy & Data Processing
              </Text>
              <Text style={styles.bodyText}>
                Effective Date: November 2026{'\n'}
                Data Controller: WalnutIQ (Contact: pinarlik99@gmail.com){'\n\n'}
                <Text style={styles.bold}>A. Data We Collect & Why{'\n'}</Text>
                • Identity & Auth (Clerk): Name, email address, and Clerk User
                ID when you sign in with Google or Email (Legal Basis: Contract
                Performance, GDPR Art. 6(1)(b)).{'\n'}
                • Field & Orchard Location Data: Approximate/precise field
                location and climate zone used to provide accurate local weather,
                frost warnings, chill-hour tracking, and soil-specific treatment
                schedules (Legal Basis: Consent, GDPR Art. 6(1)(a)).{'\n'}
                • Orchard & Sensor Records: Tree counts, varieties, care logs,
                and Tuya sensor snapshots (Contract Performance).{'\n'}
                • Camera Frames: Processed locally on-device for walnut
                counting; images are only uploaded if you choose to share a scan
                card or place a shop upload.{'\n\n'}
                <Text style={styles.bold}>B. Storage, Security & Retention{'\n'}</Text>
                • Encryption: All network traffic uses TLS/HTTPS/WSS. Auth
                tokens are stored in hardware-backed SecureStore on iOS/Android.{'\n'}
                • Local SQLite & 14-Day Retention: Offline field records are
                saved locally in SQLite (`walnutiq_cache.db`). Once synced to
                Convex Cloud (Auto by default, or Manual in Setup & Data),
                local synced copies are automatically purged after 14 days to
                protect device storage. Unsynced offline records are retained on
                your device until synced.{'\n'}
                • Cloud Retention: Synced Convex records are kept until you
                delete specific field entries or delete your account.
              </Text>
            </>
          )}

          {tab === 'cookies' && (
            <>
              <Text style={styles.cardTitle}>
                2. Cookies, Google Analytics & Location Tracking
              </Text>
              <Text style={styles.bodyText}>
                • Strictly Necessary Session Storage: Clerk authentication
                cookies (on web) and SecureStore tokens (on mobile) are required
                to maintain your signed-in session and protect account access.{'\n\n'}
                • Analytics & Usage Telemetry: No third-party Google Analytics
                tracking SDK is active in the mobile app. Only essential error
                diagnostics and Clerk session state are used unless you opt in
                to optional telemetry.{'\n\n'}
                • Field Location Tracking: Field coordinates/zone are used
                solely to calibrate local weather, frost alerts, irrigation
                intervals, and soil treatment recommendations — never sold to
                advertisers or data brokers.
              </Text>
            </>
          )}

          {tab === 'terms' && (
            <>
              <Text style={styles.cardTitle}>3. Terms & Conditions</Text>
              <Text style={styles.bodyText}>
                • Agronomic Guidance Disclaimer: Watering intervals, NPK/Zinc
                feeding windows, frost alerts, and AI nut counts are
                decision-support estimates. Always verify against physical
                orchard conditions before applying treatments.{'\n\n'}
                • Account Security: You are responsible for safeguarding your
                Google or Email login credentials.{'\n\n'}
                • Hardware Shop Orders: Sensor and irrigation switch orders are
                subject to stock availability and payment confirmation.{'\n\n'}
                • Governing Rights: These terms do not limit your mandatory
                consumer or data protection rights under GDPR / UK-GDPR.
              </Text>
            </>
          )}

          {tab === 'gdpr' && (
            <>
              <Text style={styles.cardTitle}>
                4. Your GDPR / UK-GDPR Rights & Data Deletion
              </Text>
              <Text style={styles.bodyText}>
                Under GDPR / UK-GDPR and Google Play Data Safety rules, you have
                the right to:{'\n'}
                • Access & Portability (GDPR Art. 15 & 20): View or export your
                synced orchard records.{'\n'}
                • Rectification (Art. 16): Edit your soil type, location zone,
                and tree entries anytime in Setup & Data.{'\n'}
                • Right to Erasure / Delete Field Details (Art. 17): Delete
                individual field/tree entries or purge your entire account and
                all cloud + local SQLite data at any time.{'\n'}
                • Withdraw Consent (Art. 7): Disable location or analytics
                permissions in your device settings at any time.{'\n'}
                • Lodge a Complaint: Contact your local Data Protection
                Authority (e.g., ICO in the UK or EU DPA).{'\n\n'}
                <Text style={styles.bold}>How to Delete Your Account & Data:{'\n'}</Text>
                1. Instant In-App Deletion: Open Account → Tap "Delete Account &
                Data" to erase your Clerk profile, local SQLite cache, single-owner
                orchard/marketplace records, uploaded photo blobs, and scrub PII
                on two-party trade threads.{'\n'}
                2. Anti-Fraud Dispute Archive Notice: Policy-removed marketplace
                trust disputes keep only an anonymized phone hash for 90 days to
                prevent ban evasion, with all comments and personal identifiers scrubbed.{'\n'}
                3. Email Request: Write to pinarlik99@gmail.com with subject
                "Delete WalnutIQ Account".
              </Text>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.walnutGreen[50] },
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.walnutGreen[200],
    gap: 6,
  },
  backBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.walnutGreen[900],
  },
  webBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.walnutGreen[200],
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  webBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.walnutGreen[900],
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
    marginBottom: 14,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
  },
  tabChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.surface.card,
    borderWidth: 1,
    borderColor: Colors.walnutGreen[200],
    alignItems: 'center',
  },
  tabChipActive: {
    backgroundColor: Colors.walnutGreen[700],
    borderColor: Colors.walnutGreen[800],
  },
  tabChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.walnutGreen[900],
  },
  tabChipTextActive: {
    color: '#FFFFFF',
  },
  card: {
    backgroundColor: Colors.surface.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.walnutGreen[200],
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.walnutGreen[900],
    marginBottom: 10,
  },
  bold: {
    fontWeight: '800',
    color: Colors.walnutGreen[900],
  },
  bodyText: {
    fontSize: 13,
    lineHeight: 20,
    color: Colors.text.secondary,
  },
});
