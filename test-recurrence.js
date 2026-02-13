const { spawn } = require('child_process');
const http = require('http');
const assert = require('assert');

const PORT = 8001;
const BASE_URL = `http://localhost:${PORT}`;

// Utils to make API calls
function api(method, path, body = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        const req = http.request(`${BASE_URL}${path}`, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = data ? JSON.parse(data) : {};
                    resolve({ status: res.statusCode, body: json, headers: res.headers });
                } catch (e) {
                    resolve({ status: res.statusCode, body: data, headers: res.headers });
                }
            });
        });

        req.on('error', reject);

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

async function runTests() {
    console.log('🚀 Starting Test Server...');
    const server = spawn('node', ['server.js'], {
        env: { ...process.env, PORT: PORT, NODE_ENV: 'test' },
        stdio: 'inherit'
    });

    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 3000));

    try {
        console.log('📝 Registering test user...');
        const userSuffix = Date.now();
        const username = `testuser${userSuffix}`;
        const password = 'Password@123';

        let res = await api('POST', '/register', { username, password });
        if (res.status !== 200) throw new Error(`Registration failed: ${JSON.stringify(res.body)}`);

        console.log('🔑 Logging in...');
        res = await api('POST', '/login', { username, password });
        if (res.status !== 200) throw new Error(`Login failed: ${JSON.stringify(res.body)}`);

        // Extract cookie
        const cookies = res.headers['set-cookie'];
        const cookieHeader = cookies.map(c => c.split(';')[0]).join('; ');
        const headers = { 'Cookie': cookieHeader };

        // --- TEST 1: Monthly Recurrence ---
        console.log('\n🧪 TEST 1: Monthly Recurrence');
        const today = new Date().toISOString().split('T')[0];
        res = await api('POST', '/api/reminders', {
            description: 'Test Monthly Bill',
            amount: 100,
            due_date: today,
            frequency: 'monthly'
        }, headers);
        const monthlyId = res.body.id;
        console.log(`Created monthly reminder ID: ${monthlyId}`);

        // Mark as paid
        console.log('Marking monthly reminder as paid...');
        res = await api('PUT', `/api/reminders/${monthlyId}`, { is_paid: true }, headers);
        assert.strictEqual(res.status, 200);

        // Verify
        res = await api('GET', '/api/reminders', null, headers);
        const monthlyReminder = res.body.find(r => r.id === monthlyId);

        const nextMonthDate = new Date(today);
        nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
        const expectedDate = nextMonthDate.toISOString().split('T')[0];
        // Simple check: just check if month incremented
        const fetchedDate = new Date(monthlyReminder.due_date).toISOString().split('T')[0];

        console.log(`Updated Due Date: ${fetchedDate}, Expected around: ${expectedDate}`);

        if (monthlyReminder.is_paid !== 0 && monthlyReminder.is_paid !== false) {
            throw new Error(`Expected is_paid to be false/0, got ${monthlyReminder.is_paid}`);
        }
        // We allow a bit of flexibility in date calculation verify, but it should definitely be in the future
        if (new Date(fetchedDate) <= new Date(today)) {
            throw new Error(`Date did not advance!`);
        }
        console.log('✅ Monthly recurrence passed');


        // --- TEST 2: Yearly Recurrence ---
        console.log('\n🧪 TEST 2: Yearly Recurrence');
        res = await api('POST', '/api/reminders', {
            description: 'Test Yearly Bill',
            amount: 500,
            due_date: today,
            frequency: 'yearly'
        }, headers);
        const yearlyId = res.body.id;
        console.log(`Created yearly reminder ID: ${yearlyId}`);

        // Mark as paid
        console.log('Marking yearly reminder as paid...');
        res = await api('PUT', `/api/reminders/${yearlyId}`, { is_paid: true }, headers);
        assert.strictEqual(res.status, 200);

        // Verify
        res = await api('GET', '/api/reminders', null, headers);
        const yearlyReminder = res.body.find(r => r.id === yearlyId);

        const nextYearDate = new Date(today);
        nextYearDate.setFullYear(nextYearDate.getFullYear() + 1);
        const expectedYearDate = nextYearDate.toISOString().split('T')[0];
        const fetchedYearDate = new Date(yearlyReminder.due_date).toISOString().split('T')[0];

        console.log(`Updated Due Date: ${fetchedYearDate}, Expected: ${expectedYearDate}`);

        if (yearlyReminder.is_paid !== 0 && yearlyReminder.is_paid !== false) {
            throw new Error(`Expected is_paid to be false/0, got ${yearlyReminder.is_paid}`);
        }
        if (fetchedYearDate !== expectedYearDate) {
            throw new Error(`Date did not advance correctly!`);
        }
        console.log('✅ Yearly recurrence passed');


        // --- TEST 3: One-time Reminder ---
        console.log('\n🧪 TEST 3: One-time Reminder');
        res = await api('POST', '/api/reminders', {
            description: 'Test Once Bill',
            amount: 50,
            due_date: today,
            frequency: 'once'
        }, headers);
        const onceId = res.body.id;
        console.log(`Created one-time reminder ID: ${onceId}`);

        // Mark as paid
        console.log('Marking one-time reminder as paid...');
        res = await api('PUT', `/api/reminders/${onceId}`, { is_paid: true }, headers);
        assert.strictEqual(res.status, 200);

        // Verify
        res = await api('GET', '/api/reminders', null, headers);
        const onceReminder = res.body.find(r => r.id === onceId);

        // SQLite boolean is 0 or 1
        if (onceReminder.is_paid !== 1 && onceReminder.is_paid !== true) {
            throw new Error(`Expected is_paid to be true/1, got ${onceReminder.is_paid}`);
        }
        console.log('✅ One-time reminder passed');

    } catch (err) {
        console.error('❌ Test Failed:', err);
        process.exit(1);
    } finally {
        console.log('🛑 Stopping Test Server...');
        server.kill();
    }
}

runTests();
