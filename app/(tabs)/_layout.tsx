import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../src/theme/colors';
import { useWalnutCloud } from '../../src/providers/ConvexClerkProvider';

export default function TabsLayout() {
  const router = useRouter();
  const { isSignedIn } = useWalnutCloud();

  const lockedTabListeners = {
    tabPress: (e: { preventDefault: () => void }) => {
      if (!isSignedIn) {
        e.preventDefault();
        router.push('/auth');
      }
    },
  };

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
        listeners={lockedTabListeners}
        options={{
          title: isSignedIn ? 'Care Plan' : 'Care Plan 🔒',
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name={isSignedIn ? 'calendar' : 'lock-closed'}
              size={size}
              color={isSignedIn ? color : Colors.text.muted}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="scanner"
        listeners={lockedTabListeners}
        options={{
          title: isSignedIn ? 'Camera AI' : 'Camera AI 🔒',
          tabBarIcon: ({ focused }) => (
            <View
              style={[
                styles.centerScannerBtn,
                focused && styles.centerScannerBtnActive,
                !isSignedIn && styles.centerScannerBtnLocked,
              ]}
            >
              <Ionicons
                name={isSignedIn ? 'camera' : 'lock-closed'}
                size={24}
                color="#FFFFFF"
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="community"
        listeners={lockedTabListeners}
        options={{
          title: isSignedIn ? 'Community' : 'Community 🔒',
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name={isSignedIn ? 'chatbubbles' : 'lock-closed'}
              size={size}
              color={isSignedIn ? color : Colors.text.muted}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="analytics"
        listeners={lockedTabListeners}
        options={{
          title: isSignedIn ? 'Setup & Data' : 'Setup 🔒',
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name={isSignedIn ? 'options' : 'lock-closed'}
              size={size}
              color={isSignedIn ? color : Colors.text.muted}
            />
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
  centerScannerBtnLocked: {
    backgroundColor: Colors.walnutShell[500],
    borderColor: Colors.walnutShell[200],
  },
});

