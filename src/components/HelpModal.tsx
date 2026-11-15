import React, { useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';

export interface MobileHelpContent {
  title: string;
  whatItDoes: string;
  howToDoIt: string[];
  whatToExpect: string;
}

export function HelpButton({
  help,
  size = 20,
}: {
  help: MobileHelpContent;
  size?: number;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <>
      <TouchableOpacity
        accessibilityLabel={`Help: ${help.title}`}
        onPress={() => setVisible(true)}
        style={styles.iconBtn}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons
          name="help-circle-outline"
          size={size}
          color={Colors.walnutGreen[700]}
        />
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={styles.card}
            onPress={() => {}}
          >
            <View style={styles.header}>
              <View style={styles.titleRow}>
                <Ionicons
                  name="help-circle"
                  size={20}
                  color={Colors.walnutGreen[700]}
                />
                <Text style={styles.title}>{help.title}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setVisible(false)}
                style={styles.closeBtn}
              >
                <Text style={styles.closeText}>Done</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>What it does</Text>
              <Text style={styles.paragraph}>{help.whatItDoes}</Text>

              <Text style={styles.label}>How to do it</Text>
              {help.howToDoIt.map((step, idx) => (
                <Text key={idx} style={styles.step}>
                  {idx + 1}. {step}
                </Text>
              ))}

              <View style={styles.expectBox}>
                <Text style={styles.expectLabel}>What to expect</Text>
                <Text style={styles.expectText}>{help.whatToExpect}</Text>
              </View>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  iconBtn: {
    padding: 4,
    borderRadius: 999,
    backgroundColor: Colors.walnutGreen[100],
    borderWidth: 1,
    borderColor: Colors.walnutGreen[200],
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(26, 38, 22, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.walnutGreen[200],
    padding: 18,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.walnutGreen[900],
    flexShrink: 1,
  },
  closeBtn: {
    backgroundColor: Colors.walnutGreen[100],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  closeText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.walnutGreen[800],
  },
  body: {
    flexGrow: 0,
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.walnutGreen[800],
    textTransform: 'uppercase',
    marginTop: 6,
    marginBottom: 4,
  },
  paragraph: {
    fontSize: 13,
    lineHeight: 19,
    color: Colors.text.secondary,
    marginBottom: 10,
  },
  step: {
    fontSize: 13,
    lineHeight: 19,
    color: Colors.walnutGreen[900],
    marginBottom: 4,
  },
  expectBox: {
    marginTop: 10,
    backgroundColor: Colors.walnutGreen[50],
    borderWidth: 1,
    borderColor: Colors.walnutGreen[200],
    borderRadius: 10,
    padding: 12,
  },
  expectLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.walnutGreen[800],
    marginBottom: 4,
  },
  expectText: {
    fontSize: 13,
    lineHeight: 19,
    color: Colors.text.secondary,
  },
});
