import Link from "next/link";
import { NAME, TAGLINE } from "@/lib/brand";
import { Mark } from "@/app/mark";

/**
 * Site chrome, see the note on Nav in ./nav.tsx. Exists so the product feels
 * finished, not because anyone will spend time down here.
 *
 * "Nimiq Explorer" points at nimiq.watch specifically, not nimiq.com: it's
 * the same explorer family the app itself already depends on for chain
 * reads and RPC (see lib/chain.ts's api.nimiq.watch and
 * lib/broadcast.ts's rpc.nimiqwatch.com), so linking it here is pointing at
 * infrastructure this app actually uses, not a generic project link.
 */
export function Footer() {
  return (
    <footer className="site-footer">
      <div>
        <p className="site-footer-mark"><Mark className="brand-mark" /> {NAME}</p>
        <p className="faint" style={{ marginTop: "0.3rem", maxWidth: "26ch" }}>{TAGLINE}</p>
      </div>
      <div className="site-footer-cols">
        <div className="site-footer-col">
          <Link href="/#experiments">Experiments</Link>
          <Link href="/live">Live</Link>
          <Link href="/how-it-works">How it works</Link>
          <Link href="/research">Research</Link>
          <Link href="/results">Results</Link>
        </div>
        <div className="site-footer-col">
          <Link href="/docs">Docs</Link>
          <a href="https://nimiq.watch" target="_blank" rel="noopener noreferrer">Nimiq Explorer</a>
          <a href="https://github.com/bzdmin/hunch" target="_blank" rel="noopener noreferrer">GitHub</a>
        </div>
        <div className="site-footer-col">
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy</Link>
        </div>
      </div>
    </footer>
  );
}
