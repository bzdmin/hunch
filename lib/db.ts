/**
 * Storage, behind one interface.
 *
 * Local development writes JSON files, which is fine on a laptop and fatal on Vercel:
 * the filesystem there is read-only apart from /tmp and is not shared between
 * invocations, so every decision and every gift would silently vanish between
 * requests. Deploying without fixing this would lose real players' money records.
 *
 * So both stores go through this adapter. Set POSTGRES_URL and it uses Postgres;
 * leave it unset and it uses files. Nothing above this file knows which.
 *
 * Postgres rather than a key-value store because the queries this app actually needs
 * oldest unclaimed gift, decisions grouped by funding mode, are awkward to do
 * correctly with plain key lookups, and getting them wrong shows the wrong number to
 * every player.
 */

import { promises as fs } from "fs";
import path from "path";

export type Row = { id: string; data: unknown; at: number };

export interface Store {
  get(coll: string, id: string): Promise<unknown | null>;
  put(coll: string, id: string, data: unknown): Promise<void>;
  all(coll: string): Promise<Row[]>;
}

// ------------------------------------------------------------------- files

class FileStore implements Store {
  private dir = path.join(process.cwd(), ".data");
  private file(coll: string) { return path.join(this.dir, `${coll}.json`); }

  private async read(coll: string): Promise<Row[]> {
    try {
      return JSON.parse(await fs.readFile(this.file(coll), "utf8")) as Row[];
    } catch {
      return [];
    }
  }

  private async write(coll: string, rows: Row[]) {
    await fs.mkdir(this.dir, { recursive: true });
    await fs.writeFile(this.file(coll), JSON.stringify(rows, null, 2), "utf8");
  }

  async get(coll: string, id: string) {
    return (await this.read(coll)).find((r) => r.id === id)?.data ?? null;
  }

  async put(coll: string, id: string, data: unknown) {
    const rows = await this.read(coll);
    const i = rows.findIndex((r) => r.id === id);
    const row = { id, data, at: Date.now() };
    if (i >= 0) rows[i] = row;
    else rows.push(row);
    await this.write(coll, rows);
  }

  async all(coll: string) {
    return this.read(coll);
  }
}

// ---------------------------------------------------------------- postgres

class PgStore implements Store {
  private ready: Promise<void> | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private sql: any;

  private async init() {
    if (this.ready) return this.ready;
    this.ready = (async () => {
      const { neon } = await import("@neondatabase/serverless");
      this.sql = neon(process.env.POSTGRES_URL!);
      await this.sql`
        CREATE TABLE IF NOT EXISTS rows (
          coll TEXT NOT NULL,
          id   TEXT NOT NULL,
          data JSONB NOT NULL,
          at   BIGINT NOT NULL,
          PRIMARY KEY (coll, id)
        )`;
    })();
    return this.ready;
  }

  async get(coll: string, id: string) {
    await this.init();
    const r = await this.sql`SELECT data FROM rows WHERE coll = ${coll} AND id = ${id}`;
    return r[0]?.data ?? null;
  }

  async put(coll: string, id: string, data: unknown) {
    await this.init();
    const at = Date.now();
    await this.sql`
      INSERT INTO rows (coll, id, data, at)
      VALUES (${coll}, ${id}, ${JSON.stringify(data)}::jsonb, ${at})
      ON CONFLICT (coll, id) DO UPDATE SET data = EXCLUDED.data, at = EXCLUDED.at`;
  }

  async all(coll: string) {
    await this.init();
    const r = await this.sql`SELECT id, data, at FROM rows WHERE coll = ${coll} ORDER BY at ASC`;
    return r as Row[];
  }
}

let cached: Store | null = null;

export function db(): Store {
  if (!cached) {
    cached = process.env.POSTGRES_URL ? new PgStore() : new FileStore();
  }
  return cached;
}

/** Which backend is live, surfaced so a deploy cannot quietly run on files. */
export const backend = () => (process.env.POSTGRES_URL ? "postgres" : "files");
