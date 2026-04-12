import { useCallback, useEffect, useRef, useState } from "react";
import type { AIVoiceReturn, VoiceOptions } from "../types";

export function useAIVoice(options: VoiceOptions = {}): AIVoiceReturn {
  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const recordingRef = useRef<any>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

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
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Failed to speak text",
        );
      }
    },
    [options.speechPitch, options.speechRate],
  );

  const stopListening = useCallback(async () => {
    const recognition = recognitionRef.current;

    if (recognition) {
      recognition.stop?.();
      recognitionRef.current = null;
      cleanupRef.current?.();
      cleanupRef.current = null;
      setIsListening(false);
      return;
    }

    const recording = recordingRef.current;
    if (recording) {
      try {
        await recording.stopAndUnloadAsync();
        setRecordingUri(recording.getURI?.() ?? null);
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Failed to stop recording",
        );
      } finally {
        recordingRef.current = null;
        setIsListening(false);
      }
    }
  }, []);

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

        setTranscript(nextTranscript.trim());
      };

      recognition.onerror = (event: any) => {
        setError(
          event?.error ? String(event.error) : "Speech recognition failed",
        );
        setIsListening(false);
      };

      recognition.onend = () => {
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
      setError(
        "Speech recognition is not available in Expo Go. Audio recording started instead.",
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Failed to start listening",
      );
      setIsListening(false);
    }
  }, [
    clearTranscript,
    options.continuous,
    options.interimResults,
    options.language,
  ]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop?.();
      cleanupRef.current?.();
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
