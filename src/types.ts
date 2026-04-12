export type AIProviderName = "openai" | "gemini";

export type AIMessageRole = "user" | "assistant";

export type AIMessageStatus = "sending" | "streaming" | "sent" | "error";

export interface AIMessage {
  id: string;
  role: AIMessageRole;
  content: string;
  createdAt: number;
  status?: AIMessageStatus;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface AIConversationMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIProviderRequest {
  messages: AIConversationMessage[];
  signal?: AbortSignal;
  timeoutMs?: number;
}

export interface AIProviderResult {
  content: string;
  raw?: unknown;
}

export interface AIStreamHandlers {
  onToken?: (token: string) => void;
  onDelta?: (content: string) => void;
  onFinish?: (result: AIProviderResult) => void;
}

export interface AIProvider {
  name: AIProviderName;
  sendMessage: (request: AIProviderRequest) => Promise<AIProviderResult>;
  streamMessage: (
    request: AIProviderRequest & AIStreamHandlers,
  ) => Promise<AIProviderResult>;
}

export interface AIChatOptions {
  provider: AIProviderName;
  apiKey: string;
  model?: string;
  systemPrompt?: string;
  cacheKey?: string;
  initialMessages?: AIMessage[];
  timeoutMs?: number;
  enableCache?: boolean;
  debug?: boolean;
}

export interface AIChatReturn {
  messages: AIMessage[];
  input: string;
  setInput: (value: string) => void;
  sendMessage: (message?: string) => Promise<AIMessage | null>;
  isLoading: boolean;
  error: string | null;
  stopGenerating: () => void;
  clearMessages: () => void;
  retryLastMessage: () => Promise<AIMessage | null>;
}

export interface VoiceOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  autoSpeak?: boolean;
  speechRate?: number;
  speechPitch?: number;
}

export interface AIVoiceReturn {
  startListening: () => Promise<void>;
  stopListening: () => Promise<void>;
  transcript: string;
  isListening: boolean;
  recordingUri: string | null;
  error: string | null;
  speak: (text: string) => Promise<void>;
  clearTranscript: () => void;
}

export interface AITheme {
  backgroundColor: string;
  surfaceColor: string;
  surfaceMutedColor: string;
  textColor: string;
  textMutedColor: string;
  borderColor: string;
  primaryColor: string;
  userBubbleColor: string;
  assistantBubbleColor: string;
  codeBackgroundColor: string;
  codeTextColor: string;
  errorColor: string;
}

export interface AIMessageBubbleProps {
  message: AIMessage;
  theme?: Partial<AITheme>;
  className?: string;
  style?: import("react-native").StyleProp<import("react-native").ViewStyle>;
  contentStyle?: import("react-native").StyleProp<
    import("react-native").TextStyle
  >;
  codeStyle?: import("react-native").StyleProp<
    import("react-native").TextStyle
  >;
  onLinkPress?: (url: string) => void;
  showTimestamp?: boolean;
}

export interface AIInputProps {
  value: string;
  onChangeText: (value: string) => void;
  onSend: () => void | Promise<void>;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  style?: import("react-native").StyleProp<import("react-native").ViewStyle>;
  inputStyle?: import("react-native").StyleProp<
    import("react-native").TextStyle
  >;
  buttonStyle?: import("react-native").StyleProp<
    import("react-native").ViewStyle
  >;
  buttonTextStyle?: import("react-native").StyleProp<
    import("react-native").TextStyle
  >;
  multiline?: boolean;
  showSendIcon?: boolean;
  sendLabel?: string;
}

export interface AIChatViewProps extends AIChatReturn {
  title?: string;
  subtitle?: string;
  emptyStateTitle?: string;
  emptyStateDescription?: string;
  className?: string;
  style?: import("react-native").StyleProp<import("react-native").ViewStyle>;
  contentContainerStyle?: import("react-native").StyleProp<
    import("react-native").ViewStyle
  >;
  headerStyle?: import("react-native").StyleProp<
    import("react-native").ViewStyle
  >;
  footerStyle?: import("react-native").StyleProp<
    import("react-native").ViewStyle
  >;
  theme?: Partial<AITheme>;
  renderMessage?: (
    message: AIMessage,
    index: number,
  ) => import("react").ReactNode;
  renderFooter?: () => import("react").ReactNode;
  renderHeader?: () => import("react").ReactNode;
  onPressRetry?: () => void;
}
