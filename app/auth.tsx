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
import {
  useWalnutCloud,
  GrowerExperienceLevel,
} from '../src/providers/ConvexClerkProvider';
import { AccountType } from '../src/data/marketplaceDemo';
import { HelpButton } from '../src/components/HelpModal';

const EXPERIENCE_LEVELS: {
  id: GrowerExperienceLevel;
  label: string;
  desc: string;
}[] = [
  {
    id: 'beginner',
    label: 'Beginner',
    desc: 'Step-by-step pruning, watering & seasonal reminders.',
  },
  {
    id: 'experienced',
    label: 'Experienced',
    desc: 'Balanced seasonal care, blight alerts & harvest windows.',
  },
  {
    id: 'expert',
    label: 'Expert',
    desc: 'SWP irrigation bars, chill hours, ethephon & R&D updates.',
  },
];

const NOTIFICATION_TOPIC_OPTIONS = [
  { id: 'weather', label: 'Weather Alerts' },
  { id: 'fertilizing', label: 'Fertilizing Season' },
  { id: 'blight_pest', label: 'Blight & Pests' },
  { id: 'seminars_expo', label: 'Seminars & Expos' },
  { id: 'maintenance', label: 'Pruning & Maintenance' },
  { id: 'news', label: 'Community News' },
];

