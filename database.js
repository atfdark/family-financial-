const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Hardcoded database path for single-link deployment
const dbPath = './family_financial.db';

// Configuration
const DB_CONFIG = {
  // Connection pool settings
  busyTimeout: 5000,
  // Backup settings
  backupDir: path.join(__dirname, 'backups'),
  maxBackups: 10,
  backupInterval: 24 * 60 * 60 * 1000, // 24 hours
};

// Create database with proper mode for concurrent access
const db = new sqlite3.Database(dbPath, { mode: sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE }, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err.message);
    process.exit(1);
  } else {
    console.log('✅ Connected to SQLite database:', dbPath);
  }
});

// Enable WAL mode for better concurrent access
db.run('PRAGMA journal_mode = WAL', (err) => {
  if (err) {
    console.error('⚠️  Warning: Could not enable WAL mode:', err.message);
  } else {
    console.log('✅ WAL mode enabled for better concurrent access');
  }
});

// Enable foreign key enforcement - must be set before any operations
db.run('PRAGMA foreign_keys = ON', (err) => {
  if (err) {
    console.error('❌ Error enabling foreign keys:', err.message);
  } else {
    console.log('✅ SQLite foreign_keys PRAGMA enabled');
  }
});

// Set busy timeout for handling concurrent access
db.run(`PRAGMA busy_timeout = ${DB_CONFIG.busyTimeout}`, (err) => {
  if (err) {
    console.error('⚠️  Warning: Could not set busy timeout:', err.message);
  } else {
    console.log(`✅ Busy timeout set to ${DB_CONFIG.busyTimeout}ms`);
  }
});

// Data sanitization functions
const sanitizers = {
  // Sanitize string input
  string: (value) => {
    if (typeof value !== 'string') return value;
    return value
      .trim()
      .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
      .slice(0, 10000); // Limit length
  },

  // Sanitize numeric input
  number: (value) => {
    const num = parseFloat(value);
    if (isNaN(num)) return null;
    return num;
  },

  // Sanitize transaction type
  transactionType: (value) => {
    if (value === 'income' || value === 'expense') {
      return value;
    }
    return null;
  },

  // Sanitize date input
  date: (value) => {
    const date = new Date(value);
    if (isNaN(date.getTime())) return null;
    return date.toISOString();
  },
};

// Data sanitization middleware for database operations
function sanitizeData(data, typeMap) {
  const sanitized = {};
  for (const key in data) {
    if (data.hasOwnProperty(key)) {
      const type = typeMap[key] || 'string';
      const sanitizer = sanitizers[type] || sanitizers.string;
      sanitized[key] = sanitizer(data[key]);
    }
  }
  return sanitized;
}

// Backup functions
function createBackup() {
  return new Promise((resolve, reject) => {
    // Create backups directory if it doesn't exist
    if (!fs.existsSync(DB_CONFIG.backupDir)) {
      fs.mkdirSync(DB_CONFIG.backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(DB_CONFIG.backupDir, `backup-${timestamp}.db`);

    fs.copyFile(dbPath, backupPath, (err) => {
      if (err) {
        console.error('❌ Backup creation failed:', err.message);
        reject(err);
        return;
      }

      console.log('✅ Backup created:', backupPath);

      // Clean up old backups
      cleanupOldBackups();
      resolve(backupPath);
    });
  });
}

function cleanupOldBackups() {
  if (!fs.existsSync(DB_CONFIG.backupDir)) return;

  const files = fs.readdirSync(DB_CONFIG.backupDir)
    .filter(file => file.startsWith('backup-') && file.endsWith('.db'))
    .map(file => ({
      name: file,
      path: path.join(DB_CONFIG.backupDir, file),
      time: fs.statSync(path.join(DB_CONFIG.backupDir, file)).mtime
    }))
    .sort((a, b) => b.time - a.time);

  // Keep only the most recent backups
  if (files.length > DB_CONFIG.maxBackups) {
    const toDelete = files.slice(DB_CONFIG.maxBackups);
    toDelete.forEach(file => {
      fs.unlinkSync(file.path);
      console.log('🗑️  Old backup removed:', file.name);
    });
  }
}

function restoreBackup(backupPath) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(backupPath)) {
      reject(new Error('Backup file not found'));
      return;
    }

    // Close current connection
    db.close((err) => {
      if (err) {
        console.error('❌ Error closing database for restore:', err.message);
        reject(err);
        return;
      }

      // Copy backup over current database
      fs.copyFile(backupPath, dbPath, (err) => {
        if (err) {
          console.error('❌ Error restoring backup:', err.message);
          reject(err);
          return;
        }

        console.log('✅ Backup restored:', backupPath);

        // Reopen database connection
        const newDb = new sqlite3.Database(dbPath, { mode: sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE }, (err) => {
          if (err) {
            console.error('❌ Error reopening database:', err.message);
            reject(err);
            return;
          }

          // Enable WAL mode for better concurrent access
          newDb.run('PRAGMA journal_mode = WAL', (err) => {
            if (err) {
              console.error('⚠️  Warning: Could not enable WAL mode:', err.message);
            } else {
              console.log('✅ WAL mode enabled for better concurrent access');
            }
          });

          // Enable foreign key enforcement
          newDb.run('PRAGMA foreign_keys = ON', (err) => {
            if (err) {
              console.error('❌ Error enabling foreign keys:', err.message);
            } else {
              console.log('✅ SQLite foreign_keys PRAGMA enabled');
            }
          });

          // Set busy timeout for handling concurrent access
          newDb.run(`PRAGMA busy_timeout = ${DB_CONFIG.busyTimeout}`, (err) => {
            if (err) {
              console.error('⚠️  Warning: Could not set busy timeout:', err.message);
            }
          });

          // Update the db reference
          db = newDb;
          console.log('✅ Database connection restored');
          resolve();
        });
      });
    });
  });
}

