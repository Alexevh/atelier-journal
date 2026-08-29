import { useMemo, useState } from "react";
import {
  ArrowRight,
  ArrowUpDown,
  Beaker,
  Check,
  Droplets,
  History,
  Pin,
  Thermometer,
  X,
} from "lucide-react";
import { hexToRgb, rgbToHex, rgbToLab, matchScore, type RGB } from "@/lib/color";
import { coach, quantifyAdjustment, type TipKind } from "@/lib/coach";
import { useT } from "@/lib/i18n";
import { useTargetColor } from "@/hooks/useTargetColor";
import {
  useColorMemory,
  pinColor,
  removeColor,
  clearUnpinned,
} from "@/hooks/useColorMemory";
import type { Pigment } from "@/lib/pigments";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const TIP_ICON: Record<TipKind, typeof Droplets> = {
  value: ArrowUpDown,
  saturation: Droplets,
  hue: Thermometer,
  done: Check,
};

// A grey chip showing a colour's VALUE alone (its L*), so the painter can judge
// the value step between the previous colour and the new one.
function valueGrey(rgb: RGB): string {
  const v = Math.round((rgbToLab(rgb).L / 100) * 255);
  return rgbToHex({ r: v, g: v, b: v });
}

/**
 * Compare the previously-picked colour (A) with the current one (B) and show
 * how to get from one to the other — the Coach's directional tips + a quantified
 * "add this to your A mix" — plus a value (grayscale) comparison. Fed by a small
 * hybrid memory of recent picks (auto-remembered, pinnable).
 */
