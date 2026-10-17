import { Check } from "lucide-react";
import { AVATARS } from "@/lib/avatars";
import { Button } from "@/components/ui/button";

interface Props {
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}

/** Grid of fun character avatars; selection never relies on color alone. */
export function AvatarPicker({ value, onChange, disabled }: Props) {
  return (
    <div role="radiogroup" aria-label="Choose your character" className="grid grid-cols-4 gap-3">
      {AVATARS.map((a) => {
        const selected = a.id === value;
        return (
          <Button
            variant="ghost"
            key={a.id}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={a.label}
            disabled={disabled}
            onClick={() => onChange(a.id)}
            className={`relative flex h-auto aspect-square items-center justify-center rounded-full border-2 bg-leaf-soft p-0 transition-transform active:scale-95 motion-reduce:transition-none disabled:opacity-60 ${
              selected ? "border-primary ring-2 ring-primary/40" : "border-transparent"
            }`}
          >
            <img src={a.src} alt="" width={1024} height={1024} loading="lazy" className="size-full rounded-full object-cover" />
            {selected && (
              <span className="absolute -bottom-0.5 -right-0.5 flex size-6 items-center justify-center rounded-full border-2 border-card bg-primary text-primary-foreground">
                <Check className="size-3.5" aria-hidden />
              </span>
            )}
          </Button>
        );
      })}
    </div>
  );
}
