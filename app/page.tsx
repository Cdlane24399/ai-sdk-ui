"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Zap, Layers, Code2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModelSelector, useModelSelection } from "@/components/model-selector";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const router = useRouter();
  const { modelId, setModelId, isHydrated } = useModelSelection();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      router.push(`/builder?prompt=${encodeURIComponent(prompt)}&model=${modelId}`);
    }
  };

  const examplePrompts = [
    "Build a modern portfolio site with a bento grid layout",
    "Create a task management app with drag and drop",
    "Design a restaurant booking system with calendar",
    "Make an AI image gallery with lightbox",
  ];

  return (
    <div className="noise-bg min-h-screen flex flex-col">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="flex items-center justify-between px-8 py-6"
      >
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-2xl bg-copper/20 flex items-center justify-center">
            <Sparkles className="size-5 text-copper" />
          </div>
          <span className="text-xl font-semibold tracking-tight">Forge</span>
        </div>
        <nav className="flex items-center gap-2">
          <Button variant="ghost" size="sm">
            Examples
          </Button>
          <Button variant="ghost" size="sm">
            Docs
          </Button>
          <Button variant="outline" size="sm">
            Sign in
          </Button>
        </nav>
      </motion.header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-semibold tracking-tight mb-6 max-w-4xl leading-[1.1]">
            Turn ideas into
            <span className="text-copper"> reality</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Describe your vision and watch it come to life. Build production-ready web apps
            with AI-powered precision.
          </p>
        </motion.div>

        {/* Main Input */}
        <motion.form
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          onSubmit={handleSubmit}
          className="w-full max-w-3xl"
        >
          <div
            className={`
              relative rounded-[2rem] p-1 transition-all duration-300
              ${isFocused ? "glow-copper" : ""}
            `}
            style={{
              background: isFocused
                ? "rgba(201, 149, 108, 0.15)"
                : "rgba(255, 255, 255, 0.03)",
            }}
          >
            <div className="relative rounded-[1.75rem] bg-card overflow-hidden">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder="Describe the app you want to build..."
                rows={3}
                className="w-full bg-transparent px-8 pt-6 pb-4 text-lg resize-none focus:outline-none placeholder:text-muted-foreground/50"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    handleSubmit(e);
                  }
                }}
              />
              <div className="flex items-center justify-between px-6 pb-5">
                <div className="flex items-center gap-4">
                  {isHydrated && (
                    <ModelSelector
                      value={modelId}
                      onChange={setModelId}
                    />
                  )}
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    Press{" "}
                    <kbd className="px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground text-[10px] font-mono">
                      ⌘
                    </kbd>{" "}
                    +{" "}
                    <kbd className="px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground text-[10px] font-mono">
                      Enter
                    </kbd>{" "}
                    to submit
                  </span>
                </div>
                <Button
                  type="submit"
                  size="lg"
                  disabled={!prompt.trim()}
                  className="gap-2"
                >
                  Build it
                  <ArrowRight className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        </motion.form>

        {/* Example Prompts */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-8 flex flex-wrap justify-center gap-3"
        >
          {examplePrompts.map((example, i) => (
            <motion.button
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.5 + i * 0.1 }}
              onClick={() => setPrompt(example)}
              className="px-4 py-2 rounded-full bg-muted/50 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              {example}
            </motion.button>
          ))}
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full"
        >
          <FeatureCard
            icon={<Zap className="size-5" />}
            title="Lightning Fast"
            description="See your app take shape in real-time as you refine your vision."
          />
          <FeatureCard
            icon={<Layers className="size-5" />}
            title="Full Stack"
            description="Complete applications with frontend, backend, and database."
          />
          <FeatureCard
            icon={<Code2 className="size-5" />}
            title="Clean Code"
            description="Production-ready code that follows best practices."
          />
        </motion.div>
      </main>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="group p-6 rounded-3xl bg-card/50 hover:bg-card transition-colors">
      <div className="size-12 rounded-2xl bg-copper/10 flex items-center justify-center mb-4 text-copper group-hover:bg-copper/20 transition-colors">
        {icon}
      </div>
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
