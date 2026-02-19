import sqlite3 from "sqlite3";

export const db = new sqlite3.Database("./spotter.db");

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT,
      password TEXT,
      role TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT,
      width INTEGER,
      height INTEGER,
      state TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS labels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      image_id INTEGER,
      created_by INTEGER,
      xmin REAL,
      ymin REAL,
      xmax REAL,
      ymax REAL
    )
  `);

  // Seed Users
  db.run(
    `INSERT OR IGNORE INTO users (id, email, password, role)
     VALUES (1, 'annotator@test.com', 'password', 'Annotator')`
  );

  db.run(
    `INSERT OR IGNORE INTO users (id, email, password, role)
     VALUES (2, 'admin@test.com', 'password', 'Admin')`
  );
});