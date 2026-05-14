import { Skeleton } from "@/components/ui/skeleton";

export function FeedPostSkeleton() {
  return (
    <div className="flex gap-3 p-4 border rounded-lg">
      <Skeleton className="h-10 w-10 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}
