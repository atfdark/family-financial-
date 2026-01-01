# Family Financial Dashboard API Documentation

## Overview

The Family Financial Dashboard API provides simplified access to financial data for family members without requiring authentication. The system supports Alok, Amol, Atul, and Rashmi with monthly and yearly dashboard views.

## Base URL

```
http://localhost:3000
```

## Endpoints

### 1. List Family Members

**GET** `/dashboard/users`

Returns a list of all family members in the system.

**Response:**
```json
[
  {
    "id": 1,
    "name": "Alok",
    "email": "alok@example.com"
  },
  {
    "id": 2,
    "name": "Amol", 
    "email": "amol@example.com"
  },
  {
    "id": 3,
    "name": "Atul",
    "email": "atul@example.com"
  },
  {
    "id": 4,
    "name": "Rashmi",
    "email": "rashmi@example.com"
  }
]
```

### 2. Monthly Dashboard

**GET** `/dashboard/:user_id/monthly`

Returns monthly financial dashboard data for a specific user.

**Parameters:**
- `:user_id` (path): User ID (1-4 for Alok, Amol, Atul, Rashmi)
- `year` (query, optional): Year to analyze (default: current year)
- `month` (query, optional): Month to analyze (1-12, default: current month)

**Example:**
```
GET /dashboard/1/monthly?year=2025&month=1
```

**Response:**
```json
{
  "user": {
    "id": 1,
    "name": "Alok"
  },
  "period": {
    "type": "monthly",
    "year": 2025,
    "month": 1
  },
  "total_spent": 23333,
  "top_categories": [
    {
      "category": "Utilities",
      "amount": 14326,
      "percentage": 61.4
    },
    {
      "category": "Entertainment", 
      "amount": 3926,
      "percentage": 16.8
    }
  ],
  "category_breakdown": [
    {
      "category": "Utilities",
      "amount": 14326,
      "percentage": 61.4
    }
  ]
}
```

### 3. Yearly Dashboard

**GET** `/dashboard/:user_id/yearly`

Returns yearly financial dashboard data for a specific user.

**Parameters:**
- `:user_id` (path): User ID (1-4 for Alok, Amol, Atul, Rashmi)
- `year` (query, optional): Year to analyze (default: current year)

**Example:**
```
GET /dashboard/1/yearly?year=2025
```

**Response:**
```json
{
  "user": {
    "id": 1,
    "name": "Alok"
  },
  "period": {
    "type": "yearly",
    "year": 2025
  },
  "total_spent": 241976,
  "monthly_trends": [
    {
      "month": 1,
      "month_name": "January",
      "amount": 23333
    },
    {
      "month": 2,
      "month_name": "February", 
      "amount": 17165
    }
  ],
  "top_categories": [
    {
      "category": "Entertainment",
      "amount": 76057,
      "percentage": 31.4
    }
  ],
  "category_breakdown": [
    {
      "category": "Entertainment",
      "amount": 76057,
      "percentage": 31.4
    }
  ]
}
```

### 4. Categories

**GET** `/categories`

Returns all available expense categories.

**Response:**
```json
[
  {
    "id": 1,
    "name": "Food",
    "description": "Expenses related to food and dining"
  },
  {
    "id": 2,
    "name": "Transportation",
    "description": "Travel and commuting costs"
  }
]
```

### 5. Payment Methods

**GET** `/payment-methods`

Returns all available payment methods.

**Response:**
```json
[
  {
    "id": 1,
    "name": "Cash"
  },
  {
    "id": 2,
    "name": "Credit Card"
  }
]
```

### 6. Expenses (Admin/Debug)

**GET** `/expenses`

Returns expense data with optional filters.

**Parameters:**
- `user_id` (query, optional): Filter by user ID
- `category_id` (query, optional): Filter by category ID
- `date_from` (query, optional): Filter from date (YYYY-MM-DD)
- `date_to` (query, optional): Filter to date (YYYY-MM-DD)

## Dashboard Features

### Monthly Dashboard
- **Total Spending**: Sum of all expenses for the selected month
- **Top 5 Categories**: Categories with highest spending (amount and percentage)
- **Category Breakdown**: All categories with spending amounts and percentages
- **Interactive Charts**: Doughnut chart showing category distribution

### Yearly Dashboard
- **Total Spending**: Sum of all expenses for the selected year
- **Monthly Trends**: Monthly spending trend chart (12 months)
- **Top 5 Categories**: Categories with highest spending (amount and percentage)
- **Category Breakdown**: All categories with spending amounts and percentages
- **Interactive Charts**: Doughnut chart for categories, line chart for trends

## Frontend Interface

The dashboard is accessible at:
```
http://localhost:3000/
```

### Features
- **User Selection**: Dropdown to select family member (Alok, Amol, Atul, Rashmi)
- **View Toggle**: Switch between Monthly and Yearly views
- **Date Controls**: 
  - Monthly: Month and year selection
  - Yearly: Year selection
- **Dashboard Cards**:
  - Total spending amount
  - Top 5 expense categories list
  - Category breakdown pie chart
  - Monthly trends line chart (yearly view only)

### Technology Stack
- **Frontend**: HTML, CSS, JavaScript with Chart.js
- **Backend**: Node.js with Express
- **Database**: SQLite
- **Charts**: Chart.js for data visualization

## Data Structure

### Users
- Alok (ID: 1)
- Amol (ID: 2) 
- Atul (ID: 3)
- Rashmi (ID: 4)

### Categories
- Food
- Transportation
- Utilities
- Entertainment

### Payment Methods
- Cash
- Credit Card
- Debit Card
- UPI
- Other

## Error Handling

The API returns appropriate HTTP status codes and error messages:

- `400 Bad Request`: Invalid parameters
- `404 Not Found`: User not found
- `500 Internal Server Error`: Database errors

## No Authentication Required

Unlike the previous version, this dashboard system does not require:
- Login credentials
- JWT tokens
- Authentication headers
- Rate limiting

The system is designed for easy access by family members to view their financial data.

## Testing

### Sample API Calls

```bash
# Get all users
curl http://localhost:3000/dashboard/users

# Get Alok's January 2025 monthly dashboard
curl "http://localhost:3000/dashboard/1/monthly?year=2025&month=1"

# Get Amol's 2025 yearly dashboard
curl "http://localhost:3000/dashboard/2/yearly?year=2025"

# Get all categories
curl http://localhost:3000/categories
```

## Development

### Starting the Server
```bash
npm start
```

### Database Setup
```bash
# Initialize database structure
npm run init-db

# Populate with sample data
node populate_expenses.js
```

### Frontend Development
The frontend files are located in the `/public` directory:
- `index.html`: Main dashboard page
- `styles.css`: Styling and responsive design
- `dashboard.js`: JavaScript functionality and API calls