const express = require('express');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = 3001;

app.use(cookieParser());

app.get('/test-cookie', (req, res) => {
    console.log('Setting test cookie');
    res.cookie('test-jwt', 'test-token-value', {
        httpOnly: true,
        secure: false,
        sameSite: 'Strict',
        maxAge: 24 * 60 * 60 * 1000
    });
    
    res.setHeader('Set-Cookie', 'manual-test-cookie=manual-token-value; HttpOnly; Path=/; Max-Age=86400; SameSite=Strict');
    
    console.log('Response headers after cookie set:', res.getHeaders());
    
    res.json({
        message: 'Cookie test',
        cookies: req.cookies,
        headers: res.getHeaders()
    });
});

app.listen(PORT, () => {
    console.log(`Test server running on port ${PORT}`);
    console.log(`http://localhost:${PORT}/test-cookie`);
});
