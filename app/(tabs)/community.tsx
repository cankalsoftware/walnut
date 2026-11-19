import React, { useEffect, useState } from 'react';
import {
  Alert,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '../../src/theme/colors';
import {
  COMMUNITY_CHANNELS,
  ChatMessage,
  INITIAL_CHAT_MESSAGES,
  INITIAL_TREES,
} from '../../src/data/walnutLifecycle';
import { useWalnutCloud } from '../../src/providers/ConvexClerkProvider';
import { LockedTabNotice } from '../../src/components/LockedTabNotice';
import { HelpButton } from '../../src/components/HelpModal';

export default function CommunityChatScreen() {
  const router = useRouter();
  const {
    isSignedIn,
    userProfile,
    roleGroupMessages,
    marketPulse,
    postRoleGroupMessage,
    submitContentReport,
  } = useWalnutCloud();

  const isWholesaler = userProfile.accountType === 'wholesaler';
  const isPureWholesaler = isWholesaler && !userProfile.enableOrchardTools;
  const roleRoomName = isWholesaler ? 'Buyers Only Hall' : 'Sellers Only Hall';
  const [selectedChannel, setSelectedChannel] = useState(
    isWholesaler ? 'role_room' : 'yield-counts'
  );
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_CHAT_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [attachScanCard, setAttachScanCard] = useState(false);

  useEffect(() => {
    if (isPureWholesaler && selectedChannel !== 'role_room') {
      setSelectedChannel('role_room');
    }
  }, [isPureWholesaler, selectedChannel]);

  if (!isSignedIn) {
    return (
      <LockedTabNotice
        title="Sign In Required for Trade & Grower Community"
        description="Sign in to join your role-only main hall (Sellers Only or Buyers Only), follow Market Pulse prices, and exchange regional updates."
      />
    );
  }

  const isRoleRoom = selectedChannel === 'role_room';
  const channelMessages = messages.filter(
    (m) => m.channelId === selectedChannel
  );

  const visibleChannels = isPureWholesaler
    ? [{ id: 'role_room', name: roleRoomName }]
    : [{ id: 'role_room', name: roleRoomName }, ...COMMUNITY_CHANNELS];

  const handleSendMessage = async () => {
    if (!isSignedIn) {
      router.push('/auth');
      return;
    }

    if (isRoleRoom) {
      const clean = inputText.trim();
      if (!clean) return;
      try {
        await postRoleGroupMessage(clean);
        setInputText('');
      } catch (err: any) {
        Alert.alert('Message Notice', err?.message ?? 'Could not post to hall.');
      }
      return;
    }

    if (!inputText.trim() && !attachScanCard) return;

    const sampleTree = INITIAL_TREES[0];
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      channelId: selectedChannel,
      senderName: userProfile.displayName || 'You (Orchard Grower)',
      senderRole: 'Orchard Owner',
      senderRegion: userProfile.region || 'Verified Grower',
      timestamp: 'Just now',
      text:
        inputText.trim() ||
        'Sharing my latest tree count and care metrics with the group:',
      isOwn: true,
      sharedCard: attachScanCard
        ? {
            treeName: sampleTree.name,
            variety: sampleTree.variety,
            treeAgeYears: 2026 - sampleTree.plantedYear,
            scanMode: 'Canopy Yield Count',
            detectedInFrame: sampleTree.lastCanopyCount,
            estimatedTotalNuts: sampleTree.estimatedTotalNuts,
            estimatedYieldKg: sampleTree.estimatedWeightKg,
            avgNutSizeMm: sampleTree.avgNutDiameterMm,
            careNote: 'Synced from local orchard log • Ready for feedback',
          }
        : undefined,
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputText('');
    setAttachScanCard(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>
              {isWholesaler && userProfile.enableOrchardTools
                ? 'Buyers Hall & Grower Community'
                : isWholesaler
                  ? 'Buyers Trade Community'
                  : 'Grower & Trade Community'}
            </Text>
            <Text style={styles.subtitle}>
              {isWholesaler && userProfile.enableOrchardTools
                ? 'Market Pulse, Buyers-only hall & grower orchard tips'
                : isWholesaler
                  ? 'Market Pulse benchmarks & Wholesalers-only hall'
                  : 'Market Pulse benchmarks, Sellers-only hall & grower tips'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <HelpButton
              help={{
                title: 'Community & Role Halls',
                whatItDoes:
                  'Connects Producers exclusively with fellow Producers in Sellers Only Hall, and Wholesalers exclusively with fellow Wholesalers in Buyers Only Hall, alongside live Market Pulse benchmarks.',
                howToDoIt: [
                  'Check the Regional Market Pulse strip at the top for active supply, demand, and ask price ranges.',
                  'Select your role hall to share logistics, harvest timing, or grading updates with verified peers.',
                  'Use Report on any message if someone posts abusive or misleading trade claims.',
                ],
                whatToExpect:
                  'Server-side RBAC prevents cross-role visibility in the Sellers Only and Buyers Only halls.',
              }}
            />
            <TouchableOpacity
              style={styles.accountChip}
              onPress={() => router.push('/auth')}
            >
              <Ionicons name="person-circle" size={18} color={Colors.walnutGreen[800]} />
              <Text style={styles.accountChipText}>Account</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Pinned Regional Market Pulse Bar */}
        {marketPulse.length > 0 && (
          <View style={styles.pulseWrapper}>
            <Text style={styles.pulseSectionLabel}>REGIONAL MARKET PULSE</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pulseStrip}
            >
              {marketPulse.map((bucket) => (
                <View key={bucket.key} style={styles.pulseCard}>
                  <Text style={styles.pulseTitle}>
                    {bucket.variety} •{' '}
                    {bucket.form === 'in_shell' ? 'In-Shell' : 'Kernel'}
                  </Text>
                  <Text style={styles.pulseMetric}>
                    Supply: {bucket.activeListingCount} lots (
                    {(bucket.totalAvailableKg / 1000).toFixed(1)}T)
                    {bucket.minPricePerKg !== undefined &&
                    bucket.maxPricePerKg !== undefined
                      ? ` • ${bucket.currency} ${bucket.minPricePerKg.toFixed(2)}–${bucket.maxPricePerKg.toFixed(2)}/kg`
                      : ''}
                  </Text>
                  <Text style={styles.pulseDemand}>
                    Demand: {bucket.activeBuyRequestCount} buyers (
                    {(bucket.totalDemandKg / 1000).toFixed(1)}T wanted)
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Channel Switcher Strip */}
        <View style={styles.channelStripWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.channelStrip}
          >
            {visibleChannels.map((ch) => {
              const active = ch.id === selectedChannel;
              return (
                <TouchableOpacity
                  key={ch.id}
                  style={[
                    styles.channelPill,
                    ch.id === 'role_room' && styles.roleChannelPill,
                    active && styles.channelPillActive,
                  ]}
                  onPress={() => setSelectedChannel(ch.id)}
                >
                  <Text
                    style={[
                      styles.channelPillText,
                      active && styles.channelPillTextActive,
                    ]}
                  >
                    {ch.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Role Isolation Notice when inside Sellers Only / Buyers Only */}
        {isRoleRoom && (
          <View style={styles.roleIsolationBanner}>
            <Ionicons name="shield-checkmark" size={14} color={Colors.walnutGreen[800]} />
            <Text style={styles.roleIsolationText}>
              {isWholesaler
                ? 'Buyers Only Hall: Visible exclusively to registered Wholesalers.'
                : 'Sellers Only Hall: Visible exclusively to Walnut Producers.'}
            </Text>
          </View>
        )}

        {/* Messages Feed */}
        <ScrollView
          style={styles.feed}
          contentContainerStyle={styles.feedContent}
          showsVerticalScrollIndicator={false}
        >
          {isRoleRoom ? (
            roleGroupMessages.length === 0 ? (
              <View style={styles.emptyRoleBox}>
                <Text style={styles.emptyRoleTitle}>Welcome to {roleRoomName}</Text>
                <Text style={styles.emptyRoleDesc}>
                  {isWholesaler
                    ? 'Coordinate regional truck routes, crack-test practices, and cold-storage demand with fellow verified buyers.'
                    : 'Share drying schedules, hull-split timing, caliber feedback, and regional buyer demand with fellow walnut growers.'}
                </Text>
              </View>
            ) : (
              roleGroupMessages.map((msg) => {
                const isOwn = msg.senderClerkId === userProfile.clerkId;
                return (
                  <View
                    key={msg._id}
                    style={[styles.messageBubble, isOwn && styles.messageBubbleOwn]}
                  >
                    <View style={styles.msgHeader}>
                      <Text style={styles.senderName}>{msg.senderName}</Text>
                      <Text style={styles.msgTimestamp}>
                        {new Date(msg.createdAtMs).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                    <Text style={styles.senderMeta}>
                      {msg.senderRole} • {msg.senderRegion}
                    </Text>
                    <Text style={styles.msgText}>{msg.text}</Text>
                    {!isOwn && (
                      <TouchableOpacity
                        style={{ alignSelf: 'flex-end', marginTop: 4 }}
                        onPress={async () => {
                          await submitContentReport({
                            targetType: 'group_message',
                            targetId: msg._id,
                            reportedUserId: msg.senderClerkId,
                            reason: `Reported in ${roleRoomName}`,
                          });
                          Alert.alert(
                            'Reported',
                            'Message flagged for Admin moderation review.'
                          );
                        }}
                      >
                        <Text style={styles.reportLink}>Report</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })
            )
          ) : (
            channelMessages.map((msg) => (
              <View
                key={msg.id}
                style={[
                  styles.messageBubble,
                  msg.isOwn && styles.messageBubbleOwn,
                ]}
              >
                <View style={styles.msgHeader}>
                  <Text style={styles.senderName}>{msg.senderName}</Text>
                  <Text style={styles.msgTimestamp}>{msg.timestamp}</Text>
                </View>
                <Text style={styles.senderMeta}>
                  {msg.senderRole} • {msg.senderRegion}
                </Text>
                <Text style={styles.msgText}>{msg.text}</Text>

                {/* Embedded Shareable Orchard Data Card */}
                {msg.sharedCard && (
                  <View style={styles.sharedDataCard}>
                    <View style={styles.sharedCardHeader}>
                      <Ionicons
                        name="analytics"
                        size={16}
                        color={Colors.walnutGreen[800]}
                      />
                      <Text style={styles.sharedCardTitle}>
                        {msg.sharedCard.treeName} ({msg.sharedCard.variety})
                      </Text>
                    </View>
                    <View style={styles.sharedMetricsRow}>
                      <View style={styles.sharedMetricBox}>
                        <Text style={styles.sharedMetricVal}>
                          {msg.sharedCard.detectedInFrame}
                        </Text>
                        <Text style={styles.sharedMetricLbl}>AI Count</Text>
                      </View>
                      <View style={styles.sharedMetricBox}>
                        <Text style={styles.sharedMetricVal}>
                          {msg.sharedCard.estimatedTotalNuts}
                        </Text>
                        <Text style={styles.sharedMetricLbl}>Est. Tree Total</Text>
                      </View>
                      <View style={styles.sharedMetricBox}>
                        <Text style={styles.sharedMetricVal}>
                          {msg.sharedCard.estimatedYieldKg} kg
                        </Text>
                        <Text style={styles.sharedMetricLbl}>Est. Yield</Text>
                      </View>
                      <View style={styles.sharedMetricBox}>
                        <Text style={styles.sharedMetricVal}>
                          {msg.sharedCard.avgNutSizeMm}mm
                        </Text>
                        <Text style={styles.sharedMetricLbl}>Nut Size</Text>
                      </View>
                    </View>
                    <Text style={styles.sharedCareNote}>
                      Care Log: {msg.sharedCard.careNote}
                    </Text>
                  </View>
                )}
              </View>
            ))
          )}
        </ScrollView>

        {/* Optional Attached Tree Card Preview */}
        {!isRoleRoom && attachScanCard && (
          <View style={styles.attachmentPreviewBar}>
            <Ionicons
              name="checkmark-circle"
              size={16}
              color={Colors.walnutGreen[700]}
            />
            <Text style={styles.attachmentPreviewText}>
              Attaching Tree #01 Yield & Care Card to message
            </Text>
            <TouchableOpacity onPress={() => setAttachScanCard(false)}>
              <Ionicons name="close-circle" size={18} color={Colors.text.muted} />
            </TouchableOpacity>
          </View>
        )}

        {/* Composer Bar */}
        <View style={styles.composerRow}>
          {!isRoleRoom && (
            <TouchableOpacity
              style={[
                styles.attachBtn,
                attachScanCard && styles.attachBtnActive,
              ]}
              onPress={() => setAttachScanCard((prev) => !prev)}
            >
              <Ionicons
                name="stats-chart"
                size={20}
                color={Colors.walnutGreen[800]}
              />
            </TouchableOpacity>
          )}
          <TextInput
            style={styles.input}
            placeholder={
              isRoleRoom
                ? `Post to ${roleRoomName}...`
                : 'Share walnut experience, pruning tip, or tree count...'
            }
            placeholderTextColor={Colors.text.muted}
            value={inputText}
            onChangeText={setInputText}
          />
          <TouchableOpacity
            style={styles.sendBtn}
            onPress={handleSendMessage}
          >
            <Ionicons name="send" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
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
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: {
    fontSize: 23,
    fontWeight: '800',
    color: Colors.walnutGreen[900],
  },
  subtitle: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  channelStripWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.surface.border,
    paddingBottom: 10,
  },
  channelStrip: {
    paddingHorizontal: 16,
    gap: 8,
  },
  channelPill: {
    backgroundColor: Colors.surface.card,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.surface.border,
  },
  channelPillActive: {
    backgroundColor: Colors.walnutGreen[200],
    borderColor: Colors.walnutGreen[600],
  },
  channelPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  channelPillTextActive: {
    color: Colors.walnutGreen[900],
    fontWeight: '800',
  },
  feed: {
    flex: 1,
  },
  feedContent: {
    padding: 16,
    gap: 12,
  },
  messageBubble: {
    backgroundColor: Colors.surface.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.surface.border,
  },
  messageBubbleOwn: {
    backgroundColor: Colors.walnutGreen[200],
    borderColor: Colors.walnutGreen[400],
  },
  msgHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  senderName: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.walnutGreen[900],
  },
  msgTimestamp: {
    fontSize: 11,
    color: Colors.text.muted,
  },
  senderMeta: {
    fontSize: 11,
    color: Colors.walnutShell[500],
    fontWeight: '600',
    marginBottom: 6,
  },
  msgText: {
    fontSize: 13,
    color: Colors.walnutGreen[900],
    lineHeight: 19,
  },
  sharedDataCard: {
    marginTop: 10,
    backgroundColor: Colors.walnutGreen[100],
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.walnutGreen[300],
  },
  sharedCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  sharedCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.walnutGreen[900],
  },
  sharedMetricsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  sharedMetricBox: {
    flex: 1,
    backgroundColor: Colors.surface.card,
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: 'center',
  },
  sharedMetricVal: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.walnutGreen[800],
  },
  sharedMetricLbl: {
    fontSize: 9,
    color: Colors.text.secondary,
  },
  sharedCareNote: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.walnutShell[700],
  },
  attachmentPreviewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.walnutGreen[200],
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
  },
  attachmentPreviewText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: Colors.walnutGreen[900],
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: Colors.surface.card,
    borderTopWidth: 1,
    borderTopColor: Colors.surface.border,
    gap: 8,
  },
  attachBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: Colors.walnutGreen[100],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.walnutGreen[300],
  },
  attachBtnActive: {
    backgroundColor: Colors.walnutGreen[300],
  },
  input: {
    flex: 1,
    backgroundColor: Colors.walnutGreen[50],
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: Colors.walnutGreen[900],
    borderWidth: 1,
    borderColor: Colors.surface.border,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: Colors.walnutGreen[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseWrapper: {
    paddingBottom: 8,
  },
  pulseSectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: Colors.walnutShell[700],
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  pulseStrip: {
    paddingHorizontal: 16,
    gap: 8,
  },
  pulseCard: {
    backgroundColor: Colors.walnutShell[50],
    borderWidth: 1,
    borderColor: Colors.walnutShell[200],
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 220,
    gap: 2,
  },
  pulseTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.walnutShell[700],
  },
  pulseMetric: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.walnutGreen[900],
  },
  pulseDemand: {
    fontSize: 10,
    color: Colors.text.secondary,
  },
  roleChannelPill: {
    borderColor: Colors.walnutShell[500],
    backgroundColor: Colors.walnutShell[50],
  },
  roleIsolationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.walnutGreen[100],
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surface.border,
  },
  roleIsolationText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.walnutGreen[900],
    flex: 1,
  },
  emptyRoleBox: {
    backgroundColor: Colors.surface.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.surface.border,
    gap: 6,
  },
  emptyRoleTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.walnutGreen[900],
  },
  emptyRoleDesc: {
    fontSize: 13,
    color: Colors.text.secondary,
    lineHeight: 19,
  },
  reportLink: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.text.muted,
  },
  accountChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.walnutGreen[100],
    borderWidth: 1,
    borderColor: Colors.walnutGreen[300],
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  accountChipText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.walnutGreen[800],
  },
});

