# Specifications: Landing Page Premium

## 1. Hero Section
- **Visuals**: Fullscreen video background (`object-cover`), dark gradient overlay (`bg-black/75` to `bg-black/55`).
- **Content**: Logo, Headline ("Vive el Deporte Aficionado como un profesional"), Subheadline, CTA with gradient and shine hover.
- **Decor**: Primary color blobs floating behind text.

## 2. Challenge Section
- **Background**: Solid color (Zinc-950 in Dark, White in Light) with large floating blobs (Cyan, Purple, Blue).
- **Grid**: 3 columns.
- **Components**: Lucide icons in glassmorphic rounded squares.
- **Animations**: GSAP ScrollTrigger (`toggleActions: "play none none reverse"`). 
  - Text: `y: 40`, `opacity: 0 -> 1`, `power3.out`.
  - Icons: Staggered entrance with `back.out(1.2)`.

## 3. Solution Section
- **Visuals**: Immersive sports photography background with `bg-fixed bg-cover bg-center` (native parallax).
- **Overlay**: `bg-black/80`.
- **Content**: White text centered.
- **Grid**: 3 features with large, bright numbers (Cyan/Purple) in glassmorphic containers.

## 4. Features Section
- **Visuals**: Solid background, floating blobs, glassmorphic cards.
- **Hover Effects**: `scale-103`, `-translate-y-2`, glowing border, back glow.
- **Icon Animation**: `pulse-slow` on hover + color change to white.
- **Entrance**: GSAP cascaded appearance.

## 5. Local Focus Section
- **Visuals**: Photography background (fixed) with `bg-black/85` overlay.
- **Columns**:
  - Left: Inspirational text + 2 images with zoom on hover.
  - Right: Google Maps iframe in glassmorphic container with animated "pings" (pinging circles).

## 6. Registration Form
- **Fields**: Email (Required, validated), Name (Optional), Sport (Shadcn Select), Terms Checkbox.
- **Button**: Dynamic gradient + loading state.
- **Post-registration**: Success icon + Copy URL share button.
- **Integration**: Prepared for Supabase.
