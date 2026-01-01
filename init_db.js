const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const fs = require('fs');

const db = new sqlite3.Database('./family_financial.db');

const schema = fs.readFileSync('schema.sql', 'utf8');

db.serialize(async () => {
  db.exec(schema, async (err) => {
    if (err) {
      console.error('Error creating database schema:', err.message);
    } else {
      console.log('Database schema created.');
    }
    
    // Create default users with hashed passwords
    const users = [
      { name: 'Alok', email: 'alok@example.com', password: 'password123' },
      { name: 'Amol', email: 'amol@example.com', password: 'password123' },
      { name: 'Atul', email: 'atul@example.com', password: 'password123' },
      { name: 'Rashmi', email: 'rashmi@example.com', password: 'password123' }
    ];

    for (const user of users) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      db.run(
        'INSERT OR IGNORE INTO users (name, email, password_hash) VALUES (?, ?, ?)',
        [user.name, user.email, hashedPassword],
        (err) => {
          if (err) {
            console.error(`Error inserting user ${user.name}:`, err.message);
          } else {
            console.log(`User ${user.name} created successfully`);
          }
        }
      );
    }
    
    db.close();
  });
});