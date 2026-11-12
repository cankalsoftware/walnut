import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../src/theme/colors';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.walnutGreen[700],
        tabBarInactiveTintColor: Colors.text.muted,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Orchard',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="leaf" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Care Plan',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="scanner"
        options={{
          title: 'YOLO AI',
          tabBarIcon: ({ focused }) => (
            <View
              style={[
                styles.centerScannerBtn,
                focused && styles.centerScannerBtnActive,
              ]}
            >
              <Ionicons name="scan" size={26} color="#FFFFFF" />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: 'Grower Chat',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Analytics',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.surface.card,
    borderTopColor: Colors.walnutGreen[200],
    borderTopWidth: 1,
    height: Platform.OS === 'ios' ? 86 : 68,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    paddingTop: 8,
    elevation: 10,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  centerScannerBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.walnutGreen[500],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Platform.OS === 'ios' ? 18 : 22,
    borderWidth: 3,
    borderColor: Colors.walnutGreen[200],
    shadowColor: Colors.walnutGreen[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  centerScannerBtnActive: {
    backgroundColor: Colors.walnutGreen[700],
    borderColor: Colors.walnutGreen[300],
  },
});

