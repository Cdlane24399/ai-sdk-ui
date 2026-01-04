"use client";

import { useState, useRef, useEffect, Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  Send,
  Sparkles,
  Code2,
  Eye,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  ChevronLeft,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useChat, Chat } from "@ai-sdk/react";
import { TextStreamChatTransport, UIMessage } from "ai";
import dynamic from "next/dynamic";
import { PreviewIframe } from "@/components/preview-iframe";
import { ModelSelector, useModelSelection } from "@/components/model-selector";

// Dynamically import Monaco Editor to avoid SSR issues
const Editor = dynamic(
  () => import("@monaco-editor/react").then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="h-full flex items-center justify-center bg-slate-900">
        <Loader2 className="size-6 text-copper animate-spin" />
      </div>
    ),
  }
);

// Helper to get text content from message parts
function getMessageContent(message: UIMessage): string {
  return message.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("");
}

// Parse structured AI response
interface ParsedResponse {
  plan: string | null;
  tools: Array<{ type: string; description: string }>;
  code: string | null;
  summary: string | null;
}

function parseAIResponse(content: string): ParsedResponse {
  const result: ParsedResponse = {
    plan: null,
    tools: [],
    code: null,
    summary: null,
  };

  // Extract Plan section
  const planMatch = content.match(/## Plan\s*\n([\s\S]*?)(?=\n## |$)/);
  if (planMatch) {
    result.plan = planMatch[1].trim();
  }

  // Extract Building section and parse tool calls
  const buildingMatch = content.match(/## Building\s*\n([\s\S]*?)(?=\n## |$)/);
  if (buildingMatch) {
    const toolLines = buildingMatch[1].match(/\[TOOL:(\w+)\]\s*(.+)/g);
    if (toolLines) {
      result.tools = toolLines.map((line) => {
        const match = line.match(/\[TOOL:(\w+)\]\s*(.+)/);
        return {
          type: match?.[1] || "unknown",
          description: match?.[2] || "",
        };
      });
    }
  }

  // Extract code block
  const codeMatch = content.match(/```(?:jsx?|tsx?)\n([\s\S]*?)```/);
  if (codeMatch) {
    result.code = codeMatch[1];
  }

  // Extract Summary section
  const summaryMatch = content.match(/## Summary\s*\n([\s\S]*?)(?=\n## |$)/);
  if (summaryMatch) {
    result.summary = summaryMatch[1].trim();
  }

  return result;
}

// Tool icon mapping
function getToolIcon(type: string) {
  switch (type) {
    case "create_component":
      return <Code2 className="size-3.5" />;
    case "add_styling":
      return <Sparkles className="size-3.5" />;
    case "add_interactivity":
      return <Eye className="size-3.5" />;
    default:
      return <Check className="size-3.5" />;
  }
}

// Render structured AI message
function StructuredMessage({ content }: { content: string }) {
  const parsed = parseAIResponse(content);

  // If no structured format detected, show as plain text (without code blocks)
  if (!parsed.plan && !parsed.tools.length && !parsed.summary) {
    const plainContent = content.replace(/```[\s\S]*?```/g, "").trim();
    return <p className="text-sm leading-relaxed whitespace-pre-wrap">{plainContent || "[Code generated]"}</p>;
  }

  return (
    <div className="space-y-3">
      {/* Plan */}
      {parsed.plan && (
        <p className="text-sm leading-relaxed">{parsed.plan}</p>
      )}

      {/* Tool calls */}
      {parsed.tools.length > 0 && (
        <div className="space-y-1.5">
          {parsed.tools.map((tool, i) => (
            <div
              key={i}
              className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg px-2.5 py-1.5"
            >
              <span className="text-copper">{getToolIcon(tool.type)}</span>
              <span className="font-medium capitalize">
                {tool.type.replace(/_/g, " ")}:
              </span>
              <span>{tool.description}</span>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      {parsed.summary && (
        <p className="text-sm text-muted-foreground italic">{parsed.summary}</p>
      )}
    </div>
  );
}

// Track sent prompts to prevent duplicates
const sentPrompts = new Set<string>();

function BuilderContent() {
  const searchParams = useSearchParams();
  const initialPrompt = searchParams.get("prompt") || "";

  const [viewMode, setViewMode] = useState<"preview" | "code">("preview");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [generatedCode, setGeneratedCode] = useState(DEFAULT_CODE);
  const [input, setInput] = useState("");
  const [mobileView, setMobileView] = useState<"chat" | "preview">("chat");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasInitializedRef = useRef(false);

  // Model selection with localStorage persistence
  const { modelId, setModelId, isHydrated } = useModelSelection();

  // Create the chat instance with transport (includes modelId in body)
  const chat = useMemo(
    () =>
      new Chat({
        transport: new TextStreamChatTransport({
          api: "/api/chat",
          body: { modelId },
        }),
      }),
    [modelId]
  );

  const { messages, sendMessage, status } = useChat({ chat });

  const isLoading = status === "streaming" || status === "submitted";

  // Extract code from messages when they change
  useEffect(() => {
    const lastAssistantMessage = [...messages]
      .reverse()
      .find((m) => m.role === "assistant");
    if (lastAssistantMessage) {
      const content = getMessageContent(lastAssistantMessage);
      const parsed = parseAIResponse(content);
      if (parsed.code) {
        setGeneratedCode(parsed.code);
      }
    }
  }, [messages]);

  // Send initial prompt on mount (only once)
  useEffect(() => {
    const promptKey = `initial:${initialPrompt}`;
    if (initialPrompt && !hasInitializedRef.current && !sentPrompts.has(promptKey)) {
      hasInitializedRef.current = true;
      sentPrompts.add(promptKey);
      setTimeout(() => {
        sendMessage({ text: initialPrompt });
      }, 100);
    }
  }, [initialPrompt, sendMessage]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      const messageText = input;
      setInput("");
      sendMessage({ text: messageText });
    }
  };

  return (
    <div className="noise-bg h-screen-safe flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 shrink-0 z-10">
        <div className="flex items-center gap-2 md:gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon-sm" className="rounded-xl">
              <ChevronLeft className="size-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <div className="size-7 md:size-8 rounded-xl bg-copper/20 flex items-center justify-center">
              <Sparkles className="size-3.5 md:size-4 text-copper" />
            </div>
            <span className="font-medium text-sm md:text-base">Forge</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Mobile view toggle */}
          <div className="flex md:hidden items-center gap-1 p-1 rounded-xl bg-muted/50">
            <button
              onClick={() => setMobileView("chat")}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                mobileView === "chat"
                  ? "bg-card text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              Chat
            </button>
            <button
              onClick={() => setMobileView("preview")}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                mobileView === "preview"
                  ? "bg-card text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              Preview
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={handleCopy} className="hidden md:flex">
            {copied ? (
              <>
                <Check className="size-3.5 mr-1.5" />
                Copied
              </>
            ) : (
              <>
                <Copy className="size-3.5 mr-1.5" />
                Copy code
              </>
            )}
          </Button>
          <Button size="sm" className="hidden md:flex">Export</Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden px-3 md:px-4 pb-3 md:pb-4 gap-3 md:gap-4 min-h-0">
        {/* Chat Panel */}
        <div
          className={`${isFullscreen ? "hidden" : ""} ${mobileView === "chat" ? "flex" : "hidden"} md:flex w-full md:w-[30%] flex-col shrink-0 min-h-0`}
        >
          {/* Messages */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden pr-2 md:pr-4 touch-scroll">
            <div className="space-y-3 md:space-y-4 py-2">
              {messages.map((message) => {
                const content = getMessageContent(message);
                return (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[90%] md:max-w-[85%] rounded-2xl px-3 md:px-4 py-2.5 md:py-3 ${
                        message.role === "user"
                          ? "bg-copper/20 text-foreground"
                          : "bg-card"
                      }`}
                    >
                      {message.role === "assistant" ? (
                        <StructuredMessage content={content} />
                      ) : (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {content}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-card rounded-2xl px-3 md:px-4 py-2.5 md:py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <span className="size-2 rounded-full bg-copper/60 animate-pulse" />
                        <span
                          className="size-2 rounded-full bg-copper/60 animate-pulse"
                          style={{ animationDelay: "0.15s" }}
                        />
                        <span
                          className="size-2 rounded-full bg-copper/60 animate-pulse"
                          style={{ animationDelay: "0.3s" }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground">
                        Generating...
                      </span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input */}
          <form onSubmit={handleFormSubmit} className="mt-3 md:mt-4 shrink-0">
            <div className="relative rounded-2xl bg-card overflow-hidden">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Describe what to build..."
                rows={2}
                className="w-full bg-transparent px-3 md:px-4 pt-3 md:pt-4 pb-12 text-sm resize-none focus:outline-none placeholder:text-muted-foreground/50"
                style={{ fontSize: '16px' }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleFormSubmit(e);
                  }
                }}
              />
              {/* Bottom bar with model selector and send button */}
              <div className="absolute bottom-2.5 md:bottom-3 left-2.5 md:left-3 right-2.5 md:right-3 flex items-center justify-between">
                {/* Model Selector - Bottom Left */}
                {isHydrated && (
                  <ModelSelector
                    value={modelId}
                    onChange={setModelId}
                    disabled={isLoading}
                  />
                )}
                {!isHydrated && <div className="w-[120px]" />}

                {/* Send Button - Bottom Right */}
                <Button
                  type="submit"
                  size="icon-sm"
                  disabled={!input.trim() || isLoading}
                  className="rounded-xl"
                >
                  <Send className="size-4" />
                </Button>
              </div>
            </div>
          </form>
        </div>

        {/* Preview/Editor Panel */}
        <div
          className={`${isFullscreen ? "w-full" : ""} ${mobileView === "preview" ? "flex" : "hidden"} md:flex flex-1 flex-col rounded-2xl md:rounded-3xl bg-card overflow-hidden min-h-0`}
        >
          {/* Panel Header */}
          <div className="flex items-center justify-between px-3 md:px-4 py-2.5 md:py-3 bg-muted/30">
            <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/50">
              <button
                onClick={() => setViewMode("preview")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === "preview"
                    ? "bg-card text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Eye className="size-3.5" />
                Preview
              </button>
              <button
                onClick={() => setViewMode("code")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === "code"
                    ? "bg-card text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Code2 className="size-3.5" />
                Code
              </button>
            </div>
            <div className="hidden md:flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon-sm"
                className="rounded-xl"
                onClick={() => setIsFullscreen(!isFullscreen)}
              >
                {isFullscreen ? (
                  <Minimize2 className="size-4" />
                ) : (
                  <Maximize2 className="size-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden min-h-0">
            {viewMode === "preview" ? (
              <div className="h-full bg-white rounded-b-xl md:rounded-b-2xl overflow-hidden">
                <PreviewIframe code={generatedCode} />
              </div>
            ) : (
              <div className="h-full">
                <Editor
                  height="100%"
                  defaultLanguage="javascript"
                  value={generatedCode}
                  onChange={(value) => setGeneratedCode(value || "")}
                  theme="vs-dark"
                  options={{
                    fontSize: 14,
                    fontFamily: "var(--font-geist-mono), monospace",
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    padding: { top: 16, bottom: 16 },
                    lineNumbers: "on",
                    renderLineHighlight: "none",
                    overviewRulerLanes: 0,
                    hideCursorInOverviewRuler: true,
                    scrollbar: {
                      vertical: "auto",
                      horizontal: "auto",
                      verticalScrollbarSize: 8,
                      horizontalScrollbarSize: 8,
                    },
                    wordWrap: "on",
                    tabSize: 2,
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BuilderPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center bg-background">
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-copper animate-pulse" />
            <div
              className="size-2 rounded-full bg-copper animate-pulse"
              style={{ animationDelay: "0.15s" }}
            />
            <div
              className="size-2 rounded-full bg-copper animate-pulse"
              style={{ animationDelay: "0.3s" }}
            />
          </div>
        </div>
      }
    >
      <BuilderContent />
    </Suspense>
  );
}

// Default code to show in the editor
const DEFAULT_CODE = `export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white flex items-center justify-center p-8">
      <div className="max-w-2xl text-center">
        <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
          Welcome to Forge
        </h1>
        <p className="text-xl text-slate-300 mb-8">
          Describe your app idea in the chat and watch it come to life.
        </p>
        <div className="flex justify-center gap-4">
          <button className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold rounded-full transition-colors">
            Get Started
          </button>
          <button className="px-6 py-3 border border-slate-600 hover:border-slate-500 rounded-full transition-colors">
            Learn More
          </button>
        </div>
      </div>
    </div>
  );
}`;
