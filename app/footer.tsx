import Link from "next/link";
import { NAME, TAGLINE } from "@/lib/brand";
import { Mark } from "@/app/mark";

/**
 * Site chrome, see the note on Nav in ./nav.tsx. Exists so the product feels
 * finished, not because anyone will spend time down here.
 *
 * No Privacy or Terms links: those pages do not exist, and a footer link to
 * a 404 undermines the exact impression a footer is supposed to create.
 * Real external links only, Nimiq itself and the repository, nothing
 * invented to fill a column.
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
          <Link href="/how-it-works">How it works</Link>
          <Link href="/research">Research</Link>
          <Link href="/results">Results</Link>
        </div>
        <div className="site-footer-col">
          <a href="https://www.nimiq.com" target="_blank" rel="noopener noreferrer">Nimiq</a>
          <a href="https://github.com/bzdmin/hunch" target="_blank" rel="noopener noreferrer">GitHub</a>
        </div>
      </div>
    </footer>
  );
}
