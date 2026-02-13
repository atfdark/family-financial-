const express = require('express');
const bcrypt = require('bcryptjs');
const supabase = require('./services/supabase');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const { body, validationResult, query } = require('express-validator');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const PDFDocument = require('pdfkit');
const csv = require('fast-csv');

// Load environment variables
require('dotenv').config();

// Configuration
const NODE_ENV = process.env.NODE_ENV || 'development';
const PORT = process.env.PORT || 8000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

const { checkReminders } = require('./services/scheduler');

const app = express();

// Cron endpoint for Vercel
app.get('/api/cron', async (req, res) => {
  // Check for CRON_SECRET if it's set in environment variables
  if (process.env.CRON_SECRET) {
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  try {
    await checkReminders();
    res.json({ message: 'Cron job executed successfully' });
  } catch (error) {
    console.error('Cron job failed:', error);
    res.status(500).json({ error: 'Cron job failed' });
  }
});

// Custom CORS middleware to force headers
app.use((req, res, next) => {
  const origin = req.headers.origin;

  // Allow all origins or reflect the request origin
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
  } else {
    res.header('Access-Control-Allow-Origin', '*');
  }

  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.header('Access-Control-Allow-Credentials', 'true');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

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



// Authentication middleware
const requireAuth = (req, res, next) => {
  const token = req.cookies.jwt;

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
      req.userId = decoded.userId;
      console.log('JWT authentication successful for user ID:', req.userId);
      return next();
    } catch (error) {
      console.error('JWT verification error:', error);
      return res.status(401).json({ error: 'Unauthorized - Invalid token' });
    }
  }

  // Fallback to X-User-ID for backward compatibility
  const userId = req.headers['x-user-id'];
  if (userId) {
    const parsedId = parseInt(userId, 10);
    if (!isNaN(parsedId)) {
      req.userId = parsedId;
      console.log('X-User-ID authentication (deprecated) successful for user ID:', req.userId);
      return next();
    }
  }

  return res.status(401).json({ error: 'Unauthorized - No valid authentication provided' });
};



