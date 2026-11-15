import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../src/theme/colors';
import {
  CanopyQuadrant,
  ScannerMode,
  calculateTreeYieldEstimate,
  getWeightsStatus,
  runFrameDetection,
} from '../../src/services/yoloService';
import { INITIAL_TREES } from '../../src/data/walnutLifecycle';
import { useWalnutCloud } from '../../src/providers/ConvexClerkProvider';
import { LockedTabNotice } from '../../src/components/LockedTabNotice';
import { HelpButton } from '../../src/components/HelpModal';

const QUADRANTS: CanopyQuadrant[] = ['North', 'East', 'South', 'West'];

export default function CameraAiScreen() {
  const router = useRouter();
  const { isSignedIn } = useWalnutCloud();
  const params = useLocalSearchParams<{ mode?: string }>();
  const [mode, setMode] = useState<ScannerMode>('canopy');

  useEffect(() => {
    if (
      params.mode === 'canopy' ||
      params.mode === 'ground' ||
      params.mode === 'growth'
    ) {
      setMode(params.mode);
    }
  }, [params.mode]);

  if (!isSignedIn) {
    return (
      <LockedTabNotice
        title="Sign In Required for Camera AI"
        description="Sign in to run orchard tree scans and save yield counts to your local SQLite & cloud backup."
      />
    );
  }
  const [selectedTreeIndex, setSelectedTreeIndex] = useState(0);
  const [frameSeed, setFrameSeed] = useState(1);
  const [activeQuadrant, setActiveQuadrant] = useState<CanopyQuadrant>('North');
  const [quadrantCounts, setQuadrantCounts] = useState<
    Record<CanopyQuadrant, number>
  >({
    North: 64,
    East: 58,
    South: 68,
    West: 58,
  });
  const [groundPickedSession, setGroundPickedSession] = useState(42);

  const weightsStatus = getWeightsStatus();
  const activeTree = INITIAL_TREES[selectedTreeIndex];
  const detections = runFrameDetection(mode, frameSeed);

  const yieldEstimate = calculateTreeYieldEstimate(
    quadrantCounts,
    activeTree.canopyDensity
  );

  const handleCaptureFrame = () => {
    if (!isSignedIn) {
      router.push('/auth');
      return;
    }
    setFrameSeed((prev) => prev + 1);
    if (mode === 'canopy') {
      const simulatedCount = 55 + ((frameSeed * 7) % 22);
      setQuadrantCounts((prev) => ({
        ...prev,
        [activeQuadrant]: simulatedCount,
      }));
    } else if (mode === 'ground') {
      setGroundPickedSession((prev) => prev + detections.length);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Mode Switcher: Option 1 (Canopy Count) vs Option 2 (Ground Finder) vs Growth */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: Colors.walnutGreen[900] }}>
            Camera AI Scanner
          </Text>
          <HelpButton
            help={{
              title: 'Camera AI Scanner Modes',
              whatItDoes:
                'Estimates walnut counts on tree canopies, detects fallen nuts on the ground, and tracks hull/leaf health.',
              howToDoIt: [
                'Choose "1. Tree Count" for canopy quadrants (North/East/South/West), "2. Ground" for harvest pickup, or "3. Health".',
                'Point at the tree or ground and tap Capture Frame.',
              ],
              whatToExpect:
                'Detected counts update the tree yield estimate and save to your local SQLite queue.',
            }}
          />
        </View>
        <View style={styles.modeTabs}>
          <TouchableOpacity
            style={[styles.modeTab, mode === 'canopy' && styles.modeTabActive]}
            onPress={() => setMode('canopy')}
          >
            <Ionicons
              name="leaf"
              size={15}
              color={mode === 'canopy' ? Colors.walnutGreen[900] : '#FFF'}
            />
            <Text
              style={[
                styles.modeTabText,
                mode === 'canopy' && styles.modeTabTextActive,
              ]}
            >
              1. Tree Count
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeTab, mode === 'ground' && styles.modeTabActive]}
            onPress={() => setMode('ground')}
          >
            <Ionicons
              name="locate"
              size={15}
              color={mode === 'ground' ? Colors.walnutGreen[900] : '#FFF'}
            />
            <Text
              style={[
                styles.modeTabText,
                mode === 'ground' && styles.modeTabTextActive,
              ]}
            >
              2. Ground Picker
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeTab, mode === 'growth' && styles.modeTabActive]}
            onPress={() => setMode('growth')}
          >
            <Ionicons
              name="analytics"
              size={15}
              color={mode === 'growth' ? Colors.walnutGreen[900] : '#FFF'}
            />
            <Text
              style={[
                styles.modeTabText,
                mode === 'growth' && styles.modeTabTextActive,
              ]}
            >
              3. Growth Size
            </Text>
          </TouchableOpacity>
        </View>

        {/* Active Camera Mode Status Strip */}
        <View style={styles.weightStrip}>
          <Ionicons name="sparkles" size={15} color={Colors.walnutGreen[200]} />
          <Text style={styles.weightStripText}>
            {mode === 'ground'
              ? 'Ground Harvest Finder • Fallen Nut Detection'
              : mode === 'growth'
              ? 'Nut Sizing & Husk Health Check'
              : 'Canopy Yield Counter • 4-Quadrant Estimator'}
          </Text>
          <View style={styles.simBadge}>
            <Text style={styles.simBadgeText}>CAMERA AI</Text>
          </View>
        </View>

        {/* Simulated Live Camera Viewfinder with Real-Time YOLO Bounding Boxes */}
        <View
          style={[
            styles.viewfinder,
            mode === 'ground' && styles.viewfinderGround,
          ]}
        >
          {/* Background Context Hint */}
          <Text style={styles.viewfinderWatermark}>
            {mode === 'canopy'
              ? 'CANOPY VIEW • POINT AT TREE BRANCHES'
              : mode === 'ground'
              ? 'ORCHARD FLOOR VIEW • FALLEN LEAVES & WALNUTS'
              : 'CLOSE-UP NUT CALIBRATION VIEW'}
          </Text>

          {/* Render YOLO Bounding Boxes */}
          {detections.map((box) => (
            <View
              key={box.id}
              style={[
                styles.bbox,
                {
                  left: `${box.xPct}%`,
                  top: `${box.yPct}%`,
                  width: `${box.widthPct}%`,
                  height: `${box.heightPct}%`,
                  borderColor: box.color,
                },
              ]}
            >
              <View
                style={[styles.bboxLabelPill, { backgroundColor: box.color }]}
              >
                <Text style={styles.bboxLabelText}>{box.label}</Text>
              </View>
            </View>
          ))}

          {/* Bottom Viewfinder Live Telemetry Overlay */}
          <View style={styles.hudOverlayBottom}>
            <View>
              <Text style={styles.hudCountBig}>{detections.length}</Text>
              <Text style={styles.hudCountSub}>
                {mode === 'ground'
                  ? 'Fallen Walnuts Highlighted'
                  : 'Walnuts in Current Frame'}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.shutterButton}
              onPress={handleCaptureFrame}
            >
              <View style={styles.shutterInner} />
            </TouchableOpacity>

            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.hudRightValue}>
                {mode === 'ground'
                  ? `${groundPickedSession} Picked`
                  : `${yieldEstimate.estimatedTotalNuts} Est.`}
              </Text>
              <Text style={styles.hudCountSub}>
                {mode === 'ground'
                  ? 'Session Total'
                  : `~${yieldEstimate.estimatedWeightKg} kg Yield`}
              </Text>
            </View>
          </View>
        </View>

        {/* Mode-Specific Control Panel */}
        {mode === 'canopy' ? (
          <View style={styles.controlCard}>
            <View style={styles.controlHeader}>
              <Text style={styles.controlTitle}>
                4-Quadrant Tree Yield Estimator
              </Text>
              <TouchableOpacity
                onPress={() =>
                  setSelectedTreeIndex(
                    (prev) => (prev + 1) % INITIAL_TREES.length
                  )
                }
              >
                <Text style={styles.treeSwitchLink}>{activeTree.name} ▾</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.quadrantRow}>
              {QUADRANTS.map((q) => {
                const active = activeQuadrant === q;
                return (
                  <TouchableOpacity
                    key={q}
                    style={[
                      styles.quadrantBox,
                      active && styles.quadrantBoxActive,
                    ]}
                    onPress={() => setActiveQuadrant(q)}
                  >
                    <Text style={styles.quadrantLabel}>{q}</Text>
                    <Text style={styles.quadrantValue}>
                      {quadrantCounts[q]}
                    </Text>
                    <Text style={styles.quadrantSub}>nuts</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.formulaSummary}>
              <Text style={styles.formulaText}>
                Raw 4-Side Sum: <Text style={styles.bold}>{yieldEstimate.rawSum}</Text> ×
                Occlusion ({activeTree.canopyDensity}:{' '}
                <Text style={styles.bold}>×{yieldEstimate.occlusionFactor}</Text>) ={' '}
                <Text style={styles.highlightGreen}>
                  {yieldEstimate.estimatedTotalNuts} Walnuts (~
                  {yieldEstimate.estimatedWeightKg} kg)
                </Text>
              </Text>
            </View>
          </View>
        ) : mode === 'ground' ? (
          <View style={styles.controlCard}>
            <Text style={styles.controlTitle}>
              Post-Harvest Ground Nut Finder
            </Text>
            <Text style={styles.groundDesc}>
              Highlights fallen walnuts camouflaged among brown leaves, hulls,
              and grass with bright visual outlines so nothing is left behind
              after shaking.
            </Text>
            <View style={styles.groundLegendRow}>
              <View style={styles.legendItem}>
                <View
                  style={[
                    styles.legendDot,
                    { backgroundColor: Colors.visionHud.groundClean },
                  ]}
                />
                <Text style={styles.legendText}>Clean Shell Walnut</Text>
              </View>
              <View style={styles.legendItem}>
                <View
                  style={[
                    styles.legendDot,
                    { backgroundColor: Colors.visionHud.groundInHull },
                  ]}
                />
                <Text style={styles.legendText}>Partially Hulled / Under Leaves</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.controlCard}>
            <Text style={styles.controlTitle}>
              Visual Growth & Husk Blight Analytics
            </Text>
            <Text style={styles.groundDesc}>
              Measures nut cross-section diameter (36.8 mm) and inspects green
              husk surface for Walnut Blight or Husk Fly staining.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#11180F',
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 14,
    paddingBottom: 36,
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: '#1E2B1B',
    borderRadius: 14,
    padding: 4,
    marginBottom: 10,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    gap: 5,
  },
  modeTabActive: {
    backgroundColor: Colors.walnutGreen[200],
  },
  modeTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D5E5CC',
  },
  modeTabTextActive: {
    color: Colors.walnutGreen[900],
    fontWeight: '800',
  },
  weightStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1B2718',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    marginBottom: 12,
    gap: 6,
  },
  weightStripText: {
    flex: 1,
    fontSize: 11,
    color: Colors.walnutGreen[200],
    fontFamily: 'monospace',
  },
  simBadge: {
    backgroundColor: Colors.walnutGreen[700],
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  simBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  viewfinder: {
    height: 360,
    backgroundColor: '#1E331A',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.walnutGreen[500],
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  viewfinderGround: {
    backgroundColor: '#2E261B',
    borderColor: Colors.visionHud.groundClean,
  },
  viewfinderWatermark: {
    fontSize: 11,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
    marginTop: 14,
    letterSpacing: 0.8,
  },
  bbox: {
    position: 'absolute',
    borderWidth: 2,
    borderRadius: 8,
  },
  bboxLabelPill: {
    position: 'absolute',
    top: -16,
    left: -2,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  bboxLabelText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#11180F',
  },
  hudOverlayBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(17, 24, 15, 0.82)',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  hudCountBig: {
    fontSize: 26,
    fontWeight: '900',
    color: Colors.visionHud.groundClean,
  },
  hudRightValue: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.walnutGreen[200],
  },
  hudCountSub: {
    fontSize: 11,
    color: '#CFE3C4',
  },
  shutterButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: Colors.walnutGreen[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.walnutGreen[500],
  },
  controlCard: {
    backgroundColor: Colors.walnutGreen[50],
    borderRadius: 18,
    padding: 15,
  },
  controlHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  controlTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.walnutGreen[900],
  },
  treeSwitchLink: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.walnutGreen[700],
    backgroundColor: Colors.walnutGreen[200],
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  quadrantRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  quadrantBox: {
    flex: 1,
    backgroundColor: Colors.surface.card,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.surface.border,
  },
  quadrantBoxActive: {
    backgroundColor: Colors.walnutGreen[200],
    borderColor: Colors.walnutGreen[600],
    borderWidth: 1.5,
  },
  quadrantLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.text.secondary,
  },
  quadrantValue: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.walnutGreen[900],
    marginVertical: 2,
  },
  quadrantSub: {
    fontSize: 10,
    color: Colors.text.muted,
  },
  formulaSummary: {
    backgroundColor: Colors.walnutGreen[100],
    padding: 10,
    borderRadius: 10,
  },
  formulaText: {
    fontSize: 12,
    color: Colors.walnutGreen[900],
    lineHeight: 18,
  },
  bold: {
    fontWeight: '800',
  },
  highlightGreen: {
    fontWeight: '900',
    color: Colors.walnutGreen[700],
  },
  groundDesc: {
    fontSize: 13,
    color: Colors.text.secondary,
    lineHeight: 18,
    marginTop: 6,
    marginBottom: 10,
  },
  groundLegendRow: {
    flexDirection: 'row',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.walnutGreen[900],
  },
});

