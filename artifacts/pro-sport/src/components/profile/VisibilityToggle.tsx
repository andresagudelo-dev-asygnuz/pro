import { VISIBILITY_LEVELS } from "@/lib/types/db";
import type { VisibilityLevel } from "@/lib/types/db";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface Props {
  value: VisibilityLevel;
  onChange: (level: VisibilityLevel) => void;
  disabled?: boolean;
}

export function VisibilityToggle({ value, onChange, disabled }: Props) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs text-muted-foreground">Visibilidad</Label>
      <Select value={value} onValueChange={(v) => onChange(v as VisibilityLevel)} disabled={disabled}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {VISIBILITY_LEVELS.map((lvl) => (
            <SelectItem key={lvl.value} value={lvl.value}>
              <span className="font-medium">{lvl.label}</span>
              <span className="ml-2 text-xs text-muted-foreground">{lvl.description}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
