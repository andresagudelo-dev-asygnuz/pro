import { type PostWithDetails } from "@/lib/social/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initialsFromName, formatRelativeTime } from "@/lib/format";
import { MessageCircle, MapPin, Trash2 } from "lucide-react";
import { FistBumpButton } from "./FistBumpButton";
import { PostCommentsInline } from "./PostCommentsInline";
import { cn } from "@/lib/utils";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface PostCardProps {
  post: PostWithDetails;
  currentUserId?: string;
  onLikeToggle: (postId: string) => void;
  onCommentAdded: (postId: string) => void;
  onLocationClick?: (canchaId: string) => void;
  onDeleteClick?: (postId: string) => void;
}

export function PostCard({ post, currentUserId, onLikeToggle, onCommentAdded, onLocationClick, onDeleteClick }: PostCardProps) {
  const [showComments, setShowComments] = useState(false);

  return (
    <div className="bg-card border-y sm:border sm:rounded-2xl border-border/50 overflow-hidden mb-4 sm:mb-6 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <Avatar className="size-10 border border-border/50">
            <AvatarImage src={post.author.avatar_url || ""} />
            <AvatarFallback>{initialsFromName(post.author.full_name || post.author.username || "Jugador")}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-bold text-sm text-foreground">
              {post.author.full_name || post.author.username || "Jugador"}
            </span>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{formatRelativeTime(post.created_at)}</span>
              {post.cancha_id && (
                <>
                  <span>•</span>
                  <button 
                    onClick={() => onLocationClick && onLocationClick(post.cancha_id!)}
                    className="flex items-center gap-1 hover:text-brand-primary transition-colors font-medium"
                  >
                    <MapPin className="size-3" /> Cancha
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
        
        {currentUserId === post.author_id && onDeleteClick && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button 
                className="p-2 text-muted-foreground hover:text-destructive transition-colors rounded-full hover:bg-destructive/10"
                title="Eliminar publicación"
              >
                <Trash2 className="size-4" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar publicación?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción no se puede deshacer. Esto eliminará permanentemente la publicación y cualquier foto adjunta del Tercer Tiempo.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDeleteClick(post.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Eliminar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* Media Carousel (Simulated for 1 image for now) */}
      {post.media_urls && post.media_urls.length > 0 && (
        <div className="w-full relative bg-zinc-900 aspect-square sm:aspect-video flex items-center justify-center overflow-hidden">
          <img 
            src={post.media_urls[0]} 
            alt="Post image" 
            className="w-full h-full object-cover"
          />
          {post.media_urls.length > 1 && (
            <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-2 py-1 rounded-full text-xs font-bold text-white">
              1 / {post.media_urls.length}
            </div>
          )}
        </div>
      )}

      {/* Content & Actions */}
      <div className="p-4 pt-3 flex flex-col gap-3">
        {/* Actions */}
        <div className="flex items-center gap-4">
          <FistBumpButton 
            isLiked={post.has_liked} 
            likeCount={post.likes_count} 
            onClick={() => onLikeToggle(post.id)} 
          />
          <button 
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-full"
          >
            <MessageCircle className="size-5" />
            <span className="text-sm font-bold">{post.comments_count > 0 ? post.comments_count : "Comentar"}</span>
          </button>
        </div>

        {/* Text Content */}
        {post.content && (
          <p className="text-sm text-foreground whitespace-pre-wrap">
            <span className="font-bold mr-2">{post.author.username || post.author.full_name?.split(" ")[0]}</span>
            {post.content}
          </p>
        )}
      </div>

      {showComments && (
        <PostCommentsInline post={post} onCommentAdded={onCommentAdded} />
      )}
    </div>
  );
}