// Use serialize to ensure tables are created in order
db.serialize(() => {
  // Create users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) {
      console.error('❌ Error creating users table:', err.message);
    } else {
      console.log('✅ Users table ready');
    }
  });

  // Create transactions table with proper constraints
  db.run(`CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
    amount REAL NOT NULL CHECK(amount > 0),
    description TEXT NOT NULL,
    category TEXT,
    payment_method TEXT,
    date TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  )`, (err) => {
    if (err) {
      console.error('❌ Error creating transactions table:', err.message);
    } else {
      console.log('✅ Transactions table ready');

      // Check if payment_method column exists (migration for existing dbs)
      db.all("PRAGMA table_info(transactions)", [], (err, rows) => {
        if (!err) {
          const hasPaymentMethod = rows.some(row => row.name === 'payment_method');
          if (!hasPaymentMethod) {
            db.run(`ALTER TABLE transactions ADD COLUMN payment_method TEXT`, (err) => {
              if (err) console.error('❌ Error adding payment_method column:', err.message);
              else console.log('✅ Added payment_method column to transactions');
            });
          }
        }
      });
    }
  });

  // Create indexes for better query performance
  db.run(`CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id)`, (err) => {
    if (err) {
      console.error('⚠️  Warning: Could not create index on transactions.user_id:', err.message);
    } else {
      console.log('✅ Index on transactions.user_id created');
    }
  });

  db.run(`CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC)`, (err) => {
    if (err) {
      console.error('⚠️  Warning: Could not create index on transactions.date:', err.message);
    } else {
      console.log('✅ Index on transactions.date created');
    }
  });
});

// Graceful shutdown handler
const gracefulShutdown = (signal) => {
  console.log(`\n📡 ${signal} received, closing database connection...`);

  db.close((err) => {
    if (err) {
      console.error('❌ Error closing database:', err.message);
      process.exit(1);
    } else {
      console.log('✅ Database connection closed');
      process.exit(0);
    }
  });

  // Force exit after 5 seconds if database doesn't close
  setTimeout(() => {
    console.error('⚠️  Forced shutdown after timeout');
    process.exit(1);
  }, 5000);
};

// Handle multiple termination signals
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGHUP', () => gracefulShutdown('SIGHUP'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

// Retry logic for database operations
function withRetry(operation, maxRetries = 3, delay = 1000) {
  return new Promise((resolve, reject) => {
    let attempts = 0;

    const attempt = () => {
      attempts++;
      operation()
        .then(resolve)
        .catch((err) => {
          if (attempts < maxRetries && err.code === 'SQLITE_BUSY') {
            console.log(`Database busy, retrying (${attempts}/${maxRetries})...`);
            setTimeout(attempt, delay * attempts);
          } else {
            reject(err);
          }
        });
    };

    attempt();
  });
}

// Export database with error handling wrapper
module.exports = {
  // Wrap db.get with error handling and retry
  get: function (sql, params, callback) {
    withRetry(() => {
      return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
          if (err) {
            console.error('Database query error (get):', err.message);
            console.error('SQL:', sql);
            console.error('Params:', params);
            reject(err);
          } else {
            resolve(row);
          }
        });
      });
    })
      .then(row => callback(null, row))
      .catch(err => callback(err, null));
  },

  // Wrap db.all with error handling and retry
  all: function (sql, params, callback) {
    withRetry(() => {
      return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
          if (err) {
            console.error('Database query error (all):', err.message);
            console.error('SQL:', sql);
            console.error('Params:', params);
            reject(err);
          } else {
            resolve(rows);
          }
        });
      });
    })
      .then(rows => callback(null, rows))
      .catch(err => callback(err, null));
  },

  // Wrap db.run with error handling and retry
  run: function (sql, params, callback) {
    withRetry(() => {
      return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
          if (err) {
            console.error('Database query error (run):', err.message);
            console.error('SQL:', sql);
            console.error('Params:', params);
            reject(err);
          } else {
            resolve(this);
          }
        });
      });
    })
      .then(result => callback(null, result))
      .catch(err => callback(err));
  },

  // Expose the raw database for advanced usage if needed
  raw: db,

  // Export utility functions
  sanitizers,
  sanitizeData,
  createBackup,
  restoreBackup,
  cleanupOldBackups,
};

// Start periodic backup if not in test environment
if (process.env.NODE_ENV !== 'test') {
  setInterval(() => {
    console.log('🔄 Creating scheduled backup...');
    createBackup()
      .then(() => console.log('✅ Scheduled backup completed'))
      .catch(err => console.error('❌ Scheduled backup failed:', err));
  }, DB_CONFIG.backupInterval);
}
