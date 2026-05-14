import { Skeleton } from "@/components/ui/skeleton";

export function TournamentCardSkeleton() {
  return (
    <div className="flex items-center gap-3 p-4 border rounded-lg">
      <Skeleton className="h-12 w-12 rounded-md shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
      </div>
      <Skeleton className="h-6 w-16 rounded-full" />
    </div>
  );
}
