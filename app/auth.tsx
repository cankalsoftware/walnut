import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  Modal,
} from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
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
  const navigation = useNavigation();
  const {
    isSignedIn,
    userProfile,
    myWholesalerProfile,
    buyRequests,
    marketplaceThreads,
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
    saveAccountSettings,
    signOutToOfflineMode,
    deleteAccountAndData,
    syncPendingToConvex,
  } = useWalnutCloud();

  const [authTab, setAuthTab] = useState<'register' | 'phone_login' | 'email_login'>('register');
  const [roleChoice, setRoleChoice] = useState<AccountType>('producer');
  const [alsoOrchardMode, setAlsoOrchardMode] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [nameInput, setNameInput] = useState('');

  // Explicit signed-in draft state (committed via "Save Account Settings")
  const [draftRole, setDraftRole] = useState<AccountType>(
    userProfile.accountType || 'producer'
  );
  const [draftEnableOrchardTools, setDraftEnableOrchardTools] = useState<boolean>(
    Boolean(userProfile.enableOrchardTools)
  );
  const [draftDisplayName, setDraftDisplayName] = useState(
    userProfile.displayName || ''
  );
  const [draftPhone, setDraftPhone] = useState(userProfile.phone || '');
  const [draftExperienceLevel, setDraftExperienceLevel] =
    useState<GrowerExperienceLevel>(userProfile.experienceLevel);
  const [draftNotificationTopics, setDraftNotificationTopics] = useState<string[]>(
    userProfile.notificationTopics
  );
  const [draftPushEnabled, setDraftPushEnabled] = useState<boolean>(
    userProfile.pushNotificationsEnabled
  );
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [authActionFeedback, setAuthActionFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingNavAction, setPendingNavAction] = useState<any>(null);

  const isValidPhoneDigits = (raw: string) => {
    const d = raw.replace(/\D/g, '');
    return d.length >= 8 && d.length <= 15;
  };
  const clearFieldError = (key: string) => {
    setFieldErrors((prev) => (prev[key] ? { ...prev, [key]: '' } : prev));
  };

  const allowLeaveRef = useRef(false);
  const isDirtyRef = useRef(false);

  const isPureWholesaler =
    isSignedIn &&
    userProfile.accountType === 'wholesaler' &&
    !userProfile.enableOrchardTools;
  const isDualRole =
    isSignedIn &&
    userProfile.accountType === 'wholesaler' &&
    userProfile.enableOrchardTools;
  const draftShowOrchardTools =
    isSignedIn && (draftRole === 'producer' || draftEnableOrchardTools);

  const normalizedSavedTopics = useMemo(
    () => [...userProfile.notificationTopics].sort().join(','),
    [userProfile.notificationTopics]
  );
  const normalizedDraftTopics = useMemo(
    () => [...draftNotificationTopics].sort().join(','),
    [draftNotificationTopics]
  );

  const hasUnsavedChanges = useMemo(() => {
    if (!isSignedIn) {
      if (authTab !== 'register') return false;
      return Boolean(
        nameInput.trim() ||
          phoneInput.trim() ||
          emailInput.trim() ||
          passwordInput.trim() ||
          roleChoice !== 'producer' ||
          alsoOrchardMode
      );
    }
    const effectiveDraftOrchard =
      draftRole === 'wholesaler' ? draftEnableOrchardTools : false;
    const effectiveSavedOrchard =
      userProfile.accountType === 'wholesaler'
        ? userProfile.enableOrchardTools
        : false;
    const baseDirty =
      draftRole !== userProfile.accountType ||
      effectiveDraftOrchard !== effectiveSavedOrchard ||
      draftDisplayName.trim() !== userProfile.displayName.trim() ||
      draftPhone.trim() !== (userProfile.phone || '').trim();
    if (baseDirty) return true;

    if (draftRole === 'producer' || draftEnableOrchardTools) {
      return (
        draftExperienceLevel !== userProfile.experienceLevel ||
        draftPushEnabled !== userProfile.pushNotificationsEnabled ||
        normalizedDraftTopics !== normalizedSavedTopics
      );
    }
    return false;
  }, [
    isSignedIn,
    authTab,
    nameInput,
    phoneInput,
    emailInput,
    passwordInput,
    roleChoice,
    alsoOrchardMode,
    draftRole,
    draftEnableOrchardTools,
    draftDisplayName,
    draftPhone,
    draftExperienceLevel,
    draftPushEnabled,
    normalizedDraftTopics,
    normalizedSavedTopics,
    userProfile.accountType,
    userProfile.enableOrchardTools,
    userProfile.displayName,
    userProfile.phone,
    userProfile.experienceLevel,
    userProfile.pushNotificationsEnabled,
  ]);

  isDirtyRef.current = hasUnsavedChanges;

  useEffect(() => {
    if (!isDirtyRef.current) {
      setDraftRole(userProfile.accountType || 'producer');
      setDraftEnableOrchardTools(Boolean(userProfile.enableOrchardTools));
      setDraftDisplayName(userProfile.displayName || '');
      setDraftPhone(userProfile.phone || '');
      setDraftExperienceLevel(userProfile.experienceLevel);
      setDraftNotificationTopics(userProfile.notificationTopics);
      setDraftPushEnabled(userProfile.pushNotificationsEnabled);
    }
  }, [
    userProfile.accountType,
    userProfile.enableOrchardTools,
    userProfile.displayName,
    userProfile.phone,
    userProfile.experienceLevel,
    userProfile.notificationTopics,
    userProfile.pushNotificationsEnabled,
  ]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
      if (allowLeaveRef.current || !hasUnsavedChanges) {
        return;
      }
      e.preventDefault();
      setPendingNavAction(e.data.action);
      setShowUnsavedModal(true);
    });
    return unsubscribe;
  }, [navigation, hasUnsavedChanges]);

  const handleDiscardDrafts = () => {
    setSaveFeedback(null);
    if (isSignedIn) {
      setDraftRole(userProfile.accountType || 'producer');
      setDraftEnableOrchardTools(Boolean(userProfile.enableOrchardTools));
      setDraftDisplayName(userProfile.displayName || '');
      setDraftPhone(userProfile.phone || '');
      setDraftExperienceLevel(userProfile.experienceLevel);
      setDraftNotificationTopics(userProfile.notificationTopics);
      setDraftPushEnabled(userProfile.pushNotificationsEnabled);
    } else {
      setRoleChoice('producer');
      setAlsoOrchardMode(false);
      setNameInput('');
      setPhoneInput('');
      setEmailInput('');
      setPasswordInput('');
    }
  };

  const navigateToRoleHome = (
    targetRole: AccountType,
    targetOrchardTools: boolean
  ) => {
    allowLeaveRef.current = true;
    const pureWholesaler = targetRole === 'wholesaler' && !targetOrchardTools;
    router.replace(pureWholesaler ? '/(tabs)/marketplace' : '/(tabs)');
  };

  const handleRegisterSubmit = async () => {
    const errs: Record<string, string> = {};
    if (nameInput.trim().length < 2) {
      errs.regName = 'Enter your full name or orchard/company name (at least 2 chars).';
    }
    if (!isValidPhoneDigits(phoneInput)) {
      errs.regPhone = 'Enter a valid 8–15 digit mobile number with country code (e.g. +905551234567).';
    }
    if (emailInput.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.trim())) {
      errs.regEmail = 'Enter a valid email address or leave this field blank.';
    }
    if (passwordInput.length < 8) {
      errs.regPassword = 'Password must be at least 8 characters.';
    }
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) {
      setAuthActionFeedback({
        type: 'error',
        message: `Please fix the ${Object.keys(errs).length} required field(s) highlighted in red above.`,
      });
      return;
    }
    setAuthActionFeedback(null);
    const res = await registerWithPhone({
      displayName: nameInput,
      phone: phoneInput,
      password: passwordInput,
      email: emailInput,
      accountType: roleChoice,
      enableOrchardTools: roleChoice === 'wholesaler' ? alsoOrchardMode : false,
    });
    if (!res.ok) {
      setAuthActionFeedback({
        type: 'error',
        message: 'Could not create account. Check the notice banner above for details.',
      });
    }
  };

  const handlePhoneLoginSubmit = async () => {
    const errs: Record<string, string> = {};
    if (!isValidPhoneDigits(phoneInput)) {
      errs.loginPhone = 'Enter your registered 8–15 digit mobile number with country code.';
    }
    if (!passwordInput) {
      errs.loginPassword = 'Enter your account password.';
    }
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) {
      setAuthActionFeedback({
        type: 'error',
        message: 'Please enter both your mobile number and password.',
      });
      return;
    }
    setAuthActionFeedback(null);
    const ok = await signInWithPhone(phoneInput, passwordInput);
    if (!ok) {
      setAuthActionFeedback({
        type: 'error',
        message: 'Mobile sign-in failed. Check your mobile number, password, or notice above.',
      });
    }
  };

  const handleEmailLoginSubmit = async () => {
    const errs: Record<string, string> = {};
    if (!emailInput.trim() || !emailInput.includes('@')) {
      errs.loginEmail = 'Enter a valid email address.';
    }
    if (!passwordInput) {
      errs.loginPassword = 'Enter your account password.';
    }
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) {
      setAuthActionFeedback({
        type: 'error',
        message: 'Please enter both your email address and password.',
      });
      return;
    }
    setAuthActionFeedback(null);
    await signInWithEmail(emailInput, passwordInput, nameInput);
  };

  const handleSaveAccountSettings = async (navigateAfter = true) => {
    const cleanName = (draftDisplayName || userProfile.displayName || '').trim();
    const errs: Record<string, string> = {};
    if (cleanName.length < 2) {
      errs.draftDisplayName = 'Enter Display / Company Name (at least 2 characters).';
    }
    if (!isValidPhoneDigits(draftPhone)) {
      errs.draftPhone = 'Enter a valid 8–15 digit mobile number with country code (e.g. +905551234567).';
    }
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) {
      setShowUnsavedModal(false);
      setSaveFeedback({
        type: 'error',
        message: `Please fix ${Object.keys(errs).length} required field(s) highlighted in red above before saving.`,
      });
      return;
    }

    setIsSavingSettings(true);
    setSaveFeedback(null);
    const effectiveOrchard =
      draftRole === 'wholesaler' ? draftEnableOrchardTools : false;
    const result = await saveAccountSettings({
      displayName: cleanName,
      phone: draftPhone,
      email: userProfile.email || undefined,
      accountType: draftRole,
      enableOrchardTools: effectiveOrchard,
      experienceLevel: draftExperienceLevel,
      notificationTopics: draftNotificationTopics,
      pushNotificationsEnabled: draftPushEnabled,
    });
    setIsSavingSettings(false);

    if (!result.ok) {
      setShowUnsavedModal(false);
      setSaveFeedback({
        type: 'error',
        message: result.error || 'Failed to save account settings.',
      });
      return;
    }

    isDirtyRef.current = false;
    setShowUnsavedModal(false);
    setPendingNavAction(null);
    setSaveFeedback({
      type: 'success',
      message: 'Account settings saved and tabs updated.',
    });

    if (navigateAfter) {
      navigateToRoleHome(draftRole, effectiveOrchard);
    }
  };

  const handleHeaderBackPress = () => {
    if (hasUnsavedChanges) {
      setPendingNavAction(null);
      setShowUnsavedModal(true);
      return;
    }
    allowLeaveRef.current = true;
    if (isPureWholesaler) {
      router.replace('/(tabs)/marketplace');
    } else {
      router.back();
    }
  };

  const handleExportData = async () => {
    const payload = isPureWholesaler
      ? JSON.stringify(
          {
            exportedAt: new Date().toISOString(),
            userProfile,
            myWholesalerProfile,
            buyRequests: buyRequests.filter(
              (r) => r.userId === userProfile.clerkId
            ),
            marketplaceThreads,
          },
          null,
          2
        )
      : JSON.stringify(
          {
            exportedAt: new Date().toISOString(),
            userProfile,
            careSetup,
            trees,
            localCache,
            myWholesalerProfile,
            marketplaceThreads,
          },
          null,
          2
        );
    await Share.share({
      title: isPureWholesaler
        ? 'WalnutIQ Wholesaler Data Export (JSON)'
        : 'WalnutIQ Orchard & Trade Data Export (JSON)',
      message: payload,
    });
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account & Data',
      'This will permanently delete your WalnutIQ login, marketplace listings/profiles, messages, synced records, and local offline cache. Continue?',
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
            onPress={handleHeaderBackPress}
          >
            <Ionicons
              name="arrow-back"
              size={18}
              color={Colors.walnutGreen[900]}
            />
            <Text style={styles.backBtnText}>
              {isPureWholesaler ? 'Back to Marketplace' : 'Back to Orchard'}
            </Text>
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
              {!isSignedIn
                ? 'OFFLINE DEMO MODE'
                : isPureWholesaler
                  ? 'ACCOUNT SYNCED'
                  : 'BACKUP ACTIVE'}
            </Text>
          </View>
        </View>

        {hasUnsavedChanges && (
          <View style={styles.unsavedBanner}>
            <Ionicons name="warning" size={18} color="#9A3412" />
            <Text style={styles.unsavedBannerText}>
              {isSignedIn
                ? "You have unsaved changes (including Account Type or settings). Tap 'Save Account Settings' to apply your menus."
                : 'You have unsaved registration details. Complete account creation below or discard changes.'}
            </Text>
          </View>
        )}

        <Text style={styles.title}>
          {!isSignedIn
            ? 'WalnutIQ Account & Marketplace'
            : isPureWholesaler
              ? 'Wholesaler Account & Trade Settings'
              : isDualRole
                ? 'Dual-Role Buyer & Orchard Account'
                : 'Grower Account & Orchard Backup'}
        </Text>
        <Text style={styles.subtitle}>
          {!isSignedIn
            ? 'Register with your mobile number (email optional) or sign in with Google to buy or sell walnut lots.'
            : isPureWholesaler
              ? 'Manage your wholesale buyer role, mobile contact, GDPR export, and Marketplace access.'
              : isDualRole
                ? 'Connected for wholesale buying alongside personal orchard care and crop listings.'
                : 'Back up your walnut tree counts, crop listings, sensor readings, and care schedule across devices.'}
        </Text>

        {/* Active Account Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileTop}>
            <View style={styles.avatarCircle}>
              <Ionicons
                name={
                  userProfile.authProvider === 'google'
                    ? 'logo-google'
                    : userProfile.authProvider === 'phone'
                      ? 'call'
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
                  : 'Local Device (Not Signed In)'}
              </Text>
              <Text style={styles.profileEmail}>
                {isSignedIn
                  ? [userProfile.phone, userProfile.email].filter(Boolean).join(' • ') ||
                    'Complete mobile number below'
                  : 'Sign in or create a Producer / Wholesaler account below'}
              </Text>
              <Text style={styles.profileMeta}>
                {isSignedIn
                  ? `${userProfile.accountType === 'wholesaler' ? (isDualRole ? 'Wholesaler + Grower' : 'Wholesaler Buyer') : 'Producer / Grower'} • 👍 ${userProfile.trustedSellerCount + userProfile.trustedBuyerCount} Trust Badges`
                  : `${userProfile.region}`}
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
                    style={[styles.input, Boolean(fieldErrors.regName) && styles.inputError]}
                    value={nameInput}
                    onChangeText={(t) => {
                      setNameInput(t);
                      clearFieldError('regName');
                      setAuthActionFeedback(null);
                    }}
                    placeholder="e.g. Valley Walnut Farms"
                    placeholderTextColor={Colors.text.muted}
                  />
                  {Boolean(fieldErrors.regName) && (
                    <Text style={styles.fieldErrorText}>{fieldErrors.regName}</Text>
                  )}

                  <Text style={styles.inputLabel}>
                    Mobile Phone Number (Compulsory, with country code) *
                  </Text>
                  <TextInput
                    style={[styles.input, Boolean(fieldErrors.regPhone) && styles.inputError]}
                    value={phoneInput}
                    onChangeText={(t) => {
                      setPhoneInput(t);
                      clearFieldError('regPhone');
                      setAuthActionFeedback(null);
                    }}
                    keyboardType="phone-pad"
                    placeholder="+905551234567"
                    placeholderTextColor={Colors.text.muted}
                  />
                  {Boolean(fieldErrors.regPhone) && (
                    <Text style={styles.fieldErrorText}>{fieldErrors.regPhone}</Text>
                  )}

                  <Text style={styles.inputLabel}>
                    Email Address (Optional — leave blank if no email)
                  </Text>
                  <TextInput
                    style={[styles.input, Boolean(fieldErrors.regEmail) && styles.inputError]}
                    value={emailInput}
                    onChangeText={(t) => {
                      setEmailInput(t);
                      clearFieldError('regEmail');
                      setAuthActionFeedback(null);
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholder="Optional (not required)"
                    placeholderTextColor={Colors.text.muted}
                  />
                  {Boolean(fieldErrors.regEmail) && (
                    <Text style={styles.fieldErrorText}>{fieldErrors.regEmail}</Text>
                  )}

                  <Text style={styles.inputLabel}>
                    Password (minimum 8 characters) *
                  </Text>
                  <TextInput
                    style={[styles.input, Boolean(fieldErrors.regPassword) && styles.inputError]}
                    value={passwordInput}
                    onChangeText={(t) => {
                      setPasswordInput(t);
                      clearFieldError('regPassword');
                      setAuthActionFeedback(null);
                    }}
                    secureTextEntry
                    placeholder="At least 8 characters"
                    placeholderTextColor={Colors.text.muted}
                  />
                  {Boolean(fieldErrors.regPassword) && (
                    <Text style={styles.fieldErrorText}>{fieldErrors.regPassword}</Text>
                  )}

                  <TouchableOpacity
                    style={styles.emailBtn}
                    onPress={() => void handleRegisterSubmit()}
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
                    style={[styles.input, Boolean(fieldErrors.loginPhone) && styles.inputError]}
                    value={phoneInput}
                    onChangeText={(t) => {
                      setPhoneInput(t);
                      clearFieldError('loginPhone');
                      setAuthActionFeedback(null);
                    }}
                    keyboardType="phone-pad"
                    placeholder="+905551234567"
                    placeholderTextColor={Colors.text.muted}
                  />
                  {Boolean(fieldErrors.loginPhone) && (
                    <Text style={styles.fieldErrorText}>{fieldErrors.loginPhone}</Text>
                  )}

                  <Text style={styles.inputLabel}>Password *</Text>
                  <TextInput
                    style={[styles.input, Boolean(fieldErrors.loginPassword) && styles.inputError]}
                    value={passwordInput}
                    onChangeText={(t) => {
                      setPasswordInput(t);
                      clearFieldError('loginPassword');
                      setAuthActionFeedback(null);
                    }}
                    secureTextEntry
                    placeholder="8+ character password"
                    placeholderTextColor={Colors.text.muted}
                  />
                  {Boolean(fieldErrors.loginPassword) && (
                    <Text style={styles.fieldErrorText}>{fieldErrors.loginPassword}</Text>
                  )}

                  <TouchableOpacity
                    style={styles.emailBtn}
                    onPress={() => void handlePhoneLoginSubmit()}
                  >
                    <Ionicons name="log-in-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.emailBtnText}>Sign In with Mobile</Text>
                  </TouchableOpacity>
                </>
              )}

              {authTab === 'email_login' && (
                <>
                  <Text style={styles.sectionTitle}>Sign In with Email</Text>
                  <Text style={styles.inputLabel}>Email Address *</Text>
                  <TextInput
                    style={[styles.input, Boolean(fieldErrors.loginEmail) && styles.inputError]}
                    value={emailInput}
                    onChangeText={(t) => {
                      setEmailInput(t);
                      clearFieldError('loginEmail');
                      setAuthActionFeedback(null);
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholder="you@example.com"
                    placeholderTextColor={Colors.text.muted}
                  />
                  {Boolean(fieldErrors.loginEmail) && (
                    <Text style={styles.fieldErrorText}>{fieldErrors.loginEmail}</Text>
                  )}

                  <Text style={styles.inputLabel}>Password *</Text>
                  <TextInput
                    style={[styles.input, Boolean(fieldErrors.loginPassword) && styles.inputError]}
                    value={passwordInput}
                    onChangeText={(t) => {
                      setPasswordInput(t);
                      clearFieldError('loginPassword');
                      setAuthActionFeedback(null);
                    }}
                    secureTextEntry
                    placeholder="Your account password"
                    placeholderTextColor={Colors.text.muted}
                  />
                  {Boolean(fieldErrors.loginPassword) && (
                    <Text style={styles.fieldErrorText}>{fieldErrors.loginPassword}</Text>
                  )}

                  <TouchableOpacity
                    style={styles.emailBtn}
                    onPress={() => void handleEmailLoginSubmit()}
                  >
                    <Ionicons name="mail-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.emailBtnText}>Sign In with Email</Text>
                  </TouchableOpacity>
                </>
              )}

              {authActionFeedback && (
                <View
                  style={[
                    styles.feedbackBox,
                    authActionFeedback.type === 'error'
                      ? styles.feedbackError
                      : styles.feedbackSuccess,
                  ]}
                >
                  <Text style={styles.feedbackText}>{authActionFeedback.message}</Text>
                </View>
              )}
            </View>
          </>
        )}

        {/* Signed-In Account Role, Mobile & Dynamic Menu Setup */}
        {isSignedIn && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>
              Account Type, Role & Mobile Number
            </Text>
            <Text style={styles.sectionDesc}>
              {!userProfile.isMarketplaceOnboardingComplete
                ? 'Choose your role and enter your compulsory mobile number to unlock tailored Marketplace menus.'
                : 'Adjust your account mode or mobile number below, then tap "Save Account Settings" to dynamically update all tabs and menus.'}
            </Text>

            <Text style={styles.inputLabel}>Account Type *</Text>
            <View style={styles.roleRow}>
              <TouchableOpacity
                style={[
                  styles.roleCard,
                  draftRole === 'producer' && styles.roleCardActive,
                ]}
                onPress={() => {
                  setDraftRole('producer');
                  setSaveFeedback(null);
                }}
              >
                <Text style={styles.roleTitle}>🌳 Producer (Grower)</Text>
                <Text style={styles.roleDesc}>
                  Orchard fields, care calendar, Camera AI & crop listings
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.roleCard,
                  draftRole === 'wholesaler' && styles.roleCardActive,
                ]}
                onPress={() => {
                  setDraftRole('wholesaler');
                  setSaveFeedback(null);
                }}
              >
                <Text style={styles.roleTitle}>🏪 Wholesaler (Buyer)</Text>
                <Text style={styles.roleDesc}>
                  Clean Buyer Hub: Marketplace, Buyers Hall & Buyer Desk
                </Text>
              </TouchableOpacity>
            </View>

            {draftRole === 'wholesaler' && (
              <TouchableOpacity
                style={styles.optInRow}
                onPress={() => {
                  setDraftEnableOrchardTools((v) => !v);
                  setSaveFeedback(null);
                }}
              >
                <Ionicons
                  name={draftEnableOrchardTools ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={Colors.walnutGreen[800]}
                />
                <Text style={styles.optInText}>
                  Also Enable Grower / Orchard Mode (unlocks personal Orchard,
                  Care Plan & Camera AI tabs alongside buying)
                </Text>
              </TouchableOpacity>
            )}

            <Text style={styles.inputLabel}>Display / Company Name *</Text>
            <TextInput
              style={[
                styles.input,
                Boolean(fieldErrors.draftDisplayName) && styles.inputError,
              ]}
              value={draftDisplayName}
              onChangeText={(text) => {
                setDraftDisplayName(text);
                clearFieldError('draftDisplayName');
                setSaveFeedback(null);
              }}
              placeholder="Your name or business name"
              placeholderTextColor={Colors.text.muted}
            />
            {Boolean(fieldErrors.draftDisplayName) && (
              <Text style={styles.fieldErrorText}>
                {fieldErrors.draftDisplayName}
              </Text>
            )}

            <Text style={styles.inputLabel}>
              Compulsory Mobile Number (E.164 with country code) *
            </Text>
            <TextInput
              style={[
                styles.input,
                Boolean(fieldErrors.draftPhone) && styles.inputError,
              ]}
              value={draftPhone}
              onChangeText={(text) => {
                setDraftPhone(text);
                clearFieldError('draftPhone');
                setSaveFeedback(null);
              }}
              keyboardType="phone-pad"
              placeholder="+905551234567"
              placeholderTextColor={Colors.text.muted}
            />
            {Boolean(fieldErrors.draftPhone) && (
              <Text style={styles.fieldErrorText}>{fieldErrors.draftPhone}</Text>
            )}

            {!draftShowOrchardTools && (
              <>
                {hasUnsavedChanges && (
                  <View style={styles.unsavedBanner}>
                    <Ionicons name="warning" size={16} color="#9A3412" />
                    <Text style={styles.unsavedBannerText}>
                      Unsaved changes pending — tap Save Account Settings to update menus.
                    </Text>
                  </View>
                )}

                <View style={styles.saveBtnRow}>
                  {hasUnsavedChanges && (
                    <TouchableOpacity
                      style={styles.resetDraftBtn}
                      onPress={handleDiscardDrafts}
                    >
                      <Text style={styles.resetDraftBtnText}>Reset</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[
                      styles.emailBtn,
                      { flex: 1, marginTop: 0 },
                      isSavingSettings && { opacity: 0.7 },
                    ]}
                    disabled={isSavingSettings}
                    onPress={() => void handleSaveAccountSettings(true)}
                  >
                    <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                    <Text style={styles.emailBtnText}>
                      {isSavingSettings
                        ? 'Saving Settings...'
                        : 'Save Account Settings'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {saveFeedback && (
                  <View
                    style={[
                      styles.feedbackBox,
                      saveFeedback.type === 'error'
                        ? styles.feedbackError
                        : styles.feedbackSuccess,
                    ]}
                  >
                    <Text style={styles.feedbackText}>{saveFeedback.message}</Text>
                  </View>
                )}
              </>
            )}
          </View>
        )}

        {/* Grower Care Level & Notification Preferences (Producer or Opt-in Orchard Mode) */}
        {draftShowOrchardTools && (
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
                  'Tap "Save Account Settings" below to commit all role & care changes.',
                ],
                whatToExpect:
                  'Saving commits your preferences to Convex and updates your navigation menus immediately.',
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
              const active = draftExperienceLevel === lvl.id;
              return (
                <TouchableOpacity
                  key={lvl.id}
                  style={[styles.levelBtn, active && styles.levelBtnActive]}
                  onPress={() => {
                    setDraftExperienceLevel(lvl.id);
                    setSaveFeedback(null);
                  }}
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
              Notification Topics ({draftPushEnabled ? 'Enabled' : 'Paused'})
            </Text>
            <TouchableOpacity
              style={[
                styles.pushPill,
                draftPushEnabled && styles.pushPillActive,
              ]}
              onPress={() => {
                setDraftPushEnabled((prev) => !prev);
                setSaveFeedback(null);
              }}
            >
              <Text
                style={[
                  styles.pushPillText,
                  draftPushEnabled && styles.pushPillTextActive,
                ]}
              >
                {draftPushEnabled ? 'Alerts ON' : 'Paused'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.topicWrap}>
            {NOTIFICATION_TOPIC_OPTIONS.map((topic) => {
              const selected = draftNotificationTopics.includes(topic.id);
              return (
                <TouchableOpacity
                  key={topic.id}
                  style={[styles.topicChip, selected && styles.topicChipActive]}
                  onPress={() => {
                    const next = selected
                      ? draftNotificationTopics.filter((t) => t !== topic.id)
                      : [...draftNotificationTopics, topic.id];
                    setDraftNotificationTopics(next);
                    setSaveFeedback(null);
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

          {hasUnsavedChanges && (
            <View style={[styles.unsavedBanner, { marginTop: 12, marginBottom: 4 }]}>
              <Ionicons name="warning" size={16} color="#9A3412" />
              <Text style={styles.unsavedBannerText}>
                Unsaved changes pending — tap Save Account Settings to apply.
              </Text>
            </View>
          )}

          <View style={[styles.saveBtnRow, { marginTop: 10 }]}>
            {hasUnsavedChanges && (
              <TouchableOpacity
                style={styles.resetDraftBtn}
                onPress={handleDiscardDrafts}
              >
                <Text style={styles.resetDraftBtnText}>Reset</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.emailBtn,
                { flex: 1, marginTop: 0 },
                isSavingSettings && { opacity: 0.7 },
              ]}
              disabled={isSavingSettings}
              onPress={() => void handleSaveAccountSettings(true)}
            >
              <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
              <Text style={styles.emailBtnText}>
                {isSavingSettings
                  ? 'Saving Settings...'
                  : 'Save Account Settings'}
              </Text>
            </TouchableOpacity>
          </View>

          {saveFeedback && (
            <View
              style={[
                styles.feedbackBox,
                saveFeedback.type === 'error'
                  ? styles.feedbackError
                  : styles.feedbackSuccess,
              ]}
            >
              <Text style={styles.feedbackText}>{saveFeedback.message}</Text>
            </View>
          )}
        </View>
        )}

        {/* Account Data, Export & Backup Controls */}
        <View style={styles.sectionCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={styles.sectionTitle}>
              {isPureWholesaler
                ? 'Account Data, Export & Security'
                : 'Orchard & Trade Cloud Backup'}
            </Text>
            <HelpButton
              help={{
                title: isPureWholesaler
                  ? 'Account Data, GDPR Export & Deletion'
                  : 'Cloud Backup, GDPR Export & Deletion',
                whatItDoes: isPureWholesaler
                  ? 'Manages GDPR JSON export of your Wholesaler profile, Buy Requests, and trade threads, plus Log Out and permanent account deletion.'
                  : 'Manages manual Convex backup, GDPR JSON data export, Log Out, and permanent account deletion.',
                howToDoIt: isPureWholesaler
                  ? [
                      'Tap "Export My Buyer Data (GDPR JSON)" to download or share your marketplace records.',
                      'Tap "Log Out" to sign out safely, or "Delete Account & Data" to erase all cloud + local records.',
                    ]
                  : [
                      'Tap "Back Up Pending Orchard Logs" to upload queued SQLite records immediately.',
                      'Tap "Export My Orchard & Trade Data (GDPR JSON)" to download or share a copy of your records.',
                      'Tap "Log Out" to lock orchard menus, or "Delete Account & Data" to erase all cloud + local records.',
                    ],
                whatToExpect:
                  'Account deletion permanently removes your Convex records, marketplace listings/profiles, messages, local SQLite cache, and Clerk login.',
              }}
            />
          </View>
          <Text style={styles.sectionDesc}>
            {isPureWholesaler
              ? 'Your buyer profile, buy requests, and trade messages sync securely with Convex Cloud.'
              : 'Your tree counts, crop drafts, and care logs work offline in the grove and back up automatically when signal returns.'}
          </Text>

          {!isPureWholesaler && (
            <TouchableOpacity
              style={styles.syncActionBtn}
              onPress={() => void syncPendingToConvex()}
            >
              <Ionicons name="cloud-upload" size={16} color="#FFFFFF" />
              <Text style={styles.syncActionBtnText}>
                Back Up Pending Orchard Logs ({pendingUploadCount})
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.offlineToggleBtn,
              !isPureWholesaler && { marginTop: 10 },
            ]}
            onPress={() => void handleExportData()}
          >
            <Ionicons
              name="download-outline"
              size={16}
              color={Colors.walnutGreen[800]}
            />
            <Text style={styles.offlineToggleText}>
              {isPureWholesaler
                ? 'Export My Buyer Data (GDPR JSON)'
                : 'Export My Orchard & Trade Data (GDPR JSON)'}
            </Text>
          </TouchableOpacity>

          {isSignedIn && (
            <>
              <TouchableOpacity
                style={styles.offlineToggleBtn}
                onPress={() => void signOutToOfflineMode()}
              >
                <Ionicons
                  name="log-out-outline"
                  size={16}
                  color={Colors.walnutShell[700]}
                />
                <Text style={styles.offlineToggleText}>
                  {isPureWholesaler ? 'Log Out' : 'Log Out (Lock Orchard Menus)'}
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

      {/* Cross-Platform Unsaved Changes Confirmation Modal */}
      <Modal
        visible={showUnsavedModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowUnsavedModal(false);
          setPendingNavAction(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="warning" size={22} color="#B45309" />
              <Text style={styles.modalTitle}>Unsaved Account Changes</Text>
            </View>
            <Text style={styles.modalDesc}>
              {isSignedIn
                ? 'You changed your account type, mobile number, or preferences without saving. Do you want to save and apply these changes now?'
                : 'You entered registration details without creating the account yet. Discard changes or keep editing?'}
            </Text>

            {isSignedIn && (
              <TouchableOpacity
                style={styles.modalPrimaryBtn}
                disabled={isSavingSettings}
                onPress={() => void handleSaveAccountSettings(true)}
              >
                <Text style={styles.modalPrimaryText}>
                  {isSavingSettings ? 'Saving...' : 'Save & Apply Now'}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.modalDangerBtn}
              onPress={() => {
                handleDiscardDrafts();
                setShowUnsavedModal(false);
                allowLeaveRef.current = true;
                const action = pendingNavAction;
                setPendingNavAction(null);
                if (action) {
                  navigation.dispatch(action);
                } else if (isPureWholesaler) {
                  router.replace('/(tabs)/marketplace');
                } else {
                  router.back();
                }
              }}
            >
              <Text style={styles.modalDangerText}>Discard & Leave</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalSecondaryBtn}
              onPress={() => {
                setShowUnsavedModal(false);
                setPendingNavAction(null);
              }}
            >
              <Text style={styles.modalSecondaryText}>Keep Editing</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  unsavedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  unsavedBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
    lineHeight: 17,
  },
  saveBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  resetDraftBtn: {
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.walnutShell[200],
    backgroundColor: Colors.walnutShell[50],
  },
  resetDraftBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.walnutShell[700],
  },
  feedbackBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  feedbackError: {
    backgroundColor: '#FEE2E2',
    borderColor: '#F87171',
  },
  feedbackSuccess: {
    backgroundColor: '#DCFCE7',
    borderColor: '#4ADE80',
  },
  feedbackText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.walnutGreen[900],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 15, 0.55)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: Colors.surface.card,
    borderRadius: 16,
    padding: 18,
    gap: 10,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.walnutGreen[900],
  },
  modalDesc: {
    fontSize: 13,
    color: Colors.text.secondary,
    lineHeight: 19,
  },
  modalPrimaryBtn: {
    backgroundColor: Colors.walnutGreen[700],
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalPrimaryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  modalDangerBtn: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalDangerText: {
    color: '#991B1B',
    fontSize: 13,
    fontWeight: '800',
  },
  modalSecondaryBtn: {
    backgroundColor: Colors.walnutGreen[50],
    borderWidth: 1,
    borderColor: Colors.surface.border,
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalSecondaryText: {
    color: Colors.walnutGreen[900],
    fontSize: 13,
    fontWeight: '700',
  },
  inputError: {
    borderColor: '#DC2626',
    borderWidth: 1.5,
    backgroundColor: '#FEF2F2',
  },
  fieldErrorText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B91C1C',
    marginTop: -6,
    marginBottom: 8,
  },
});
