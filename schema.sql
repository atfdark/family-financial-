CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE,
  password_hash TEXT,
  role TEXT DEFAULT 'user',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categories (
  id INTEGER PRIMARY KEY,
  name TEXT UNIQUE,
  description TEXT
);

CREATE TABLE payment_methods (
  id INTEGER PRIMARY KEY,
  name TEXT UNIQUE
);

CREATE TABLE expenses (
  id INTEGER PRIMARY KEY,
  user_id INTEGER,
  amount REAL,
  date DATE,
  category_id INTEGER,
  payment_method_id INTEGER,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(category_id) REFERENCES categories(id),
  FOREIGN KEY(payment_method_id) REFERENCES payment_methods(id)
);

CREATE INDEX idx_expenses_user_id ON expenses(user_id);
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_expenses_category_id ON expenses(category_id);
CREATE INDEX idx_expenses_payment_method_id ON expenses(payment_method_id);