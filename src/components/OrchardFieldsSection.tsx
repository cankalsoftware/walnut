import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '../theme/colors';
import {
  OrchardFieldBlock,
  QuadrantSample,
  useWalnutCloud,
} from '../providers/ConvexClerkProvider';
import {
  BoundaryPin,
  buildFieldSections,
  computePolygonMetrics,
  computeTreeSpacingGuidance,
  DEFAULT_TREE_SPACING_METERS,
  generateRectPinsFromCenter,
  MAX_TREES_PER_SECTION,
  parseLatLngText,
} from '../utils/orchardGeometry';
import { HelpButton } from './HelpModal';
import { FieldGoogleMapPicker } from './FieldGoogleMapPicker';

const VARIETIES: OrchardFieldBlock['variety'][] = [
  'Chandler',
  'Howard',
  'Hartley',
  'Tulare',
  'Franquette',
];

const BASE_QUADRANT_NAMES: Record<string, string> = {
  NW: 'North-West',
  NE: 'North-East',
  SW: 'South-West',
  SE: 'South-East',
};

function formatSectionTitle(quadrantId: string): string {
  const [base, sub] = quadrantId.split('-');
  const baseName = BASE_QUADRANT_NAMES[base] ?? quadrantId;
  if (sub) {
    return `${baseName} • Area ${sub} (14×14)`;
  }
  return `${baseName} (${base})`;
}

