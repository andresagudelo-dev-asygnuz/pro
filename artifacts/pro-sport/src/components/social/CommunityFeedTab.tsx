import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { getGlobalFeed, toggleFistBump, createPost, deletePost, type PostWithDetails } from "@/lib/social/api";
import { FeedLayout } from "@/components/social/FeedLayout";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { uploadFile } from "@/lib/storage/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initialsFromName } from "@/lib/format";
import { ImageIcon, X, Send } from "lucide-react";

export function CommunityFeedTab() {
  const { user, profile } = useAuth();
  const [, setLocation] = useLocation();
  const [posts, setPosts] = useState<PostWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newPostContent, setNewPostContent] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

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
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (selectedImages.length + files.length > 4) {
      toast.error("Máximo 4 fotos por publicación");
      return;
    }

    const validFiles = files.filter((file) => {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`La imagen ${file.name} supera los 10MB`);
        return false;
      }
      return true;
    });

    if (validFiles.length > 0) {
      setSelectedImages((prev) => [...prev, ...validFiles]);
      validFiles.forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreviews((prev) => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const clearImages = () => {
    setSelectedImages([]);
    setImagePreviews([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePublish = async () => {
    if (!profile || !user) {
      toast.error("Configura tu perfil para poder publicar.");
      return;
    }
    if (!newPostContent.trim() && selectedImages.length === 0) return;
    
    try {
      setIsPublishing(true);
      let mediaUrls: string[] = [];

      if (selectedImages.length > 0) {
        const uploadPromises = selectedImages.map(async (file) => {
          const fileExt = file.name.split('.').pop();
          const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
          const { url: publicUrl, error: uploadError } = await uploadFile(supabase, "post_media", fileName, file);
          if (uploadError) throw new Error(uploadError);
          return publicUrl;
        });

        const urls = await Promise.all(uploadPromises);
        mediaUrls = urls.filter((url): url is string => !!url);
      }

      await createPost(user.id, newPostContent.trim(), mediaUrls);
      toast.success("¡Publicado en el Tercer Tiempo! ⚡");
      
      setNewPostContent("");
      clearImages();
      loadFeed();
    } catch (err) {
      console.error("Publish error", err);
      toast.error("Error al publicar. Revisa tu conexión.");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="pt-0 px-0 sm:px-4">
      {/* Sticky top container for the publish box */}
      <div className="sticky top-[112px] z-30 bg-white dark:bg-zinc-900 pb-3 px-4 border-b border-border/50 shadow-sm mb-2 sm:mb-4">
        <div className="w-full mx-auto sm:max-w-xl">
          <div className="bg-white dark:bg-zinc-900 p-0">
            <div className="flex items-center gap-2 sm:gap-3">
              <Avatar className="size-9 shrink-0">
                <AvatarImage src={profile?.avatar_url || ""} />
                <AvatarFallback>{initialsFromName(profile?.full_name || profile?.username || "U")}</AvatarFallback>
              </Avatar>
              
              <Input 
                placeholder={`¿Qué pasó hoy en la cancha, ${profile?.full_name?.split(" ")[0] || "Crack"}?`}
                className="flex-1 rounded-full bg-muted border-none h-10 px-4 text-sm focus-visible:ring-1"
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handlePublish();
                  }
                }}
              />

              <div className="flex items-center shrink-0 pr-1">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageSelect} 
                  accept="image/*" 
                  multiple
                  className="hidden" 
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={selectedImages.length >= 4}
                  className="p-2 text-green-500 hover:bg-green-50 dark:hover:bg-green-950 rounded-full transition-colors disabled:opacity-50"
                  title="Añadir fotos"
                >
                  <ImageIcon className="w-6 h-6" />
                </button>

                {(newPostContent.trim() || selectedImages.length > 0) && (
                  <button 
                    onClick={handlePublish}
                    disabled={isPublishing}
                    className="p-2 text-primary hover:bg-primary/10 rounded-full transition-colors ml-1"
                    title="Publicar"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            {/* Image Previews */}
            {imagePreviews.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mt-3 px-2 pb-2">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="relative rounded-lg overflow-hidden border border-border aspect-square sm:aspect-video">
                    <img src={preview} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                    <button 
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 bg-black/60 backdrop-blur-sm text-white p-1 rounded-full hover:bg-black/80 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
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
