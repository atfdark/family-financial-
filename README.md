# Family Financial App

A comprehensive financial management application designed for family use, featuring income/expense tracking, recurring reminders, and detailed reporting. Built with a modern tech stack ensuring security, responsiveness, and ease of use.

## 🚀 Features

-   **Dashboard**: Real-time overview of your finances with an interactive Doughnut chart.
-   **Transaction Management**: Add, edit, and delete income and expense records.
-   **Recurring Reminders**: Set up monthly or yearly bill reminders (e.g., Insurance, Utilities).
-   **Financial Reporting**:
    -   **Summary Cards**: Quick view of Opening Balance, Income, Expenses, and Closing Balance.
    -   **Filters**: Filter transactions by Date, Month, Year, Category, and Payment Method.
    -   **Visualizations**: Dynamic charts showing expense breakdown by category.
    -   **Export**: Download transaction history as CSV or PDF (Monthly or Financial Year).
-   **Responsive Design**: Fully optimized for mobile devices (works great on S23 Ultra and similar screens).
-   **Secure Authentication**: JWT-based authentication with secure cookie handling.

## 🛠️ Tech Stack

### Frontend
-   **React 19**: Modern UI library for building interactive interfaces.
-   **TypeScript**: Ensures type safety and code quality.
-   **Tailwind CSS**: Utility-first CSS framework for rapid and responsive UI development.
-   **Shadcn UI**: Accessible and customizable component primitives.
-   **Chart.js**: For data visualization.
-   **React Router**: For client-side navigation.

### Backend
-   **Node.js & Express**: Robust server-side runtime and framework.
-   **SQLite**: Lightweight and reliable relational database.
-   **JWT (JSON Web Tokens)**: Secure stateless authentication.
-   **PDFKit**: For generating PDF reports.
-   **Fast-CSV**: For CSV data export.

## 📋 Prerequisites

-   **Node.js** (v14 or higher recommended)
-   **npm** (comes with Node.js)

## ⚡ Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/atfdark/family-financial-.git
    cd family-financial-
    ```

2.  **Install Backend Dependencies:**
    ```bash
    npm install
    ```

3.  **Install Frontend Dependencies:**
    ```bash
    cd react-frontend
    npm install
    cd ..
    ```

4.  **Database Setup:**
    The application uses SQLite. The database file (`family_financial.db`) will be automatically created in the root directory upon first run.

## 🚀 Running the Application

### Option 1: Unified Start (Recommended)
This command starts both the backend server and the React frontend concurrently.

1.  Open a terminal in the project root.
2.  Run:
    ```bash
    npm start
    ```
    -   **Backend**: http://localhost:8000
    -   **Frontend**: http://localhost:3000

### Option 2: Separate Processes
If you prefer identifying logs separately:

**Backend:**
```bash
npm run server
```

**Frontend:**
```bash
cd react-frontend
npm start
```

## 📱 Mobile Access (Local Network)

To access the app from your mobile device on the same network:

1.  Find your PC's local IP address (e.g., `192.168.1.5`).
2.  Update the frontend API configuration if necessary (usually robust enough to handle relative paths or configured hostnames).
3.  Open your mobile browser and navigate to `http://<YOUR_PC_IP>:3000`.

## 🔒 Security

-   **Authentication**: Users must register and log in to access the dashboard.
-   **Data Isolation**: User data is isolated; you only see your own transactions.
-   **Input Validation**: All inputs are sanitized and validated to prevent common attacks.
-   **Secure Cookies**: Auth tokens are stored in HttpOnly cookies to prevent XSS attacks.

## 📄 License

This project is licensed under the ISC License.
