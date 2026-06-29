import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { getFeedMatches, type FeedFilters, type FeedMatch } from "@/lib/feed/api";

export function useFeedData(filters: FeedFilters = {}) {
  const query = useInfiniteQuery({
    queryKey: ["feed", filters],
    queryFn: async ({ pageParam }) => {
      const result = await getFeedMatches(supabase, filters, {
        cursor: pageParam as string | undefined,
      });
      if (result.error) throw new Error(result.error);
      return result;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  const matches: FeedMatch[] = query.data?.pages.flatMap((p) => p.data ?? []) ?? [];

  return {
    matches,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    error: query.error ? (query.error as Error).message : null,
  };
}
