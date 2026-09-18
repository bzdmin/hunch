import Link from "next/link";
import { NAME } from "@/lib/brand";
import { Mark } from "@/app/mark";

/**
 * Site chrome, not experiment chrome. See the note above .site-nav in
 * globals.css: this exists on the pages that explain Hunch, never on a
 * decision screen. A logo mark beyond the wordmark is deliberately not here
 * yet, real icon design needs visual iteration this session cannot do
 * reliably, and a mediocre mark stamped across every screen is worse than a
 * plain wordmark used consistently.
 *
 * "Experiments" links to an anchor on the home page rather than its own
 * route: the three game cards already are that content, a second page
 * saying the same thing again would be upkeep with no new value.
 *
 * "Results" is this device's own history (lib/history.ts), not an account's,
 * there is no login on Hunch and a signing key is not one. Said plainly on
 * that page itself, not just implied by the nav item.
 */
export function Nav() {
  return (
    <nav className="site-nav">
      <Link href="/" className="site-nav-mark">
        <Mark className="brand-mark" /> {NAME}
      </Link>
      <div className="site-nav-links">
        <Link href="/#experiments">Experiments</Link>
        <Link href="/live">Live</Link>
        <Link href="/how-it-works">How it works</Link>
        <Link href="/research">Research</Link>
        <Link href="/results">Results</Link>
        <Link href="/docs">Docs</Link>
      </div>
      <Link href="/#experiments" className="btn site-nav-cta">Play {NAME}</Link>
    </nav>
  );
}
