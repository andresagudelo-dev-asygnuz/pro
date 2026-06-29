import { useEffect, useState, useRef } from "react";
import { type PostWithDetails, type CommentWithDetails, getComments, addComment } from "@/lib/social/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initialsFromName, formatRelativeTime } from "@/lib/format";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";

interface PostCommentsInlineProps {
  post: PostWithDetails;
  onCommentAdded: (postId: string) => void;
}

export function PostCommentsInline({ post, onCommentAdded }: PostCommentsInlineProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<CommentWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Ref for the comments container to scroll to bottom automatically
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadComments(post.id);
  }, [post.id]);

  useEffect(() => {
    // Auto-scroll when new comments arrive
    if (comments.length > 0 && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [comments]);

  async function loadComments(postId: string) {
    setIsLoading(true);
    try {
      const data = await getComments(postId);
      // Sort oldest to newest so newest is at the bottom
      setComments(data.reverse()); 
    } catch (err) {
      console.error("Error loading comments:", err);
      toast.error("Error al cargar comentarios");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !newComment.trim() || isSubmitting) return;

    const content = newComment.trim();
    setIsSubmitting(true);

    try {
      const comment = await addComment(post.id, user.id, content);
      setComments(prev => [...prev, comment]);
      setNewComment("");
      onCommentAdded(post.id);
    } catch (err) {
      console.error("Error posting comment:", err);
      toast.error("Error al publicar el comentario");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col bg-zinc-50/50 dark:bg-zinc-950/50 border-t border-border/50">
      {/* List area with internal scroll so it doesn't take up the whole screen */}
      <div className="overflow-y-auto max-h-[40vh] p-4 flex flex-col gap-4">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center py-6">
            <Loader2 className="size-5 animate-spin text-brand-primary" />
          </div>
        ) : comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center text-muted-foreground py-4">
            <p className="text-2xl mb-2">💬</p>
            <p className="font-semibold text-xs">Sin comentarios aún</p>
            <p className="text-[10px] mt-1">Sé el primero en opinar.</p>
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex items-start gap-2.5">
              <Avatar className="size-7 shrink-0 border border-border/50">
                <AvatarImage src={comment.author.avatar_url || ""} />
                <AvatarFallback className="text-[9px]">
                  {initialsFromName(comment.author.full_name || comment.author.username || "Usuario")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 bg-card rounded-2xl rounded-tl-none p-3 border border-border/50 shadow-sm">
                <div className="flex items-baseline justify-between gap-2 mb-1">
                  <span className="font-bold text-[13px] text-foreground truncate">
                    {comment.author.full_name || comment.author.username || "Usuario"}
                  </span>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {formatRelativeTime(comment.created_at)}
                  </span>
                </div>
                <p className="text-[13px] text-foreground leading-snug whitespace-pre-wrap break-words">
                  {comment.content}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} className="h-0 shrink-0" />
      </div>

      {/* Input area */}
      <div className="p-3 bg-card border-t border-border/50 shrink-0 pb-safe">
        <form 
          onSubmit={handleSubmit}
          className="flex items-end gap-2 bg-muted/50 rounded-2xl p-1.5 border border-border/50 focus-within:ring-1 focus-within:ring-brand-primary transition-all"
        >
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Escribe un comentario..."
            className="flex-1 max-h-24 min-h-[36px] w-full resize-none bg-transparent border-0 py-2 px-2 text-[13px] focus:ring-0 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <button
            type="submit"
            disabled={!newComment.trim() || isSubmitting}
            className="size-9 shrink-0 rounded-xl bg-brand-primary text-white flex items-center justify-center disabled:opacity-50 disabled:bg-muted disabled:text-muted-foreground transition-colors hover:bg-brand-primary/90"
          >
            {isSubmitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-3.5 ml-0.5" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
