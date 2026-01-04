"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  MODELS,
  DEFAULT_MODEL_ID,
  type ModelId,
  type ModelConfig,
  isValidModelId,
} from "@/lib/models";

const STORAGE_KEY = "ai-model";

interface ModelSelectorProps {
  value: ModelId;
  onChange: (modelId: ModelId) => void;
  disabled?: boolean;
  className?: string;
}

export function ModelSelector({
  value,
  onChange,
  disabled = false,
  className,
}: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedModel = MODELS.find((m) => m.id === value) || MODELS[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  const handleSelect = (model: ModelConfig) => {
    onChange(model.id as ModelId);
    setIsOpen(false);
  };

  const Icon = selectedModel.icon;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all duration-200",
          "bg-muted/50 hover:bg-muted/80 border border-border/50",
          "focus:outline-none focus:ring-2 focus:ring-copper/30",
          disabled && "opacity-50 cursor-not-allowed",
          isOpen && "bg-muted/80 ring-2 ring-copper/30"
        )}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <Icon className="size-3.5 text-copper shrink-0" />
        <span className="truncate max-w-[100px]">{selectedModel.name}</span>
        <ChevronDown
          className={cn(
            "size-3 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div
          className={cn(
            "absolute bottom-full left-0 mb-2 w-56 z-50",
            "bg-card border border-border rounded-xl shadow-lg overflow-hidden",
            "animate-in fade-in-0 slide-in-from-bottom-2 duration-200"
          )}
          role="listbox"
        >
          <div className="p-1.5">
            {MODELS.map((model) => {
              const ModelIcon = model.icon;
              const isSelected = model.id === value;

              return (
                <button
                  key={model.id}
                  type="button"
                  onClick={() => handleSelect(model)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                    "hover:bg-muted/50",
                    isSelected && "bg-copper/10"
                  )}
                  role="option"
                  aria-selected={isSelected}
                >
                  <div
                    className={cn(
                      "size-8 rounded-lg flex items-center justify-center shrink-0",
                      isSelected ? "bg-copper/20" : "bg-muted/50"
                    )}
                  >
                    <ModelIcon
                      className={cn(
                        "size-4",
                        isSelected ? "text-copper" : "text-muted-foreground"
                      )}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className={cn(
                        "text-sm font-medium",
                        isSelected && "text-copper"
                      )}
                    >
                      {model.name}
                    </div>
                    {model.description && (
                      <div className="text-xs text-muted-foreground truncate">
                        {model.description}
                      </div>
                    )}
                  </div>
                  {isSelected && (
                    <div className="size-1.5 rounded-full bg-copper shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Hook for model selection with localStorage persistence
export function useModelSelection() {
  const [modelId, setModelId] = useState<ModelId>(DEFAULT_MODEL_ID);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && isValidModelId(stored)) {
      setModelId(stored);
    }
    setIsHydrated(true);
  }, []);

  // Save to localStorage on change
  const setModel = (id: ModelId) => {
    setModelId(id);
    localStorage.setItem(STORAGE_KEY, id);
  };

  return {
    modelId,
    setModelId: setModel,
    isHydrated,
    model: MODELS.find((m) => m.id === modelId) || MODELS[0],
  };
}
