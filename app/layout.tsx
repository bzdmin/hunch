import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Public_Sans } from "next/font/google";
import { NAME, TAGLINE } from "@/lib/brand";
import Boot from "./boot";
import "./globals.css";

/**
 * Self-hosted through next/font instead of globals.css's old @import from
 * fonts.googleapis.com: an @import at the top of a stylesheet is render-
 * blocking, nothing in that file applies, including the p{margin:0} and
 * h1{margin:...} resets right below it, until that third-party request
 * resolves. On a fast connection that's invisible; on a real phone over
 * cellular it's a real window where the page renders in the browser's
 * default serif font with default (much larger) heading and paragraph
 * margins, which reads exactly like a layout bug even though nothing in
 * the CSS is wrong. next/font fetches at build time and serves the font
 * files from this origin, so there's no external request to block on at
 * all. `variable` is set to the same custom property names --display and
 * --body globals.css has always used, so nothing else in that file needs
 * to change, this only replaces how the font gets onto the page.
 */
const display = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--display",
  display: "swap",
});
const body = Public_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--body",
  display: "swap",
});

const DEFINITION = "short behavioural experiments played with real NIM";

const PROD_URL = "https://hunch-teal.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined) ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ||
    PROD_URL
  ),
  title: `${NAME}: ${DEFINITION}`,
  applicationName: "Hunch",
  description: `${TAGLINE} ${NAME} is a collection of ${DEFINITION}. Make a decision, predict what another person will do, then find out.`,
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/favicon.ico"],
  },
  openGraph: {
    title: `${NAME}: ${DEFINITION}`,
    description: `${TAGLINE} Make a decision, predict what another person will do, then find out.`,
    url: PROD_URL,
    siteName: "Hunch",
    images: [
      {
        url: "/icon-512.png",
        width: 512,
        height: 512,
        alt: "Hunch mark",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary",
    title: `${NAME}: ${DEFINITION}`,
    description: `${TAGLINE} Make a decision, predict what another person will do, then find out.`,
    images: ["/icon-512.png"],
  },
  appleWebApp: {
    capable: true,
    title: "Hunch",
    statusBarStyle: "black-translucent",
  },
};

/**
 * viewportFit "cover" so the layout reaches under the notch, and one themeColor
 * so the WebView chrome matches the page instead of flashing white.
 * userScalable stays on, disabling pinch-zoom on a page about reading a decision
 * carefully is the wrong trade.
 *
 * One colour, not a pair: Hunch is dark in every environment now, so a
 * light-scheme entry here would tint the chrome around a page that never
 * goes light. See the palette note at the top of globals.css.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#131110",
};

/**
 * The diagnostics below are development-only, and that gate is not optional.
 * /e/<session> is the page strangers land on from a shared link, the first thing
 * anyone ever sees of this product. A red bar reading "react booted: no" appeared
 * there on 5 Sep, on a real phone, under a message about receiving money. Debug
 * output must never reach a page a stranger can open.
 */
const dev = process.env.NODE_ENV !== "production";

const DIAG = `(function(){
  var log = [];
  function paint(){
    var el = document.getElementById('rawdiag');
    if (!el) return;
    el.textContent = log.length ? log.join('\\n\\n') : 'no errors caught';
    el.style.display = 'block';
  }
  window.addEventListener('error', function(e){
    if (e.target && e.target !== window && e.target.src) {
      log.push('FAILED TO LOAD:\\n' + e.target.src);
    } else {
      log.push('ERROR: ' + e.message + '\\n  ' + (e.filename||'?') + ':' + (e.lineno||'?'));
    }
    paint();
  }, true);
  window.addEventListener('unhandledrejection', function(e){
    log.push('REJECTED: ' + (e.reason && e.reason.message ? e.reason.message : String(e.reason)));
    paint();
  });
})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        {dev && <script dangerouslySetInnerHTML={{ __html: DIAG }} />}
        {children}
        {dev && <Boot />}
        {dev && (
          <pre
            id="rawdiag"
            style={{
              display: "none",
              position: "fixed",
              left: 0,
              right: 0,
              bottom: "22px",
              maxHeight: "50vh",
              overflow: "auto",
              margin: 0,
              zIndex: 10000,
              background: "#2b1512",
              color: "#ffb4a2",
              font: "11px/1.45 ui-monospace, Menlo, monospace",
              padding: "10px 12px",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          />
        )}
      </body>
    </html>
  );
}
