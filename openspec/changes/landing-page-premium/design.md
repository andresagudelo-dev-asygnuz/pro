# Design System & Visuals

## Color Palette (Tailwind v4 Variables)
- **Primary**: #6B46C1 (Purple) -> `var(--color-primary)`
- **Accent**: #9F7AEA / #b794f4 (Light Purple) -> `var(--color-accent)`
- **Secondary**: #00B5D8 / #64ffda (Cyan/Blue) -> `var(--color-secondary)`
- **Dark BG**: #0A0A0A / Zinc-950
- **Light BG**: White

## Effects
- **Blobs**: 
  - `blur-[100px]`, `rounded-full`, 10-20% opacity.
  - Animation: `.animate-float` (12s cycle: translate, scale, opacity).
- **Glassmorphism**:
  - `backdrop-blur-md`, `bg-white/10` (Dark) / `bg-black/5` (Light), `border border-white/20`.

## Typography
- Headline: Large, bold, with text-shadow.
- Body: Minimalist, clean sans-serif.
