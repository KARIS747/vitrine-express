import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const wrangler = resolve(root, 'node_modules/.bin/wrangler');
const database = 'vitrine_express_db';
const args = process.argv.slice(2);
const isRemote = args.includes('--remote');
const isLocal = args.includes('--local');

if (isRemote === isLocal) {
  console.error('Usage: node scripts/migrate-d1.mjs --local|--remote');
  process.exit(1);
}

const scopeFlag = isRemote ? '--remote' : '--local';

function runSql(command) {
  const output = execFileSync(
    wrangler,
    ['d1', 'execute', database, scopeFlag, '--json', '--command', command],
    { cwd: root, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 },
  );
  const start = output.indexOf('[');
  const end = output.lastIndexOf(']');
  if (start < 0 || end < start) return [];
  return JSON.parse(output.slice(start, end + 1));
}

function rows(sql) {
  const [batch] = runSql(sql);
  return batch?.results ?? [];
}

function markApplied(id) {
  runSql(`INSERT OR IGNORE INTO schema_migrations (id) VALUES ('${id}')`);
}

runSql('CREATE TABLE IF NOT EXISTS schema_migrations (id TEXT PRIMARY KEY, applied_at TEXT DEFAULT CURRENT_TIMESTAMP)');

const applied = new Set(rows('SELECT id FROM schema_migrations').map((row) => row.id));

const migrations = [
  {
    id: '0001_store_contact_columns',
    run() {
      const columns = new Set(rows("SELECT name FROM pragma_table_info('stores')").map((row) => row.name));
      const definitions = {
        contact_preference: "TEXT DEFAULT 'whatsapp'",
        contact_email: 'TEXT',
        country: "TEXT DEFAULT 'Cameroun'",
      };

      for (const [column, definition] of Object.entries(definitions)) {
        if (!columns.has(column)) {
          runSql(`ALTER TABLE stores ADD COLUMN ${column} ${definition}`);
          console.info(`[migrate:${scopeFlag}] added stores.${column}`);
        }
      }

      runSql("UPDATE stores SET whatsapp_number = '237681610040', phone_call = '+237 681 61 00 40' WHERE id = 'store_demo_1'");
    },
  },
  {
    id: '0002_analytics_events',
    run() {
      runSql(`CREATE TABLE IF NOT EXISTS analytics_events (
        id TEXT PRIMARY KEY,
        event TEXT NOT NULL,
        store_ref TEXT,
        campaign TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`);
      runSql('CREATE INDEX IF NOT EXISTS idx_analytics_events_event ON analytics_events(event)');
      runSql('CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events(created_at)');
    },
  },
];

for (const migration of migrations) {
  if (applied.has(migration.id)) {
    console.info(`[migrate:${scopeFlag}] skip ${migration.id} (already applied)`);
    continue;
  }
  migration.run();
  markApplied(migration.id);
  console.info(`[migrate:${scopeFlag}] applied ${migration.id}`);
}
