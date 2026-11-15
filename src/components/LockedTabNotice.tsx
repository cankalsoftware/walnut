import React from 'react';
import { SafeAreaView, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '../theme/colors';

export function LockedTabNotice({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.walnutGreen[50] }}>
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 24,
        }}
      >
        <Ionicons
          name="lock-closed"
          size={40}
          color={Colors.walnutGreen[700]}
        />
        <Text
          style={{
            fontSize: 18,
            fontWeight: '800',
            color: Colors.walnutGreen[900],
            marginTop: 12,
            textAlign: 'center',
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            fontSize: 13,
            color: Colors.text.secondary,
            marginTop: 6,
            marginBottom: 18,
            textAlign: 'center',
          }}
        >
          {description}
        </Text>
        <TouchableOpacity
          style={{
            backgroundColor: Colors.walnutGreen[700],
            paddingHorizontal: 20,
            paddingVertical: 12,
            borderRadius: 12,
          }}
          onPress={() => router.push('/auth')}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>
            Sign In to Unlock
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
