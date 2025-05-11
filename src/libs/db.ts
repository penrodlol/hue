import { type SQLiteDatabase } from 'expo-sqlite';
import { z } from 'zod';

export const DB_NAME = z.string().parse(process.env.EXPO_PUBLIC_DB_NAME);
export const DB_VERSION = z.coerce.number().parse(process.env.EXPO_PUBLIC_DB_VERSION);

export async function initDB(db: SQLiteDatabase) {
  const rs = await z.object({ user_version: z.number() }).safeParseAsync(await db.getFirstAsync('PRAGMA user_version'));
  if (!rs.success || rs.data.user_version >= DB_VERSION) return;
  (await migrations[rs.data.user_version]?.(db))?.execAsync(`PRAGMA user_version = ${DB_VERSION}`);
}

const migrations: Record<string, (db: SQLiteDatabase) => Promise<SQLiteDatabase>> = {
  '0': async (db: SQLiteDatabase) => db,
};
