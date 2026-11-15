import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '../src/theme/colors';
import { ConvexClerkAppProvider } from '../src/providers/ConvexClerkProvider';

export default function RootLayout() {
  return (
    <ConvexClerkAppProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.walnutGreen[50] },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="auth"
          options={{
            headerShown: false,
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="shop"
          options={{
            headerShown: false,
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="legal"
          options={{
            headerShown: false,
            presentation: 'modal',
          }}
        />
      </Stack>
    </ConvexClerkAppProvider>
  );
}
