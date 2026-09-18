"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * The persistent wayfinding for every /docs page. A client component only
 * because active-state highlighting needs the current path, everything else
 * about this list is static.
 *
 * "Overview" points at /docs itself rather than a separate route: the hub
 * page already is the 60-second explanation (hero plus the four guide
 * cards), a second page saying that again would be the same duplication
 * problem this whole docs section exists to avoid elsewhere.
 */
const GUIDES: { label: string; href: string; sub?: { label: string; href: string }[] }[] = [
  { label: "Overview", href: "/docs" },
  {
    label: "Experiments",
    href: "/docs/experiments",
    sub: [
      { label: "Split", href: "/docs/experiments#split" },
      { label: "Trust", href: "/docs/experiments#trust" },
      { label: "Ultimatum", href: "/docs/experiments#ultimatum" },
    ],
  },
  {
    label: "Nimiq Pay",
    href: "/docs/nimiq-pay",
    sub: [
      { label: "Wallet flow", href: "/docs/nimiq-pay#wallet-flow" },
      { label: "Settlement", href: "/docs/nimiq-pay#settlement" },
    ],
  },
  { label: "Security & privacy", href: "/docs/security" },
  { label: "Local setup", href: "/docs/local-setup" },
];

export function DocsSidebar() {
  const pathname = usePathname();

  return (
    <div className="docs-sidebar">
      <p className="label">Guides</p>
      <nav>
        {GUIDES.map((g) => (
          <div key={g.href}>
            <Link href={g.href} className={pathname === g.href ? "active" : ""}>
              {g.label}
            </Link>
            {g.sub && pathname === g.href && (
              <div className="sub">
                {g.sub.map((s) => (
                  <Link key={s.href} href={s.href}>{s.label}</Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
      <div className="divider" />
      <a href="https://github.com/bzdmin/hunch" target="_blank" rel="noopener noreferrer">
        View source on GitHub &#8599;
      </a>
    </div>
  );
}
