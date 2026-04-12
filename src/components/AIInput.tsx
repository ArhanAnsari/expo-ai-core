import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { AIInputProps, AITheme } from '../types';

const defaultTheme: Partial<AITheme> = {
  surfaceColor: '#111827',
  textColor: '#f9fafb',
  textMutedColor: '#94a3b8',
  borderColor: '#334155',
  primaryColor: '#38bdf8'
};

export function AIInput({
  value,
  onChangeText,
  onSend,
  placeholder = 'Type a message',
  disabled,
  loading,
  className,
  style,
  inputStyle,
  buttonStyle,
  buttonTextStyle,
  multiline = true,
  showSendIcon = true,
  sendLabel = 'Send'
}: AIInputProps) {
  const isDisabled = disabled || loading || value.trim().length === 0;

  return (
    <View {...({ className } as any)} style={[styles.container, style, { borderColor: defaultTheme.borderColor, backgroundColor: defaultTheme.surfaceColor }]}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={defaultTheme.textMutedColor}
        editable={!disabled}
        multiline={multiline}
        style={[styles.input, { color: defaultTheme.textColor }, inputStyle]}
      />
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          if (!isDisabled) {
            void onSend();
          }
        }}
        style={({ pressed }: { pressed: boolean }) => [
          styles.button,
          {
            opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
            backgroundColor: defaultTheme.primaryColor
          },
          buttonStyle
        ]}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={[styles.buttonText, buttonTextStyle]}>{showSendIcon ? '➤ ' : ''}{sendLabel}</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    alignItems: 'flex-end'
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 140,
    fontSize: 15,
    paddingVertical: 8
  },
  button: {
    alignItems: 'center',
    borderRadius: 14,
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700'
  }
});
