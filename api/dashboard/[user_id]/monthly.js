require('dotenv').config();
const jwt = require('jsonwebtoken');

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
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

  const { user_id } = req.query;
  const { year, month } = req.query;

  if (decoded.userId !== user_id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    const { supabase } = require('../../../db');

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

    const dateFilter = `${targetYear}-${String(targetMonth).padStart(2, '0')}`;

    const { data: totalData, error: totalError } = await supabase
      .from('expenses')
      .select('amount')
      .eq('user_id', user_id)
      .like('date', `${dateFilter}%`);

    if (totalError) {
      return res.status(500).json({ error: 'Database error' });
    }

    const total_spent = totalData ? totalData.reduce((sum, expense) => sum + parseFloat(expense.amount), 0) : 0;

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
}