import fs from 'node:fs';
import path from 'node:path';
import { readdir, readFile } from 'node:fs/promises';
import pg from 'pg';
import { PGlite } from '@electric-sql/pglite';

const databaseUrl = process.env.DATABASE_URL?.trim() ?? '';
const directUrl = process.env.DATABASE_URL_UNPOOLED?.trim() || databaseUrl;

let pool;
let localPromise;

function placeholders(sql) {
  let index = 0;
  return sql.replace(/\?/g, () => {
    index += 1;
    return `$${index}`;
  });
}

function statements(sql) {
  return sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean);
}

async function applyFiles(run) {
  const dir = path.join(process.cwd(), 'migrations');
  const files = (await readdir(dir).catch(() => [])).filter((file) => file.endsWith('.sql')).sort();
  await run('create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())');
  const doneRows = await run('select name from schema_migrations', [], true);
  const done = new Set(doneRows.map((row) => row.name));
  for (const file of files) {
    if (done.has(file)) continue;
    const text = await readFile(path.join(dir, file), 'utf8');
    await run('begin');
    try {
      for (const statement of statements(text)) await run(statement);
      await run('insert into schema_migrations (name) values ($1)', [file]);
      await run('commit');
      console.log(`migrate: applied ${file}`);
    } catch (error) {
      await run('rollback');
      throw error;
    }
  }
}

export async function migratePostgres() {
  if (!directUrl) {
    console.log('migrate: nothing to do');
    return;
  }
  const client = new pg.Client({ connectionString: directUrl });
  await client.connect();
  try {
    await client.query("set lock_timeout = '60s'");
    await client.query('select pg_advisory_lock(7272741)');
    await applyFiles(async (text, params = [], wantRows = false) => {
      const result = await client.query(text, params);
      return wantRows ? result.rows : result;
    });
  } finally {
    await client.end();
  }
}

async function localDatabase() {
  if (!localPromise) {
    localPromise = (async () => {
      const dir = path.join(process.cwd(), 'data', 'pglite');
      fs.mkdirSync(dir, { recursive: true });
      const db = new PGlite(dir);
      await db.exec(
        'create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())',
      );
      const dirFiles = path.join(process.cwd(), 'migrations');
      const files = (await readdir(dirFiles).catch(() => [])).filter((file) => file.endsWith('.sql')).sort();
      const done = new Set((await db.query('select name from schema_migrations')).rows.map((row) => row.name));
      for (const file of files) {
        if (done.has(file)) continue;
        const text = await readFile(path.join(dirFiles, file), 'utf8');
        await db.transaction(async (tx) => {
          for (const statement of statements(text)) await tx.exec(statement);
          await tx.query('insert into schema_migrations (name) values ($1)', [file]);
        });
        console.log(`migrate: applied ${file}`);
      }
      return db;
    })().catch((error) => {
      localPromise = undefined;
      throw error;
    });
  }
  return localPromise;
}

function bind(query) {
  return {
    async get(sql, ...params) {
      const rows = await query(placeholders(sql), params);
      return rows[0] ?? null;
    },
    async all(sql, ...params) {
      return query(placeholders(sql), params);
    },
    async run(sql, ...params) {
      await query(placeholders(sql), params);
    },
    async insert(sql, ...params) {
      const rows = await query(`${placeholders(sql)} returning id`, params);
      return Number(rows[0].id);
    },
    async transaction(fn) {
      return query.transaction(fn);
    },
  };
}

export async function openStore() {
  if (databaseUrl) {
    await migratePostgres();
    pool = new pg.Pool({ connectionString: databaseUrl, max: 5 });
    const query = async (text, params = []) => (await pool.query(text, params)).rows;
    query.transaction = async (fn) => {
      const client = await pool.connect();
      const tx = bind(async (text, params = []) => (await client.query(text, params)).rows);
      try {
        await client.query('begin');
        const result = await fn(tx);
        await client.query('commit');
        return result;
      } catch (error) {
        await client.query('rollback');
        throw error;
      } finally {
        client.release();
      }
    };
    return bind(query);
  }

  const db = await localDatabase();
  const query = async (text, params = []) => (await db.query(text, params)).rows;
  query.transaction = async (fn) => db.transaction(async (tx) => {
    const bound = bind(async (text, params = []) => (await tx.query(text, params)).rows);
    return fn(bound);
  });
  return bind(query);
}
