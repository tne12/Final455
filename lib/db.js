// lib/db.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');  // pure‑JS, no install pain


// Resolve the absolute path for the database file (history.db) in the project root
const dbPath = path.resolve(process.cwd(), 'history.db');
console.log("Database path:", dbPath);

// Open or create the SQLite database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Error opening database:", err);
  } else {
    console.log("Database opened successfully at", dbPath);
  }
});

// Create the encryption_history table if it doesn't exist
const createTableQuery = `
  CREATE TABLE IF NOT EXISTS encryption_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    cipher_type TEXT,
    plaintext TEXT,
    encrypted_text TEXT,
    operation TEXT,
    key_a INTEGER,
    key_b INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`;

// after your history table creation…
const createUsersTable = `
  CREATE TABLE IF NOT EXISTS users (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    name           TEXT    NOT NULL,
    email          TEXT    UNIQUE NOT NULL,
    password_hash  TEXT    NOT NULL,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`;
db.run(createUsersTable, (err) => {
  if (err) console.error("Error creating users table:", err);
  else console.log("Table 'users' OK");
});



db.run(createTableQuery, (err) => {
  if (err) {
    console.error("Error creating table:", err);
  } else {
    console.log("Table 'encryption_history' created or already exists.");
  }
});

// Function to insert history data into the database

const insertHistory = (user_id, cipher_type, plaintext, encrypted_text, key_a, key_b, operation) => {
  return new Promise((resolve, reject) => {
    const sql = `
      INSERT INTO encryption_history
        (user_id, cipher_type, plaintext, encrypted_text, operation, key_a, key_b)
      VALUES (?, ?, ?, ?, ?, ?, ?);
    `;
    db.run(sql,
      [user_id, cipher_type, plaintext, encrypted_text, operation, key_a, key_b],
      function(err) {
        if (err) return reject(err);
        resolve(this.lastID);
      }
    );
  });
};


// Function to fetch history data from the database
function fetchHistory(user_id) {
  return new Promise((resolve, reject) => {
    const sql = user_id
      ? `SELECT * FROM encryption_history WHERE user_id = ? ORDER BY created_at DESC`
      : `SELECT * FROM encryption_history ORDER BY created_at DESC`;
    const params = user_id ? [user_id] : [];
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
};

const deleteHistory = (id) => {
  return new Promise((resolve, reject) => {
    db.run(
      "DELETE FROM encryption_history WHERE id = ?",
      [id],
      function (err) {
        if (err) return reject(err);
        resolve(this.changes);  // number of rows deleted (should be 1)
      }
    );
  });
};


const deleteAllHistory = (user_id) => {
  return new Promise((resolve, reject) => {
    db.run(
      `DELETE FROM encryption_history WHERE user_id = ?`,
      [user_id],
      function(err) {
        if (err) return reject(err);
        resolve(this.changes);
      }
    );
  });
};

function createUser(name, email, password) {
  return new Promise(async (resolve, reject) => {
    try {
      const hash = await bcrypt.hash(password, 10);
      db.run(
        `INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)`,
        [name, email, hash],
        function (err) {
          if (err) return reject(err);
          resolve({ id: this.lastID, name, email });
        }
      );
    } catch (e) {
      reject(e);
    }
  });
}

function authenticateUser(email, password) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT id, name, email, password_hash FROM users WHERE email = ?`,
      [email],
      async (err, row) => {
        if (err) return reject(err);
        if (!row) return resolve(null);
        const ok = await bcrypt.compare(password, row.password_hash);
        if (!ok) return resolve(null);
        resolve({ id: row.id, name: row.name, email: row.email });
      }
    );
  });
}

function findUserByEmail(email) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT * FROM users WHERE email = ?`,
      [email],
      (err, row) => {
        if (err) return reject(err);
        resolve(row || null);
      }
    );
  });
}

module.exports = {
  db,
  insertHistory,
  fetchHistory,
  deleteHistory,
  deleteAllHistory,
  createUser,
  authenticateUser,
  findUserByEmail
}

