import Link from "next/link";
import { NAME, TAGLINE } from "@/lib/brand";
import { Mark } from "@/app/mark";
import { PlayLink } from "@/app/play-link";

/**
 * Site chrome, see the note on Nav in ./nav.tsx. Exists so the product feels
 * finished, not because anyone will spend time down here.
 *
 * Three groups, each a real category rather than an unlabelled list:
 * DISCOVER is the product itself, THE BUILD is the open-source/technical
 * side, TRUST is the legal/privacy side. "The Build" over the more generic
 * "Trust & Code" on purpose, it reads as this specific project rather than
 * template crypto-footer language.
 *
 * "Nimiq Explorer" points at nimiq.watch specifically, not nimiq.com: it's
 * the same explorer family the app itself already depends on for chain
 * reads and RPC (see lib/chain.ts's api.nimiq.watch and
 * lib/broadcast.ts's rpc.nimiqwatch.com), so linking it here is pointing at
 * infrastructure this app actually uses, not a generic project link.
 *
 * The competition credit is text, not yet a link: there is no submission
 * URL to point it at as this was written. Styled like a link so it slots
 * straight into an <a> the moment one exists, rather than needing a second
 * pass to restyle it later.
 */
export function Footer() {
  return (
    <footer className="site-footer">
      <div>
        <p className="site-footer-mark"><Mark className="brand-mark" /> {NAME}</p>
        <p className="faint" style={{ marginTop: "0.3rem", maxWidth: "30ch" }}>{TAGLINE}</p>
        <p className="faint" style={{ marginTop: "0.3rem", maxWidth: "30ch" }}>
          Built towards the{" "}
          <span className="site-footer-credit">Nimiq Mini Apps Competition Cycle II</span>
        </p>
      </div>
      <div className="site-footer-cols">
        <div className="site-footer-col">
          <p className="site-footer-label">Discover</p>
          <PlayLink href="/#experiments">Experiments</PlayLink>
          <Link href="/live">Live</Link>
          <Link href="/how-it-works">How it works</Link>
          <Link href="/research">Research</Link>
          <Link href="/results">Results</Link>
        </div>
        <div className="site-footer-col">
          <p className="site-footer-label">The build</p>
          <Link href="/docs">Docs</Link>
          <a href="https://nimiq.watch" target="_blank" rel="noopener noreferrer">Nimiq Explorer</a>
          <a href="https://github.com/bzdmin/hunch" target="_blank" rel="noopener noreferrer">GitHub</a>
        </div>
        <div className="site-footer-col">
          <p className="site-footer-label">Trust</p>
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy</Link>
        </div>
      </div>
    </footer>
  );
}
