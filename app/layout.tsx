import type { Metadata, Viewport } from "next";
import { NAME, TAGLINE } from "@/lib/brand";
import Boot from "./boot";
import "./globals.css";

export const metadata: Metadata = {
  title: NAME,
  description: TAGLINE,
};

/**
 * viewportFit "cover" so the layout reaches under the notch, and a themeColor per
 * scheme so the WebView chrome matches the page instead of flashing white.
 * userScalable stays on, disabling pinch-zoom on a page about reading a decision
 * carefully is the wrong trade.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf4e6" },
    { media: "(prefers-color-scheme: dark)", color: "#16120e" },
  ],
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
    <html lang="en">
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
