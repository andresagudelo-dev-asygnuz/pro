import { Skeleton } from "@/components/ui/skeleton";

export function BookingCardSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 border rounded-md">
      <Skeleton className="h-8 w-12 shrink-0" />
      <div className="flex-1 space-y-1">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-3 w-1/4" />
      </div>
      <Skeleton className="h-5 w-16 rounded-full" />
    </div>
  );
}
