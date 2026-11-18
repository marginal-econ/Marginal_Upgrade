import disposableDomains from "disposable-email-domains";

// Known disposable / temporary email providers supplement
const supplementalDomains = [
  "hideam.com",
  "jobscai.com",
  "tempmail.com",
  "temp-mail.org",
  "tempmail.net",
  "temp-mail.io",
  "tempmailo.com",
  "tempmailgen.com",
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
  "crazymailing.com",
  "getairmail.com",
  "throwawaymail.com",
  "emailondeck.com",
  "generator.email",
  "fakemailgenerator.com",
  "burnermail.io",
  "mytempemail.com",
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
];

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
