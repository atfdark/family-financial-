require('dotenv').config();
const jwt = require('jsonwebtoken');

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization token required' });
  }

  const token = authHeader.substring(7);
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  if (req.method === 'POST') {
    const { amount, date, category_id, payment_method_id, description } = req.body;
    const user_id = decoded.userId;

    if (!amount || !date || !category_id || !payment_method_id) {
      return res.status(400).json({ error: 'Amount, date, category, and payment method are required' });
    }

    try {
      const { supabase } = require('../../db');

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
  } else if (req.method === 'GET') {
    const { user_id, category_id, date_from, date_to } = req.query;

    if (decoded.userId !== user_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    try {
      const { supabase } = require('../../db');

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
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}