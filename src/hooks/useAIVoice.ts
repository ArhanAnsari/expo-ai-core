import { useCallback, useEffect, useRef, useState } from "react";
import type { AIVoiceReturn, VoiceOptions } from "../types";

export function useAIVoice(options: VoiceOptions = {}): AIVoiceReturn {
  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const recordingRef = useRef<any>(null);

  const clearTranscript = useCallback(() => {
    setTranscript("");
    setError(null);
  }, []);

  const speak = useCallback(
    async (text: string) => {
      if (!text.trim()) {
        return;
      }

      try {
        const speechModule = await import("expo-speech").catch(() => null);
        const speech = (speechModule?.default ?? speechModule) as any;

        if (speech?.speak) {
          speech.speak(text, {
            rate: options.speechRate ?? 1,
            pitch: options.speechPitch ?? 1,
          });
          return;
        }

        if (
          typeof globalThis !== "undefined" &&
          "speechSynthesis" in globalThis
        ) {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = options.speechRate ?? 1;
          utterance.pitch = options.speechPitch ?? 1;
          globalThis.speechSynthesis.speak(utterance);
        }
      } catch (caughtError) {
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Failed to speak text";
        setError(message);
        options.onVoiceError?.(message);
      }
    },
    [options.onVoiceError, options.speechPitch, options.speechRate],
  );

  const stopListening = useCallback(async () => {
    const recognition = recognitionRef.current;
    if (recognition) {
      recognition.stop?.();
      recognitionRef.current = null;
      setIsListening(false);
      return;
    }

    const recording = recordingRef.current;
    if (recording) {
      try {
        await recording.stopAndUnloadAsync();
        setRecordingUri(recording.getURI?.() ?? null);
      } catch (caughtError) {
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Failed to stop recording";
        setError(message);
        options.onVoiceError?.(message);
      } finally {
        recordingRef.current = null;
        setIsListening(false);
      }
    }
  }, [options]);

  const startListening = useCallback(async () => {
    setError(null);
    clearTranscript();

    const SpeechRecognition =
      (globalThis as any).SpeechRecognition ??
      (globalThis as any).webkitSpeechRecognition ??
      null;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = options.language ?? "en-US";
      recognition.continuous = options.continuous ?? false;
      recognition.interimResults = options.interimResults ?? true;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: any) => {
        let nextTranscript = "";

        for (let index = 0; index < event.results.length; index += 1) {
          const result = event.results[index];
          nextTranscript += result[0]?.transcript ?? "";
        }

        const finalText = nextTranscript.trim();
        setTranscript(finalText);
        options.onTranscript?.(finalText);

        if (options.autoSpeak && finalText) {
          void speak(finalText);
        }
      };

      recognition.onerror = (event: any) => {
        const message = event?.error
          ? String(event.error)
          : "Speech recognition failed";
        setError(message);
        options.onVoiceError?.(message);
        setIsListening(false);
      };

      recognition.onend = () => {
        if (options.loop) {
          recognition.start();
          return;
        }

        setIsListening(false);
        recognitionRef.current = null;
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
      return;
    }

    try {
      const expoAv = await import("expo-av").catch(() => null);
      const Audio = expoAv?.Audio ?? null;

      if (!Audio) {
        throw new Error("Speech recognition is unavailable on this platform");
      }

      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        throw new Error("Microphone permission is required");
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        staysActiveInBackground: false,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      await recording.startAsync();
      recordingRef.current = recording;
      setIsListening(true);

      const fallbackMessage =
        "Speech recognition is not available in Expo Go. Audio recording started instead.";
      setError(fallbackMessage);
      options.onVoiceError?.(fallbackMessage);
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Failed to start listening";
      setError(message);
      options.onVoiceError?.(message);
      setIsListening(false);
    }
  }, [clearTranscript, options, speak]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop?.();
      const recording = recordingRef.current;
      if (recording) {
        void recording.stopAndUnloadAsync().catch(() => undefined);
      }
    };
  }, []);

  return {
    startListening,
    stopListening,
    transcript,
    isListening,
    recordingUri,
    error,
    speak,
    clearTranscript,
  };
}
