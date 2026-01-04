import { streamText, convertToModelMessages, UIMessage } from "ai";
import { google, GoogleGenerativeAIProviderOptions } from "@ai-sdk/google";
import { anthropic } from "@ai-sdk/anthropic";

// Model configuration matching lib/models.ts
const MODEL_MAP = {
  "gemini-3-pro": {
    provider: "google" as const,
    modelId: "gemini-3-pro-preview",
  },
  "claude-sonnet-4-5": {
    provider: "anthropic" as const,
    modelId: "claude-sonnet-4-5-20250929",
  },
  "claude-opus-4-5": {
    provider: "anthropic" as const,
    modelId: "claude-opus-4-5-20251101",
  },
} as const;

type ModelId = keyof typeof MODEL_MAP;

function getModel(modelId: string) {
  const config = MODEL_MAP[modelId as ModelId];

  if (!config) {
    // Default to Gemini 3 Pro if invalid model ID
    return google("gemini-3-pro-preview");
  }

  switch (config.provider) {
    case "google":
      return google(config.modelId);
    case "anthropic":
      return anthropic(config.modelId);
    default:
      return google("gemini-3-pro-preview");
  }
}

function getProviderOptions(modelId: string) {
  const config = MODEL_MAP[modelId as ModelId];

  // Only Google models support thinkingConfig
  if (config?.provider === "google") {
    return {
      google: {
        thinkingConfig: {
          includeThoughts: true,
          thinkingLevel: "high",
        },
      } satisfies GoogleGenerativeAIProviderOptions,
    };
  }

  return undefined;
}

const systemPrompt = `You are an expert web developer and UI designer. You help users build beautiful, modern web applications.

IMPORTANT: Structure your responses in this exact format:

## Plan
[1-2 sentence summary of what you'll build, mentioning key features]

## Building
[TOOL:create_component] ComponentName
[TOOL:add_styling] Tailwind classes for layout, colors, effects
[TOOL:add_interactivity] Any state, handlers, or animations

## Code
\`\`\`jsx
[Your complete React component code here]
\`\`\`

## Summary
[1 sentence confirmation of what was created]

Your code should:
- Use modern React patterns (functional components, hooks)
- Use Tailwind CSS for styling
- Be responsive and accessible
- Have a polished, professional look
- Export a default App component
- ONLY use React and Tailwind - NO external libraries (no lucide-react, no framer-motion, no other npm packages)
- Use emoji or Unicode symbols for icons (e.g., ➕ ➖ 🔄 ✓ ✕ ⬆️ ⬇️)

Keep explanations concise. The code block is required but won't be shown directly to users - it powers the live preview.`;

export async function POST(req: Request) {
  const { messages, modelId = "gemini-3-pro" } = await req.json();

  // Convert UIMessage format (parts array) to ModelMessage format (content string)
  const modelMessages = await convertToModelMessages(messages as UIMessage[]);

  const model = getModel(modelId);
  const providerOptions = getProviderOptions(modelId);

  const result = streamText({
    model,
    system: systemPrompt,
    messages: modelMessages,
    ...(providerOptions && { providerOptions }),
  });

  return result.toTextStreamResponse();
}
