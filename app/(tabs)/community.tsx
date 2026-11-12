import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../src/theme/colors';
import {
  COMMUNITY_CHANNELS,
  ChatMessage,
  INITIAL_CHAT_MESSAGES,
  INITIAL_TREES,
} from '../../src/data/walnutLifecycle';

export default function CommunityChatScreen() {
  const [selectedChannel, setSelectedChannel] = useState('yolo-yield-estimates');
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_CHAT_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [attachScanCard, setAttachScanCard] = useState(false);

  const channelMessages = messages.filter(
    (m) => m.channelId === selectedChannel
  );

  const handleSendMessage = () => {
    if (!inputText.trim() && !attachScanCard) return;

    const sampleTree = INITIAL_TREES[0];
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      channelId: selectedChannel,
      senderName: 'You (WalnutIQ Grower)',
      senderRole: 'Orchard Owner',
      senderRegion: 'Synced via Convex',
      timestamp: 'Just now',
      text:
        inputText.trim() ||
        'Sharing my latest YOLO tree scan and care metrics with the group:',
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
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Grower Community & Chat</Text>
            <Text style={styles.subtitle}>
              Powered by Convex Real-Time + Clerk Auth (Mobile & Web Shared)
            </Text>
          </View>
        </View>

        {/* Channel Switcher Strip */}
        <View style={styles.channelStripWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.channelStrip}
          >
            {COMMUNITY_CHANNELS.map((ch) => {
              const active = ch.id === selectedChannel;
              return (
                <TouchableOpacity
                  key={ch.id}
                  style={[
                    styles.channelPill,
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

        {/* Messages Feed */}
        <ScrollView
          style={styles.feed}
          contentContainerStyle={styles.feedContent}
          showsVerticalScrollIndicator={false}
        >
          {channelMessages.map((msg) => (
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
                      <Text style={styles.sharedMetricLbl}>YOLO Count</Text>
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
          ))}
        </ScrollView>

        {/* Optional Attached Tree Card Preview */}
        {attachScanCard && (
          <View style={styles.attachmentPreviewBar}>
            <Ionicons
              name="checkmark-circle"
              size={16}
              color={Colors.walnutGreen[700]}
            />
            <Text style={styles.attachmentPreviewText}>
              Attaching Tree #01 YOLO Yield & Care Card to message
            </Text>
            <TouchableOpacity onPress={() => setAttachScanCard(false)}>
              <Ionicons name="close-circle" size={18} color={Colors.text.muted} />
            </TouchableOpacity>
          </View>
        )}

        {/* Composer Bar */}
        <View style={styles.composerRow}>
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
          <TextInput
            style={styles.input}
            placeholder="Share walnut experience, pruning tip, or YOLO count..."
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
});