export function OrchardFieldsSection() {
  const router = useRouter();
  const {
    isSignedIn,
    fields,
    addOrchardField,
    updateOrchardField,
    updateQuadrantSample,
    attachQuadrantEvidenceBlob,
  } = useWalnutCloud();

  const [selectedFieldId, setSelectedFieldId] = useState<string>(
    fields[0]?.id ?? ''
  );
  const selectedField =
    fields.find((f) => f.id === selectedFieldId) ?? fields[0];

  // Add / Edit Field Modal state
  const [fieldModalVisible, setFieldModalVisible] = useState(false);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [fName, setFName] = useState('');
  const [fVariety, setFVariety] =
    useState<OrchardFieldBlock['variety']>('Chandler');
  const [fTreeCount, setFTreeCount] = useState('100');
  const [fAreaHa, setFAreaHa] = useState('2.0');
  const [fPlantedYear, setFPlantedYear] = useState('2020');
  const [fSeasonYear, setFSeasonYear] = useState(
    String(new Date().getFullYear())
  );
  const [fDensity, setFDensity] =
    useState<OrchardFieldBlock['canopyDensity']>('standard');
  const [fLat, setFLat] = useState('');
  const [fLng, setFLng] = useState('');
  const [fNote, setFNote] = useState('');

  // Quadrant Editor Modal state
  const [editingQuadrant, setEditingQuadrant] = useState<QuadrantSample | null>(
    null
  );
  const [qTreeLabel, setQTreeLabel] = useState('');
  const [qNuts, setQNuts] = useState('0');
  const [qKg, setQKg] = useState('0');
  const [qNote, setQNote] = useState('');

  // Google Maps Boundary Pinning & Auto-Split Modal state
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [pinInputs, setPinInputs] = useState<string[]>([
    '38.5458, -121.7415',
    '38.5458, -121.7395',
    '38.5440, -121.7395',
    '38.5440, -121.7415',
  ]);

  const openAddField = () => {
    setEditingFieldId(null);
    setFName(`Field Block #${fields.length + 1}`);
    setFVariety('Chandler');
    setFTreeCount('100');
    setFAreaHa('2.0');
    setFPlantedYear('2020');
    setFSeasonYear(String(new Date().getFullYear()));
    setFDensity('standard');
    setFLat('38.5449');
    setFLng('-121.7405');
    setFNote('');
    setFieldModalVisible(true);
  };

  const openEditField = (field: OrchardFieldBlock) => {
    setEditingFieldId(field.id);
    setFName(field.name);
    setFVariety(field.variety);
    setFTreeCount(String(field.treeCount));
    setFAreaHa(String(field.areaHectares));
    setFPlantedYear(String(field.plantedYear));
    setFSeasonYear(String(field.seasonYear));
    setFDensity(field.canopyDensity);
    setFLat(field.latitude !== undefined ? String(field.latitude) : '');
    setFLng(field.longitude !== undefined ? String(field.longitude) : '');
    setFNote(field.fieldNote);
    setFieldModalVisible(true);
  };

  const handleSaveField = async () => {
    const payload = {
      name: fName.trim() || 'Orchard Field Block',
      variety: fVariety,
      treeCount: Math.max(1, parseInt(fTreeCount, 10) || 1),
      areaHectares: Math.max(0.1, parseFloat(fAreaHa) || 1),
      plantedYear: parseInt(fPlantedYear, 10) || 2020,
      seasonYear: parseInt(fSeasonYear, 10) || new Date().getFullYear(),
      canopyDensity: fDensity,
      latitude: fLat.trim() ? parseFloat(fLat) : undefined,
      longitude: fLng.trim() ? parseFloat(fLng) : undefined,
      fieldNote: fNote.trim(),
    };
    if (editingFieldId) {
      await updateOrchardField(editingFieldId, payload);
    } else {
      const newId = await addOrchardField(payload);
      setSelectedFieldId(newId);
    }
    setFieldModalVisible(false);
  };

  const openQuadrantModal = (q: QuadrantSample) => {
    setEditingQuadrant(q);
    setQTreeLabel(q.sampledTreeLabel);
    setQNuts(String(q.scannedNutsPerTree));
    setQKg(String(q.estimatedWeightKgPerTree));
    setQNote(q.note);
  };

  const handleSaveQuadrant = async () => {
    if (!selectedField || !editingQuadrant) return;
    const nuts = Math.max(0, parseInt(qNuts, 10) || 0);
    const kg = Math.max(
      0,
      parseFloat(qKg) || Number((nuts * 0.013).toFixed(1))
    );
    await updateQuadrantSample(selectedField.id, editingQuadrant.quadrantId, {
      sampledTreeLabel: qTreeLabel.trim() || `${editingQuadrant.quadrantId} Sample Tree`,
      scannedNutsPerTree: nuts,
      estimatedWeightKgPerTree: kg,
      note: qNote.trim(),
    });
    setEditingQuadrant(null);
  };

  const handleAttachEvidence = async () => {
    if (!selectedField || !editingQuadrant) return;
    const sampleBlobUri = `evidence://${selectedField.id}/${editingQuadrant.quadrantId}/${Date.now()}.jpg`;
    await attachQuadrantEvidenceBlob(
      selectedField.id,
      editingQuadrant.quadrantId,
      sampleBlobUri
    );
    Alert.alert(
      'Evidence Recorded',
      `Saved insurance/evidence photo record for ${formatSectionTitle(editingQuadrant.quadrantId)} (queued in SQLite & Convex Blob Storage).`
    );
    setEditingQuadrant((prev) =>
      prev ? { ...prev, evidenceCount: prev.evidenceCount + 1 } : null
    );
  };

  const openGoogleMapsPinModal = (field: OrchardFieldBlock) => {
    if (field.boundaryPins && field.boundaryPins.length >= 3) {
      setPinInputs(
        field.boundaryPins.map(
          (p) => `${p.latitude.toFixed(6)}, ${p.longitude.toFixed(6)}`
        )
      );
    } else {
      const centerLat = field.latitude ?? 38.5449;
      const centerLng = field.longitude ?? -121.7405;
      const generated = generateRectPinsFromCenter(
        centerLat,
        centerLng,
        field.areaHectares
      );
      setPinInputs(
        generated.map(
          (p) => `${p.latitude.toFixed(6)}, ${p.longitude.toFixed(6)}`
        )
      );
    }
    setMapModalVisible(true);
  };

  const launchExternalGoogleMaps = (lat?: number, lng?: number) => {
    const safeLat = lat ?? 38.5449;
    const safeLng = lng ?? -121.7405;
    void Linking.openURL(
      `https://www.google.com/maps/@${safeLat},${safeLng},18z/data=!3m1!1e3`
    );
  };

  const parsedMapPins: BoundaryPin[] = pinInputs
    .map<BoundaryPin | null>((txt, idx) => {
      const parsed = parseLatLngText(txt);
      if (!parsed) return null;
      const labels = ['NW Corner', 'NE Corner', 'SE Corner', 'SW Corner'];
      return { ...parsed, label: labels[idx] ?? `Pin ${idx + 1}` };
    })
    .filter((p): p is BoundaryPin => p !== null);

  const mapMetrics = computePolygonMetrics(parsedMapPins);

  const handleApplyMapPins = async () => {
    if (!selectedField) return;
    if (!mapMetrics || parsedMapPins.length < 3) {
      Alert.alert(
        'Need 3+ Valid Pins',
        'Please enter at least 3 valid corner coordinates (lat, lng) from Google Maps.'
      );
      return;
    }
    const nextSections = buildFieldSections(
      selectedField.treeCount,
      selectedField.quadrants
    );
    await updateOrchardField(selectedField.id, {
      latitude: mapMetrics.centerLat,
      longitude: mapMetrics.centerLng,
      areaHectares: mapMetrics.areaHectares,
      boundaryPins: parsedMapPins,
      treeSpacingMeters:
        selectedField.treeSpacingMeters ?? DEFAULT_TREE_SPACING_METERS,
      quadrants: nextSections,
    });
    setMapModalVisible(false);
    Alert.alert(
      'Field Mapped & Split',
      `Mapped ${mapMetrics.areaHectares} ha (${mapMetrics.areaM2.toLocaleString()} m²) and split into ${nextSections.length} sampling section${nextSections.length > 1 ? 's' : ''}.`
    );
  };

  const fieldSpacingGuidance = selectedField
    ? computeTreeSpacingGuidance(
        selectedField.areaHectares,
        selectedField.treeCount,
        selectedField.treeSpacingMeters ?? DEFAULT_TREE_SPACING_METERS
      )
    : null;

  // Compute 4-quadrant annual yield estimate for selected field
  const sampledQuadrants =
    selectedField?.quadrants.filter((q) => q.scannedNutsPerTree > 0) ?? [];
  const avgNutsPerTree =
    sampledQuadrants.length > 0
      ? Math.round(
          sampledQuadrants.reduce((acc, q) => acc + q.scannedNutsPerTree, 0) /
            sampledQuadrants.length
        )
      : 0;
  const avgKgPerTree =
    sampledQuadrants.length > 0
      ? sampledQuadrants.reduce((acc, q) => acc + q.estimatedWeightKgPerTree, 0) /
        sampledQuadrants.length
      : 0;
  const estFieldNuts = selectedField
    ? avgNutsPerTree * selectedField.treeCount
    : 0;
  const estFieldKg = selectedField
    ? Math.round(avgKgPerTree * selectedField.treeCount)
    : 0;

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={styles.sectionTitle}>
            {isSignedIn ? 'Orchard Field Blocks' : 'Demo Orchard Field Blocks'}
          </Text>
          <HelpButton
            help={{
              title: 'Grouped Field Blocks & 4-Quadrant Yield Estimation',
              whatItDoes:
                'Groups walnut trees into manageable orchard blocks instead of tracking tree-by-tree, and guides you to sample 4+ random trees (NW, NE, SW, SE) for annual yield estimation.',
              howToDoIt: [
                'Tap "+ Add Field" or "Edit" on any field block to set Tree Count, Area (ha), Planted Year, and Google Maps GPS Pin.',
                'Tap any quadrant (NW, NE, SW, SE) in the 2x2 Field Grid to log a random tree scan, save seasonal notes, or attach insurance evidence photo blobs.',
              ],
              whatToExpect:
                'Annual field yield is automatically estimated from your 4-quadrant average multiplied by total trees in the block.',
            }}
          />
        </View>
        <TouchableOpacity onPress={openAddField}>
          <Text style={styles.sectionLink}>+ Add Field</Text>
        </TouchableOpacity>
      </View>

      {/* Horizontal Field Block Selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.fieldChipRow}
      >
        {fields.map((field) => {
          const active = selectedField?.id === field.id;
          return (
            <TouchableOpacity
              key={field.id}
              style={[styles.fieldChip, active && styles.fieldChipActive]}
              onPress={() => setSelectedFieldId(field.id)}
            >
              <Text
                style={[
                  styles.fieldChipTitle,
                  active && styles.fieldChipTitleActive,
                ]}
              >
                {field.name}
              </Text>
              <Text style={styles.fieldChipMeta}>
                {field.treeCount} trees • {field.areaHectares} ha •{' '}
                {field.seasonYear}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Selected Field Details + 4-Quadrant Square Grid */}
      {selectedField && (
        <View style={styles.fieldCard}>
          <View style={styles.fieldHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldTitle}>{selectedField.name}</Text>
              <Text style={styles.fieldSubtitle}>
                {selectedField.variety} • {selectedField.treeCount} Trees •{' '}
                {selectedField.areaHectares} ha • Planted{' '}
                {selectedField.plantedYear} • Season {selectedField.seasonYear}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => openEditField(selectedField)}
            >
              <Ionicons
                name="create-outline"
                size={15}
                color={Colors.walnutGreen[800]}
              />
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
          </View>

          {/* Google Maps Pin & Field Note */}
          <View style={styles.mapBar}>
            <View style={{ flex: 1 }}>
              <Text style={styles.mapCoordText}>
                {selectedField.latitude !== undefined &&
                selectedField.longitude !== undefined
                  ? `GPS Pin: ${selectedField.latitude.toFixed(4)}, ${selectedField.longitude.toFixed(4)}`
                  : 'No GPS coordinates pinned yet'}
              </Text>
              {selectedField.fieldNote ? (
                <Text style={styles.fieldNoteText}>
                  Note: {selectedField.fieldNote}
                </Text>
              ) : null}
            </View>
            <TouchableOpacity
              style={styles.mapBtn}
              onPress={() => openGoogleMapsPinModal(selectedField)}
            >
              <Ionicons name="map-outline" size={14} color="#FFFFFF" />
              <Text style={styles.mapBtnText}>Pin & Split Map</Text>
            </TouchableOpacity>
          </View>

          {/* 5m x 5m Tree Spacing Guidance */}
          {fieldSpacingGuidance && (
            <View
              style={[
                styles.spacingBanner,
                fieldSpacingGuidance.status === 'dense_warning' &&
                  styles.spacingBannerWarn,
                fieldSpacingGuidance.status === 'sparse_guidance' &&
                  styles.spacingBannerInfo,
              ]}
            >
              <Text style={styles.spacingBannerTitle}>
                5m × 5m Tree Spacing Guide • Est. Capacity:{' '}
                {fieldSpacingGuidance.possibleTrees.toLocaleString()} trees
              </Text>
              <Text style={styles.spacingBannerText}>
                {fieldSpacingGuidance.message}
              </Text>
            </View>
          )}

          {/* Annual Yield Estimate Summary */}
          <View style={styles.yieldSummaryBar}>
            <View style={styles.yieldStat}>
              <Text style={styles.yieldStatLabel}>Sections Sampled</Text>
              <Text style={styles.yieldStatVal}>
                {sampledQuadrants.length} / {selectedField.quadrants.length}
              </Text>
            </View>
            <View style={styles.yieldStat}>
              <Text style={styles.yieldStatLabel}>Avg / Tree</Text>
              <Text style={styles.yieldStatVal}>{avgNutsPerTree} nuts</Text>
            </View>
            <View style={styles.yieldStat}>
              <Text style={styles.yieldStatLabel}>Est. Annual Yield</Text>
              <Text style={styles.yieldStatVal}>
                {estFieldNuts.toLocaleString()} ({estFieldKg.toLocaleString()} kg)
              </Text>
            </View>
          </View>

          {/* 2x2 Crossed Field GUI (auto-splits into 14x14 sub-areas when section > 200 trees) */}
          <Text style={styles.gridGuideText}>
            {selectedField.quadrants.length > 4
              ? `Section > ${MAX_TREES_PER_SECTION} trees: automatically split into ${selectedField.quadrants.length} sub-areas (14×14 trees max each). Tap any area to scan a random tree, add notes, or attach insurance evidence:`
              : 'Field crossed into 4 sections (NW, NE, SW, SE). Tap a section to log a random tree scan, seasonal note, or insurance evidence photo:'}
          </Text>
          <View style={styles.squareGrid}>
            {selectedField.quadrants.map((q) => (
              <TouchableOpacity
                key={q.quadrantId}
                style={[
                  styles.quadrantBox,
                  q.scannedNutsPerTree > 0 && styles.quadrantBoxSampled,
                ]}
                onPress={() => openQuadrantModal(q)}
              >
                <View style={styles.quadrantTop}>
                  <Text style={styles.quadrantBadge}>
                    {q.quadrantId}
                    {q.allocatedTrees ? ` • ${q.allocatedTrees}t` : ''}
                  </Text>
                  <Text style={styles.quadrantEvidence}>
                    📎 {q.evidenceCount}
                  </Text>
                </View>
                <Text style={styles.quadrantTreeLabel} numberOfLines={1}>
                  {q.sampledTreeLabel}
                </Text>
                <Text style={styles.quadrantMetric}>
                  {q.scannedNutsPerTree} nuts • {q.estimatedWeightKgPerTree} kg
                </Text>
                <Text style={styles.quadrantNote} numberOfLines={2}>
                  {q.note ? q.note : 'Tap to add scan & seasonal note'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Add / Edit Field Modal */}
      <Modal
        visible={fieldModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFieldModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <ScrollView contentContainerStyle={styles.modalScrollWrap}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>
                {editingFieldId ? 'Edit Orchard Field Block' : 'Add Orchard Field Block'}
              </Text>

              <Text style={styles.inputLabel}>Field / Block Name</Text>
              <TextInput
                style={styles.input}
                value={fName}
                onChangeText={setFName}
                placeholder="e.g. North Block • Chandler"
              />

              <Text style={styles.inputLabel}>Variety</Text>
              <View style={styles.pillRow}>
                {VARIETIES.map((v) => (
                  <TouchableOpacity
                    key={v}
                    style={[
                      styles.choicePill,
                      fVariety === v && styles.choicePillActive,
                    ]}
                    onPress={() => setFVariety(v)}
                  >
                    <Text
                      style={[
                        styles.choicePillText,
                        fVariety === v && styles.choicePillTextActive,
                      ]}
                    >
                      {v}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.twoCol}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Tree Count</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={fTreeCount}
                    onChangeText={setFTreeCount}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Area (Hectares)</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="decimal-pad"
                    value={fAreaHa}
                    onChangeText={setFAreaHa}
                  />
                </View>
              </View>

              <View style={styles.spacingBanner}>
                <Text style={styles.spacingBannerText}>
                  {
                    computeTreeSpacingGuidance(
                      parseFloat(fAreaHa) || 1,
                      parseInt(fTreeCount, 10) || 1,
                      DEFAULT_TREE_SPACING_METERS
                    ).message
                  }
                </Text>
              </View>

              <View style={styles.twoCol}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Planted Year</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={fPlantedYear}
                    onChangeText={setFPlantedYear}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Season Year</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={fSeasonYear}
                    onChangeText={setFSeasonYear}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Canopy Density</Text>
              <View style={styles.pillRow}>
                {(['open', 'standard', 'dense'] as const).map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[
                      styles.choicePill,
                      fDensity === d && styles.choicePillActive,
                    ]}
                    onPress={() => setFDensity(d)}
                  >
                    <Text
                      style={[
                        styles.choicePillText,
                        fDensity === d && styles.choicePillTextActive,
                      ]}
                    >
                      {d.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.twoCol}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Google Maps Latitude</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numbers-and-punctuation"
                    value={fLat}
                    onChangeText={setFLat}
                    placeholder="38.5449"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Google Maps Longitude</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numbers-and-punctuation"
                    value={fLng}
                    onChangeText={setFLng}
                    placeholder="-121.7405"
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Field / Season Notes</Text>
              <TextInput
                style={[styles.input, { minHeight: 56 }]}
                multiline
                value={fNote}
                onChangeText={setFNote}
                placeholder="Soil notes, irrigation block, or annual yield notes..."
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setFieldModalVisible(false)}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={() => void handleSaveField()}
                >
                  <Text style={styles.saveBtnText}>Save Field</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Quadrant Sample & Insurance Evidence Modal */}
      <Modal
        visible={Boolean(editingQuadrant)}
        transparent
        animationType="slide"
        onRequestClose={() => setEditingQuadrant(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {editingQuadrant
                ? formatSectionTitle(editingQuadrant.quadrantId)
                : 'Section Sample'}
            </Text>
            <Text style={styles.modalSubtitle}>
              Log 1 random sample tree in this quadrant, save seasonal notes, or
              store photo evidence blobs for insurance claims.
            </Text>

            <Text style={styles.inputLabel}>Sampled Tree Label</Text>
            <TextInput
              style={styles.input}
              value={qTreeLabel}
              onChangeText={setQTreeLabel}
              placeholder="e.g. Row 4, Tree #12"
            />

            <View style={styles.twoCol}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Counted Nuts / Tree</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={qNuts}
                  onChangeText={setQNuts}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Est. Kg / Tree</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="decimal-pad"
                  value={qKg}
                  onChangeText={setQKg}
                />
              </View>
            </View>

            <Text style={styles.inputLabel}>
              Season / Year Observation Note
            </Text>
            <TextInput
              style={[styles.input, { minHeight: 60 }]}
              multiline
              value={qNote}
              onChangeText={setQNote}
              placeholder="e.g. 2026: Heavy nut set, slight sunburn on SW limb..."
            />

            <View style={styles.evidenceRow}>
              <TouchableOpacity
                style={styles.evidenceBtn}
                onPress={() => void handleAttachEvidence()}
              >
                <Ionicons name="cloud-upload-outline" size={16} color="#FFFFFF" />
                <Text style={styles.evidenceBtnText}>
                  Save Evidence Blob ({editingQuadrant?.evidenceCount ?? 0})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.scannerBtn}
                onPress={() => {
                  setEditingQuadrant(null);
                  router.push('/(tabs)/scanner');
                }}
              >
                <Ionicons
                  name="camera-outline"
                  size={16}
                  color={Colors.walnutGreen[800]}
                />
                <Text style={styles.scannerBtnText}>AI Scanner</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setEditingQuadrant(null)}
              >
                <Text style={styles.cancelBtnText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={() => void handleSaveQuadrant()}
              >
                <Text style={styles.saveBtnText}>Save Quadrant</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Google Maps Boundary Pinning & 4-Section / 14x14 Auto-Split Modal */}
      <Modal
        visible={mapModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setMapModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <ScrollView contentContainerStyle={styles.modalScrollWrap}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>
                Google Maps Field Pinning & Auto-Split
              </Text>
              <Text style={styles.modalSubtitle}>
                Tap on the Google Map below to drop & drag field corner pins.
                We automatically cross and split your field (5m tree spacing,
                14×14 sub-areas if any section exceeds 200 trees).
              </Text>

              <FieldGoogleMapPicker
                pins={parsedMapPins}
                onChangePins={(nextPins) =>
                  setPinInputs(
                    nextPins.map(
                      (p) => `${p.latitude.toFixed(6)}, ${p.longitude.toFixed(6)}`
                    )
                  )
                }
                initialCenter={{
                  latitude: selectedField?.latitude ?? 38.5449,
                  longitude: selectedField?.longitude ?? -121.7405,
                }}
                treeCount={selectedField?.treeCount ?? 100}
              />

              <Text style={styles.inputLabel}>
                Field Corner Coordinates (lat, lng — synced with map pins)
              </Text>
              {pinInputs.map((val, idx) => {
                const labels = [
                  'Pin 1 (NW Corner)',
                  'Pin 2 (NE Corner)',
                  'Pin 3 (SE Corner)',
                  'Pin 4 (SW Corner)',
                ];
                return (
                  <View key={idx} style={{ marginBottom: 6 }}>
                    <Text style={styles.pinLabel}>
                      {labels[idx] ?? `Pin ${idx + 1}`}
                    </Text>
                    <TextInput
                      style={styles.input}
                      value={val}
                      onChangeText={(txt) =>
                        setPinInputs((prev) =>
                          prev.map((item, i) => (i === idx ? txt : item))
                        )
                      }
                      placeholder="38.5458, -121.7415"
                    />
                  </View>
                );
              })}

              {mapMetrics && selectedField ? (
                <View style={styles.mapPreviewBox}>
                  <Text style={styles.mapPreviewTitle}>
                    Mapped Area: {mapMetrics.areaHectares} ha (
                    {mapMetrics.areaM2.toLocaleString()} m²) •{' '}
                    {mapMetrics.widthMeters}m × {mapMetrics.heightMeters}m
                  </Text>
                  <Text style={styles.mapPreviewMeta}>
                    {computeTreeSpacingGuidance(
                      mapMetrics.areaHectares,
                      selectedField.treeCount,
                      DEFAULT_TREE_SPACING_METERS
                    ).message}
                  </Text>
                  <Text style={styles.mapPreviewSplit}>
                    Auto-Split Result:{' '}
                    {buildFieldSections(
                      selectedField.treeCount,
                      selectedField.quadrants
                    ).length > 4
                      ? `${buildFieldSections(selectedField.treeCount, selectedField.quadrants).length} sub-areas (14×14 trees each, section > 200 trees)`
                      : '4 Crossed Sections (NW, NE, SW, SE)'}
                  </Text>
                </View>
              ) : (
                <Text style={styles.spacingBannerText}>
                  Enter at least 3 valid corner coordinates to compute field
                  area and auto-split.
                </Text>
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setMapModalVisible(false)}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={() => void handleApplyMapPins()}
                >
                  <Text style={styles.saveBtnText}>Apply Pins & Split</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 6, marginBottom: 14 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.walnutGreen[900],
  },
  sectionLink: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.walnutGreen[700],
  },
  fieldChipRow: { gap: 8, paddingBottom: 10 },
  fieldChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.walnutGreen[200],
    backgroundColor: Colors.surface.card,
  },
  fieldChipActive: {
    borderColor: Colors.walnutGreen[700],
    backgroundColor: Colors.walnutGreen[50],
  },
  fieldChipTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.walnutShell[700],
  },
  fieldChipTitleActive: { color: Colors.walnutGreen[900] },
  fieldChipMeta: { fontSize: 10, color: Colors.walnutShell[500], marginTop: 2 },
  fieldCard: {
    backgroundColor: Colors.surface.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.walnutGreen[200],
    padding: 14,
  },
  fieldHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 10,
  },
  fieldTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.walnutGreen[900],
  },
  fieldSubtitle: {
    fontSize: 11,
    color: Colors.walnutShell[500],
    marginTop: 2,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: Colors.walnutGreen[100],
  },
  editBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.walnutGreen[800],
  },
  mapBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 12,
    backgroundColor: Colors.walnutShell[50],
    borderWidth: 1,
    borderColor: Colors.walnutShell[200],
    marginBottom: 10,
  },
  mapCoordText: { fontSize: 11, fontWeight: '700', color: Colors.walnutShell[700] },
  fieldNoteText: { fontSize: 11, color: Colors.walnutShell[500], marginTop: 2 },
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.walnutGreen[700],
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },
  mapBtnText: { fontSize: 11, fontWeight: '800', color: '#FFFFFF' },
  yieldSummaryBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  yieldStat: {
    flex: 1,
    backgroundColor: Colors.walnutGreen[50],
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: Colors.walnutGreen[200],
  },
  yieldStatLabel: { fontSize: 10, fontWeight: '700', color: Colors.walnutShell[500] },
  yieldStatVal: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.walnutGreen[900],
    marginTop: 2,
  },
  gridGuideText: {
    fontSize: 11,
    color: Colors.walnutShell[500],
    marginBottom: 8,
  },
  squareGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quadrantBox: {
    width: '48.5%',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.walnutShell[200],
    backgroundColor: Colors.walnutShell[50],
    padding: 10,
  },
  quadrantBoxSampled: {
    borderColor: Colors.walnutGreen[600],
    backgroundColor: Colors.walnutGreen[50],
  },
  quadrantTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  quadrantBadge: {
    fontSize: 11,
    fontWeight: '900',
    color: Colors.walnutGreen[900],
  },
  quadrantEvidence: { fontSize: 11, color: Colors.walnutShell[700] },
  quadrantTreeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.walnutGreen[800],
  },
  quadrantMetric: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.walnutShell[700],
    marginTop: 2,
  },
  quadrantNote: {
    fontSize: 10,
    color: Colors.walnutShell[500],
    marginTop: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(18, 28, 16, 0.55)',
    justifyContent: 'center',
    padding: 16,
  },
  modalScrollWrap: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.walnutGreen[200],
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.walnutGreen[900],
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 12,
    color: Colors.walnutShell[500],
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.walnutGreen[900],
    marginTop: 8,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.walnutGreen[200],
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    backgroundColor: '#FAFDF8',
    color: Colors.walnutGreen[900],
  },
  twoCol: { flexDirection: 'row', gap: 10 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  choicePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.walnutShell[200],
    backgroundColor: Colors.walnutShell[50],
  },
  choicePillActive: {
    borderColor: Colors.walnutGreen[700],
    backgroundColor: Colors.walnutGreen[100],
  },
  choicePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.walnutShell[700],
  },
  choicePillTextActive: {
    color: Colors.walnutGreen[900],
    fontWeight: '800',
  },
  evidenceRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  evidenceBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.walnutShell[700],
    paddingVertical: 10,
    borderRadius: 10,
  },
  evidenceBtnText: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
  scannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.walnutGreen[100],
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  scannerBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.walnutGreen[800],
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: Colors.walnutShell[100],
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.walnutShell[700],
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: Colors.walnutGreen[700],
    alignItems: 'center',
  },
  saveBtnText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
  spacingBanner: {
    marginTop: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: Colors.walnutGreen[50],
    borderWidth: 1,
    borderColor: Colors.walnutGreen[200],
  },
  spacingBannerWarn: {
    backgroundColor: '#FFF5EB',
    borderColor: '#E8A87C',
  },
  spacingBannerInfo: {
    backgroundColor: '#FBF8F1',
    borderColor: Colors.walnutShell[200],
  },
  spacingBannerTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.walnutGreen[900],
    marginBottom: 2,
  },
  spacingBannerText: {
    fontSize: 11,
    color: Colors.walnutShell[700],
    lineHeight: 15,
  },
  launchMapsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1A73E8',
    paddingVertical: 11,
    borderRadius: 10,
    marginTop: 8,
    marginBottom: 8,
  },
  launchMapsBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  pinLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.walnutGreen[800],
    marginBottom: 2,
  },
  mapPreviewBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: Colors.walnutGreen[50],
    borderWidth: 1,
    borderColor: Colors.walnutGreen[200],
    gap: 4,
  },
  mapPreviewTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.walnutGreen[900],
  },
  mapPreviewMeta: {
    fontSize: 11,
    color: Colors.walnutShell[700],
    lineHeight: 15,
  },
  mapPreviewSplit: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.walnutGreen[800],
  },
});
