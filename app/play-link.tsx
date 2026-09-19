"use client";

import { useEffect, type MouseEvent, type ReactNode } from "react";

interface PlayLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href?: string;
  className?: string;
  children: ReactNode;
}

/**
 * Reliable navigation to the Hunch experiment selection flow.
 *
 * When on the homepage (/), clicking "Play a Hunch" or "Play Hunch"
 * smoothly scrolls the viewport directly to the #experiments section,
 * avoiding Next.js shallow client-side router interception which
 * swallows same-page hash links.
 *
 * When on other pages, it navigates to /#experiments as intended.
 */
export function PlayLink({
  href = "/#experiments",
  className,
  children,
  onClick,
  ...props
}: PlayLinkProps) {
  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (onClick) {
      onClick(e);
      if (e.defaultPrevented) return;
    }

    if (typeof window !== "undefined") {
      const isHome = window.location.pathname === "/" || window.location.pathname === "";
      if (isHome) {
        e.preventDefault();
        const target = document.getElementById("experiments");
        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
          window.history.pushState(null, "", "/#experiments");
        } else {
          window.location.hash = "experiments";
        }
      }
    }
  };

  return (
    <a href={href} onClick={handleClick} className={className} {...props}>
      {children}
    </a>
  );
}

/**
 * Ensures that navigating to /#experiments from an external page or directly
 * via URL hash reliably scrolls to the #experiments section on mount.
 */
export function HashScrollHandler() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const scrollToHash = () => {
      if (window.location.hash === "#experiments") {
        const el = document.getElementById("experiments");
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
    };

    const timer = setTimeout(scrollToHash, 60);
    window.addEventListener("hashchange", scrollToHash);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("hashchange", scrollToHash);
    };
  }, []);

  return null;
}
