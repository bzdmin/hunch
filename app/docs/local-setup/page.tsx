import { NAME } from "@/lib/brand";
import { Nav } from "@/app/nav";
import { Footer } from "@/app/footer";
import { DocsSidebar } from "@/app/docs/sidebar";

export const metadata = { title: `Local setup · Docs · ${NAME}` };

/**
 * The developer-facing guide. Deliberately high-level: exact environment
 * variable names, admin routes, and abuse-threshold constants live in one
 * place, README.md, and this page points there instead of reproducing them.
 * A second copy of that table here is exactly the kind of thing that goes
 * stale the next time an env var changes and nobody remembers to update
 * both places.
 */
export default function LocalSetupDoc() {
  return (
    <>
      <Nav />
      <main className="screen wide">
        <div className="page-header">
          <p className="eyebrow">Docs &middot; Local setup</p>
          <h1>Run {NAME} locally</h1>
          <p className="soft" style={{ marginTop: "0.5rem", maxWidth: "60ch" }}>
            {NAME} is open source. This is the map, the README has the exact
            commands and environment variables.
          </p>
        </div>

        <div className="docs-shell">
          <DocsSidebar />

          <div className="docs-content">
            <p className="section-label">Requirements</p>
            <div className="card">
              <p className="soft">
                Node.js and npm. Locally, {NAME} falls back to file-backed
                JSON storage under <code>.data/</code>, so nothing else is
                required to run it: no database to provision, no house
                wallet to fund. Production storage and house funding are
                both opt-in through environment variables, see the README.
              </p>
            </div>

            <p className="section-label">Install and run</p>
            <div className="diagram">
{`npm install
npm run build && npm start`}
            </div>
            <div className="card">
              <p className="soft">
                {NAME} is built for the Nimiq Pay WebView, dev bundles
                don&rsquo;t run inside it, so a production build is the
                normal way to actually open it in Nimiq Pay under{" "}
                <strong>Mini Apps &rarr; Custom URL</strong>. The hidden dev
                menu, a 10-second long-press on settings, switches to
                testnet and hands out free NIM for testing.
              </p>
            </div>

            <p className="section-label">Technical architecture</p>
            <div className="diagram">
{`Nimiq Pay / Nimiq Hub
        |
        v
 Wallet signature
        |
        v
   Hunch API / server
    +---------+---------+
    |                   |
Split engine        Pair engine
    |                   |
    |          Trust / Ultimatum
    |                   |
    +---------+---------+
              |
        Round state
              |
      +-------+-------+
      |               |
 Settlement         Results
      |               |
      v               v
Nimiq blockchain   Live / Research`}
            </div>
            <div className="card">
              <table className="docs-table">
                <thead>
                  <tr><th>Component</th><th>Responsibility</th></tr>
                </thead>
                <tbody>
                  <tr><td>Wallet</td><td>Signs decisions, provides payout authority</td></tr>
                  <tr><td>Commit API</td><td>Verifies signed decisions before anything is stored</td></tr>
                  <tr><td>Split engine</td><td>Handles the NIM chain, self-funded and house-funded</td></tr>
                  <tr><td>Pair engine</td><td>Handles blind two-player commitments for Trust and Ultimatum</td></tr>
                  <tr><td>Payout system</td><td>Calculates and settles NIM, tracks queued/sending/sent/failed</td></tr>
                  <tr><td>Abuse layer</td><td>Limits repeated house-funded play by wallet, device, and pair</td></tr>
                  <tr><td>Results</td><td>Shows a player&rsquo;s local history, stored on-device</td></tr>
                  <tr><td>Live</td><td>Shows anonymised real observations, no identity in the shape</td></tr>
                  <tr><td>Research</td><td>Compares {NAME}&rsquo;s observations with published work</td></tr>
                </tbody>
              </table>
            </div>

            <p className="section-label">Project structure</p>
            <div className="card">
              <p className="soft">
                Routes live under <code>app/</code>, one folder per
                experiment or page. Everything that isn&rsquo;t UI, the
                round engines, payout logic, abuse controls, wallet
                signing, storage, lives under <code>lib/</code> as small,
                single-purpose modules rather than one shared utility file.
                Storage goes through one adapter (<code>lib/db.ts</code>),
                so swapping the local JSON files for Postgres in production
                is a one-file change, not a refactor.
              </p>
            </div>

            <p className="section-label">Everything else</p>
            <div className="card">
              <p className="soft">
                Environment variables, the storage schema, the admin
                tooling, and deployment specifics are documented directly
                in the repository rather than here, they change with the
                code, and a second copy on this page would only ever be
                the stale one.
              </p>
              <a
                href="https://github.com/bzdmin/hunch"
                target="_blank"
                rel="noopener noreferrer"
                className="btn ghost"
                style={{ marginTop: "0.75rem" }}
              >
                View the repository &rarr;
              </a>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