app.post('/api/register', registerLimiter, [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 }).withMessage('Username must be 3-30 characters')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username must contain only letters, numbers, and underscores'),
  body('password')
    .isLength({ min: 8, max: 128 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])/).withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
], async (req, res) => {
  console.log('Registration request received. Body:', req.body);

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  const { username, password } = req.body;

  try {
    // Check for existing user
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .maybeSingle();

    if (checkError) {
      console.error('Supabase error checking user:', checkError);
      return res.status(500).json({ error: 'Database error occurred' });
    }

    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Hash password
    const hash = await bcrypt.hash(password, 12);

    // Insert user
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({ username, password_hash: hash })
      .select()
      .single();

    if (insertError) {
      console.error('Supabase error inserting user:', insertError);
      return res.status(500).json({ error: 'Error creating user account' });
    }

    console.log('User registered successfully, ID:', newUser.id, 'for username:', username);
    res.status(200).json({ message: 'Registration successful' });

  } catch (err) {
    console.error('Registration exception:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});



app.post('/api/login', loginLimiter, [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  const { username, password } = req.body;
  console.log('Login attempt for username:', username);

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, password_hash')
      .eq('username', username)
      .maybeSingle();

    if (error) {
      console.error('Supabase error fetching user:', error);
      return res.status(500).json({ error: 'Database error occurred' });
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = jwt.sign({ userId: user.id, username: user.username }, process.env.JWT_SECRET || 'your-secret-key-change-in-production', { expiresIn: '24h' });

    res.cookie('jwt', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
      maxAge: 24 * 60 * 60 * 1000,
      path: '/'
    });

    res.json({
      message: 'Login successful',
      user: { id: user.id, username: user.username }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});



app.post('/api/logout', requireAuth, (req, res) => {
  res.cookie('jwt', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    expires: new Date(0),
    path: '/'
  });
  res.status(200).json({ message: 'Logout successful' });
});

app.get('/api/transactions', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', req.userId)
      .order('date', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error fetching transactions:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/transactions', requireAuth, [
  body('type').isIn(['income', 'expense']).withMessage('Type must be income or expense'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('description').trim().isLength({ min: 1, max: 500 }).withMessage('Description is required'),
  body('category').optional().trim().isLength({ max: 100 }),
  body('payment_method').optional().trim().isLength({ max: 100 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  const { type, amount, description, category, payment_method, date: requestDate } = req.body;
  const date = requestDate || new Date().toISOString();

  if (type === 'expense' && (!category || !category.trim())) {
    return res.status(400).json({ error: 'Category is required for expenses' });
  }

  try {
    const { data, error } = await supabase
      .from('transactions')
      .insert({
        user_id: req.userId,
        type,
        amount,
        description,
        category: category || null,
        payment_method: payment_method || null,
        date
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ message: 'Transaction added successfully', id: data.id });
  } catch (err) {
    console.error('Error inserting transaction:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/transactions/:id', requireAuth, [
  body('type').isIn(['income', 'expense']).withMessage('Type must be income or expense'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('description').trim().isLength({ min: 1, max: 500 }).withMessage('Description is required'),
  body('category').optional().trim().isLength({ max: 100 }),
  body('payment_method').optional().trim().isLength({ max: 100 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  const { id } = req.params;
  const { type, amount, description, category, payment_method } = req.body;

  if (type === 'expense' && (!category || !category.trim())) {
    return res.status(400).json({ error: 'Category is required for expenses' });
  }

  try {
    const { error } = await supabase
      .from('transactions')
      .update({
        type,
        amount,
        description,
        category: category || null,
        payment_method: payment_method || null
      })
      .eq('id', id)
      .eq('user_id', req.userId);

    if (error) throw error;
    res.json({ message: 'Transaction updated successfully' });
  } catch (err) {
    console.error('Error updating transaction:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

app.delete('/api/transactions/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)
      .eq('user_id', req.userId);

    if (error) throw error;
    res.json({ message: 'Transaction deleted successfully' });
  } catch (err) {
    console.error('Error deleting transaction:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

app.get('/api/user', requireAuth, async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username')
      .eq('id', req.userId)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

app.get('/api/reminders', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('user_id', req.userId)
      .order('due_date', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error fetching reminders:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

app.post('/api/reminders', requireAuth, [
  body('description').trim().isLength({ min: 1, max: 200 }).withMessage('Description is required'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be positive'),
  body('due_date').isISO8601().withMessage('Valid due date is required'),
  body('frequency').optional().isIn(['once', 'monthly', 'yearly']).withMessage('Frequency must be once, monthly, or yearly')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  const { description, amount, due_date, frequency } = req.body;

  try {
    const { data, error } = await supabase
      .from('reminders')
      .insert({
        user_id: req.userId,
        description,
        amount,
        due_date,
        frequency: frequency || 'once'
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ message: 'Reminder created successfully', id: data.id });
  } catch (err) {
    console.error('Error creating reminder:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

app.put('/api/reminders/:id', requireAuth, [
  body('is_paid').optional().isBoolean(),
  body('description').optional().trim().isLength({ min: 1, max: 200 }),
  body('amount').optional().isFloat({ min: 0.01 }),
  body('due_date').optional().isISO8601(),
  body('frequency').optional().isIn(['once', 'monthly', 'yearly'])
], async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    // Fetch reminder first
    const { data: reminder, error: fetchError } = await supabase
      .from('reminders')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.userId)
      .single();

    if (fetchError || !reminder) {
      return res.status(404).json({ error: 'Reminder not found' });
    }

    // Handle "mark as paid" logic
    if (updates.is_paid === true) {
      if (reminder.frequency === 'monthly') {
        const currentDueDate = new Date(reminder.due_date);
        const targetMonth = currentDueDate.getMonth() + 1;
        currentDueDate.setMonth(targetMonth);
        if (currentDueDate.getMonth() !== targetMonth % 12) {
          currentDueDate.setDate(0);
        }
        updates.due_date = currentDueDate.toISOString();
        updates.is_paid = false;
      } else if (reminder.frequency === 'yearly') {
        const currentDueDate = new Date(reminder.due_date);
        currentDueDate.setFullYear(currentDueDate.getFullYear() + 1);
        updates.due_date = currentDueDate.toISOString();
        updates.is_paid = false;
      }
    }

    const { error: updateError } = await supabase
      .from('reminders')
      .update(updates)
      .eq('id', id)
      .eq('user_id', req.userId);

    if (updateError) throw updateError;
    res.json({ message: 'Reminder updated successfully', updatedFields: updates });

  } catch (err) {
    console.error('Error updating reminder:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

app.delete('/api/reminders/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const { error } = await supabase
      .from('reminders')
      .delete()
      .eq('id', id)
      .eq('user_id', req.userId);

    if (error) throw error;
    res.json({ message: 'Reminder deleted successfully' });
  } catch (err) {
    console.error('Error deleting reminder:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

app.get('/api/health', (req, res) => {
  res.cookie('testcookie', 'testvalue', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    maxAge: 86400000
  });
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.post('/api/backup', requireAuth, (req, res) => {
  // Backups are handled by Supabase now
  res.status(501).json({ error: 'Backup functionality is managed by Supabase platform' });
});

app.get('/api/export/transactions', requireAuth, [
  query('format').isIn(['csv', 'pdf']).withMessage('Format must be csv or pdf'),
  query('month').optional().isInt({ min: 1, max: 12 }),
  query('year').isInt({ min: 2000, max: 2100 }),
  query('type').optional().isIn(['financial_year', 'month'])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  const { format, month, year, type } = req.query;
  const userId = req.userId;

  let startDate, endDate;
  let filenamePrefix = 'transactions';

  if (type === 'financial_year') {
    startDate = `${year}-04-01`;
    endDate = `${parseInt(year) + 1}-03-31`;
    filenamePrefix = `FY_${year}-${parseInt(year) + 1}`;
  } else {
    const m = month.toString().padStart(2, '0');
    startDate = `${year}-${m}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    endDate = `${year}-${m}-${lastDay}`;
    filenamePrefix = `${year}-${m}`;
  }

  try {
    const { data: rows, error } = await supabase
      .from('transactions')
      .select('date, type, category, amount, description, payment_method')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (error) throw error;

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${filenamePrefix}.csv`);

      const csvStream = csv.format({ headers: true });
      csvStream.pipe(res);
      rows.forEach(row => csvStream.write(row));
      csvStream.end();
    } else {
      // PDF Generation
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=${filenamePrefix}.pdf`);

      const doc = new PDFDocument({ margin: 30, size: 'A4' });
      doc.pipe(res);

      doc.fontSize(20).text('Transaction History', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Period: ${startDate} to ${endDate}`, { align: 'center' });
      doc.moveDown();

      const tableTop = 150;
      const colX = [30, 90, 140, 230, 380, 480];
      const colWidths = [60, 50, 90, 150, 100, 85];

      doc.font('Helvetica-Bold');
      doc.text('Date', colX[0], tableTop);
      doc.text('Type', colX[1], tableTop);
      doc.text('Category', colX[2], tableTop);
      doc.text('Description', colX[3], tableTop);
      doc.text('Method', colX[4], tableTop);
      doc.text('Amount', colX[5], tableTop, { align: 'right', width: colWidths[5] });

      doc.moveTo(30, tableTop + 15).lineTo(565, tableTop + 15).stroke();

      let y = tableTop + 25;
      doc.font('Helvetica').fontSize(9);

      let totalIncome = 0;
      let totalExpense = 0;

      rows.forEach((row) => {
        const descHeight = doc.heightOfString(row.description || '-', { width: colWidths[3] });
        const lineHeight = Math.max(20, descHeight);

        if (y + lineHeight > 750) {
          doc.addPage();
          y = 50;
        }

        if (row.type === 'income') {
          doc.fillColor('green');
          totalIncome += row.amount;
        } else {
          doc.fillColor('red');
          totalExpense += row.amount;
        }

        doc.text(row.date, colX[0], y);
        doc.text(row.type, colX[1], y);
        doc.fillColor('black');
        doc.text(row.category || '-', colX[2], y, { width: colWidths[2], ellipsis: true });
        doc.text(row.description || '-', colX[3], y, { width: colWidths[3], align: 'left' });
        doc.text(row.payment_method || '-', colX[4], y, { width: colWidths[4], ellipsis: true });

        if (row.type === 'income') doc.fillColor('green');
        else doc.fillColor('red');

        doc.text(row.amount.toFixed(2), colX[5], y, { align: 'right', width: colWidths[5] });
        doc.fillColor('black');

        y += lineHeight + 5;
      });

      doc.moveDown();
      doc.moveTo(30, y).lineTo(565, y).stroke();
      y += 10;
      doc.font('Helvetica-Bold').fontSize(12);
      doc.text(`Total Income: ${totalIncome.toFixed(2)}`, 30, y);
      doc.text(`Total Expense: ${totalExpense.toFixed(2)}`, 200, y);

      const netAmount = totalIncome - totalExpense;
      const netLabel = netAmount >= 0 ? 'Net Profit:' : 'Net Loss:';

      doc.text(`${netLabel} ${Math.abs(netAmount).toFixed(2)}`, 400, y, {
        align: 'right',
        color: netAmount >= 0 ? 'green' : 'red'
      });

      doc.end();
    }
  } catch (err) {
    console.error('Error exporting transactions:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

// Start server conditionally (only for local dev)
if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${NODE_ENV}`);
    console.log(`CORS Origin: ${CORS_ORIGIN}`);
  });
}

// Export the app for Vercel
module.exports = app;
// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  // process.exit(1); // Optional: Restart via PM2/Docker usually better
});
