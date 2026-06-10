import { supabase } from "@/lib/supabase";
import { type Post, type PostLike, type PostComment, type Profile } from "@/lib/types/db";

export type PostWithDetails = Post & {
  author: Profile;
  likes_count: number;
  comments_count: number;
  has_liked: boolean;
};

export type CommentWithDetails = PostComment & {
  author: Profile;
};

export async function getGlobalFeed(userId: string, limit = 20): Promise<PostWithDetails[]> {
  const { data, error } = await supabase
    .from("posts")
    .select(`
      *,
      author:profiles!author_id(*),
      likes:post_likes(count),
      comments:post_comments(count),
      user_like:post_likes!left(id)
    `)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return data.map((post: any) => ({
    ...post,
    likes_count: post.likes[0]?.count || 0,
    comments_count: post.comments[0]?.count || 0,
    // Since we can't easily filter the join by user_id in the standard select without an RPC,
    // we fetch user_likes by querying the post_likes table directly or we can just fetch if there's any like from this user.
    // A simpler approach for the prototype is checking if user_like array has elements if we pass eq('user_id', userId).
    // Let's assume user_like holds likes for the post. We map it below.
    has_liked: post.user_like?.some((like: any) => like.user_id === userId) || false,
  }));
}

export async function toggleFistBump(postId: string, userId: string): Promise<boolean> {
  // Check if liked
  const { data: existingLike } = await supabase
    .from("post_likes")
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existingLike) {
    // Remove like
    await supabase.from("post_likes").delete().eq("id", existingLike.id);
    return false; // Now unliked
  } else {
    // Add like
    await supabase.from("post_likes").insert({ post_id: postId, user_id: userId });
    return true; // Now liked
  }
}

export async function createPost(
  authorId: string,
  content: string,
  mediaUrls: string[],
  matchId?: string,
  canchaId?: string
): Promise<Post> {
  const { data, error } = await supabase
    .from("posts")
    .insert({
      author_id: authorId,
      content,
      media_urls: mediaUrls,
      match_id: matchId || null,
      cancha_id: canchaId || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getComments(postId: string): Promise<CommentWithDetails[]> {
  const { data, error } = await supabase
    .from("post_comments")
    .select(`
      *,
      author:profiles!author_id(*)
    `)
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data;
}

export async function addComment(postId: string, authorId: string, content: string): Promise<CommentWithDetails> {
  const { data, error } = await supabase
    .from("post_comments")
    .insert({
      post_id: postId,
      author_id: authorId,
      content,
    })
    .select(`
      *,
      author:profiles!author_id(*)
    `)
    .single();

  if (error) throw error;
  return data;
}

export async function deletePost(postId: string, currentUserId: string): Promise<void> {
  // First, verify the post belongs to the user and get media URLs
  const { data: post, error: fetchError } = await supabase
    .from("posts")
    .select("author_id, media_urls")
    .eq("id", postId)
    .single();

  if (fetchError) throw fetchError;
  if (!post) throw new Error("Post no encontrado");
  if (post.author_id !== currentUserId) throw new Error("No tienes permisos para eliminar este post");

  // Delete media from bucket if any
  if (post.media_urls && post.media_urls.length > 0) {
    const pathsToDelete = post.media_urls.map((url: string) => {
      // Extract the path after /post_media/
      const parts = url.split('/post_media/');
      return parts.length > 1 ? parts[1] : null;
    }).filter(Boolean) as string[];

    if (pathsToDelete.length > 0) {
      await supabase.storage.from("post_media").remove(pathsToDelete);
    }
  }

  // Delete the post from the database
  const { error: deleteError } = await supabase
    .from("posts")
    .delete()
    .eq("id", postId);

  if (deleteError) throw deleteError;
}
