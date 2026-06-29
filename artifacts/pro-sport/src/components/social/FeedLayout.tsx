import { PostCard } from "./PostCard";
import { type PostWithDetails } from "@/lib/social/api";
import { Loader2 } from "lucide-react";

interface FeedLayoutProps {
  posts: PostWithDetails[];
  currentUserId?: string;
  isLoading: boolean;
  onLikeToggle: (postId: string) => void;
  onCommentAdded: (postId: string) => void;
  onLocationClick?: (canchaId: string) => void;
  onDeleteClick?: (postId: string) => void;
}

export function FeedLayout({ posts, currentUserId, isLoading, onLikeToggle, onCommentAdded, onLocationClick, onDeleteClick }: FeedLayoutProps) {
  if (isLoading) {
    return (
      <div className="w-full flex items-center justify-center py-12">
        <Loader2 className="size-8 text-brand-primary animate-spin" />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="w-full flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="text-6xl mb-4">🏟️</div>
        <h3 className="text-xl font-black text-foreground mb-2">Aún no hay publicaciones</h3>
        <p className="text-muted-foreground text-sm max-w-sm">
          Sé el primero en subir una foto y compartir la emoción del partido.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto pb-20">
      {posts.map(post => (
        <PostCard 
          key={post.id} 
          post={post} 
          currentUserId={currentUserId}
          onLikeToggle={onLikeToggle}
          onCommentAdded={onCommentAdded}
          onLocationClick={onLocationClick}
          onDeleteClick={onDeleteClick}
        />
      ))}
    </div>
  );
}
