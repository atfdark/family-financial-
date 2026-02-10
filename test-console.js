const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 8002;

app.use(express.json());
app.use(cookieParser());

app.post('/test-login', (req, res) => {
    const { username } = req.body;
    
    const token = jwt.sign({ userId: 123, username: username }, 'your-secret-key-change-in-production', { expiresIn: '24h' });
    
    console.log('Generated token:', token);
    
    res.setHeader('Set-Cookie', `jwt=${token}; HttpOnly; Path=/; Max-Age=86400; SameSite=Strict`);
    
    const headers = res.getHeaders();
    console.log('Response headers:', headers);
    console.log('Set-Cookie header:', headers['set-cookie']);
    
    res.json({
        message: 'Login successful',
        user: { id: 123, username: username },
        token: token,
        headers: headers
    });
});

app.listen(PORT, () => {
    console.log(`Test server running on port ${PORT}`);
    console.log(`Test login endpoint: http://localhost:${PORT}/test-login`);
});
