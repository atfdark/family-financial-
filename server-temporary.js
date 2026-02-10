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

// Security headers with helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

// CORS configuration
const corsOrigins = [CORS_ORIGIN];

const corsOptions = {
  origin: function(origin, callback) {
    if (!origin || corsOrigins.indexOf(origin) !== -1 || corsOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

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

// Parse cookies
app.use(cookieParser());

// Apply CORS
app.use(cors(corsOptions));

// Login endpoint only
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
        res.setHeader('Set-Cookie', `jwt=${token}; HttpOnly; Path=/; Max-Age=86400; SameSite=Strict${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
        
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

function startServer() {
    const server = app.listen(PORT, () => {
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
