# expo-ai-kit ⚡

> Add AI (ChatGPT-style chat, streaming, voice) to your Expo app in **5 lines of code**

---

## 🚀 Why this exists

Building AI features in Expo is painful:

* Too much boilerplate
* No streaming support
* Voice is messy
* UI takes forever

**expo-ai-kit fixes all of that.**

---

## ⚡ Quick Demo

```tsx
import { AIChatView, useAIChat } from "expo-ai-kit";

export default function Screen() {
  const chat = useAIChat({
    provider: "openai",
    apiKey: "YOUR_API_KEY",
  });

  return <AIChatView {...chat} />;
}
```

👉 That’s it. You now have a working AI chat UI.

---

## ✨ Features

* 🧠 **AI Chat Hook** → `useAIChat`
* ⚡ **Streaming Responses** (real-time typing effect)
* 🎤 **Voice Input + TTS**
* 🔌 **Multi-Provider Support**

  * OpenAI
  * Google Gemini
* 💬 **Prebuilt UI Components**
* 💾 **Offline Cache + Persistence**
* ⚙️ **Zero Backend Required**
* 📦 **Tiny & Tree-shakable**

---

## 📦 Installation

```bash
npm install expo-ai-kit
npm install expo-speech expo-av @react-native-async-storage/async-storage
```

---

## 🔧 Providers

### OpenAI

```tsx
useAIChat({
  provider: "openai",
  apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY!,
  model: "gpt-4o-mini",
});
```

### Gemini

```tsx
useAIChat({
  provider: "gemini",
  apiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY!,
  model: "gemini-2.5-flash",
});
```

---

## 🎤 Voice (Speech-to-Text + TTS)

```tsx
import { useAIVoice } from "expo-ai-kit";

const voice = useAIVoice();

await voice.startListening();
await voice.stopListening();
await voice.speak("Hello from Expo");
```

---

## 🧩 Components

* `AIChatView` → full chat UI
* `AIInput` → input box
* `AIMessageBubble` → messages
* `AITypingIndicator` → streaming state

All components are:

* Customizable
* NativeWind-compatible
* Lightweight

---

## 🧠 How it works

* Uses `fetch` (no backend needed)
* Streams tokens in real-time
* Stores chats via AsyncStorage
* Works in Expo Go

---

## ⚠️ Notes

* Native speech recognition requires platform support
* Works best with Expo SDK 50+
* No Node.js APIs used

---

## 📱 Example App

See `/example` for a full working demo.

---

## 💡 Coming Soon

* Image generation support
* Markdown + code block rendering
* Better voice transcription
* More providers

---

## ⭐ Support

If this helped you:

* Star the repo ⭐
* Share on Twitter/X
* Build something cool 🚀

---

## 🧑‍💻 Author

Built by Arhan Ansari
[Twitter](https://twitter.com/codewitharhan) | [GitHub](https://github.com/ArhanAnsari)