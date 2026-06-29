import { Skeleton } from "@/components/ui/skeleton";

export function AgendaDaySkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex gap-2 items-center p-2 border rounded-md">
          <Skeleton className="h-8 w-14 shrink-0" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
