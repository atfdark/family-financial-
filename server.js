const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('./database');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const { body, validationResult } = require('express-validator');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

// Load environment variables
require('dotenv').config();

// Configuration
const NODE_ENV = process.env.NODE_ENV || 'development';
const PORT = process.env.PORT || 8000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';
const DATABASE_PATH = process.env.DATABASE_PATH || './family_financial.db';

const app = express();

// Custom CORS middleware to force headers
app.use((req, res, next) => {

  // Allow requests from frontend
  res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.header('Access-Control-Allow-Credentials', 'true');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});



// Security headers with helmet (temporarily disabled to test cookie setting)
// app.use(helmet({
//   contentSecurityPolicy: {
//     directives: {
//       defaultSrc: ["'self'"],
//       styleSrc: ["'self'", "'unsafe-inline'"],
//       scriptSrc: ["'self'"],
//       imgSrc: ["'self'", "data:", "https:"],
//       connectSrc: ["'self'"],
//       fontSrc: ["'self'"],
//       objectSrc: ["'none'"],
//       mediaSrc: ["'self'"],
//       frameSrc: ["'none'"],
//     },
//   },
//   hsts: {
//     maxAge: 31536000,
//     includeSubDomains: true,
//     preload: true
//   },
//   noSniff: true,
//   xssFilter: true,
//   referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
// }));



// Request size limits
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Rate limiting for login endpoint
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: { error: 'Too many login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true
});

// Rate limiting for registration endpoint
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 registrations per hour
  message: { error: 'Too many registration attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true
});

// General API rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});



// Serve static files from public directory - this must come first
app.use(express.static(path.join(__dirname, 'public')));

// Parse cookies
app.use(cookieParser());

// Input sanitization middleware
const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    if (typeof obj === 'string') {
      return obj.trim().replace(/[<>]/g, '');
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }
    if (obj && typeof obj === 'object') {
      const sanitized = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          sanitized[key] = sanitize(obj[key]);
        }
      }
      return sanitized;
    }
    return obj;
  };

  req.body = sanitize(req.body);
  req.query = sanitize(req.query);
  req.params = sanitize(req.params);
  next();
};

app.use(sanitizeInput);

// Apply API rate limiting
app.use('/api', apiLimiter);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

// Authentication middleware - supports both JWT cookies and X-User-ID for backward compatibility
const requireAuth = (req, res, next) => {
  // Check for JWT token in cookies
  const token = req.cookies.jwt;

  if (token) {
    try {
      // Verify the token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
      req.userId = decoded.userId;
      console.log('JWT authentication successful for user ID:', req.userId);
      return next();
    } catch (error) {
      console.error('JWT verification error:', error);
      return res.status(401).json({ error: 'Unauthorized - Invalid token' });
    }
  }

  // Fallback to X-User-ID for backward compatibility (deprecated)
  const userId = req.headers['x-user-id'];
  if (userId) {
    req.userId = parseInt(userId, 10);
    if (!isNaN(req.userId)) {
      console.log('X-User-ID authentication (deprecated) successful for user ID:', req.userId);
      return next();
    }
  }

  return res.status(401).json({ error: 'Unauthorized - No valid authentication provided' });
};

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'register.html'));
});

