import { useRef } from "react";
import { Send, Loader2 } from "lucide-react";

interface MessageComposerProps {
  onSend: (content: string) => void;
  isLoading: boolean;
  value: string;
  onChange: (value: string) => void;
}

export function MessageComposer({ onSend, isLoading, value, onChange }: MessageComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  const handleSend = () => {
    const content = value.trim();
    if (!content) return;
    onSend(content);
    onChange("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="shrink-0 bg-white dark:bg-zinc-900 border-t border-border/50 pb-safe shadow-2xl z-20">
      <div className="flex items-end gap-3 px-4 py-4 max-w-2xl mx-auto">
        {/* Textarea container */}
        <div className="flex-1 flex items-end bg-zinc-100 dark:bg-zinc-800/80 rounded-[28px] border border-border/40 focus-within:border-brand-primary/40 focus-within:ring-4 focus-within:ring-brand-primary/10 transition-all duration-300 overflow-hidden shadow-inner">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              autoResize(e.target);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Escribí un mensaje..."
            rows={1}
            className="flex-1 resize-none bg-transparent px-5 py-3.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none max-h-[120px] overflow-y-auto leading-relaxed font-medium"
          />
        </div>

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!value.trim()}
          className="shrink-0 w-12 h-12 rounded-[22px] bg-brand-primary hover:bg-brand-primary/90 active:bg-brand-primary/80 disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed flex items-center justify-center transition-all active:scale-90 shadow-xl shadow-brand-primary/20 self-end mb-0.5"
        >
          {isLoading ? (
            <Loader2 className="size-5 text-white animate-spin" />
          ) : (
            <Send className="size-5 text-white" />
          )}
        </button>
      </div>
      <p className="text-center text-[9px] font-bold text-muted-foreground/30 uppercase tracking-[0.2em] pb-3 -mt-1">
        Pulsa enter para enviar
      </p>
    </div>
  );
}
