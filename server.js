const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const db = require('./database');
const multer = require('multer');

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(multer().any());
app.use(session({
  secret: 'family-financial-secret',
  resave: false,
  saveUninitialized: true
}));
app.use(express.static('.'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/login.html');
});

const requireAuth = (req, res, next) => {
   console.log('Auth check - Session user ID:', req.session.userId);
   if (!req.session.userId) {
     console.log('Auth failed - No session user ID, redirecting to login');
     return res.redirect('/login');
   }
   console.log('Auth successful - User ID:', req.session.userId);
   next();
 };

app.get('/register', (req, res) => {
  res.sendFile(__dirname + '/register.html');
});

app.post('/register', (req, res) => {
   console.log('Registration request received. Body:', req.body);
   const { username, password } = req.body;

   if (!username || !password) {
     console.log('Validation failed: Missing fields');
     return res.status(400).json({ error: 'Username and password are required' });
   }

   if (password.length < 6) {
     console.log('Validation failed: Password too short');
     return res.status(400).json({ error: 'Password must be at least 6 characters' });
   }

   console.log('Checking for existing user...');
   db.get('SELECT id FROM users WHERE username = ?', [username], (err, row) => {
     if (err) {
       console.log('Database error during check:', err);
       return res.status(500).json({ error: 'Database error' });
     }

     if (row) {
       console.log('User already exists');
       return res.status(400).json({ error: 'Username already exists' });
     }

     console.log('Hashing password...');
     bcrypt.hash(password, 10, (err, hash) => {
       if (err) {
         console.log('Error hashing password:', err);
         return res.status(500).json({ error: 'Error hashing password' });
       }

       console.log('Inserting user into database...');
       db.run('INSERT INTO users (username, password_hash) VALUES (?, ?)', [username, hash], function(err) {
         if (err) {
           console.log('Error inserting user:', err);
           return res.status(500).json({ error: 'Error creating user' });
         }

         console.log('User registered successfully, ID:', this.lastID);
         res.json({ message: 'User registered successfully' });
       });
     });
   });
 });

app.get('/login', (req, res) => {
  res.sendFile(__dirname + '/login.html');
});

app.post('/login', (req, res) => {
   const { username, password } = req.body;
   console.log('Login attempt for username:', username);

   if (!username || !password) {
     console.log('Validation failed: Missing username or password');
     return res.status(400).json({ error: 'Username and password are required' });
   }

   db.get('SELECT id, password_hash FROM users WHERE username = ?', [username], (err, row) => {
     if (err) {
       console.log('Database error during login:', err);
       return res.status(500).json({ error: 'Database error' });
     }

     if (!row) {
       console.log('User not found for username:', username);
       return res.status(401).json({ error: 'Invalid username or password' });
     }

     bcrypt.compare(password, row.password_hash, (err, isMatch) => {
       if (err) {
         console.log('Error verifying password:', err);
         return res.status(500).json({ error: 'Error verifying password' });
       }

       if (!isMatch) {
         console.log('Password mismatch for username:', username);
         return res.status(401).json({ error: 'Invalid username or password' });
       }

       req.session.userId = row.id;
       console.log('Login successful for username:', username, 'User ID:', row.id, 'redirecting to dashboard');
       res.redirect('/dashboard');
     });
   });
 });

app.get('/dashboard', requireAuth, (req, res) => {
   console.log('Dashboard access granted for user ID:', req.session.userId);
   res.sendFile(__dirname + '/dashboard.html');
 });

app.get('/api/transactions', requireAuth, (req, res) => {
    const userId = req.session.userId;
    db.all('SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC', [userId], (err, rows) => {
       if (err) {
          return res.status(500).json({ error: 'Database error' });
       }
       res.json(rows);
    });
 });

app.post('/api/transactions', requireAuth, (req, res) => {
    const { type, amount, description, category } = req.body;
    const userId = req.session.userId;

    if (!type || !amount || !description) {
        return res.status(400).json({ error: 'Type, amount, and description are required' });
    }

    if (amount <= 0) {
        return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    if (!description.trim()) {
        return res.status(400).json({ error: 'Description cannot be empty' });
    }

    if (type === 'expense' && (!category || !category.trim())) {
        return res.status(400).json({ error: 'Category is required for expenses' });
    }

    const date = new Date().toISOString();

    db.run('INSERT INTO transactions (user_id, type, amount, description, category, date) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, type, amount, description, category || null, date], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ message: 'Transaction added successfully' });
    });
});

app.get('/api/user', requireAuth, (req, res) => {
    const userId = req.session.userId;
    db.get('SELECT username FROM users WHERE id = ?', [userId], (err, row) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        if (!row) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ username: row.username });
    });
});

app.post('/logout', requireAuth, (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Logout failed' });
        }
        res.json({ message: 'Logged out successfully' });
    });
});

app.listen(8000, () => {
   console.log('Server running on port 8000');
});