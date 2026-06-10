import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface FistBumpButtonProps {
  isLiked: boolean;
  likeCount: number;
  onClick: () => void;
  className?: string;
}

export function FistBumpButton({ isLiked, likeCount, onClick, className }: FistBumpButtonProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleClick = () => {
    if (!isLiked) {
      setIsAnimating(true);
      // Haptic feedback for mobile
      if (typeof window !== "undefined" && window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate([50, 50, 50]); // double pop
      }
    }
    onClick();
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "flex items-center gap-1.5 transition-colors p-1.5 rounded-full",
        isLiked ? "text-brand-primary" : "text-muted-foreground hover:text-foreground",
        className
      )}
    >
      <motion.div
        animate={isAnimating ? { scale: [1, 1.4, 0.9, 1] } : { scale: 1 }}
        transition={{ duration: 0.4 }}
        onAnimationComplete={() => setIsAnimating(false)}
      >
        <span className="text-xl leading-none block mt-[-2px]">
          {isLiked ? "🤜🤛" : "👊"}
        </span>
      </motion.div>
      <span className="text-sm font-bold">{likeCount > 0 ? likeCount : "Puñito"}</span>
    </button>
  );
}
