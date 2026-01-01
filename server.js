const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const session = require('express-session');
const path = require('path');

require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Import Supabase clients
const { supabase, supabaseAdmin } = require('./db');

// Middleware
app.use(cors({ 
  origin: process.env.CORS_ORIGINS.split(','),
  credentials: true
}));
app.use(bodyParser.json());
app.use(express.static('public'));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Helper function to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) {
    return next();
  }
  return res.status(401).json({ error: 'Authentication required' });
};

// Basic route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// POST /auth/login - user login
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  
  try {
    // Use admin client to bypass RLS for authentication
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, name, email, password_hash')
      .eq('email', email)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Set session
    req.session.userId = user.id;
    req.session.userName = user.name;
    req.session.email = user.email;
    
    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// POST /api/register - user registration
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    // Hash the password
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert new user using admin client to bypass RLS
    const { data, error } = await supabaseAdmin
      .from('users')
      .insert([
        {
          name: username,
          email: username,
          password_hash: passwordHash
        }
      ])
      .select();

    if (error) {
      // Check if it's a duplicate email error
      if (error.code === '23505') { // Unique violation
        return res.status(409).json({ error: 'Username already exists' });
      }
      console.error('Registration error:', error);
      return res.status(500).json({ error: 'Registration failed' });
    }

    res.json({ message: 'Registration successful' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /auth/logout - user logout
app.post('/auth/logout', (req, res) => {
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to logout' });
      }
      res.json({ message: 'Logout successful' });
    });
  } else {
    res.json({ message: 'No active session' });
  }
});