app.post('/register', registerLimiter, [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 }).withMessage('Username must be 3-30 characters')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username must contain only letters, numbers, and underscores'),
  body('password')
    .isLength({ min: 8, max: 128 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])/).withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
], (req, res) => {
  console.log('Registration request received. Body:', req.body);

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('Validation failed:', errors.array());
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  const { username, password } = req.body;

  console.log('Checking for existing user...');
  db.get('SELECT id FROM users WHERE username = ?', [username], (err, row) => {
    if (err) {
      console.log('Database error during check:', err);
      return res.status(500).json({ error: 'Database error occurred' });
    }

    if (row) {
      console.log('User already exists');
      return res.status(400).json({ error: 'Username already exists' });
    }

    console.log('Hashing password...');
    bcrypt.hash(password, 12, (err, hash) => {
      if (err) {
        console.log('Error hashing password:', err);
        return res.status(500).json({ error: 'Error processing password' });
      }

      console.log('Inserting user into database...');
      db.run('INSERT INTO users (username, password_hash) VALUES (?, ?)', [username, hash], function (err) {
        if (err) {
          console.log('Error inserting user:', err);
          return res.status(500).json({ error: 'Error creating user account' });
        }

        console.log('User registered successfully, ID:', this.lastID, 'for username:', username);
        res.status(200).json({ message: 'Registration successful' });
      });
    });
  });
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

app.post('/login', loginLimiter, [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('Validation failed:', errors.array());
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  const { username, password } = req.body;
  console.log('Login attempt for username:', username);

  try {
    // Find user in database
    const user = await new Promise((resolve, reject) => {
      db.get('SELECT id, username, password_hash FROM users WHERE username = ?', [username], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!user) {
      console.log('User not found for username:', username);
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      console.log('Password mismatch for username:', username);
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Create JWT token
    const token = jwt.sign({ userId: user.id, username: user.username }, process.env.JWT_SECRET || 'your-secret-key-change-in-production', { expiresIn: '24h' });

    // Set cookie
    res.cookie('jwt', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: '/'
    });

    console.log('Login successful for user:', username, 'Token:', token);
    console.log('Response headers:', res.getHeaders());

    res.json({
      message: 'Login successful',
      user: { id: user.id, username: user.username }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

app.post('/api/logout', requireAuth, (req, res) => {
  // Clear the JWT cookie
  res.cookie('jwt', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
    expires: new Date(0), // Set to past date to expire immediately
    path: '/'
  });

  console.log('Logout successful for user ID:', req.userId);
  res.status(200).json({ message: 'Logout successful' });
});

app.get('/api/transactions', requireAuth, (req, res) => {
  const userId = req.userId;
  db.all('SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC', [userId], (err, rows) => {
    if (err) {
      console.error('Database error fetching transactions:', err);
      return res.status(500).json({ error: 'Database error occurred' });
    }
    res.json(rows);
  });
});

app.post('/api/transactions', requireAuth, [
  body('type').isIn(['income', 'expense']).withMessage('Type must be income or expense'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('description').trim().isLength({ min: 1, max: 500 }).withMessage('Description is required'),
  body('category').optional().trim().isLength({ max: 100 }),
  body('payment_method').optional().trim().isLength({ max: 100 })
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  const { type, amount, description, category, payment_method } = req.body;
  const userId = req.userId;

  if (type === 'expense' && (!category || !category.trim())) {
    return res.status(400).json({ error: 'Category is required for expenses' });
  }

  const { date: requestDate } = req.body;
  const date = requestDate || new Date().toISOString();

  db.run('INSERT INTO transactions (user_id, type, amount, description, category, payment_method, date) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [userId, type, amount, description, category || null, payment_method || null, date], function (err) {
      if (err) {
        console.error('Database error inserting transaction:', err);
        return res.status(500).json({ error: 'Database error occurred' });
      }
      res.json({ message: 'Transaction added successfully', id: this.lastID });
    });
});

app.put('/api/transactions/:id', requireAuth, [
  body('type').isIn(['income', 'expense']).withMessage('Type must be income or expense'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('description').trim().isLength({ min: 1, max: 500 }).withMessage('Description is required'),
  body('category').optional().trim().isLength({ max: 100 }),
  body('payment_method').optional().trim().isLength({ max: 100 })
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  const { id } = req.params;
  const transactionId = parseInt(id, 10);
  if (!Number.isInteger(transactionId) || transactionId <= 0) {
    return res.status(400).json({ error: 'Invalid transaction ID' });
  }
  const { type, amount, description, category, payment_method } = req.body;
  const userId = req.userId; // Keep userId for consistency with existing code, though req.user.id is also available

  if (type === 'expense' && (!category || !category.trim())) {
    return res.status(400).json({ error: 'Category is required for expenses' });
  }

  // The instruction implies updating the date as well, or using COALESCE.
  // For simplicity, we'll assume date is not updated unless explicitly provided,
  // or we can just update the other fields.
  // If date is meant to be updated, it should be part of req.body and validation.
  // For now, let's update the fields provided in the instruction.
  db.run('UPDATE transactions SET type = ?, amount = ?, description = ?, category = ?, payment_method = ? WHERE id = ? AND user_id = ?',
    [type, amount, description, category || null, payment_method || null, transactionId, userId], function (err) {
      if (err) {
        console.error('Database error updating transaction:', err);
        return res.status(500).json({ error: 'Database error occurred' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Transaction not found or not authorized' });
      }
      res.json({ message: 'Transaction updated successfully' });
    });
});

app.delete('/api/transactions/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const transactionId = parseInt(id, 10);
  if (!Number.isInteger(transactionId) || transactionId <= 0) {
    return res.status(400).json({ error: 'Invalid transaction ID' });
  }
  const userId = req.userId;

  db.run('DELETE FROM transactions WHERE id = ? AND user_id = ?', [transactionId, userId], function (err) {
    if (err) {
      console.error('Database error deleting transaction:', err);
      return res.status(500).json({ error: 'Database error occurred' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Transaction not found or not authorized' });
    }
    res.json({ message: 'Transaction deleted successfully' });
  });
});

app.get('/api/user', requireAuth, (req, res) => {
  const userId = req.userId;
  db.get('SELECT id, username FROM users WHERE id = ?', [userId], (err, row) => {
    if (err) {
      console.error('Database error fetching user:', err);
      return res.status(500).json({ error: 'Database error occurred' });
    }
    if (!row) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ id: row.id, username: row.username });
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.cookie('testcookie', 'testvalue', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
    maxAge: 86400000
  });
  res.setHeader('Set-Cookie', 'manualcookie=manualvalue; HttpOnly; Path=/; Max-Age=86400; SameSite=Strict');
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    cookies: req.cookies
  });
});

// Simple test endpoint to check routing
app.get('/simple-test', (req, res) => {
  res.json({ message: 'Simple test endpoint is working!' });
});

// Test endpoint to set cookie without database interaction
app.post('/test-login', (req, res) => {
  const { username } = req.body;

  // Create a simple JWT token for testing
  const token = jwt.sign(
    { userId: 123, username: username },
    process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    { expiresIn: '24h' }
  );

  console.log('Generated test JWT token:', token);

  // Try to set cookie
  res.setHeader('Set-Cookie', `jwt=${token}; HttpOnly; Path=/; Max-Age=86400; SameSite=Strict`);

  console.log('Response headers after setting cookie:', res.getHeaders());

  res.json({
    message: 'Test login successful',
    user: { id: 123, username: username }
  });
});

// Backup endpoint
app.post('/api/backup', requireAuth, (req, res) => {
  const dbPath = DATABASE_PATH;
  const backupDir = path.join(__dirname, 'backups');

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `backup-${timestamp}.db`);

  try {
    fs.copyFileSync(dbPath, backupPath);
    console.log('✅ Backup created:', backupPath);
    res.json({
      message: 'Backup created successfully',
      backupPath: backupPath,
      timestamp: timestamp
    });
  } catch (error) {
    console.error('❌ Backup failed:', error);
    res.status(500).json({ error: 'Failed to create backup' });
  }
});



// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);

  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'CORS not allowed for this origin' });
  }

  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

function startServer() {
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log('Server running on port', PORT);
    console.log(`http://localhost:${PORT}`);
    console.log('Environment:', NODE_ENV);
    console.log('CORS origins:', CORS_ORIGIN);
  });
  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