export default function GrowerAccountScreen() {
  const router = useRouter();
  const {
    isSignedIn,
    userProfile,
    lastRecoveryCode,
    clearLastRecoveryCode,
    trees,
    careSetup,
    localCache,
    pendingUploadCount,
    lastSyncMessage,
    signInWithGoogle,
    signInWithEmail,
    registerWithPhone,
    signInWithPhone,
    completeMarketplaceOnboarding,
    setEnableOrchardTools,
    signOutToOfflineMode,
    deleteAccountAndData,
    syncPendingToConvex,
    updateGrowerPreferences,
  } = useWalnutCloud();

  const [authTab, setAuthTab] = useState<'register' | 'phone_login' | 'email_login'>('register');
  const [roleChoice, setRoleChoice] = useState<AccountType>('producer');
  const [alsoOrchardMode, setAlsoOrchardMode] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [onboardPhone, setOnboardPhone] = useState(userProfile.phone || '');
  const [onboardName, setOnboardName] = useState(userProfile.displayName || '');
  const [onboardRole, setOnboardRole] = useState<AccountType>(
    userProfile.accountType || 'producer'
  );

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
                  ? [userProfile.phone, userProfile.email].filter(Boolean).join(' • ') ||
                    'Complete mobile number below'
                  : 'Data saved safely on your phone until you sign in'}
              </Text>
              <Text style={styles.profileMeta}>
                {isSignedIn
                  ? `${userProfile.accountType === 'wholesaler' ? 'Wholesaler Buyer' : 'Producer / Grower'} • 👍 ${userProfile.trustedSellerCount + userProfile.trustedBuyerCount} Trust Badges`
                  : `${userProfile.orchardName} • ${userProfile.region}`}
              </Text>
            </View>
          </View>
        </View>

        {lastRecoveryCode && (
          <View style={styles.recoveryCard}>
            <Text style={styles.recoveryTitle}>
              Save Your Offline Recovery Backup Code
            </Text>
            <Text style={styles.recoveryCode}>{lastRecoveryCode}</Text>
            <Text style={styles.recoveryNote}>
              No SMS fees needed: store this code safely to recover your phone
              account if you forget your password.
            </Text>
            <TouchableOpacity
              style={styles.recoveryDoneBtn}
              onPress={clearLastRecoveryCode}
            >
              <Text style={styles.recoveryDoneText}>I Saved My Code</Text>
            </TouchableOpacity>
          </View>
        )}

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
                Sign in with your Google account or register with a mobile
                number (email is optional).
              </Text>
              <TouchableOpacity
                style={styles.googleBtn}
                onPress={signInWithGoogle}
              >
                <Ionicons name="logo-google" size={18} color="#FFFFFF" />
                <Text style={styles.googleBtnText}>Continue with Google</Text>
              </TouchableOpacity>
            </View>

            {/* Option 2: Phone-First Registration / Login */}
            <View style={styles.sectionCard}>
              <View style={styles.modeSwitchRow}>
                {(
                  [
                    { id: 'register', label: 'Create Account' },
                    { id: 'phone_login', label: 'Mobile Sign In' },
                    { id: 'email_login', label: 'Email Sign In' },
                  ] as const
                ).map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    style={[
                      styles.modePill,
                      authTab === t.id && styles.modePillActive,
                    ]}
                    onPress={() => setAuthTab(t.id)}
                  >
                    <Text
                      style={[
                        styles.modePillText,
                        authTab === t.id && styles.modePillTextActive,
                      ]}
                    >
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {authTab === 'register' && (
                <>
                  <Text style={styles.sectionTitle}>
                    Register with Mobile Number
                  </Text>
                  <Text style={styles.inputLabel}>Select Your Account Type *</Text>
                  <View style={styles.roleRow}>
                    <TouchableOpacity
                      style={[
                        styles.roleCard,
                        roleChoice === 'producer' && styles.roleCardActive,
                      ]}
                      onPress={() => setRoleChoice('producer')}
                    >
                      <Text style={styles.roleTitle}>🌳 Producer (Grower)</Text>
                      <Text style={styles.roleDesc}>
                        Track walnut fields, scan yields & sell crops in Marketplace
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.roleCard,
                        roleChoice === 'wholesaler' && styles.roleCardActive,
                      ]}
                      onPress={() => setRoleChoice('wholesaler')}
                    >
                      <Text style={styles.roleTitle}>🏪 Wholesaler (Buyer)</Text>
                      <Text style={styles.roleDesc}>
                        Browse grower crops, post Buy Requests & publish how you work
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {roleChoice === 'wholesaler' && (
                    <TouchableOpacity
                      style={styles.optInRow}
                      onPress={() => setAlsoOrchardMode((v) => !v)}
                    >
                      <Ionicons
                        name={alsoOrchardMode ? 'checkbox' : 'square-outline'}
                        size={18}
                        color={Colors.walnutGreen[800]}
                      />
                      <Text style={styles.optInText}>
                        Also Enable Grower / Orchard Mode (I grow walnut trees too)
                      </Text>
                    </TouchableOpacity>
                  )}

                  <Text style={styles.inputLabel}>
                    Full Name / Orchard or Company Name *
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={nameInput}
                    onChangeText={setNameInput}
                    placeholder="e.g. Valley Walnut Farms"
                    placeholderTextColor={Colors.text.muted}
                  />

                  <Text style={styles.inputLabel}>
                    Mobile Phone Number (Compulsory, with country code) *
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={phoneInput}
                    onChangeText={setPhoneInput}
                    keyboardType="phone-pad"
                    placeholder="+905551234567"
                    placeholderTextColor={Colors.text.muted}
                  />

                  <Text style={styles.inputLabel}>
                    Email Address (Optional — leave blank if no email)
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={emailInput}
                    onChangeText={setEmailInput}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholder="Optional (not required)"
                    placeholderTextColor={Colors.text.muted}
                  />

                  <Text style={styles.inputLabel}>
                    Password (minimum 8 characters) *
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={passwordInput}
                    onChangeText={setPasswordInput}
                    secureTextEntry
                    placeholder="At least 8 characters"
                    placeholderTextColor={Colors.text.muted}
                  />

                  <TouchableOpacity
                    style={styles.emailBtn}
                    onPress={() =>
                      void registerWithPhone({
                        displayName: nameInput,
                        phone: phoneInput,
                        password: passwordInput,
                        email: emailInput,
                        accountType: roleChoice,
                        enableOrchardTools: alsoOrchardMode,
                      })
                    }
                  >
                    <Ionicons name="call-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.emailBtnText}>
                      Create {roleChoice === 'wholesaler' ? 'Wholesaler' : 'Producer'} Account
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              {authTab === 'phone_login' && (
                <>
                  <Text style={styles.sectionTitle}>
                    Sign In with Mobile Number
                  </Text>
                  <Text style={styles.inputLabel}>Mobile Phone Number *</Text>
                  <TextInput
                    style={styles.input}
                    value={phoneInput}
                    onChangeText={setPhoneInput}
                    keyboardType="phone-pad"
                    placeholder="+905551234567"
                    placeholderTextColor={Colors.text.muted}
                  />

                  <Text style={styles.inputLabel}>Password *</Text>
                  <TextInput
                    style={styles.input}
                    value={passwordInput}
                    onChangeText={setPasswordInput}
                    secureTextEntry
                    placeholder="8+ character password"
                    placeholderTextColor={Colors.text.muted}
                  />

                  <TouchableOpacity
                    style={styles.emailBtn}
                    onPress={() => void signInWithPhone(phoneInput, passwordInput)}
                  >
                    <Ionicons name="log-in-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.emailBtnText}>Sign In with Mobile</Text>
                  </TouchableOpacity>
                </>
              )}

              {authTab === 'email_login' && (
                <>
                  <Text style={styles.sectionTitle}>Sign In with Email</Text>
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
                </>
              )}
            </View>
          </>
        )}

        {/* Signed-In Marketplace Onboarding & Role Switch */}
        {isSignedIn && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>
              Marketplace Role & Compulsory Mobile Setup
            </Text>
            {!userProfile.isMarketplaceOnboardingComplete ? (
              <>
                <Text style={styles.sectionDesc}>
                  Add your compulsory mobile number and confirm your role to
                  publish listings, complete your buyer profile, or chat in the
                  Marketplace.
                </Text>
                <View style={styles.roleRow}>
                  <TouchableOpacity
                    style={[
                      styles.roleCard,
                      onboardRole === 'producer' && styles.roleCardActive,
                    ]}
                    onPress={() => setOnboardRole('producer')}
                  >
                    <Text style={styles.roleTitle}>🌳 Producer</Text>
                    <Text style={styles.roleDesc}>Grow & sell walnuts</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.roleCard,
                      onboardRole === 'wholesaler' && styles.roleCardActive,
                    ]}
                    onPress={() => setOnboardRole('wholesaler')}
                  >
                    <Text style={styles.roleTitle}>🏪 Wholesaler</Text>
                    <Text style={styles.roleDesc}>Buy wholesale lots</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.inputLabel}>Display / Company Name *</Text>
                <TextInput
                  style={styles.input}
                  value={onboardName}
                  onChangeText={setOnboardName}
                  placeholder="Your name or business name"
                />
                <Text style={styles.inputLabel}>
                  Compulsory Mobile Number (E.164) *
                </Text>
                <TextInput
                  style={styles.input}
                  value={onboardPhone}
                  onChangeText={setOnboardPhone}
                  keyboardType="phone-pad"
                  placeholder="+905551234567"
                />
                <TouchableOpacity
                  style={styles.emailBtn}
                  onPress={() =>
                    void completeMarketplaceOnboarding({
                      displayName: onboardName || userProfile.displayName,
                      phone: onboardPhone,
                      email: userProfile.email || undefined,
                      accountType: onboardRole,
                      enableOrchardTools: alsoOrchardMode,
                    })
                  }
                >
                  <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                  <Text style={styles.emailBtnText}>
                    Save Role & Mobile Number
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.sectionDesc}>
                  Registered Role:{' '}
                  {userProfile.accountType === 'wholesaler'
                    ? 'Wholesaler (Buyer)'
                    : 'Producer (Walnut Grower)'}{' '}
                  • Mobile: {userProfile.phone}
                </Text>
                {userProfile.accountType === 'wholesaler' && (
                  <TouchableOpacity
                    style={styles.optInRow}
                    onPress={() =>
                      void setEnableOrchardTools(!userProfile.enableOrchardTools)
                    }
                  >
                    <Ionicons
                      name={
                        userProfile.enableOrchardTools
                          ? 'checkbox'
                          : 'square-outline'
                      }
                      size={20}
                      color={Colors.walnutGreen[800]}
                    />
                    <Text style={styles.optInText}>
                      Also Enable Grower / Orchard Mode (unlocks personal Orchard,
                      Care Plan & Camera AI tabs)
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        )}

        {/* Grower Care Level & Notification Preferences (Producer or Opt-in Orchard Mode) */}
        {(userProfile.accountType === 'producer' ||
          userProfile.enableOrchardTools) && (
        <View style={styles.sectionCard}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Text style={styles.sectionTitle}>
              Care Level & Notification Alerts
            </Text>
            <HelpButton
              help={{
                title: 'Care Level & Notification Alerts',
                whatItDoes:
                  'Lets you pick your walnut growing experience level (Beginner, Experienced, or Expert) and choose which seasonal care, weather, seminar, and expo updates you want to receive.',
                howToDoIt: [
                  'Tap Beginner, Experienced, or Expert to tailor guidance complexity.',
                  'Toggle Push Alerts On/Off and tap topic chips (Weather, Fertilizing Season, Blight, Seminars & Expos, Maintenance, News).',
                ],
                whatToExpect:
                  'Your preferences save immediately and sync to Convex so WalnutIQ admin broadcasts reach you with relevant updates.',
              }}
            />
          </View>
          <Text style={styles.sectionDesc}>
            Choose your orchard experience tier and which WalnutIQ alerts you
            want pushed to your phone.
          </Text>

          <Text style={styles.prefSubheading}>Experience Level</Text>
          <View style={styles.levelRow}>
            {EXPERIENCE_LEVELS.map((lvl) => {
              const active = userProfile.experienceLevel === lvl.id;
              return (
                <TouchableOpacity
                  key={lvl.id}
                  style={[styles.levelBtn, active && styles.levelBtnActive]}
                  onPress={() =>
                    void updateGrowerPreferences({ experienceLevel: lvl.id })
                  }
                >
                  <Text
                    style={[
                      styles.levelBtnTitle,
                      active && styles.levelBtnTitleActive,
                    ]}
                  >
                    {lvl.label}
                  </Text>
                  <Text style={styles.levelBtnDesc}>{lvl.desc}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.pushToggleRow}>
            <Text style={styles.prefSubheading}>
              Notification Topics (
              {userProfile.pushNotificationsEnabled ? 'Enabled' : 'Paused'})
            </Text>
            <TouchableOpacity
              style={[
                styles.pushPill,
                userProfile.pushNotificationsEnabled && styles.pushPillActive,
              ]}
              onPress={() =>
                void updateGrowerPreferences({
                  pushNotificationsEnabled:
                    !userProfile.pushNotificationsEnabled,
                })
              }
            >
              <Text
                style={[
                  styles.pushPillText,
                  userProfile.pushNotificationsEnabled &&
                    styles.pushPillTextActive,
                ]}
              >
                {userProfile.pushNotificationsEnabled ? 'Alerts ON' : 'Paused'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.topicWrap}>
            {NOTIFICATION_TOPIC_OPTIONS.map((topic) => {
              const selected = userProfile.notificationTopics.includes(
                topic.id
              );
              return (
                <TouchableOpacity
                  key={topic.id}
                  style={[styles.topicChip, selected && styles.topicChipActive]}
                  onPress={() => {
                    const next = selected
                      ? userProfile.notificationTopics.filter(
                          (t) => t !== topic.id
                        )
                      : [...userProfile.notificationTopics, topic.id];
                    void updateGrowerPreferences({ notificationTopics: next });
                  }}
                >
                  <Ionicons
                    name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                    size={14}
                    color={
                      selected
                        ? Colors.walnutGreen[800]
                        : Colors.walnutShell[500]
                    }
                  />
                  <Text
                    style={[
                      styles.topicChipText,
                      selected && styles.topicChipTextActive,
                    ]}
                  >
                    {topic.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
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
  prefSubheading: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.walnutGreen[900],
    marginBottom: 8,
  },
  levelRow: {
    gap: 8,
    marginBottom: 14,
  },
  levelBtn: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.walnutShell[200],
    backgroundColor: Colors.walnutShell[50],
  },
  levelBtnActive: {
    borderColor: Colors.walnutGreen[700],
    backgroundColor: Colors.walnutGreen[50],
  },
  levelBtnTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.walnutShell[700],
    marginBottom: 2,
  },
  levelBtnTitleActive: {
    color: Colors.walnutGreen[900],
  },
  levelBtnDesc: {
    fontSize: 11,
    color: Colors.walnutShell[500],
  },
  pushToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  pushPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.walnutShell[200],
    backgroundColor: Colors.walnutShell[100],
  },
  pushPillActive: {
    borderColor: Colors.walnutGreen[700],
    backgroundColor: Colors.walnutGreen[700],
  },
  pushPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.walnutShell[700],
  },
  pushPillTextActive: {
    color: '#FFFFFF',
  },
  topicWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  topicChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.walnutShell[200],
    backgroundColor: '#FFFFFF',
  },
  topicChipActive: {
    borderColor: Colors.walnutGreen[600],
    backgroundColor: Colors.walnutGreen[50],
  },
  topicChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.walnutShell[700],
  },
  topicChipTextActive: {
    color: Colors.walnutGreen[900],
    fontWeight: '800',
  },
  recoveryCard: {
    backgroundColor: '#FFF7E6',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5B869',
    marginBottom: 14,
    gap: 6,
  },
  recoveryTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#7A4B07',
  },
  recoveryCode: {
    fontSize: 18,
    fontWeight: '900',
    color: '#25421B',
    letterSpacing: 1.5,
  },
  recoveryNote: {
    fontSize: 11,
    color: '#6E5023',
    lineHeight: 16,
  },
  recoveryDoneBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#25421B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  recoveryDoneText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  modeSwitchRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  modePill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.walnutShell[100],
    alignItems: 'center',
  },
  modePillActive: {
    backgroundColor: Colors.walnutGreen[700],
  },
  modePillText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.walnutShell[700],
  },
  modePillTextActive: {
    color: '#FFFFFF',
  },
  roleRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    marginBottom: 8,
  },
  roleCard: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.walnutShell[200],
    backgroundColor: '#FFFFFF',
  },
  roleCardActive: {
    borderColor: Colors.walnutGreen[700],
    backgroundColor: Colors.walnutGreen[50],
  },
  roleTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.walnutGreen[900],
  },
  roleDesc: {
    fontSize: 10,
    color: Colors.text.secondary,
    marginTop: 3,
    lineHeight: 14,
  },
  optInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  optInText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: Colors.walnutGreen[900],
  },
});
