import { Check, X, Loader2 } from "lucide-react";

/** Generate hero gradient from a single accent color */
function heroGradient(hex: string): string {
  const c = hex.replace("#", "");
  const n = parseInt(c.length === 3 ? c.split("").map((x) => x + x).join("") : c, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const dark = `rgba(${Math.round(r * 0.2)},${Math.round(g * 0.2)},${Math.round(b * 0.2)},1)`;
  const mid  = `rgba(${Math.round(r * 0.6)},${Math.round(g * 0.6)},${Math.round(b * 0.6)},1)`;
  return `linear-gradient(160deg, ${dark} 0%, ${mid} 40%, ${hex} 70%, ${dark} 100%)`;
}

function JerseyIcon({ color, size = 32 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M11 3L4 8l3 4 2-1v15h14V11l2 1 3-4-7-5c0 2-2 4-5 4s-5-2-5-4z"
        fill={color}
        stroke="rgba(255,255,255,0.3)"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface TeamColorPanelProps {
  draftHeader: string;
  draftJersey: string;
  savingColors: boolean;
  onHeaderChange: (color: string) => void;
  onJerseyChange: (color: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function TeamColorPanel({
  draftHeader,
  draftJersey,
  savingColors,
  onHeaderChange,
  onJerseyChange,
  onSave,
  onCancel,
}: TeamColorPanelProps) {
  return (
    <div className="w-full max-w-xs mb-5 bg-black/30 backdrop-blur-md rounded-2xl border border-white/15 p-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-3 text-center">Personalizar equipo</p>

      <div className="space-y-3">
        {/* Header color */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg border border-white/20 overflow-hidden cursor-pointer shadow-md relative">
              <input
                type="color"
                value={draftHeader}
                onChange={(e) => onHeaderChange(e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="w-full h-full rounded-lg" style={{ backgroundColor: draftHeader }} />
            </div>
            <span className="text-xs font-semibold text-white/80">Color del header</span>
          </div>
          <span className="text-[10px] font-mono text-white/40">{draftHeader}</span>
        </div>

        {/* Jersey color */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg border border-white/20 overflow-hidden cursor-pointer shadow-md relative">
              <input
                type="color"
                value={draftJersey}
                onChange={(e) => onJerseyChange(e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="w-full h-full rounded-lg" style={{ backgroundColor: draftJersey }} />
            </div>
            <span className="text-xs font-semibold text-white/80">Color de camiseta</span>
          </div>
          <JerseyIcon color={draftJersey} size={28} />
        </div>

        {/* Preview hint */}
        <div className="rounded-lg overflow-hidden h-3" style={{ background: heroGradient(draftHeader) }} />
      </div>

      <div className="flex gap-2 mt-4">
        <button
          onClick={onCancel}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white/10 text-white/70 text-xs font-semibold hover:bg-white/15 transition-colors"
        >
          <X className="size-3.5" /> Cancelar
        </button>
        <button
          onClick={onSave}
          disabled={savingColors}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white/20 text-white text-xs font-bold hover:bg-white/30 transition-colors"
        >
          {savingColors ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
          Guardar
        </button>
      </div>
    </div>
  );
}
