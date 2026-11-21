import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

let dbInstance: Database.Database | null = null;

export const SEED_ROOMS = [
  { id: 1, name: 'Atlas', capacity: 4, floor: 1, amenities: 'monitor' },
  { id: 2, name: 'Borealis', capacity: 8, floor: 1, amenities: 'projector, whiteboard' },
  { id: 3, name: 'Cascade', capacity: 12, floor: 2, amenities: 'projector, video-conferencing' },
  { id: 4, name: 'Delta', capacity: 20, floor: 3, amenities: 'projector, video-conferencing, whiteboard' },
  { id: 5, name: 'Ember', capacity: 2, floor: 2, amenities: '(none)' },
];

export function getDatabase(customPath?: string): Database.Database {
  if (customPath) {
    const db = new Database(customPath);
    initDatabaseSchema(db);
    return db;
  }

  if (dbInstance) {
    return dbInstance;
  }

  const dbPath = process.env.DATABASE_PATH || './data/workspace.db';
  const resolvedPath = path.isAbsolute(dbPath)
    ? dbPath
    : path.resolve(process.cwd(), dbPath);

  const dir = path.dirname(resolvedPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(resolvedPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');

  initDatabaseSchema(db);

  dbInstance = db;
  return dbInstance;
}

export function initDatabaseSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      capacity INTEGER NOT NULL,
      floor INTEGER NOT NULL,
      amenities TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      organizer_email TEXT NOT NULL,
      attendees INTEGER NOT NULL,
      start TEXT NOT NULL,
      end TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'confirmed',
      created_at TEXT NOT NULL,
      FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_bookings_room_status_start ON bookings(room_id, status, start);
    CREATE INDEX IF NOT EXISTS idx_bookings_organizer_status ON bookings(organizer_email, status);
    CREATE INDEX IF NOT EXISTS idx_bookings_start ON bookings(start);
  `);

  // Seed rooms if not present
  const countRow = db.prepare('SELECT COUNT(*) as count FROM rooms').get() as { count: number };
  if (countRow.count === 0) {
    const insert = db.prepare(`
      INSERT INTO rooms (id, name, capacity, floor, amenities)
      VALUES (@id, @name, @capacity, @floor, @amenities)
    `);

    const insertMany = db.transaction((rooms: typeof SEED_ROOMS) => {
      for (const r of rooms) {
        insert.run(r);
      }
    });

    insertMany(SEED_ROOMS);
  }
}
