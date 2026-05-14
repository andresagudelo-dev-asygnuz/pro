import { Skeleton } from "@/components/ui/skeleton";

export function MatchCardSkeleton() {
  return (
    <div className="p-4 border rounded-lg space-y-2">
      <div className="flex justify-between">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-4 w-16" />
      </div>
      <Skeleton className="h-3 w-2/3" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}
