import { Link } from "wouter";
import { type PostWithDetails } from "@/lib/social/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initialsFromName, formatRelativeTime } from "@/lib/format";
import { MessageCircle, MapPin, Trash2 } from "lucide-react";
import { FistBumpButton } from "./FistBumpButton";
import { PostCommentsInline } from "./PostCommentsInline";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
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

function FeedImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <>
      {!loaded && <div className="absolute inset-0 bg-zinc-200 dark:bg-zinc-800 animate-pulse" />}
      <img
        src={src}
        alt={alt}
        className={cn(className, !loaded && "opacity-0", "transition-opacity duration-300")}
        onLoad={() => setLoaded(true)}
      />
    </>
  );
}

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
    <div className="bg-card border-y sm:border rounded-none sm:rounded-xl border-border/50 overflow-hidden flex flex-col shadow-sm mx-0">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <Link href={`/profile/${post.author_id}`}>
            <Avatar className="size-10 border border-border/50 cursor-pointer hover:opacity-80 transition-opacity">
              <AvatarImage src={post.author.avatar_url || ""} />
              <AvatarFallback>{initialsFromName(post.author.full_name || post.author.username || "Jugador")}</AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex flex-col">
            <Link href={`/profile/${post.author_id}`}>
              <span className="font-bold text-sm text-foreground hover:underline cursor-pointer">
                {post.author.full_name || post.author.username || "Jugador"}
              </span>
            </Link>
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

      {/* Media Gallery */}
      {post.media_urls && post.media_urls.length > 0 && (
        <div className="w-full relative border-y sm:border-y-0 border-border/50">
          {post.media_urls.length === 1 ? (
            <div className="aspect-square sm:aspect-video flex items-center justify-center overflow-hidden relative">
              <FeedImage 
                src={post.media_urls[0]} 
                alt="Post image" 
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <Carousel className="w-full">
              <CarouselContent>
                {post.media_urls.map((url, i) => (
                  <CarouselItem key={i}>
                    <div className="w-full aspect-square sm:aspect-video flex items-center justify-center overflow-hidden relative">
                      <FeedImage 
                        src={url} 
                        alt={`Post image ${i + 1}`} 
                        className="w-full h-full object-cover pointer-events-none"
                      />
                      <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-2 py-1 rounded-full text-xs font-bold text-white z-10">
                        {i + 1} / {post.media_urls!.length}
                      </div>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 text-white border-none size-8 flex" />
              <CarouselNext className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 text-white border-none size-8 flex" />
            </Carousel>
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
            <Link href={`/profile/${post.author_id}`}>
              <span className="font-bold mr-2 hover:underline cursor-pointer">{post.author.username || post.author.full_name?.split(" ")[0]}</span>
            </Link>
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