// GET /auth/me - get current user info
app.get('/auth/me', isAuthenticated, async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('id', req.session.userId)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Get user info error:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

// GET /dashboard/users - list all family members (protected)
app.get('/dashboard/users', isAuthenticated, async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, name, email')
      .order('name', { ascending: true });

    if (error) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    res.json(users || []);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// GET /dashboard/:user_id/monthly - monthly dashboard for a user (protected)
app.get('/dashboard/:user_id/monthly', isAuthenticated, async (req, res) => {
  const { user_id } = req.params;
  const { year, month } = req.query;
  
  // Check if user is accessing their own data
  if (req.session.userId !== user_id) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  try {
    // Validate user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, name')
      .eq('id', user_id)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const targetYear = year || currentYear;
    const targetMonth = month || currentMonth;
    
    // Format date for SQL query
    const dateFilter = `${targetYear}-${String(targetMonth).padStart(2, '0')}`;
    
    // Get total spending for the month
    const { data: totalData, error: totalError } = await supabase
      .from('expenses')
      .select('amount')
      .eq('user_id', user_id)
      .like('date', `${dateFilter}%`);

    if (totalError) {
      return res.status(500).json({ error: 'Database error' });
    }

    const total_spent = totalData ? totalData.reduce((sum, expense) => sum + parseFloat(expense.amount), 0) : 0;
    
    // Get top 5 categories by spending
    const { data: topCategories, error: topError } = await supabase
      .rpc('get_top_categories_monthly', {
        p_user_id: user_id,
        p_year: targetYear,
        p_month: targetMonth,
        p_limit: 5
      });

    if (topError) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    // Get all categories breakdown
    const { data: categoryBreakdown, error: breakdownError } = await supabase
      .rpc('get_category_breakdown_monthly', {
        p_user_id: user_id,
        p_year: targetYear,
        p_month: targetMonth
      });

    if (breakdownError) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    res.json({
      user: { id: user.id, name: user.name },
      period: { type: 'monthly', year: parseInt(targetYear), month: parseInt(targetMonth) },
      total_spent: total_spent,
      top_categories: topCategories || [],
      category_breakdown: categoryBreakdown || []
    });
  } catch (error) {
    console.error('Monthly dashboard error:', error);
    res.status(500).json({ error: 'Failed to get monthly dashboard' });
  }
});

// GET /dashboard/:user_id/yearly - yearly dashboard for a user (protected)
app.get('/dashboard/:user_id/yearly', isAuthenticated, async (req, res) => {
  const { user_id } = req.params;
  const { year } = req.query;
  
  // Check if user is accessing their own data
  if (req.session.userId !== user_id) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  try {
    // Validate user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, name')
      .eq('id', user_id)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const currentYear = new Date().getFullYear();
    const targetYear = year || currentYear;
    
    // Get total spending for the year
    const { data: totalData, error: totalError } = await supabase
      .from('expenses')
      .select('amount')
      .eq('user_id', user_id)
      .like('date', `${targetYear}%`);

    if (totalError) {
      return res.status(500).json({ error: 'Database error' });
    }

    const total_spent = totalData ? totalData.reduce((sum, expense) => sum + parseFloat(expense.amount), 0) : 0;
    
    // Get monthly trends for the year
    const { data: monthlyTrends, error: trendsError } = await supabase
      .rpc('get_monthly_trends_yearly', {
        p_user_id: user_id,
        p_year: targetYear
      });

    if (trendsError) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    // Get top 5 categories by spending for the year
    const { data: topCategories, error: topError } = await supabase
      .rpc('get_top_categories_yearly', {
        p_user_id: user_id,
        p_year: targetYear,
        p_limit: 5
      });

    if (topError) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    // Get all categories breakdown
    const { data: categoryBreakdown, error: breakdownError } = await supabase
      .rpc('get_category_breakdown_yearly', {
        p_user_id: user_id,
        p_year: targetYear
      });

    if (breakdownError) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    // Fill in missing months with 0
    const monthlyData = [];
    for (let m = 1; m <= 12; m++) {
      const monthStr = String(m).padStart(2, '0');
      const found = monthlyTrends ? monthlyTrends.find(t => t.month === monthStr) : null;
      monthlyData.push({
        month: m,
        month_name: new Date(targetYear, m - 1).toLocaleString('default', { month: 'long' }),
        amount: found ? parseFloat(found.amount) : 0
      });
    }
    
    res.json({
      user: { id: user.id, name: user.name },
      period: { type: 'yearly', year: parseInt(targetYear) },
      total_spent: total_spent,
      monthly_trends: monthlyData,
      top_categories: topCategories || [],
      category_breakdown: categoryBreakdown || []
    });
  } catch (error) {
    console.error('Yearly dashboard error:', error);
    res.status(500).json({ error: 'Failed to get yearly dashboard' });
  }
});

// POST /expenses - add new expense (protected)
app.post('/expenses', isAuthenticated, async (req, res) => {
  const { amount, date, category_id, payment_method_id, description } = req.body;
  const user_id = req.session.userId;
  
  if (!amount || !date || !category_id || !payment_method_id) {
    return res.status(400).json({ error: 'Amount, date, category, and payment method are required' });
  }
  
  try {
    const { data, error } = await supabase
      .from('expenses')
      .insert([
        {
          user_id: user_id,
          amount: parseFloat(amount),
          date: date,
          category_id: category_id,
          payment_method_id: payment_method_id,
          description: description || ''
        }
      ])
      .select();

    if (error) {
      console.error('Insert expense error:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    res.json({ 
      message: 'Expense added successfully',
      id: data[0].id 
    });
  } catch (error) {
    console.error('Add expense error:', error);
    res.status(500).json({ error: 'Failed to add expense' });
  }
});

// GET /expenses - list expenses with filters (protected)
app.get('/expenses', isAuthenticated, async (req, res) => {
  const { user_id, category_id, date_from, date_to } = req.query;
  
  // Only allow users to see their own expenses
  if (req.session.userId !== user_id) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  try {
    let query = supabase
      .from('expenses')
      .select(`
        *,
        category:categories(name),
        payment_method:payment_methods(name),
        user:users(name)
      `)
      .eq('user_id', user_id);

    if (category_id) {
      query = query.eq('category_id', category_id);
    }
    if (date_from) {
      query = query.gte('date', date_from);
    }
    if (date_to) {
      query = query.lte('date', date_to);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ error: 'Database error' });
    }

    // Transform the data to match the expected format
    const transformedData = data.map(expense => ({
      ...expense,
      category_name: expense.category?.name,
      payment_method_name: expense.payment_method?.name,
      user_name: expense.user?.name
    }));

    res.json(transformedData);
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({ error: 'Failed to get expenses' });
  }
});

// GET /categories
app.get('/categories', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    res.json(data || []);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to get categories' });
  }
});

// GET /payment-methods
app.get('/payment-methods', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('payment_methods')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    res.json(data || []);
  } catch (error) {
    console.error('Get payment methods error:', error);
    res.status(500).json({ error: 'Failed to get payment methods' });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});