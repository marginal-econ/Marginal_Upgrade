import { useEffect, useRef, type CSSProperties } from "react";

/**
 * Renders an already-rendered offscreen HTMLCanvasElement directly into a
 * visible <canvas> in <1ms, avoiding synchronous canvas.toDataURL("image/png")
 * main-thread stalls and WebKit/Safari "data:," memory-limit blank renders.
 */
export function CanvasPreview({
  source,
  className,
  style,
  ariaLabel,
}: {
  source: HTMLCanvasElement;
  className?: string;
  style?: CSSProperties;
  ariaLabel?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const dest = canvasRef.current;
    if (!dest || !source || source.width === 0 || source.height === 0) return;
    if (dest.width !== source.width) dest.width = source.width;
    if (dest.height !== source.height) dest.height = source.height;
    const ctx = dest.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, dest.width, dest.height);
    ctx.drawImage(source, 0, 0);
  }, [source]);

  return (
    <canvas
      ref={canvasRef}
      width={source.width}
      height={source.height}
      role="img"
      aria-label={ariaLabel}
      className={className}
      style={{
        aspectRatio:
          source.width > 0 && source.height > 0
            ? `${source.width} / ${source.height}`
            : undefined,
        ...style,
      }}
    />
  );
}
