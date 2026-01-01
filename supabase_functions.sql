-- Supabase Database Functions for Family Financial Management System

-- Function to get top categories for a specific month
CREATE OR REPLACE FUNCTION get_top_categories_monthly(
  p_user_id UUID,
  p_year INTEGER,
  p_month INTEGER,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE(
  category TEXT,
  amount DECIMAL,
  percentage DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.name::TEXT as category,
    SUM(e.amount)::DECIMAL as amount,
    (SUM(e.amount) * 100.0 / NULLIF((SELECT SUM(amount) FROM expenses WHERE user_id = p_user_id AND EXTRACT(YEAR FROM date) = p_year AND EXTRACT(MONTH FROM date) = p_month), 0))::DECIMAL as percentage
  FROM expenses e 
  JOIN categories c ON e.category_id = c.id 
  WHERE e.user_id = p_user_id 
    AND EXTRACT(YEAR FROM e.date) = p_year 
    AND EXTRACT(MONTH FROM e.date) = p_month
  GROUP BY c.id, c.name 
  ORDER BY amount DESC 
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get category breakdown for a specific month
CREATE OR REPLACE FUNCTION get_category_breakdown_monthly(
  p_user_id UUID,
  p_year INTEGER,
  p_month INTEGER
)
RETURNS TABLE(
  category TEXT,
  amount DECIMAL,
  percentage DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.name::TEXT as category,
    SUM(e.amount)::DECIMAL as amount,
    (SUM(e.amount) * 100.0 / NULLIF((SELECT SUM(amount) FROM expenses WHERE user_id = p_user_id AND EXTRACT(YEAR FROM date) = p_year AND EXTRACT(MONTH FROM date) = p_month), 0))::DECIMAL as percentage
  FROM expenses e 
  JOIN categories c ON e.category_id = c.id 
  WHERE e.user_id = p_user_id 
    AND EXTRACT(YEAR FROM e.date) = p_year 
    AND EXTRACT(MONTH FROM e.date) = p_month
  GROUP BY c.id, c.name 
  ORDER BY amount DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get monthly trends for a specific year
CREATE OR REPLACE FUNCTION get_monthly_trends_yearly(
  p_user_id UUID,
  p_year INTEGER
)
RETURNS TABLE(
  month TEXT,
  amount DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    LPAD(EXTRACT(MONTH FROM e.date)::TEXT, 2, '0')::TEXT as month,
    SUM(e.amount)::DECIMAL as amount
  FROM expenses e 
  WHERE e.user_id = p_user_id 
    AND EXTRACT(YEAR FROM e.date) = p_year
  GROUP BY EXTRACT(MONTH FROM e.date)
  ORDER BY month;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get top categories for a specific year
CREATE OR REPLACE FUNCTION get_top_categories_yearly(
  p_user_id UUID,
  p_year INTEGER,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE(
  category TEXT,
  amount DECIMAL,
  percentage DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.name::TEXT as category,
    SUM(e.amount)::DECIMAL as amount,
    (SUM(e.amount) * 100.0 / NULLIF((SELECT SUM(amount) FROM expenses WHERE user_id = p_user_id AND EXTRACT(YEAR FROM date) = p_year), 0))::DECIMAL as percentage
  FROM expenses e 
  JOIN categories c ON e.category_id = c.id 
  WHERE e.user_id = p_user_id 
    AND EXTRACT(YEAR FROM e.date) = p_year
  GROUP BY c.id, c.name 
  ORDER BY amount DESC 
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get category breakdown for a specific year
CREATE OR REPLACE FUNCTION get_category_breakdown_yearly(
  p_user_id UUID,
  p_year INTEGER
)
RETURNS TABLE(
  category TEXT,
  amount DECIMAL,
  percentage DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.name::TEXT as category,
    SUM(e.amount)::DECIMAL as amount,
    (SUM(e.amount) * 100.0 / NULLIF((SELECT SUM(amount) FROM expenses WHERE user_id = p_user_id AND EXTRACT(YEAR FROM date) = p_year), 0))::DECIMAL as percentage
  FROM expenses e 
  JOIN categories c ON e.category_id = c.id 
  WHERE e.user_id = p_user_id 
    AND EXTRACT(YEAR FROM e.date) = p_year
  GROUP BY c.id, c.name 
  ORDER BY amount DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;