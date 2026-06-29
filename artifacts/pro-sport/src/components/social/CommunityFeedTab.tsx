import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { getGlobalFeed, toggleFistBump, createPost, deletePost, type PostWithDetails } from "@/lib/social/api";
import { FeedLayout } from "@/components/social/FeedLayout";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { uploadFile } from "@/lib/storage/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ImageIcon, X } from "lucide-react";

export function CommunityFeedTab() {
  const { user, profile } = useAuth();
  const [, setLocation] = useLocation();
  const [posts, setPosts] = useState<PostWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newPostContent, setNewPostContent] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const loadFeed = async () => {
    if (!profile) {
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const data = await getGlobalFeed(profile.id);
      setPosts(data);
    } catch (err) {
      console.error("Error loading feed:", err);
      toast.error("Error al cargar el feed");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFeed();
  }, [profile]);

  const handleLikeToggle = async (postId: string) => {
    if (!profile) return;
    
    setPosts(current => current.map(p => {
      if (p.id === postId) {
        const isNowLiked = !p.has_liked;
        return {
          ...p,
          has_liked: isNowLiked,
          likes_count: isNowLiked ? p.likes_count + 1 : Math.max(0, p.likes_count - 1)
        };
      }
      return p;
    }));

    try {
      await toggleFistBump(postId, profile.id);
    } catch (err) {
      console.error("Error toggling like:", err);
      loadFeed();
    }
  };

  const handleCommentAdded = (postId: string) => {
    setPosts(current => current.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          comments_count: p.comments_count + 1
        };
      }
      return p;
    }));
  };

  const handleLocationClick = (canchaId: string) => {
    setLocation(`/canchas/${canchaId}`);
  };

  const handleDeletePost = async (postId: string) => {
    if (!user) return;

    try {
      await deletePost(postId, user.id);
      toast.success("Publicación eliminada correctamente");
      setPosts(current => current.filter(p => p.id !== postId));
    } catch (err: unknown) {
      console.error("Error deleting post:", err);
      toast.error(err instanceof Error ? err.message : "Error al eliminar la publicación");
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("La imagen no debe superar los 10MB");
        return;
      }
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePublish = async () => {
    if (!profile || !user) {
      toast.error("Configura tu perfil para poder publicar.");
      return;
    }
    if (!newPostContent.trim() && !selectedImage) return;
    
    try {
      setIsPublishing(true);
      let mediaUrls: string[] = [];

      if (selectedImage) {
        const fileExt = selectedImage.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;

        const { url: publicUrl, error: uploadError } = await uploadFile(supabase, "post_media", fileName, selectedImage);

        if (uploadError) throw new Error(uploadError);
        if (publicUrl) mediaUrls.push(publicUrl);
      }

      await createPost(user.id, newPostContent.trim(), mediaUrls);
      toast.success("¡Publicado en el Tercer Tiempo! ⚡");
      
      setNewPostContent("");
      clearImage();
      loadFeed();
    } catch (err) {
      console.error("Publish error", err);
      toast.error("Error al publicar. Revisa tu conexión.");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="pt-4 px-4 sm:px-0">
      <div className="max-w-xl mx-auto mb-4">
        <h2 className="font-black text-xl text-foreground mb-4">El Tercer Tiempo</h2>
        
        <div className="bg-card border border-border p-4 rounded-xl mb-6 shadow-sm">
          <Textarea 
            placeholder="¿Qué pasó en la cancha hoy? ⚽🔥" 
            className="mb-3 resize-none bg-background border-border"
            rows={3}
            value={newPostContent}
            onChange={(e) => setNewPostContent(e.target.value)}
          />
          
          {imagePreview && (
            <div className="relative mb-3 rounded-lg overflow-hidden border border-border max-w-sm">
              <img src={imagePreview} alt="Preview" className="w-full h-auto object-cover max-h-64" />
              <button 
                onClick={clearImage}
                className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full hover:bg-black/70 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex justify-between items-center mt-2">
            <div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageSelect} 
                accept="image/*" 
                className="hidden" 
              />
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-muted-foreground hover:text-primary px-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImageIcon className="w-5 h-5 mr-1" />
                <span className="text-sm">Foto</span>
              </Button>
            </div>
            
            <Button 
              onClick={handlePublish} 
              disabled={(!newPostContent.trim() && !selectedImage) || isPublishing}
              className="bg-primary hover:bg-primary/90 font-bold"
            >
              {isPublishing ? "Publicando..." : "Publicar ⚡"}
            </Button>
          </div>
        </div>
      </div>

      <FeedLayout 
        posts={posts}
        currentUserId={user?.id}
        isLoading={isLoading}
        onLikeToggle={handleLikeToggle}
        onCommentAdded={handleCommentAdded}
        onLocationClick={handleLocationClick}
        onDeleteClick={handleDeletePost}
      />
    </div>
  );
}
