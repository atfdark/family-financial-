const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

const db = new sqlite3.Database('./family_financial.db');

const defaultPassword = 'password123';
const hashedPassword = bcrypt.hashSync(defaultPassword, 10);

db.serialize(() => {
  // Insert categories
  const categories = [
    { name: 'Food', description: 'Expenses related to food and dining' },
    { name: 'Transportation', description: 'Travel and commuting costs' },
    { name: 'Utilities', description: 'Bills for electricity, water, etc.' },
    { name: 'Entertainment', description: 'Leisure and entertainment expenses' }
  ];

  const categoryStmt = db.prepare('INSERT INTO categories (name, description) VALUES (?, ?)');
  categories.forEach(cat => {
    categoryStmt.run(cat.name, cat.description);
  });
  categoryStmt.finalize();

  // Insert payment methods
  const paymentMethods = ['Cash', 'Credit Card', 'Debit Card', 'UPI', 'Other'];
  const pmStmt = db.prepare('INSERT INTO payment_methods (name) VALUES (?)');
  paymentMethods.forEach(pm => {
    pmStmt.run(pm);
  });
  pmStmt.finalize();

  // Insert users
  const users = [
    { name: 'Alok', email: 'alok@example.com' },
    { name: 'Amol', email: 'amol@example.com' },
    { name: 'Atul', email: 'atul@example.com' },
    { name: 'Rashmi', email: 'rashmi@example.com' }
  ];

  const userStmt = db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)');
  users.forEach(user => {
    userStmt.run(user.name, user.email, hashedPassword);
  });
  userStmt.finalize();

  console.log('Initial data populated.');
  db.close();
});