/**
 * Lightweight client-side disposable/temporary email heuristic detector.
 * Provides instant feedback as the user types without bloat.
 */
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
  "spam4.me",
  "grr.la",
];

const KNOWN_DISPOSABLE_DOMAINS = new Set([
  // Popular Rotating Throwaway Services
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
]);

export function isDisposableEmailClient(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  const atIndex = email.lastIndexOf("@");
  if (atIndex === -1) return false;

  const domain = email.slice(atIndex + 1).trim().toLowerCase();
  if (!domain || !domain.includes(".")) return false;

  if (KNOWN_DISPOSABLE_DOMAINS.has(domain)) return true;

  // Check parent domains
  const labels = domain.split(".");
  for (let i = 0; i < labels.length - 1; i++) {
    if (KNOWN_DISPOSABLE_DOMAINS.has(labels.slice(i).join("."))) return true;
  }

  // Check keywords in domain name
  return DISPOSABLE_KEYWORDS.some((kw) => domain.includes(kw));
}
