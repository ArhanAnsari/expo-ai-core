import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { AIMessage, AITheme } from '../types';
import { MarkdownText } from './MarkdownText';

const defaultTheme: AITheme = {
  backgroundColor: '#0b1020',
  surfaceColor: '#111827',
  surfaceMutedColor: '#1f2937',
  textColor: '#f9fafb',
  textMutedColor: '#cbd5e1',
  borderColor: '#334155',
  primaryColor: '#38bdf8',
  userBubbleColor: '#1d4ed8',
  assistantBubbleColor: '#111827',
  codeBackgroundColor: '#0f172a',
  codeTextColor: '#e2e8f0',
  errorColor: '#ef4444'
};

export interface AIMessageBubbleProps {
  message: AIMessage;
  theme?: Partial<AITheme>;
  className?: string;
  style?: import('react-native').StyleProp<import('react-native').ViewStyle>;
  contentStyle?: import('react-native').StyleProp<import('react-native').TextStyle>;
  codeStyle?: import('react-native').StyleProp<import('react-native').TextStyle>;
  onLinkPress?: (url: string) => void;
  showTimestamp?: boolean;
  onCopy?: (message: AIMessage) => void;
}

export function AIMessageBubble({
  message,
  theme,
  className,
  style,
  contentStyle,
  codeStyle,
  onLinkPress,
  showTimestamp,
  onCopy
}: AIMessageBubbleProps) {
  const colors = { ...defaultTheme, ...theme };
  const isUser = message.role === 'user';
  const bubbleColor = isUser ? colors.userBubbleColor : colors.assistantBubbleColor;
  const alignSelf = isUser ? 'flex-end' : 'flex-start';

  return (
    <View {...({ className } as any)} style={[styles.wrapper, { alignSelf }, style]}>
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: bubbleColor,
            borderColor: colors.borderColor
          }
        ]}
      >
        <MarkdownText
          content={message.content || (message.status === 'streaming' ? ' ' : '')}
          textStyle={[styles.content, { color: colors.textColor }, contentStyle]}
          codeStyle={[{ color: colors.codeTextColor }, codeStyle]}
          onLinkPress={onLinkPress}
        />
        {message.status === 'streaming' || message.status === 'sending' ? (
          <Text style={[styles.status, { color: colors.textMutedColor }]}>Generating...</Text>
        ) : null}
        {message.status === 'error' && message.error ? (
          <Text style={[styles.status, { color: colors.errorColor }]}>{message.error}</Text>
        ) : null}
        {showTimestamp ? <Text style={[styles.timestamp, { color: colors.textMutedColor }]}>{new Date(message.createdAt).toLocaleTimeString()}</Text> : null}
        {onCopy ? (
          <Pressable
            onPress={() => onCopy(message)}
            style={styles.copyButton}
            accessibilityRole="button"
          >
            <Text style={[styles.copyText, { color: colors.textMutedColor }]}>Copy</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: 6,
    maxWidth: '90%'
  },
  bubble: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 2
    },
    elevation: 1
  },
  content: {
    fontSize: 15,
    lineHeight: 21
  },
  status: {
    fontSize: 12,
    marginTop: 8,
    opacity: 0.85
  },
  timestamp: {
    fontSize: 11,
    marginTop: 6,
    opacity: 0.65,
    textAlign: 'right'
  },
  copyButton: {
    alignSelf: 'flex-end',
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  copyText: {
    fontSize: 11,
    fontWeight: '600'
  }
});
