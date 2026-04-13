import type { AITheme } from "../types";

export const lightTheme: AITheme = {
  backgroundColor: "#f8fafc",
  surfaceColor: "#ffffff",
  surfaceMutedColor: "#f1f5f9",
  textColor: "#0f172a",
  textMutedColor: "#475569",
  borderColor: "#cbd5e1",
  primaryColor: "#0ea5e9",
  userBubbleColor: "#0ea5e9",
  assistantBubbleColor: "#e2e8f0",
  codeBackgroundColor: "#e2e8f0",
  codeTextColor: "#0f172a",
  errorColor: "#dc2626",
};

export const darkTheme: AITheme = {
  backgroundColor: "#020617",
  surfaceColor: "#0f172a",
  surfaceMutedColor: "#1e293b",
  textColor: "#f8fafc",
  textMutedColor: "#94a3b8",
  borderColor: "#334155",
  primaryColor: "#38bdf8",
  userBubbleColor: "#1d4ed8",
  assistantBubbleColor: "#111827",
  codeBackgroundColor: "#0f172a",
  codeTextColor: "#e2e8f0",
  errorColor: "#f87171",
};

export function resolveTheme(
  mode: "light" | "dark" | "system",
  systemIsDark: boolean,
): AITheme {
  if (mode === "light") {
    return lightTheme;
  }

  if (mode === "dark") {
    return darkTheme;
  }

  return systemIsDark ? darkTheme : lightTheme;
}
