import React, { useMemo, useState } from 'react';
import { Pressable, SafeAreaView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { AIChatView, useAIChat, useAIVoice } from 'expo-ai-kit';

type Provider = 'openai' | 'gemini';

export default function App() {
  const [provider, setProvider] = useState<Provider>('openai');
  const [voicePrompt, setVoicePrompt] = useState('Summarize the key idea of Expo AI kits in one sentence.');

  const chat = useAIChat({
    provider,
    apiKey: provider === 'openai' ? (process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '') : (process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? ''),
    model: provider === 'openai' ? 'gpt-4o-mini' : 'gemini-2.5-flash',
    systemPrompt: 'You are a concise assistant for Expo developers.',
    cacheKey: `example-chat:${provider}`
  });

  const voice = useAIVoice({ language: 'en-US' });

  const providerLabel = useMemo(() => (provider === 'openai' ? 'OpenAI' : 'Gemini'), [provider]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <View style={styles.backgroundGlow} />
      <View style={styles.container}>
        <View style={styles.topPanel}>
          <View style={styles.hero}>
            <Text style={styles.kicker}>expo-ai-kit</Text>
            <Text style={styles.title}>AI chat, streaming, and voice for Expo.</Text>
            <Text style={styles.subtitle}>A client-side toolkit for shipping AI experiences in under five minutes.</Text>
          </View>

          <View style={styles.segmentedControl}>
            {(['openai', 'gemini'] as const).map((option) => {
              const selected = option === provider;
              return (
                <Pressable key={option} onPress={() => setProvider(option)} style={[styles.segment, selected && styles.segmentSelected]}>
                  <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>{option.toUpperCase()}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.voiceCard}>
            <Text style={styles.sectionTitle}>Voice Demo</Text>
            <Text style={styles.sectionCopy}>Speech recognition is best-effort on the current platform. Text-to-speech always works when expo-speech is available.</Text>
            <View style={styles.voiceActions}>
              <Pressable onPress={() => void voice.startListening()} style={styles.actionButton}>
                <Text style={styles.actionButtonText}>Start</Text>
              </Pressable>
              <Pressable onPress={() => void voice.stopListening()} style={styles.actionButtonSecondary}>
                <Text style={styles.actionButtonTextSecondary}>Stop</Text>
              </Pressable>
              <Pressable onPress={() => void voice.speak(voicePrompt)} style={styles.actionButton}>
                <Text style={styles.actionButtonText}>Speak</Text>
              </Pressable>
            </View>
            <TextInput
              value={voicePrompt}
              onChangeText={setVoicePrompt}
              placeholder="What should the assistant say out loud?"
              placeholderTextColor="#64748b"
              style={styles.voiceInput}
            />
            <Text style={styles.transcriptLabel}>Transcript</Text>
            <Text style={styles.transcript}>{voice.transcript || voice.recordingUri || 'No transcript yet'}</Text>
            {voice.error ? <Text style={styles.error}>{voice.error}</Text> : null}
            <Pressable onPress={() => chat.setInput(voice.transcript || voicePrompt)} style={styles.fillButton}>
              <Text style={styles.fillButtonText}>Use transcript in chat</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.chatCard}>
          <View style={styles.chatHeader}>
            <Text style={styles.sectionTitle}>Chat Demo</Text>
            <Text style={styles.chatMeta}>{providerLabel} model</Text>
          </View>
          <AIChatView
            {...chat}
            title="Conversation"
            subtitle="Streaming responses update in place."
            emptyStateTitle="Ask anything"
            emptyStateDescription="Try a coding question, a product summary, or a voice-transcribed prompt."
            style={styles.chatView}
            contentContainerStyle={styles.chatContent}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#020617'
  },
  backgroundGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#020617'
  },
  container: {
    flex: 1,
    padding: 16,
    gap: 16
  },
  topPanel: {
    gap: 16
  },
  hero: {
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderColor: '#1e293b',
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20
  },
  kicker: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase'
  },
  title: {
    color: '#f8fafc',
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 36,
    marginTop: 8
  },
  subtitle: {
    color: '#cbd5e1',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10
  },
  segmentedControl: {
    flexDirection: 'row',
    gap: 10
  },
  segment: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderColor: '#1e293b',
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    alignItems: 'center'
  },
  segmentSelected: {
    backgroundColor: '#38bdf8'
  },
  segmentText: {
    color: '#94a3b8',
    fontWeight: '800'
  },
  segmentTextSelected: {
    color: '#020617'
  },
  voiceCard: {
    backgroundColor: '#0f172a',
    borderColor: '#1e293b',
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 12
  },
  sectionTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '800'
  },
  sectionCopy: {
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 19
  },
  voiceActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  actionButton: {
    alignItems: 'center',
    backgroundColor: '#38bdf8',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10
  },
  actionButtonSecondary: {
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10
  },
  actionButtonText: {
    color: '#020617',
    fontWeight: '800'
  },
  actionButtonTextSecondary: {
    color: '#f8fafc',
    fontWeight: '800'
  },
  voiceInput: {
    backgroundColor: '#020617',
    borderColor: '#1e293b',
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    color: '#f8fafc',
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  transcriptLabel: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase'
  },
  transcript: {
    color: '#f8fafc',
    lineHeight: 20
  },
  error: {
    color: '#fb7185',
    fontSize: 13
  },
  fillButton: {
    alignItems: 'center',
    backgroundColor: '#1d4ed8',
    borderRadius: 16,
    paddingVertical: 12
  },
  fillButtonText: {
    color: '#f8fafc',
    fontWeight: '800'
  },
  chatCard: {
    flex: 1,
    backgroundColor: '#020617',
    borderColor: '#1e293b',
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden'
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16
  },
  chatMeta: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  chatView: {
    flex: 1,
    minHeight: 0
  },
  chatContent: {
    paddingHorizontal: 0,
    paddingBottom: 0
  }
});
