import React, { useMemo } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';

interface MarkdownTextProps {
  content: string;
  textStyle?: import('react-native').StyleProp<import('react-native').TextStyle>;
  codeStyle?: import('react-native').StyleProp<import('react-native').TextStyle>;
  onLinkPress?: (url: string) => void;
  selectable?: boolean;
}

const inlinePatterns = [
  { type: 'link', regex: /\[([^\]]+)\]\(([^)]+)\)/g },
  { type: 'code', regex: /`([^`]+)`/g },
  { type: 'bold', regex: /\*\*([^*]+)\*\*/g }
] as const;

type InlinePart =
  | { kind: 'text'; value: string }
  | { kind: 'code'; value: string }
  | { kind: 'bold'; value: string }
  | { kind: 'link'; value: string; url: string };

function parseInline(content: string): InlinePart[] {
  const parts: InlinePart[] = [];
  let cursor = 0;
  const pattern = /\[([^\]]+)\]\(([^)]+)\)|`([^`]+)`|\*\*([^*]+)\*\*/g;

  for (;;) {
    const match = pattern.exec(content);
    if (!match) {
      break;
    }

    if (match.index > cursor) {
      parts.push({ kind: 'text', value: content.slice(cursor, match.index) });
    }

    if (match[1] && match[2]) {
      parts.push({ kind: 'link', value: match[1], url: match[2] });
    } else if (match[3]) {
      parts.push({ kind: 'code', value: match[3] });
    } else if (match[4]) {
      parts.push({ kind: 'bold', value: match[4] });
    }

    cursor = pattern.lastIndex;
  }

  if (cursor < content.length) {
    parts.push({ kind: 'text', value: content.slice(cursor) });
  }

  return parts;
}

function renderInlineParts(parts: InlinePart[], onLinkPress?: (url: string) => void) {
  return parts.map((part, index) => {
    if (part.kind === 'text') {
      return part.value;
    }

    if (part.kind === 'code') {
      return (
        <Text key={`code-${index}`} style={styles.inlineCode}>
          {part.value}
        </Text>
      );
    }

    if (part.kind === 'bold') {
      return (
        <Text key={`bold-${index}`} style={styles.bold}>
          {part.value}
        </Text>
      );
    }

    return (
      <Text
        key={`link-${index}`}
        style={styles.link}
        onPress={() => {
          if (onLinkPress) {
            onLinkPress(part.url);
            return;
          }

          Linking.openURL(part.url).catch(() => undefined);
        }}
      >
        {part.value}
      </Text>
    );
  });
}

function renderTextLine(
  line: string,
  key: string,
  textStyle: import('react-native').StyleProp<import('react-native').TextStyle>,
  onLinkPress?: (url: string) => void,
  selectable = true
) {
  const headingMatch = line.match(/^(#{1,3})\s+(.*)$/);
  if (headingMatch) {
    const level = headingMatch[1].length;
    return (
      <Text
        key={key}
        selectable={selectable}
        style={[textStyle, styles.heading, level === 1 ? styles.h1 : level === 2 ? styles.h2 : styles.h3]}
      >
        {renderInlineParts(parseInline(headingMatch[2]), onLinkPress)}
      </Text>
    );
  }

  const unorderedMatch = line.match(/^[-*]\s+(.*)$/);
  if (unorderedMatch) {
    return (
      <Text key={key} selectable={selectable} style={textStyle}>
        {'\u2022 '}
        {renderInlineParts(parseInline(unorderedMatch[1]), onLinkPress)}
      </Text>
    );
  }

  const orderedMatch = line.match(/^(\d+)\.\s+(.*)$/);
  if (orderedMatch) {
    return (
      <Text key={key} selectable={selectable} style={textStyle}>
        {`${orderedMatch[1]}. `}
        {renderInlineParts(parseInline(orderedMatch[2]), onLinkPress)}
      </Text>
    );
  }

  return (
    <Text key={key} selectable={selectable} style={textStyle}>
      {renderInlineParts(parseInline(line), onLinkPress)}
    </Text>
  );
}

function splitMarkdownBlocks(content: string) {
  const blocks: Array<{ type: 'text' | 'code'; value: string; language?: string }> = [];
  const regex = /```([a-zA-Z0-9_-]+)?\n([\s\S]*?)```/g;
  let cursor = 0;

  for (;;) {
    const match = regex.exec(content);
    if (!match) {
      break;
    }

    if (match.index > cursor) {
      blocks.push({ type: 'text', value: content.slice(cursor, match.index) });
    }

    blocks.push({ type: 'code', value: match[2], language: match[1] });
    cursor = regex.lastIndex;
  }

  if (cursor < content.length) {
    blocks.push({ type: 'text', value: content.slice(cursor) });
  }

  return blocks;
}

export function MarkdownText({ content, textStyle, codeStyle, onLinkPress, selectable = true }: MarkdownTextProps) {
  const blocks = useMemo(() => splitMarkdownBlocks(content), [content]);

  return (
    <View>
      {blocks.map((block: { type: 'text' | 'code'; value: string; language?: string }, blockIndex: number) => {
        if (block.type === 'code') {
          return (
            <View key={`codeblock-${blockIndex}`} style={styles.codeBlock}>
              <Text selectable={selectable} style={[styles.codeText, codeStyle]}>
                {block.value.trimEnd()}
              </Text>
            </View>
          );
        }

        const lines = block.value.split(/\n/).filter((line) => line.length > 0);

        return lines.map((line: string, lineIndex: number) =>
          renderTextLine(
            line,
            `text-${blockIndex}-${lineIndex}`,
            textStyle,
            onLinkPress,
            selectable
          )
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  codeBlock: {
    borderRadius: 14,
    marginTop: 10,
    marginBottom: 10,
    overflow: 'hidden'
  },
  codeText: {
    backgroundColor: '#111827',
    color: '#f9fafb',
    fontFamily: 'Courier',
    fontSize: 13,
    lineHeight: 18,
    padding: 12
  },
  inlineCode: {
    backgroundColor: '#374151',
    borderRadius: 6,
    color: '#f9fafb',
    fontFamily: 'Courier',
    fontSize: 13,
    paddingHorizontal: 4,
    paddingVertical: 1
  },
  bold: {
    fontWeight: '700'
  },
  heading: {
    marginTop: 6,
    marginBottom: 4,
    fontWeight: '700'
  },
  h1: {
    fontSize: 22,
    lineHeight: 28
  },
  h2: {
    fontSize: 19,
    lineHeight: 24
  },
  h3: {
    fontSize: 17,
    lineHeight: 22
  },
  link: {
    color: '#2563eb',
    textDecorationLine: 'underline'
  }
});
