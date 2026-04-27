"use client";

import { cn } from "@/lib/utils";

export function FloatingBlobs({ className }: { className?: string }) {
  return (
    <div className={cn("absolute inset-0 overflow-hidden pointer-events-none", className)}>
      <div
        className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[100px] animate-float"
        style={{ animationDelay: '0s' }}
      />
      <div
        className="absolute top-[20%] right-[-5%] w-[35%] h-[35%] rounded-full bg-secondary/20 blur-[100px] animate-float"
        style={{ animationDelay: '2s' }}
      />
      <div
        className="absolute bottom-[10%] left-[15%] w-[30%] h-[30%] rounded-full bg-accent/20 blur-[100px] animate-float"
        style={{ animationDelay: '4s' }}
      />
    </div>
  );
}
