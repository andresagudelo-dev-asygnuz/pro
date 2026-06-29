import { useEffect, useRef } from "react";

interface InfiniteScrollSentinelProps {
  onIntersect: () => void;
  enabled: boolean;
}

export function InfiniteScrollSentinel({ onIntersect, enabled }: InfiniteScrollSentinelProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && enabled) {
          onIntersect();
        }
      },
      { rootMargin: "200px", threshold: 0 }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, [onIntersect, enabled]);

  return <div ref={sentinelRef} />;
}
