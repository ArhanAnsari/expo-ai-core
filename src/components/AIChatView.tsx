import React, { useEffect, useMemo, useRef } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { AIChatViewProps, AIMessage, AITheme } from '../types';
import { AIInput } from './AIInput';
import { AIMessageBubble } from './AIMessageBubble';
import { AITypingIndicator } from './AITypingIndicator';

const defaultTheme: AITheme = {
  backgroundColor: '#020617',
  surfaceColor: '#0f172a',
  surfaceMutedColor: '#1e293b',
  textColor: '#f8fafc',
  textMutedColor: '#94a3b8',
  borderColor: '#334155',
  primaryColor: '#38bdf8',
  userBubbleColor: '#1d4ed8',
  assistantBubbleColor: '#111827',
  codeBackgroundColor: '#0f172a',
  codeTextColor: '#e2e8f0',
  errorColor: '#f87171'
};

export function AIChatView({
  messages,
  input,
  setInput,
  sendMessage,
  isLoading,
  error,
  title = 'AI Chat',
  subtitle,
  emptyStateTitle = 'Start a conversation',
  emptyStateDescription = 'Send a message to begin chatting with the provider.',
  className,
  style,
  contentContainerStyle,
  headerStyle,
  footerStyle,
  theme,
  renderMessage,
  renderFooter,
  renderHeader,
  onPressRetry,
  regenerateResponse,
  stopGenerating,
  copyMessage,
  retryMessage,
  showControls = true
}: AIChatViewProps) {
  const colors = useMemo(() => ({ ...defaultTheme, ...theme }), [theme]);
  const listRef = useRef<FlatList<AIMessage>>(null);

  useEffect(() => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  }, [messages.length, isLoading]);

  return (
    <KeyboardAvoidingView
      {...({ className } as any)}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.root, { backgroundColor: colors.backgroundColor }, style]}
    >
      <View style={[styles.header, headerStyle]}>
        {renderHeader ? renderHeader() : (
          <View>
            <Text style={[styles.title, { color: colors.textColor }]}>{title}</Text>
            {subtitle ? <Text style={[styles.subtitle, { color: colors.textMutedColor }]}>{subtitle}</Text> : null}
          </View>
        )}
        {onPressRetry ? (
          <Pressable onPress={onPressRetry} style={[styles.retryButton, { borderColor: colors.borderColor }]}>
            <Text style={[styles.retryText, { color: colors.primaryColor }]}>Retry</Text>
          </Pressable>
        ) : null}
      </View>

      {error ? <Text style={[styles.error, { color: colors.errorColor }]}>{error}</Text> : null}

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, contentContainerStyle, messages.length === 0 ? styles.emptyList : null]}
        renderItem={({ item, index }: { item: AIMessage; index: number }) => (
          <>
            {renderMessage ? renderMessage(item, index) : <AIMessageBubble message={item} theme={theme} onCopy={() => { void copyMessage(item.id); }} />}
          </>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={[styles.emptyTitle, { color: colors.textColor }]}>{emptyStateTitle}</Text>
            <Text style={[styles.emptyDescription, { color: colors.textMutedColor }]}>{emptyStateDescription}</Text>
          </View>
        }
        ListFooterComponent={
          <View style={footerStyle}>
            {isLoading ? <AITypingIndicator color={colors.primaryColor} /> : null}
            {renderFooter ? renderFooter() : null}
          </View>
        }
        keyboardShouldPersistTaps="handled"
      />

      <AIInput
        value={input}
        onChangeText={setInput}
        onSend={() => {
          void sendMessage();
        }}
        loading={isLoading}
        style={styles.input}
      />

      {showControls ? (
        <View style={styles.controlsRow}>
          <Pressable style={[styles.controlButton, { borderColor: colors.borderColor }]} onPress={() => { void regenerateResponse(); }}>
            <Text style={[styles.controlText, { color: colors.textColor }]}>Regenerate</Text>
          </Pressable>
          <Pressable style={[styles.controlButton, { borderColor: colors.borderColor }]} onPress={stopGenerating}>
            <Text style={[styles.controlText, { color: colors.textColor }]}>Stop</Text>
          </Pressable>
          <Pressable
            style={[styles.controlButton, { borderColor: colors.borderColor }]}
            onPress={() => {
              const latest = [...messages].reverse().find((message) => message.status === 'error');
              if (!latest) {
                return;
              }
              void retryMessage(latest.id);
            }}
          >
            <Text style={[styles.controlText, { color: colors.textColor }]}>Retry Failed</Text>
          </Pressable>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    padding: 16
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  title: {
    fontSize: 26,
    fontWeight: '800'
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4
  },
  retryButton: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 8
  },
  retryText: {
    fontSize: 13,
    fontWeight: '700'
  },
  error: {
    fontSize: 13,
    marginBottom: 8
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 16
  },
  emptyList: {
    justifyContent: 'center'
  },
  emptyState: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 48
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700'
  },
  emptyDescription: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center'
  },
  input: {
    marginTop: 12
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10
  },
  controlButton: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  controlText: {
    fontSize: 12,
    fontWeight: '700'
  }
});
