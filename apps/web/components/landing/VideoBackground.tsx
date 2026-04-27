import { cn } from "@/lib/utils"

interface VideoBackgroundProps {
  src: string
  poster?: string
  overlayClassName?: string
}

export function VideoBackground({ src, poster, overlayClassName }: VideoBackgroundProps) {
  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden z-0 bg-black">
      <video
        autoPlay
        loop
        muted
        playsInline
        poster={poster || "https://images.unsplash.com/photo-1541252260730-0412e8e2108e?q=80&w=2000"}
        className="object-cover w-full h-full opacity-30 grayscale-[50%] blur-[2px]"
      >
        <source src={src} type="video/mp4" />
      </video>
      <div 
        className={cn(
          "absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-black/90", 
          overlayClassName
        )} 
      />
    </div>
  )
}
