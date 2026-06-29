import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { uploadFile } from "@/lib/storage/api";

export function useImageUpload(bucket: string) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File): Promise<string | null> {
    setIsUploading(true);
    setError(null);

    const ext = file.name.split(".").pop() ?? "bin";
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { url, error: uploadError } = await uploadFile(supabase, bucket, path, file, { upsert: false });

    if (uploadError) {
      setError(uploadError);
      setIsUploading(false);
      return null;
    }

    setIsUploading(false);
    return url;
  }

  return { upload, isUploading, error };
}
