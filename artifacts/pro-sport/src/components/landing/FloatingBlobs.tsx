import { cn } from "@/lib/utils";

export function FloatingBlobs({ className }: { className?: string }) {
  return (
    <div className={cn("absolute inset-0 overflow-hidden pointer-events-none", className)}>
      <div
        className="absolute top-[10%] left-[10%] w-[300px] h-[300px] rounded-full bg-[#6B46C1]/20 blur-[80px] animate-float"
        style={{ animationDelay: "0s" }}
      />
      <div
        className="absolute top-[40%] right-[10%] w-[250px] h-[250px] rounded-full bg-[#00B5D8]/20 blur-[80px] animate-float"
        style={{ animationDelay: "2s" }}
      />
      <div
        className="absolute bottom-[20%] left-[20%] w-[200px] h-[200px] rounded-full bg-[#9F7AEA]/20 blur-[80px] animate-float"
        style={{ animationDelay: "4s" }}
      />
    </div>
  );
}
