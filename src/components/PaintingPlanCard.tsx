import { useMemo, useState } from "react";
import { Layers, Palette as PaletteIcon, Sparkles } from "lucide-react";
import { rgbToHex, rgbToLab, labToRgb, type RGB } from "@/lib/color";
import { generateRecipe } from "@/lib/mixer";
import { PALETTE_PRESETS, type Palette, type Pigment } from "@/lib/pigments";
import { useT } from "@/lib/i18n";
import { useTargetColor } from "@/hooks/useTargetColor";
import { useMixEngine } from "@/hooks/useMixEngine";
import { useRecipeMode } from "@/hooks/useRecipeMode";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// The curated master/limited palettes to rank for "best palette for this colour".
const MASTER_IDS = new Set([
  "zorn",
  "waddell",
  "waddell-limited",
  "waddell-extended",
  "sargent",
  "velazquez",
  "caravaggio",
  "rembrandt",
]);

// A compact recipe string: the structural pigments only (drop tiny touches).
function shortRecipe(items: { pigment: Pigment; weight: number }[]): string {
  return items
    .filter((it) => it.weight >= 0.06)
    .slice(0, 4)
    .map((it) => `${Math.round(it.weight * 100)}% ${it.pigment.name.replace(/\s*\(.*\)$/, "")}`)
    .join(" + ");
}

/**
 * Painting-plan analysis for the current target:
 *  • a light / mid / shadow VALUE TRIAD (the value structure of the form), each
 *    with its own recipe on the current palette;
 *  • a "best palette for this colour" ranking of the master limited palettes,
 *    with one-click switch.
 */
export function PaintingPlanCard({
  pigments,
  onUsePalette,
}: {
  pigments: Pigment[];
  onUsePalette: (make: () => Palette, name: string) => void;
}) {
  const { t } = useT();
  const target = useTargetColor();
  const engine = useMixEngine();
  const mode = useRecipeMode();
  const [ranking, setRanking] = useState<{ name: string; match: number; make: () => Palette }[] | null>(null);

  // light / mid / shadow built by shifting value (L*) in Lab, easing chroma at
  // the extremes the way a painter does (lights a touch less saturated, shadows
  // slightly muted). Mid is the picked colour itself.
  const triad = useMemo(() => {
    const lab = rgbToLab(target);
    const light: RGB = labToRgb({ L: Math.min(95, lab.L + 18), a: lab.a * 0.8, b: lab.b * 0.85 });
    const shadow: RGB = labToRgb({ L: Math.max(10, lab.L - 24), a: lab.a * 0.92, b: lab.b * 0.9 });
    return [
      { key: "light", rgb: light },
      { key: "mid", rgb: target },
      { key: "shadow", rgb: shadow },
    ] as const;
  }, [target]);

  const triadRecipes = useMemo(
    () =>
      triad.map((step) => {
        const r = generateRecipe(step.rgb, pigments, mode, engine, {});
        return { ...step, recipe: shortRecipe(r.items), L: Math.round(rgbToLab(step.rgb).L) };
      }),
    [triad, pigments, mode, engine]
  );

  const suggestPalettes = () => {
    const masters = PALETTE_PRESETS.filter((p) => MASTER_IDS.has(p.id));
    const scored = masters.map((p) => {
      const r = generateRecipe(target, p.make().pigments, "simple", engine, {});
      return { name: p.name, match: r.match, make: p.make };
    });
    scored.sort((a, b) => b.match - a.match);
    setRanking(scored.slice(0, 3));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 normal-case tracking-normal text-foreground">
          <Layers className="h-4 w-4 text-accent" />
          {t("paintPlan.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* value triad */}
        <div>
          <p className="mb-2 text-[11px] uppercase tracking-wide text-muted-foreground">
            {t("paintPlan.values")}
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            {triadRecipes.map((step) => (
              <div key={step.key} className="rounded-lg border border-border/50 p-2">
                <div
                  className="mb-1 h-12 w-full rounded border border-border/40"
                  style={{ backgroundColor: rgbToHex(step.rgb) }}
                />
                <p className="text-xs font-medium text-foreground/90">
                  {t(`paintPlan.${step.key}`)}{" "}
                  <span className="text-muted-foreground">· {t("compareColors.value")} {step.L}</span>
                </p>
                <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                  {step.recipe || rgbToHex(step.rgb)}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">{t("paintPlan.valuesHint")}</p>
        </div>

        {/* best palette suggestion */}
        <div className="border-t border-border/50 pt-3">
          {!ranking ? (
            <Button variant="outline" size="sm" onClick={suggestPalettes}>
              <Sparkles className="h-4 w-4" /> {t("paintPlan.suggestPalette")}
            </Button>
          ) : (
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {t("paintPlan.bestFor")}
              </p>
              {ranking.map((r) => (
                <div key={r.name} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-sm">
                    <PaletteIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    {r.name}
                    <span className="text-xs text-muted-foreground">{r.match}%</span>
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => onUsePalette(r.make, r.name)}
                  >
                    {t("paintPlan.use")}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
