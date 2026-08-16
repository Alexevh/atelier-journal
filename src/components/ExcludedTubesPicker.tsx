import { Ban, X } from "lucide-react";
import { rgbToHex } from "@/lib/color";
import { isEnabled, type Pigment } from "@/lib/pigments";
import {
  useExcludedTubes,
  addExcludedTube,
  removeExcludedTube,
} from "@/hooks/useExcludedTubes";
import { useT } from "@/lib/i18n";

// Opt-in excluded tubes: pick tubes to keep OUT of every suggestion. Offers
// from the full ENABLED palette (`allPigments`) — not the post-exclusion set —
// so already-excluded tubes still appear as removable pills. Empty = no-op.
export function ExcludedTubesPicker({ allPigments }: { allPigments: Pigment[] }) {
  const { t } = useT();
  const excluded = useExcludedTubes();
  const enabled = allPigments.filter(isEnabled);
  // Only ids present in the ACTIVE palette count (stale ids stay stored, inert).
  const active = excluded.filter((id) => enabled.some((p) => p.id === id));
  const choices = enabled.filter((p) => !active.includes(p.id));

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="flex items-center gap-1.5 text-xs text-muted-foreground"
          title={t("excluded.hint")}
        >
          <Ban className="h-3.5 w-3.5 text-accent" /> {t("excluded.title")}
        </span>
        <select
          value=""
          onChange={(e) => {
            if (e.target.value) addExcludedTube(e.target.value);
            e.target.value = "";
          }}
          className="h-7 rounded-md border border-input bg-background px-2 text-xs"
          aria-label={t("excluded.title")}
        >
          <option value="">{t("excluded.add")}</option>
          {choices.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        {active.map((id) => {
          const p = enabled.find((x) => x.id === id)!;
          return (
            <span
              key={id}
              className="flex items-center gap-1.5 rounded-full border border-border bg-secondary py-0.5 pl-1.5 pr-1 text-xs line-through decoration-muted-foreground/60"
            >
              <span
                className="h-3.5 w-3.5 rounded-full border border-border/60"
                style={{ backgroundColor: rgbToHex(p.rgb) }}
              />
              {p.name}
              <button
                onClick={() => removeExcludedTube(id)}
                className="rounded-full p-0.5 text-muted-foreground hover:bg-background hover:text-foreground"
                aria-label={`remove ${p.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          );
        })}
      </div>
      {active.length > 0 && (
        <p className="text-[11px] text-muted-foreground">{t("excluded.note")}</p>
      )}
    </div>
  );
}
