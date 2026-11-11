import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/backend/auth-attacher";

/** Normalizes host and paths (www/workers.dev -> apex marginal-econ.com, strips non-root trailing slashes) */
const canonicalRedirectMiddleware = createMiddleware().server(async ({ next }) => {
  const req = getRequest();
  if (req?.url) {
    try {
      const url = new URL(req.url);
      const host = url.hostname.toLowerCase();
      let shouldRedirect = false;

      // 1. Force apex production domain: redirect www and workers.dev to marginal-econ.com
      if (host === "www.marginal-econ.com" || host === "app.marginal-econ.workers.dev") {
        url.hostname = "marginal-econ.com";
        url.protocol = "https:";
        url.port = "";
        shouldRedirect = true;
      }

      // 2. Normalize trailing slashes on sub-paths (e.g. /pricing/ -> /pricing)
      if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
        url.pathname = url.pathname.replace(/\/+$/, "");
        shouldRedirect = true;
      }

      if (shouldRedirect) {
        return new Response(null, {
          status: 301,
          headers: {
            Location: url.toString(),
            "Cache-Control": "public, max-age=86400",
          },
        });
      }
    } catch {
      /* ignore invalid URLs */
    }
  }
  return await next();
});

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Start installs this automatically when src/start.ts is absent; defining the
// file opts out, so re-add it explicitly to keep server functions protected
// from cross-site requests.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [canonicalRedirectMiddleware, errorMiddleware, csrfMiddleware],
}));
