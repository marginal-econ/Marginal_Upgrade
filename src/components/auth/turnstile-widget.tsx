import { useEffect, useRef, useState } from "react";
import { ShieldCheck, Loader2 } from "lucide-react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement | string,
        params: {
          sitekey: string;
          callback?: (token: string) => void;
          "error-callback"?: (errorCode?: string) => void;
          "expired-callback"?: () => void;
          theme?: "auto" | "light" | "dark";
          size?: "normal" | "compact" | "flexible";
        },
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
  className?: string;
}

export function TurnstileWidget({
  onVerify,
  onExpire,
  onError,
  className = "",
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);

  // Cloudflare official always-passing testing sitekey: "1x00000000000000000000AA"
  // If user sets a custom production sitekey via VITE_TURNSTILE_SITE_KEY, it will be used.
  const siteKey =
    (import.meta as any).env?.VITE_TURNSTILE_SITE_KEY ||
    "1x00000000000000000000AA";

  useEffect(() => {
    let isMounted = true;

    const renderWidget = () => {
      if (!isMounted || !containerRef.current || !window.turnstile) return;
      if (widgetIdRef.current) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {}
      }

      try {
        const id = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme: "auto",
          size: "normal",
          callback: (token: string) => {
            if (!isMounted) return;
            setVerified(true);
            setLoading(false);
            onVerify(token);
          },
          "expired-callback": () => {
            if (!isMounted) return;
            setVerified(false);
            onExpire?.();
          },
          "error-callback": () => {
            if (!isMounted) return;
            setLoading(false);
            onError?.();
          },
        });
        widgetIdRef.current = id;
        setLoading(false);
      } catch (err) {
        console.warn("Turnstile render error:", err);
        setLoading(false);
      }
    };

    if (window.turnstile) {
      renderWidget();
    } else {
      const existingScript = document.querySelector('script[src*="turnstile/v0/api.js"]');
      if (!existingScript) {
        const script = document.createElement("script");
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        script.async = true;
        script.defer = true;
        script.onload = () => {
          if (isMounted) renderWidget();
        };
        document.head.appendChild(script);
      } else {
        existingScript.addEventListener("load", () => {
          if (isMounted) renderWidget();
        });
      }
    }

    return () => {
      isMounted = false;
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {}
      }
    };
  }, [siteKey]);

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1 font-medium">
          <ShieldCheck className="size-3.5 text-primary" />
          Human Verification
        </span>
        {verified ? (
          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            ✓ Verified
          </span>
        ) : (
          <span className="text-[11px] text-muted-foreground">Required for signup</span>
        )}
      </div>

      <div className="flex min-h-[65px] items-center justify-center rounded-xl border border-border/80 bg-muted/20 p-2 overflow-hidden">
        {loading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            Loading security check…
          </div>
        )}
        <div ref={containerRef} className={loading ? "hidden" : "block"} />
      </div>
    </div>
  );
}