export function CompareColorsCard({ pigments }: { pigments: Pigment[] }) {
  const { lang, t } = useT();
  const target = useTargetColor();
  const memory = useColorMemory();
  const [aId, setAId] = useState<string | null>(null);

  const targetHex = rgbToHex(target).toLowerCase();
  // A defaults to the newest remembered colour that isn't the current one.
  const autoA = memory.find((m) => m.hex.toLowerCase() !== targetHex);
  const aEntry = memory.find((m) => m.id === aId) ?? autoA ?? null;

  const A = aEntry ? hexToRgb(aEntry.hex) : null;
  const B = target;

  const result = useMemo(
    () => (A ? coach(B, A, pigments, lang) : null),
    [A, B, pigments, lang]
  );
  const quant = useMemo(
    () => (A ? quantifyAdjustment(B, A, pigments) : null),
    [A, B, pigments]
  );

  const lA = A ? Math.round(rgbToLab(A).L) : 0;
  const lB = Math.round(rgbToLab(B).L);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 normal-case tracking-normal text-foreground">
          <History className="h-4 w-4 text-accent" />
          {t("compareColors.title")}
        </CardTitle>
        {memory.some((m) => !m.pinned) && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
            onClick={clearUnpinned}
          >
            {t("compareColors.clear")}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* memory strip */}
        {memory.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {memory.map((m) => {
              const isA = aEntry?.id === m.id;
              const isB = m.hex.toLowerCase() === targetHex;
              return (
                <span
                  key={m.id}
                  className={cn(
                    "group flex items-center gap-1 rounded-full border py-0.5 pl-1 pr-1.5 text-xs",
                    isA
                      ? "border-accent/60 bg-accent/10"
                      : "border-border bg-secondary/40"
                  )}
                  title={m.hex + (isB ? ` · ${t("compareColors.current")}` : "")}
                >
                  <button
                    className="flex items-center gap-1"
                    onClick={() => setAId(m.id)}
                    aria-label={`${t("compareColors.setPrev")} ${m.hex}`}
                  >
                    <span
                      className="h-4 w-4 rounded-full border border-border/60"
                      style={{ backgroundColor: m.hex }}
                    />
                    <span className="font-mono">{m.hex}</span>
                  </button>
                  <button
                    onClick={() => pinColor(m.id, !m.pinned)}
                    className={cn(
                      "rounded p-0.5 hover:text-foreground",
                      m.pinned ? "text-accent" : "text-muted-foreground/50"
                    )}
                    title={m.pinned ? t("compareColors.unpin") : t("compareColors.pin")}
                  >
                    <Pin className={cn("h-3 w-3", m.pinned && "fill-current")} />
                  </button>
                  {!m.pinned && (
                    <button
                      onClick={() => {
                        if (aId === m.id) setAId(null);
                        removeColor(m.id);
                      }}
                      className="rounded p-0.5 text-muted-foreground/50 hover:text-foreground"
                      title={t("compareColors.remove")}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </span>
              );
            })}
          </div>
        )}

        {!A || !result ? (
          <p className="text-sm italic text-muted-foreground">
            {t("compareColors.empty")}
          </p>
        ) : (
          <>
            {/* A vs B swatches, with value chips */}
            <div className="flex items-stretch gap-2">
              <div className="flex-1 space-y-1">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  {t("compareColors.prev")}
                </p>
                <div
                  className="h-16 w-full rounded-lg border border-border/40"
                  style={{ backgroundColor: rgbToHex(A) }}
                />
                <p className="font-mono text-xs text-muted-foreground">
                  {rgbToHex(A)} · {t("compareColors.value")} {lA}
                </p>
              </div>
              <ArrowRight className="mt-8 h-5 w-5 shrink-0 text-muted-foreground" />
              <div className="flex-1 space-y-1">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  {t("compareColors.current")}
                </p>
                <div
                  className="h-16 w-full rounded-lg border border-border/40"
                  style={{ backgroundColor: rgbToHex(B) }}
                />
                <p className="font-mono text-xs text-muted-foreground">
                  {rgbToHex(B)} · {t("compareColors.value")} {lB}
                </p>
              </div>
            </div>

            {/* value (grayscale) comparison */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {t("compareColors.valueStep")}
              </span>
              <span
                className="h-5 w-8 rounded border border-border/50"
                style={{ backgroundColor: valueGrey(A) }}
              />
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              <span
                className="h-5 w-8 rounded border border-border/50"
                style={{ backgroundColor: valueGrey(B) }}
              />
              <span className="text-xs text-muted-foreground">
                {lB === lA
                  ? t("compareColors.sameValue")
                  : t(lB < lA ? "compareColors.darker" : "compareColors.lighter", {
                      n: Math.abs(lB - lA),
                    })}
              </span>
            </div>

            {/* directional tips: how to move A toward B */}
            <div>
              <p
                className={cn(
                  "mb-2 text-sm font-medium",
                  result.onTarget ? "text-emerald-400" : "text-foreground/90"
                )}
              >
                {result.onTarget
                  ? t("compareColors.same")
                  : t("compareColors.howTo")}
              </p>
              {!result.onTarget && (
                <ol className="space-y-2">
                  {result.tips.map((tip, i) => {
                    const Icon = TIP_ICON[tip.id];
                    return (
                      <li
                        key={tip.id + i}
                        className="flex items-start gap-3 rounded-lg border border-border/50 bg-secondary/20 p-2.5"
                      >
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-accent">
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <span className="flex-1 text-sm leading-relaxed text-foreground/90">
                          {tip.text}
                        </span>
                        {tip.swatchHex && (
                          <span
                            className="mt-0.5 h-5 w-5 shrink-0 rounded-full border border-border/50"
                            style={{ backgroundColor: tip.swatchHex }}
                          />
                        )}
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>

            {/* quantified single-pigment adjustment to the A mix */}
            {quant && (
              <div className="flex items-start gap-2 rounded-lg border border-accent/30 bg-accent/5 p-2.5 text-sm">
                <Beaker className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <div className="space-y-1">
                  <p className="text-foreground/90">
                    {t("compareColors.adjust", {
                      name: quant.pigment.name,
                      percent: Math.round(quant.fraction * 100),
                    })}
                  </p>
                  <p className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span
                      className="h-4 w-4 rounded border border-border/60"
                      style={{ backgroundColor: rgbToHex(quant.predicted) }}
                    />
                    {t("coach.quantResult", {
                      match: matchScore(quant.after),
                      before: matchScore(quant.before),
                    })}
                  </p>
                </div>
              </div>
            )}

            <p className="text-[11px] text-muted-foreground">
              {t("compareColors.footer")}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
