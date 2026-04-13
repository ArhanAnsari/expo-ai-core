export type AIProviderName = "openai" | "gemini" | (string & {});

export type AIMessageRole = "system" | "user" | "assistant" | "tool";

export type AIMessageStatus =
  | "sending"
  | "streaming"
  | "sent"
  | "error"
  | "cancelled";

export type AIChatThemeMode = "light" | "dark" | "system";

export type AITypingSpeed = "slow" | "normal" | "fast";

export interface AIMessage {
  id: string;
  role: AIMessageRole;
  content: string;
  createdAt: number;
  status?: AIMessageStatus;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface AIConversation {
  id: string;
  title: string;
  messages: AIMessage[];
  createdAt: number;
  updatedAt: number;
  summary?: string;
}

export interface AIConversationMessage {
  role: AIMessageRole;
  content: string;
}

export interface AIProviderRequest {
  messages: AIConversationMessage[];
  signal?: AbortSignal;
  timeoutMs?: number;
}

export interface AIImageGenerationRequest {
  prompt: string;
  model?: string;
  size?: string;
  signal?: AbortSignal;
}

export interface AIImageGenerationResult {
  url?: string;
  base64?: string;
  revisedPrompt?: string;
  raw?: unknown;
}

export interface AIProviderResult {
  content: string;
  raw?: unknown;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
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
  generateImage?: (
    request: AIImageGenerationRequest,
  ) => Promise<AIImageGenerationResult>;
}

export interface AIToolContext {
  conversationId: string;
  messages: AIMessage[];
  args: Record<string, unknown>;
}

export type AIToolFunction = (
  args: Record<string, unknown>,
  context: AIToolContext,
) => Promise<unknown> | unknown;

export type AIToolsMap = Record<string, AIToolFunction>;

export interface AIToolCall {
  name: string;
  args: Record<string, unknown>;
}

export interface AIPlugin {
  name: string;
  handler?: (input: string, messages: AIMessage[]) => Promise<void> | void;
  tools?: AIToolsMap;
}

export interface AIMemoryOptions {
  enabled?: boolean;
  strategy?: "window" | "summary";
  windowSize?: number;
  maxSummaryLength?: number;
}

export interface AIDebugMetrics {
  lastLatencyMs?: number;
  lastProvider?: string;
  totalRequests: number;
  failedRequests: number;
  totalTokens: number;
  lastError?: string;
}

export interface AIDebugEvent {
  type:
    | "request:start"
    | "request:success"
    | "request:error"
    | "tool:call"
    | "tool:result"
    | "stream:token"
    | "image:generate";
  timestamp: number;
  detail?: Record<string, unknown>;
}

export interface AIChatOptions {
  provider?: AIProviderName;
  apiKey: string;
  model?: string;
  systemPrompt?: string;
  cacheKey?: string;
  initialMessages?: AIMessage[];
  timeoutMs?: number;
  enableCache?: boolean;
  debug?: boolean;
  tools?: AIToolsMap;
  plugins?: AIPlugin[];
  memory?: AIMemoryOptions;
  typingSpeed?: AITypingSpeed;
  themeMode?: AIChatThemeMode;
  haptics?: boolean;
  maxToolIterations?: number;
  onDebugEvent?: (event: AIDebugEvent) => void;
  routing?: "auto";
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
  conversations: AIConversation[];
  currentConversationId: string;
  createChat: (title?: string) => string;
  switchChat: (conversationId: string) => void;
  deleteChat: (conversationId: string) => void;
  setConversationTitle: (conversationId: string, title: string) => void;
  regenerateResponse: () => Promise<AIMessage | null>;
  copyMessage: (messageId: string) => Promise<boolean>;
  retryMessage: (messageId: string) => Promise<AIMessage | null>;
  generateImage: (prompt: string) => Promise<AIImageGenerationResult | null>;
  setProvider: (provider: AIProviderName) => void;
  setModel: (model: string) => void;
  themeMode: AIChatThemeMode;
  setThemeMode: (mode: AIChatThemeMode) => void;
  debugState: AIDebugMetrics;
}

export interface VoiceOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  autoSpeak?: boolean;
  speechRate?: number;
  speechPitch?: number;
  loop?: boolean;
  onTranscript?: (text: string) => void;
  onVoiceError?: (message: string) => void;
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
  onCopy?: (message: AIMessage) => void;
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
  showControls?: boolean;
}

export interface AIAgentStep {
  id: string;
  instruction: string;
}

export interface AIAgentConfig {
  goal: string;
  steps: AIAgentStep[];
  provider: AIProvider;
  tools?: AIToolsMap;
  debug?: boolean;
}

export interface AIAgentStepResult {
  step: AIAgentStep;
  response: string;
  toolResult?: unknown;
}

export interface AIAgentResult {
  goal: string;
  completed: boolean;
  steps: AIAgentStepResult[];
}
