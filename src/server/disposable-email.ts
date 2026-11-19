import disposableDomains from "disposable-email-domains";

// Known disposable / temporary email providers supplement (including active rotating networks)
const supplementalDomains = [
  "bcough.com",
  "chuwel.com",
  "fulldiets.com",
  "ruutukf.com",
  "znkix.com",
  "wzjpj.com",
  "wabblywabble.com",
  "wallywatts.com",
  "dotcoop.info",
  "unitedwe.lgbt",
  "ukm.ovh",
  "hideam.com",
  "jobscai.com",
  "tempmail.com",
  "temp-mail.org",
  "tempmail.net",
  "temp-mail.io",
  "tempmailo.com",
  "tempmailgen.com",
  "tempmail.plus",
  "tempmail.lol",
  "10minutemail.com",
  "10minutemail.net",
  "10minmail.com",
  "minutemail.com",
  "guerrillamail.com",
  "guerrillamail.net",
  "guerrillamail.org",
  "guerrillamailblock.com",
  "sharklasers.com",
  "mailinator.com",
  "mailinator2.com",
  "yopmail.com",
  "yopmail.net",
  "trashmail.com",
  "trashmail.net",
  "trashmail.me",
  "dispostable.com",
  "dropmail.me",
  "inboxkitten.com",
  "mohmal.com",
  "mohmal.im",
  "crazymailing.com",
  "crazymail.com",
  "getairmail.com",
  "throwawaymail.com",
  "emailondeck.com",
  "generator.email",
  "fakemailgenerator.com",
  "burnermail.io",
  "mytempemail.com",
  "inboxes.com",
  "maildrop.cc",
  "nada.ltd",
  "mailnesia.com",
  "mailcatch.com",
  "disposablemail.com",
  "binkmail.com",
  "safetymail.info",
  "spam4.me",
  "grr.la",
];

const blockedDomains = new Set<string>([...disposableDomains, ...supplementalDomains]);

const DISPOSABLE_KEYWORDS = [
  "tempmail",
  "temp-mail",
  "tempm",
  "dispos",
  "throwaway",
  "fakeinbox",
  "10minute",
  "10minmail",
  "minutemail",
  "guerrilla",
  "mailinator",
  "yopmail",
  "trashmail",
  "sharklaser",
  "burnermail",
  "dropmail",
  "mohmal",
  "crazymail",
  "getairmail",
  "dispostable",
  "inboxkitten",
  "fakemail",
  "generator.email",
  "fakemailgenerator",
  "mytempemail",
  "anonymbox",
  "emailfake",
  "emailondeck",
  "tempinbox",
  "binkmail",
  "safetymail",
];

const TRUSTED_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "yahoo.com",
  "ymail.com",
  "rocketmail.com",
  "proton.me",
  "protonmail.com",
  "zoho.com",
  "aol.com",
  "mail.com",
  "gmx.com",
  "gmx.net",
]);

/**
 * Synchronous fast check against the 121,570+ static list and keywords
 */
export function isDisposableEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  const atIndex = email.lastIndexOf("@");
  if (atIndex === -1) return false;

  const domain = email.slice(atIndex + 1).trim().toLowerCase();
  if (!domain || !domain.includes(".")) return false;

  // 1. Keyword heuristics on domain name
  if (DISPOSABLE_KEYWORDS.some((kw) => domain.includes(kw))) {
    return true;
  }

  // 2. Check exact host and parent domains against 121,000+ disposable domain database
  const labels = domain.split(".");
  for (let index = 0; index < labels.length - 1; index += 1) {
    if (blockedDomains.has(labels.slice(index).join("."))) return true;
  }

  return false;
}

/**
 * Authoritative async server verification with real-time Mailcheck API + Cloudflare DoH MX inspection
 */
export async function isDisposableEmailServer(email: string): Promise<boolean> {
  // 1. Instant check against static 121k+ list + keywords + supplemental
  if (isDisposableEmail(email)) {
    return true;
  }

  const atIndex = email.lastIndexOf("@");
  if (atIndex === -1) return false;
  const domain = email.slice(atIndex + 1).trim().toLowerCase();
  if (!domain || !domain.includes(".")) return false;

  // 2. Whitelist known trusted domains to bypass unnecessary external network requests
  if (TRUSTED_DOMAINS.has(domain)) {
    return false;
  }

  // Educational domains are trusted (.edu, .ac.uk, .sch.uk, .edu.in, .edu.sg, etc.)
  if (
    domain.endsWith(".edu") ||
    domain.endsWith(".ac.uk") ||
    domain.endsWith(".sch.uk") ||
    domain.includes(".edu.")
  ) {
    return false;
  }

  // 3. Real-time API check via mailcheck.ai with 1800ms abort timeout
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1800);
    const apiRes = await fetch(
      `https://api.mailcheck.ai/domain/${encodeURIComponent(domain)}`,
      {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      },
    );
    clearTimeout(timer);

    if (apiRes.ok) {
      const data = (await apiRes.json()) as any;
      if (data?.disposable === true) {
        blockedDomains.add(domain);
        return true;
      }
    }
  } catch {
    // API timeout or network error, fallback to DNS MX inspection
  }

  // 4. Real-time DNS MX inspection via Cloudflare DoH
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1800);
    const dohRes = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=MX`,
      {
        signal: controller.signal,
        headers: { Accept: "application/dns-json" },
      },
    );
    clearTimeout(timer);

    if (dohRes.ok) {
      const dohData = (await dohRes.json()) as any;
      const answers = dohData?.Answer || [];
      for (const ans of answers) {
        const mxHost = String(ans?.data || "").toLowerCase();
        if (
          mxHost.includes("wabblywabble") ||
          mxHost.includes("wallywatts") ||
          mxHost.includes("mailinator") ||
          mxHost.includes("trashmail") ||
          mxHost.includes("guerrillamail") ||
          mxHost.includes("sharklasers") ||
          mxHost.includes("bcough") ||
          mxHost.includes("chuwel") ||
          mxHost.includes("fulldiets") ||
          mxHost.includes("ruutukf") ||
          mxHost.includes("znkix") ||
          mxHost.includes("wzjpj")
        ) {
          blockedDomains.add(domain);
          return true;
        }
      }
    }
  } catch {
    // DoH timeout or network error
  }

  return false;
}
