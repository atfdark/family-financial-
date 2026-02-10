const express = require('express');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const db = require('./database');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();
const PORT = 8001;

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
const corsOrigins = ['http://localhost:3000'];

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

app.use(cors(corsOptions));

// Rate limiting for login endpoint
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: { error: 'Too many login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true
});

// Request size limits
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

app.use(cookieParser());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Test login endpoint that uses the actual database
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    
    // Find user in database
    const user = await new Promise((resolve, reject) => {
        db.get('SELECT id, username, password_hash FROM users WHERE username = ?', [username], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
    
    if (!user) {
        return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    // Create JWT token
    const token = jwt.sign({ userId: user.id, username: user.username }, 'your-secret-key-change-in-production', { expiresIn: '24h' });
    
    // Set cookie
    res.setHeader('Set-Cookie', `jwt=${token}; HttpOnly; Path=/; Max-Age=86400; SameSite=Strict`);
    
    console.log('Login successful for user:', username, 'Token:', token);
    console.log('Response headers:', res.getHeaders());
    
    res.json({
        message: 'Login successful',
        user: { id: user.id, username: user.username }
    });
});

// Test protected endpoint
app.get('/protected', (req, res) => {
    const token = req.cookies.jwt;
    
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }
    
    try {
        const decoded = jwt.verify(token, 'your-secret-key-change-in-production');
        res.json({
            message: 'Protected endpoint accessed successfully',
            user: decoded
        });
    } catch (error) {
        console.error('Token verification failed:', error);
        return res.status(401).json({ error: 'Invalid token' });
    }
});

app.listen(PORT, () => {
    console.log(`Minimal server running on port ${PORT}`);
    console.log(`http://localhost:${PORT}/login`);
    console.log(`http://localhost:${PORT}/protected`);
});
