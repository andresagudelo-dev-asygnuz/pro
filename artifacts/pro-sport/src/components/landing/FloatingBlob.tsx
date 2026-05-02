import { cn } from "@/lib/utils";

interface FloatingBlobProps {
  color?: string;
  size?: string;
  className?: string;
  delay?: number;
}

export function FloatingBlob({
  color = "bg-brand-primary",
  size = "w-72 h-72",
  className,
  delay = 0,
}: FloatingBlobProps) {
  return (
    <div
      className={cn(
        "absolute rounded-full blur-[100px] opacity-20 animate-float pointer-events-none",
        color,
        size,
        className
      )}
      style={{ animationDelay: `${delay}s` }}
    />
  );
}
