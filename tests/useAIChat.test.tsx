import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const streamMessage = vi.fn(async ({ onToken }: { onToken?: (token: string) => void }) => {
  onToken?.('Hello');
  onToken?.(' world');
  return { content: 'Hello world' };
});

vi.mock('../src/providers/openai', () => ({
  createOpenAIProvider: vi.fn(() => ({
    name: 'openai',
    sendMessage: vi.fn(),
    streamMessage
  }))
}));

vi.mock('../src/providers/gemini', () => ({
  createGeminiProvider: vi.fn(() => ({
    name: 'gemini',
    sendMessage: vi.fn(),
    streamMessage
  }))
}));

import { useAIChat } from '../src/hooks/useAIChat';

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    const id = setTimeout(() => callback(Date.now()), 0) as unknown as number;
    return id;
  });

  vi.stubGlobal('cancelAnimationFrame', (id: number) => {
    clearTimeout(id);
  });
});

describe('useAIChat', () => {
  it('streams assistant tokens into state', async () => {
    const { result } = renderHook(() =>
      useAIChat({
        provider: 'openai',
        apiKey: 'test',
        systemPrompt: 'You are helpful',
        enableCache: false
      })
    );

    await act(async () => {
      await result.current.sendMessage('Hello there');
    });

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2);
      expect(result.current.messages[0]?.content).toBe('Hello there');
      expect(result.current.messages[1]?.content).toBe('Hello world');
      expect(result.current.isLoading).toBe(false);
    });
  });
});
