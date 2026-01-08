# Dashboard JavaScript Documentation

## Overview

The `dashboard.js` file provides comprehensive JavaScript functionality for the Family Financial Dashboard, implementing all required features including authentication management, expense management, dashboard analytics, user interface interactions, and data visualization.

## Features Implemented

### 1. Authentication Management

#### JWT Token Handling
- **`getAuthHeaders()`**: Retrieves JWT token from localStorage and formats it for API requests
- **`authenticatedFetch()`**: Wrapper for fetch API that automatically handles authentication and token expiration
- **`checkAuthStatus()`**: Validates user session on page load and redirects to login if needed

#### User Session Management
- **`updateUserProfile()`**: Updates sidebar user information (name, email, initials)
- **`handleLogout()`**: Clears token and redirects to login page
- **`redirectToLogin()`**: Handles navigation to login page

#### Automatic Logout
- Token expiration detection in `authenticatedFetch()`
- Automatic redirection to login page when 401 Unauthorized is received
- Local storage cleanup on logout

### 2. Expense Management

#### Form Validation
- **`setupFormValidation()`**: Real-time validation for amount (negative values), date (future dates), and required fields
- **`validateExpenseForm()`**: Comprehensive form validation before submission
- **`resetExpenseForm()`**: Clears form and sets default date to today

#### API Integration
- **`handleExpenseSubmission()`**: Handles form submission with proper error handling
- **`getExpenseFormData()`**: Extracts and formats form data for API
- POST request to `/api/expenses` endpoint with proper authentication

#### Real-time Updates
- Dashboard refreshes automatically after successful expense addition
- User feedback through notifications

### 3. Dashboard Analytics

#### Data Fetching
- **`loadInitialData()`**: Loads categories, payment methods, and dashboard data
- **`loadCategories()`**: Fetches category list from `/api/categories`
- **`loadPaymentMethods()`**: Fetches payment methods from `/api/payment-methods`
- **`loadDashboard()`**: Main dashboard data loading with view-specific endpoints

#### Chart.js Integration

##### Category Breakdown (Pie Chart)
- **`renderCategoryChart()`**: Creates interactive pie chart showing expense distribution by category
- Features: Custom colors, tooltips with percentages, responsive design
- Chart type: Doughnut with hover effects and animations

##### Monthly Trends (Line Chart)
- **`renderMonthlyTrendsChart()`**: Line chart for yearly view showing monthly expense trends
- Features: Smooth line, area fill, data points, tooltips
- Only displayed in yearly view mode

#### Summary Cards
- **`updateSummaryCards()`**: Updates income, expenses, and balance cards
- **`getPeriodText()`**: Generates appropriate period text (e.g., "January 2024", "Year 2024")

#### Top Categories List
- **`renderTopCategories()`**: Populates top categories list with amounts and percentages
- Handles empty data gracefully with "No data" message

### 4. User Interface Interactions

#### View Switching
- **`switchView()`**: Handles Monthly/Yearly view switching
- Updates UI state and chart visibility
- Triggers dashboard reload with new view parameters

#### Date Range Selection
- **`populateDateControls()`**: Sets default month and year selections
- Event listeners for month/year changes trigger dashboard reload
- **`resetFilters()`**: Resets date controls to current month/year

#### Navigation
- Sidebar toggle functionality (responsive design)
- Active state management for navigation items
- Smooth transitions and hover effects

#### Form Handling
- Prevents default form submission behavior
- Proper error handling and user feedback
- Success notifications after operations

### 5. Data Visualization

#### Chart Animations
- Smooth animations on chart load and data updates
- Hover effects on chart segments/points
- Responsive chart resizing

#### Tooltip Implementations
- Category breakdown: Shows amount and percentage
- Monthly trends: Shows expense amount for specific month
- Formatted currency display in tooltips

#### Responsive Charts
- Charts resize automatically with window changes
- Mobile-friendly chart dimensions
- Proper aspect ratio maintenance

## Architecture

### Class Structure
```javascript
class FamilyFinancialDashboard {
    constructor() // Initialize dashboard
    init() // Setup event listeners and load data
    // Authentication methods
    // Expense management methods
    // Dashboard analytics methods
    // UI interaction methods
    // Utility methods
}
```

### Event-Driven Design
- DOMContentLoaded event initializes dashboard
- Form submissions handled through event listeners
- Date changes trigger dashboard reloads
- View switches update UI and data

### Error Handling
- Network error handling with user notifications
- Form validation with real-time feedback
- Graceful handling of empty data states
- Authentication error detection and handling

## API Endpoints Used

### Authentication
- `GET /api/auth/me` - Get current user information
- `POST /api/auth/logout` - Logout user

### Data Management
- `GET /api/categories` - Get expense categories
- `GET /api/payment-methods` - Get payment methods
- `POST /api/expenses` - Add new expense

### Dashboard Analytics
- `GET /api/dashboard/{user_id}/monthly?year={year}&month={month}` - Monthly view data
- `GET /api/dashboard/{user_id}/yearly?year={year}` - Yearly view data

## Styling Integration

### CSS Classes Used
- `.loading-overlay` - Loading spinner container
- `.notification` - Toast notifications
- `.card` - Dashboard card styling
- `.chart-container` - Chart wrapper styling
- `.btn-primary`, `.btn-secondary` - Button styling

### Responsive Design
- Mobile-first approach with media queries
- Sidebar collapse on mobile devices
- Grid layout adjustments for different screen sizes
- Touch-friendly interface elements

## Browser Compatibility

### Supported Features
- Modern browsers with ES6+ support
- Chart.js v3+ for data visualization
- Fetch API for network requests
- LocalStorage for session management

### Fallbacks
- Graceful degradation for unsupported features
- Error messages for network issues
- Loading states during data fetching

## Performance Optimizations

### Chart Management
- Chart instances destroyed before creating new ones
- Memory leak prevention
- Efficient data updates

### API Calls
- Minimal API requests through data batching
- Caching of static data (categories, payment methods)
- Efficient error handling to prevent retry loops

### DOM Manipulation
- Efficient DOM updates using innerHTML
- Event delegation where appropriate
- Minimal reflows and repaints

## Security Considerations

### Authentication
- JWT tokens stored in localStorage (consider httpOnly cookies for production)
- Automatic token cleanup on logout
- Request header injection prevention

### Input Validation
- Client-side form validation
- Server-side validation required (not implemented in JS)
- XSS prevention through proper escaping

## Future Enhancements

### Potential Improvements
- Service Worker for offline functionality
- WebSocket integration for real-time updates
- Advanced filtering and search capabilities
- Export functionality for reports
- Dark mode toggle
- Accessibility improvements (ARIA labels, keyboard navigation)

### Integration Points
- Easy integration with additional API endpoints
- Modular chart system for new visualizations
- Plugin architecture for extending functionality

## Usage Notes

### Initialization
The dashboard automatically initializes when the DOM is loaded:
```javascript
document.addEventListener('DOMContentLoaded', () => {
    new FamilyFinancialDashboard();
});
```

### Dependencies
- Chart.js (loaded via CDN in HTML)
- Modern browser with ES6+ support
- FastAPI backend with specified endpoints

### Configuration
- API endpoints can be configured in the JavaScript
- Chart colors and styling can be customized
- Date ranges and default views are configurable

This comprehensive implementation provides a robust, user-friendly financial dashboard with modern JavaScript practices and excellent user experience.