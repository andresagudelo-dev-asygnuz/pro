import { useState } from "react";
import { supabase } from "@/lib/supabase";

export function useImageUpload(bucket: string) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File): Promise<string | null> {
    setIsUploading(true);
    setError(null);

    const ext = file.name.split(".").pop() ?? "bin";
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, file, { upsert: false });

    if (uploadError) {
      setError(uploadError.message);
      setIsUploading(false);
      return null;
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    setIsUploading(false);
    return data.publicUrl;
  }

  return { upload, isUploading, error };
}
