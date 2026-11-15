import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Alert,
  Share,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../src/theme/colors';
import { useWalnutCloud } from '../src/providers/ConvexClerkProvider';
import { HelpButton } from '../src/components/HelpModal';

export default function GrowerAccountScreen() {
  const router = useRouter();
  const {
    isSignedIn,
    userProfile,
    trees,
    careSetup,
    localCache,
    pendingUploadCount,
    lastSyncMessage,
    signInWithGoogle,
    signInWithEmail,
    signOutToOfflineMode,
    deleteAccountAndData,
    syncPendingToConvex,
  } = useWalnutCloud();

  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [nameInput, setNameInput] = useState('Walnut Orchard Owner');

  const handleExportData = async () => {
    const payload = JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        userProfile,
        careSetup,
        trees,
        localCache,
      },
      null,
      2
    );
    await Share.share({
      title: 'WalnutIQ Orchard Data Export (JSON)',
      message: payload,
    });
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account & Data',
      'This will permanently delete your WalnutIQ account, synced orchard records, and local offline cache. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: () => {
            void deleteAccountAndData();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Bar */}
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
            <Text style={styles.backBtnText}>Back to Orchard</Text>
          </TouchableOpacity>

          <View
            style={[
              styles.statusPill,
              !isSignedIn && styles.statusPillOffline,
            ]}
          >
            <Ionicons
              name={isSignedIn ? 'cloud-done' : 'cloud-offline'}
              size={14}
              color={
                isSignedIn ? Colors.walnutGreen[800] : Colors.walnutShell[700]
              }
            />
            <Text style={styles.statusPillText}>
              {isSignedIn ? 'BACKUP ACTIVE' : 'FIELD OFFLINE MODE'}
            </Text>
          </View>
        </View>

        <Text style={styles.title}>Grower Account & Orchard Backup</Text>
        <Text style={styles.subtitle}>
          Sign in with Google or Email to back up your walnut tree counts,
          sensor readings, and care schedule across devices.
        </Text>

        {/* Active Account Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileTop}>
            <View style={styles.avatarCircle}>
              <Ionicons
                name={
                  userProfile.authProvider === 'google'
                    ? 'logo-google'
                    : 'mail'
                }
                size={22}
                color="#FFFFFF"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.profileName}>
                {isSignedIn
                  ? userProfile.displayName
                  : 'Local Orchard Device (Not Signed In)'}
              </Text>
              <Text style={styles.profileEmail}>
                {isSignedIn
                  ? userProfile.email
                  : 'Data saved safely on your phone until you sign in'}
              </Text>
              <Text style={styles.profileMeta}>
                {userProfile.orchardName} • {userProfile.region}
              </Text>
            </View>
          </View>
        </View>

        {lastSyncMessage && (
          <View style={styles.noticeBanner}>
            <Ionicons
              name="information-circle"
              size={18}
              color={Colors.walnutGreen[800]}
            />
            <Text style={styles.noticeText}>{lastSyncMessage}</Text>
          </View>
        )}

        {!isSignedIn && (
          <>
            {/* Option 1: Google Sign-In */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Quick Sign-In</Text>
              <Text style={styles.sectionDesc}>
                Sign in with your Google account to keep your orchard trees and
                harvest records backed up automatically.
              </Text>
              <TouchableOpacity
                style={styles.googleBtn}
                onPress={signInWithGoogle}
              >
                <Ionicons name="logo-google" size={18} color="#FFFFFF" />
                <Text style={styles.googleBtnText}>Continue with Google</Text>
              </TouchableOpacity>
            </View>

            {/* Option 2: Email Sign-In */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Sign In with Email</Text>
              <Text style={styles.inputLabel}>Orchard / Grower Name</Text>
              <TextInput
                style={styles.input}
                value={nameInput}
                onChangeText={setNameInput}
                placeholder="e.g. Valley Walnut Farms"
                placeholderTextColor={Colors.text.muted}
              />

              <Text style={styles.inputLabel}>Email Address</Text>
              <TextInput
                style={styles.input}
                value={emailInput}
                onChangeText={setEmailInput}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="you@example.com"
                placeholderTextColor={Colors.text.muted}
              />

              <Text style={styles.inputLabel}>Password</Text>
              <TextInput
                style={styles.input}
                value={passwordInput}
                onChangeText={setPasswordInput}
                secureTextEntry
                placeholder="Your account password"
                placeholderTextColor={Colors.text.muted}
              />

              <TouchableOpacity
                style={styles.emailBtn}
                onPress={() =>
                  void signInWithEmail(emailInput, passwordInput, nameInput)
                }
              >
                <Ionicons name="mail-outline" size={18} color="#FFFFFF" />
                <Text style={styles.emailBtnText}>Sign In with Email</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Orchard Backup Controls */}
        <View style={styles.sectionCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={styles.sectionTitle}>Orchard Cloud Backup</Text>
            <HelpButton
              help={{
                title: 'Cloud Backup, GDPR Export & Deletion',
                whatItDoes:
                  'Manages manual Convex backup, GDPR JSON data export, Offline Lock Mode, and permanent account deletion.',
                howToDoIt: [
                  'Tap "Back Up Pending Orchard Logs" to upload queued SQLite records immediately.',
                  'Tap "Export My Orchard Data (GDPR JSON)" to download or share a copy of your orchard records.',
                  'Tap "Log Out" to lock orchard menus, or "Delete Account & Data" to erase all cloud + local records.',
                ],
                whatToExpect:
                  'Account deletion permanently removes your Convex records, community messages, local SQLite cache, and Clerk login.',
              }}
            />
          </View>
          <Text style={styles.sectionDesc}>
            Your tree counts and care logs always work offline in the grove and
            back up automatically when signal returns.
          </Text>

          <TouchableOpacity
            style={styles.syncActionBtn}
            onPress={() => void syncPendingToConvex()}
          >
            <Ionicons name="cloud-upload" size={16} color="#FFFFFF" />
            <Text style={styles.syncActionBtnText}>
              Back Up Pending Orchard Logs ({pendingUploadCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.offlineToggleBtn, { marginTop: 10 }]}
            onPress={() => void handleExportData()}
          >
            <Ionicons
              name="download-outline"
              size={16}
              color={Colors.walnutGreen[800]}
            />
            <Text style={styles.offlineToggleText}>
              Export My Orchard Data (GDPR JSON)
            </Text>
          </TouchableOpacity>

          {isSignedIn && (
            <>
              <TouchableOpacity
                style={styles.offlineToggleBtn}
                onPress={() => void signOutToOfflineMode()}
              >
                <Ionicons
                  name="airplane-outline"
                  size={16}
                  color={Colors.walnutShell[700]}
                />
                <Text style={styles.offlineToggleText}>
                  Log Out (Lock Orchard Menus)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  marginTop: 10,
                  borderRadius: 10,
                  paddingVertical: 11,
                  paddingHorizontal: 14,
                  backgroundColor: '#FDECEC',
                  borderWidth: 1,
                  borderColor: '#F5C2C7',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
                onPress={handleDeleteAccount}
              >
                <Ionicons name="trash-outline" size={16} color="#9B1C1C" />
                <Text
                  style={{ color: '#9B1C1C', fontSize: 12, fontWeight: '800' }}
                >
                  Delete Account & Data
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <TouchableOpacity
          style={{
            marginTop: 4,
            alignItems: 'center',
            paddingVertical: 10,
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
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.walnutGreen[200],
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    gap: 5,
  },
  statusPillOffline: {
    backgroundColor: Colors.walnutShell[100],
  },
  statusPillText: {
    fontSize: 10,
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
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 18,
  },
  profileCard: {
    backgroundColor: Colors.walnutGreen[200],
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.walnutGreen[400],
    marginBottom: 14,
  },
  profileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.walnutGreen[700],
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileName: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.walnutGreen[900],
  },
  profileEmail: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.walnutGreen[800],
    marginTop: 2,
  },
  profileMeta: {
    fontSize: 11,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.walnutGreen[100],
    borderRadius: 12,
    padding: 11,
    borderWidth: 1,
    borderColor: Colors.walnutGreen[400],
    gap: 8,
    marginBottom: 14,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: Colors.walnutGreen[900],
    lineHeight: 17,
  },
  sectionCard: {
    backgroundColor: Colors.surface.card,
    borderRadius: 16,
    padding: 15,
    borderWidth: 1,
    borderColor: Colors.surface.border,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.walnutGreen[900],
    marginBottom: 4,
  },
  sectionDesc: {
    fontSize: 12,
    color: Colors.text.secondary,
    lineHeight: 17,
    marginBottom: 12,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.walnutGreen[700],
    paddingVertical: 13,
    borderRadius: 12,
    gap: 8,
  },
  googleBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.walnutGreen[800],
    marginBottom: 4,
  },
  input: {
    backgroundColor: Colors.walnutGreen[50],
    borderWidth: 1,
    borderColor: Colors.walnutGreen[200],
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: Colors.walnutGreen[900],
    marginBottom: 10,
  },
  emailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.walnutShell[500],
    paddingVertical: 13,
    borderRadius: 12,
    gap: 8,
    marginTop: 2,
  },
  emailBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  syncActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.walnutGreen[600],
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  syncActionBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  offlineToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.walnutShell[50],
    borderWidth: 1,
    borderColor: Colors.walnutShell[200],
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
    marginTop: 10,
  },
  offlineToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.walnutShell[700],
  },
});
