import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Pause, Play, SwitchCamera, Upload, Crosshair } from "lucide-react";
import { useT } from "@/lib/i18n";
import { useActiveImage } from "@/hooks/useActiveImage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Live value check: the reference photo and the live camera, both rendered as
// true VALUE (CIE L*, not a naive desaturate), side by side — so the painter can
// hold the phone over the palette and see whether the puddle matches the value
// of the spot they picked on the reference. Everything runs locally.

const PROC_W = 480; // processing width for the camera frames (keeps it smooth)
const MATCH_TOL = 3; // |ΔL*| within this reads as "on value"

// sRGB 0..255 → relative luminance Y (0..1)
function lin(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}
function lumY(r: number, g: number, b: number): number {
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
function yToL(y: number): number {
  return y > 0.008856 ? 116 * Math.cbrt(y) - 16 : 903.3 * y;
}
function lToY(L: number): number {
  const f = (L + 16) / 116;
  return f ** 3 > 0.008856 ? f ** 3 : L / 903.3;
}
// display byte for a luminance Y (so the shown grey really HAS that value)
function yToByte(y: number): number {
  const v = y <= 0.0031308 ? 12.92 * y : 1.055 * y ** (1 / 2.4) - 0.055;
  return Math.max(0, Math.min(255, Math.round(v * 255)));
}

// Quantise L* into N value steps (0 = off), returning the step-centre L*.
function quantL(L: number, steps: number): number {
  if (!steps) return L;
  const i = Math.min(steps - 1, Math.floor((L / 100) * steps));
  return ((i + 0.5) / steps) * 100;
}

// Render an RGBA buffer to value-grey in place; `gain` scales luminance (the
// grey/white-card correction for the camera's auto-exposure). Returns nothing.
function toValue(data: Uint8ClampedArray, steps: number, gain = 1) {
  for (let i = 0; i < data.length; i += 4) {
    const y = Math.min(1, lumY(data[i], data[i + 1], data[i + 2]) * gain);
    const L = quantL(yToL(y), steps);
    const g = yToByte(lToY(L));
    data[i] = data[i + 1] = data[i + 2] = g;
  }
}

// Mean L* of a small square around (cx, cy) in an ORIGINAL (colour) buffer.
function sampleL(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  cx: number,
  cy: number,
  r: number,
  gain = 1
): number {
  let sum = 0;
  let n = 0;
  for (let y = Math.max(0, cy - r); y <= Math.min(h - 1, cy + r); y++) {
    for (let x = Math.max(0, cx - r); x <= Math.min(w - 1, cx + r); x++) {
      const i = (y * w + x) * 4;
      sum += Math.min(1, lumY(data[i], data[i + 1], data[i + 2]) * gain);
      n += 1;
    }
  }
  return n ? yToL(sum / n) : 0;
}

type CardKind = "grey" | "white";
const CARD_L: Record<CardKind, number> = { grey: 50, white: 95 };

export function LiveValueView() {
  const { t } = useT();
  // Own reference if the painter set one here; otherwise fall back to the
  // photo already loaded in the Image tab, so the tab opens ready to use.
  const own = useActiveImage("value.reference");
  const fromImageTab = useActiveImage("image.reference");
  const blob = own.blob ?? fromImageTab.blob;
  const save = own.save;
  const usingImageTab = !own.blob && !!fromImageTab.blob;
  const fileRef = useRef<HTMLInputElement>(null);

  // reference
  const refCanvas = useRef<HTMLCanvasElement>(null);
  const refPixels = useRef<{ data: Uint8ClampedArray; w: number; h: number } | null>(null);
  const [refPt, setRefPt] = useState<{ x: number; y: number } | null>(null);
  const [refL, setRefL] = useState<number | null>(null);

  // camera
  const videoRef = useRef<HTMLVideoElement>(null);
  const camCanvas = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [camOn, setCamOn] = useState(false);
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [camError, setCamError] = useState<string | null>(null);
  const [frozen, setFrozen] = useState(false);
  const [liveL, setLiveL] = useState<number | null>(null);
  const frozenRef = useRef(false);
  frozenRef.current = frozen;

  // options
  const [steps, setSteps] = useState<0 | 5 | 9>(0);
  const stepsRef = useRef(steps);
  stepsRef.current = steps;
  const [gain, setGain] = useState(1);
  const gainRef = useRef(gain);
  gainRef.current = gain;
  const [cardKind, setCardKind] = useState<CardKind>("grey");
  const lastRawCenter = useRef<number | null>(null); // uncorrected centre Y

  // ---- reference image → value canvas ----
  const drawRef = useCallback(() => {
    const px = refPixels.current;
    const cv = refCanvas.current;
    if (!px || !cv) return;
    cv.width = px.w;
    cv.height = px.h;
    const img = new ImageData(new Uint8ClampedArray(px.data), px.w, px.h);
    toValue(img.data, steps);
    cv.getContext("2d")!.putImageData(img, 0, 0);
  }, [steps]);

  useEffect(() => {
    if (!blob) {
      refPixels.current = null;
      return;
    }
    const url = URL.createObjectURL(blob);
    const im = new Image();
    im.onload = () => {
      const scale = Math.min(1, 900 / Math.max(im.width, im.height));
      const w = Math.round(im.width * scale);
      const h = Math.round(im.height * scale);
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(im, 0, 0, w, h);
      refPixels.current = { data: ctx.getImageData(0, 0, w, h).data, w, h };
      setRefPt(null);
      setRefL(null);
      drawRef();
      URL.revokeObjectURL(url);
    };
    im.src = url;
  }, [blob, drawRef]);

  useEffect(() => drawRef(), [drawRef]);

  const pickRef = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const px = refPixels.current;
    const cv = refCanvas.current;
    if (!px || !cv) return;
    const r = cv.getBoundingClientRect();
    const x = Math.round(((e.clientX - r.left) / r.width) * px.w);
    const y = Math.round(((e.clientY - r.top) / r.height) * px.h);
    setRefPt({ x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height });
    setRefL(sampleL(px.data, px.w, px.h, x, y, 3));
  };

  // ---- camera loop ----
  useEffect(() => {
    if (!camOn) return;
    let cancelled = false;
    let raf = 0;
    const stop = () => {
      streamRef.current?.getTracks().forEach((tr) => tr.stop());
      streamRef.current = null;
    };
    (async () => {
      setCamError(null);
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("nocam");
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((tr) => tr.stop());
          return;
        }
        streamRef.current = stream;
        const v = videoRef.current!;
        v.srcObject = stream;
        await v.play().catch(() => {});
        const tick = () => {
          if (cancelled) return;
          const cv = camCanvas.current;
          if (cv && v.videoWidth && !frozenRef.current) {
            const w = PROC_W;
            const h = Math.round((v.videoHeight / v.videoWidth) * w);
            cv.width = w;
            cv.height = h;
            const ctx = cv.getContext("2d", { willReadFrequently: true })!;
            ctx.drawImage(v, 0, 0, w, h);
            const frame = ctx.getImageData(0, 0, w, h);
            const r = Math.max(4, Math.round(w * 0.015));
            const cx = Math.round(w / 2);
            const cy = Math.round(h / 2);
            lastRawCenter.current = lToY(sampleL(frame.data, w, h, cx, cy, r, 1));
            setLiveL(sampleL(frame.data, w, h, cx, cy, r, gainRef.current));
            toValue(frame.data, stepsRef.current, gainRef.current);
            ctx.putImageData(frame, 0, 0);
          }
          raf = requestAnimationFrame(tick);
        };
        tick();
      } catch (e) {
        if (cancelled) return;
        const name = (e as { name?: string })?.name;
        setCamError(
          name === "NotAllowedError" || name === "SecurityError"
            ? t("camera.denied")
            : t("camera.error")
        );
        setCamOn(false);
      }
    })();
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camOn, facing]);

  // Grey/white card: point the crosshair at the card and lock a gain so it
  // reads as its known value — neutralising the camera's auto-exposure.
  const lockCard = () => {
    const y = lastRawCenter.current;
    if (!y || y <= 0) return;
    setGain(lToY(CARD_L[cardKind]) / y);
  };

  const diff = refL != null && liveL != null ? liveL - refL : null;

  return (
    <div className="space-y-4">
      <div className="grid items-start gap-4 lg:grid-cols-2">
        {/* reference */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>{t("liveValue.reference")}</CardTitle>
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4" /> {blob ? t("liveValue.replace") : t("liveValue.load")}
            </Button>
          </CardHeader>
          <CardContent>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) save(f);
                e.target.value = "";
              }}
            />
            {blob ? (
              <div className="relative">
                <canvas
                  ref={refCanvas}
                  onClick={pickRef}
                  className="w-full cursor-crosshair rounded-lg border border-border"
                />
                {refPt && (
                  <span
                    className="pointer-events-none absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent shadow"
                    style={{ left: `${refPt.x * 100}%`, top: `${refPt.y * 100}%` }}
                  />
                )}
                {usingImageTab && (
                  <p className="mt-2 text-[11px] italic text-muted-foreground">
                    {t("liveValue.fromImageTab")}
                  </p>
                )}
                <p className="mt-2 text-xs text-muted-foreground">
                  {refL == null
                    ? t("liveValue.pickHint")
                    : t("liveValue.refValue", { n: Math.round(refL) })}
                </p>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="flex h-64 w-full flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border text-muted-foreground hover:border-accent hover:text-foreground"
              >
                <Upload className="h-8 w-8" />
                <span className="text-sm">{t("liveValue.loadHint")}</span>
              </button>
            )}
          </CardContent>
        </Card>

        {/* camera */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>{t("liveValue.camera")}</CardTitle>
            <div className="flex gap-1.5">
              {camOn && (
                <>
                  <Button
                    variant={frozen ? "accent" : "outline"}
                    size="sm"
                    onClick={() => setFrozen((f) => !f)}
                  >
                    {frozen ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                    {frozen ? t("liveValue.resume") : t("liveValue.freeze")}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    title={t("camera.flip")}
                    onClick={() => setFacing((f) => (f === "environment" ? "user" : "environment"))}
                  >
                    <SwitchCamera className="h-4 w-4" />
                  </Button>
                </>
              )}
              <Button
                variant={camOn ? "ghost" : "accent"}
                size="sm"
                onClick={() => {
                  setFrozen(false);
                  setCamOn((c) => !c);
                }}
              >
                <Camera className="h-4 w-4" /> {camOn ? t("liveValue.stop") : t("liveValue.start")}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <video ref={videoRef} playsInline muted className="hidden" />
            {camOn ? (
              <div className="relative">
                <canvas ref={camCanvas} className="w-full rounded-lg border border-border bg-black" />
                <Crosshair className="pointer-events-none absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 text-accent drop-shadow" />
              </div>
            ) : (
              <p className="rounded-lg bg-secondary/40 px-3 py-16 text-center text-sm text-muted-foreground">
                {camError ?? t("liveValue.camHint")}
              </p>
            )}
            {camOn && (
              <p className="text-xs text-muted-foreground">
                {liveL == null ? "…" : t("liveValue.liveValue", { n: Math.round(liveL) })}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* comparison + options */}
      <Card>
        <CardContent className="space-y-4 pt-5">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={cn(
                "text-base font-semibold",
                diff == null
                  ? "text-muted-foreground"
                  : Math.abs(diff) <= MATCH_TOL
                    ? "text-emerald-500"
                    : "text-amber-500"
              )}
            >
              {diff == null
                ? t("liveValue.needBoth")
                : Math.abs(diff) <= MATCH_TOL
                  ? t("liveValue.onValue")
                  : diff < 0
                    ? t("liveValue.darker", { n: Math.round(-diff) })
                    : t("liveValue.lighter", { n: Math.round(diff) })}
            </span>
          </div>

          {/* value scale with markers */}
          <div>
            <div className="relative flex h-6 overflow-hidden rounded border border-border">
              {Array.from({ length: 9 }, (_, i) => {
                const L = ((i + 0.5) / 9) * 100;
                const g = yToByte(lToY(L));
                return <span key={i} className="flex-1" style={{ backgroundColor: `rgb(${g},${g},${g})` }} />;
              })}
              {refL != null && (
                <span
                  className="absolute top-0 h-full w-1 -translate-x-1/2 bg-accent"
                  style={{ left: `${refL}%` }}
                  title={t("liveValue.reference")}
                />
              )}
              {liveL != null && camOn && (
                <span
                  className="absolute top-0 h-full w-1 -translate-x-1/2 bg-sky-500"
                  style={{ left: `${Math.min(100, liveL)}%` }}
                  title={t("liveValue.camera")}
                />
              )}
            </div>
            <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
              <span>{t("liveValue.dark")}</span>
              <span>
                <span className="text-accent">■</span> {t("liveValue.reference")} ·{" "}
                <span className="text-sky-500">■</span> {t("liveValue.camera")}
              </span>
              <span>{t("liveValue.light")}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm">
            <label className="flex items-center gap-2">
              {t("liveValue.steps")}
              <select
                value={steps}
                onChange={(e) => setSteps(Number(e.target.value) as 0 | 5 | 9)}
                className="h-8 rounded-md border border-input bg-background px-2 text-xs"
              >
                <option value={0}>{t("liveValue.stepsOff")}</option>
                <option value={5}>5</option>
                <option value={9}>9</option>
              </select>
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={cardKind}
                onChange={(e) => setCardKind(e.target.value as CardKind)}
                className="h-8 rounded-md border border-input bg-background px-2 text-xs"
              >
                <option value="grey">{t("liveValue.cardGrey")}</option>
                <option value="white">{t("liveValue.cardWhite")}</option>
              </select>
              <Button variant="outline" size="sm" disabled={!camOn} onClick={lockCard}>
                {t("liveValue.lockCard")}
              </Button>
              {gain !== 1 && (
                <Button variant="ghost" size="sm" onClick={() => setGain(1)}>
                  {t("liveValue.resetCard")}
                </Button>
              )}
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">{t("liveValue.cardHint")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
