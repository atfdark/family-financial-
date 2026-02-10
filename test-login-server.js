const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = 3002;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Test user data
const testUser = {
  id: 1,
  username: 'testuser',
  passwordHash: bcrypt.hashSync('TestPassword123!', 12)
};

// Login endpoint for testing
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (username !== testUser.username) {
        return res.status(401).json({ error: 'Invalid username or password' });
    }

    const isMatch = await bcrypt.compare(password, testUser.passwordHash);
    if (!isMatch) {
        return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Create JWT token
    const token = jwt.sign(
        { userId: testUser.id, username: testUser.username },
        process.env.JWT_SECRET || 'your-secret-key-change-in-production',
        { expiresIn: '24h' }
    );

    console.log('Generated JWT token:', token);

    // Try setting cookie in different ways
    res.setHeader('Set-Cookie', `jwt=${token}; HttpOnly; Path=/; Max-Age=86400; SameSite=Strict;`);
    
    res.json({
        message: 'Login successful',
        user: { id: testUser.id, username: testUser.username }
    });
});

// Protected endpoint for testing
app.get('/protected', (req, res) => {
    const token = req.cookies.jwt;
    
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized - No token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
        res.json({ 
            message: 'Access granted', 
            user: { id: decoded.userId, username: decoded.username }
        });
    } catch (error) {
        console.error('JWT verification error:', error);
        return res.status(401).json({ error: 'Unauthorized - Invalid token' });
    }
});

app.listen(PORT, () => {
    console.log(`Test login server running on port ${PORT}`);
    console.log(`http://localhost:${PORT}/login`);
    console.log(`http://localhost:${PORT}/protected`);
});
