const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'attendance.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database ', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    db.run(`CREATE TABLE IF NOT EXISTS User (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS Class (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      schedule TEXT NOT NULL,
      teacherId INTEGER,
      FOREIGN KEY(teacherId) REFERENCES User(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS Attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      classId INTEGER,
      date TEXT DEFAULT CURRENT_TIMESTAMP,
      status TEXT,
      FOREIGN KEY(userId) REFERENCES User(id),
      FOREIGN KEY(classId) REFERENCES Class(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS UserData (
      userId INTEGER PRIMARY KEY,
      data_json TEXT NOT NULL,
      FOREIGN KEY(userId) REFERENCES User(id)
    )`);
  }
});

module.exports = db;
