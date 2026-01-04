import type { LucideIcon } from "lucide-react";
import { Zap, Sparkles } from "lucide-react";

export interface ModelConfig {
  id: string;
  name: string;
  provider: "google" | "anthropic";
  modelId: string;
  icon: LucideIcon;
  description?: string;
}

export const MODELS: ModelConfig[] = [
  {
    id: "gemini-3-pro",
    name: "Gemini 3 Pro",
    provider: "google",
    modelId: "gemini-3-pro-preview",
    icon: Zap,
    description: "Fast and efficient",
  },
  {
    id: "claude-sonnet-4-5",
    name: "Claude Sonnet 4.5",
    provider: "anthropic",
    modelId: "claude-sonnet-4-5-20250929",
    icon: Sparkles,
    description: "Balanced performance",
  },
  {
    id: "claude-opus-4-5",
    name: "Claude Opus 4.5",
    provider: "anthropic",
    modelId: "claude-opus-4-5-20251101",
    icon: Sparkles,
    description: "Highest quality",
  },
] as const;

export const DEFAULT_MODEL_ID = "gemini-3-pro";

export type ModelId = (typeof MODELS)[number]["id"];

export function getModelConfig(id: string): ModelConfig | undefined {
  return MODELS.find((m) => m.id === id);
}

export function isValidModelId(id: string): id is ModelId {
  return MODELS.some((m) => m.id === id);
}
