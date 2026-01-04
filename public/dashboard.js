// Dashboard JavaScript functionality
class FamilyDashboard {
    constructor() {
        this.currentView = 'monthly';
        this.currentUser = null;
        this.currentYear = new Date().getFullYear();
        this.currentMonth = new Date().getMonth() + 1;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.populateYears();

        // Check if user is already logged in
        this.checkAuthStatus();
    }

    getAuthHeaders() {
        const token = localStorage.getItem('jwt_token');
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    }

    async authenticatedFetch(url, options = {}) {
        const headers = { ...this.getAuthHeaders(), ...options.headers };
        const response = await fetch(url, { ...options, headers });
        if (response.status === 401) {
            localStorage.removeItem('jwt_token');
            this.showLogin();
            throw new Error('Unauthorized');
        }
        return response;
    }

    setupEventListeners() {
        // Login form
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        // Register button
        const registerBtn = document.getElementById('register-btn');
        if (registerBtn) {
            registerBtn.addEventListener('click', () => {
                this.handleRegister();
            });
        }

        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.handleLogout();
            });
        }

        // View type buttons
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentView = e.target.dataset.view;
                this.toggleDateControls();
            });
        });

        // Load dashboard button
        document.getElementById('load-dashboard').addEventListener('click', () => {
            this.loadDashboard();
        });

        // Clear form button
        document.getElementById('clear-form').addEventListener('click', () => {
            this.clearForm();
        });

        // Add reminder button
        const addReminderBtn = document.getElementById('add-reminder');
        if (addReminderBtn) {
            addReminderBtn.addEventListener('click', () => {
                this.addReminder();
            });
        }

        // Expense form submission
        document.getElementById('expense-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addExpense();
        });

        // Keyboard support
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && document.getElementById('login-page').style.display !== 'none') {
                this.handleLogin();
            } else if (e.key === 'Enter' && document.getElementById('dashboard-view').style.display !== 'none') {
                this.loadDashboard();
            }
        });
    }

    async checkAuthStatus() {
        const token = localStorage.getItem('jwt_token');
        if (token) {
            try {
                const response = await this.authenticatedFetch('/auth/me');
                if (response.ok) {
                    const data = await response.json();
                    this.currentUser = data.user;
                    this.showDashboard();
                    this.updateUserInfo();
                } else {
                    this.showLogin();
                }
            } catch (error) {
                console.error('Auth check failed:', error);
                this.showLogin();
            }
        } else {
            this.showLogin();
        }
    }

    async handleLogin() {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const errorDiv = document.getElementById('login-error');

        if (!email || !password) {
            this.showLoginError('Please enter both email and password');
            return;
        }

        try {
            const response = await fetch('/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('jwt_token', data.token);
                this.currentUser = data.user;
                this.showDashboard();
                this.updateUserInfo();
                this.hideLoginError();
            } else {
                this.showLoginError(data.error || 'Login failed');
            }
        } catch (error) {
            this.showLoginError('Network error. Please try again.');
        }
    }

    async handleLogout() {
        try {
            await fetch('/auth/logout', { method: 'POST' });
            localStorage.removeItem('jwt_token');
            this.currentUser = null;
            this.showLogin();
            this.clearDashboard();
        } catch (error) {
            console.error('Logout failed:', error);
        }
    }

    handleRegister() {
        // Show a simple alert for now since registration functionality isn't implemented
        window.location.href = 'register.html';
        
        // In a future implementation, this could:
        // 1. Show a registration form modal
        // 2. Redirect to a registration page
        // 3. Send an email to the administrator
    }

    showLogin() {
        document.getElementById('login-page').style.display = 'flex';
        document.getElementById('dashboard-view').style.display = 'none';
    }

    showDashboard() {
        document.getElementById('login-page').style.display = 'none';
        document.getElementById('dashboard-view').style.display = 'block';
        this.loadDashboard();
    }

    updateUserInfo() {
        if (!this.currentUser) return;

        const dashboardTitle = document.getElementById('dashboard-title');
        const userNameDisplay = document.getElementById('user-name-display');
        const userAvatar = document.getElementById('current-user-avatar');

        dashboardTitle.textContent = `${this.currentUser.name}'s Dashboard`;
        userNameDisplay.textContent = this.currentUser.name;

        // Set user avatar initials
        const initials = this.currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase();
        userAvatar.textContent = initials;
    }

    showLoginError(message) {
        const errorDiv = document.getElementById('login-error');
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }

    hideLoginError() {
        const errorDiv = document.getElementById('login-error');
        errorDiv.style.display = 'none';
    }

    toggleDateControls() {
        const monthlyControls = document.getElementById('monthly-controls');
        const yearlyControls = document.getElementById('yearly-controls');
        const trendsCard = document.getElementById('trends-card');

        if (this.currentView === 'monthly') {
            monthlyControls.style.display = 'block';
            yearlyControls.style.display = 'none';
            trendsCard.style.display = 'none';
        } else {
            monthlyControls.style.display = 'none';
            yearlyControls.style.display = 'block';
            trendsCard.style.display = 'block';
        }
    }

    populateYears() {
        const yearSelect = document.getElementById('year-select');
        const currentYear = new Date().getFullYear();
        
        for (let year = currentYear - 5; year <= currentYear + 1; year++) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            if (year === currentYear) {
                option.selected = true;
            }
            yearSelect.appendChild(option);
        }
    }

    async loadDashboard() {
        if (!this.currentUser) {
            this.showError('Please log in first');
            return;
        }

        const month = document.getElementById('month-select').value;
        const year = document.getElementById('year-select').value;

        this.showLoading();
        this.hideError();

        try {
            let url;
            if (this.currentView === 'monthly') {
                url = `/dashboard/${this.currentUser.id}/monthly?year=${year}&month=${month}`;
            } else {
                url = `/dashboard/${this.currentUser.id}/yearly?year=${year}`;
            }

            const response = await this.authenticatedFetch(url);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            this.renderDashboard(data);
        } catch (error) {
            if (error.message === 'Unauthorized') {
                return; // Already handled
            }
            this.showError('Failed to load dashboard: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    async addExpense() {
        if (!this.currentUser) {
            this.showError('Please log in first');
            return;
        }

        const amount = parseFloat(document.getElementById('expense-amount').value);
        const category = document.getElementById('expense-category').value;
        const description = document.getElementById('expense-description').value;
        const date = document.getElementById('expense-date').value;

        if (!amount || !category || !date) {
            this.showError('Please fill in all required fields');
            return;
        }

        try {
            const response = await this.authenticatedFetch('/expenses', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    amount,
                    category_id: this.getCategoryId(category),
                    payment_method_id: 1, // Default to Cash
                    description,
                    date
                })
            });

            const data = await response.json();

            if (response.ok) {
                this.showSuccess('Expense added successfully');
                this.clearForm();
                this.loadDashboard(); // Refresh dashboard
            } else {
                this.showError(data.error || 'Failed to add expense');
            }
        } catch (error) {
            if (error.message === 'Unauthorized') {
                return; // Already handled
            }
            this.showError('Network error. Please try again.');
        }
    }

    addReminder() {
        const reminderText = document.getElementById('reminder-text').value;
        const reminderDate = document.getElementById('reminder-date').value;
        const remindersList = document.getElementById('reminders-list');

        if (!reminderText) {
            this.showError('Please enter a reminder');
            return;
        }

        const reminderItem = document.createElement('div');
        reminderItem.className = 'reminder-item';
        
        const reminderContent = document.createElement('div');
        reminderContent.innerHTML = `
            <div><strong>${reminderText}</strong></div>
            ${reminderDate ? `<div style="font-size: 0.85rem; color: #666;">Ends: ${reminderDate}</div>` : ''}
        `;

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'secondary-btn';
        deleteBtn.textContent = 'Delete';
        deleteBtn.onclick = () => {
            reminderItem.remove();
        };

        reminderItem.appendChild(reminderContent);
        reminderItem.appendChild(deleteBtn);
        remindersList.appendChild(reminderItem);

        // Clear input fields
        document.getElementById('reminder-text').value = '';
        document.getElementById('reminder-date').value = '';

        this.showSuccess('Reminder added successfully');
    }

    getCategoryId(categoryName) {
        // Simple mapping for now - in a real app, this would come from the API
        const categoryMap = {
            'Food': 1,
            'Transportation': 2,
            'Entertainment': 3,
            'Utilities': 4,
            'Shopping': 5,
            'Healthcare': 6,
            'Education': 7,
            'Other': 8
        };
        return categoryMap[categoryName] || 8; // Default to Other
    }

    clearForm() {
        document.getElementById('expense-form').reset();
    }

    renderDashboard(data) {
        // Update dashboard header
        document.getElementById('dashboard-title').textContent = `${data.user.name}'s ${this.currentView === 'monthly' ? 'Monthly' : 'Yearly'} Dashboard`;
        
        const periodInfo = document.getElementById('period-info');
        if (this.currentView === 'monthly') {
            const monthName = new Date(data.period.year, data.period.month - 1).toLocaleString('default', { month: 'long' });
            periodInfo.textContent = `${monthName} ${data.period.year}`;
        } else {
            periodInfo.textContent = `Year ${data.period.year}`;
        }

        // Update total income and expenses
        const totalIncome = document.getElementById('total-income');
        const totalExpenses = document.getElementById('total-expenses');
        
        // For now, we'll use the total spent as expenses
        // In a real implementation, you'd have separate income data
        totalIncome.textContent = this.formatCurrency(data.total_income || 0);
        totalExpenses.textContent = this.formatCurrency(data.total_spent);

        // Update top categories
        this.renderTopCategories(data.top_categories);

        // Update category breakdown chart
        this.renderCategoryChart(data.category_breakdown);

        // Update monthly trends chart (yearly view only)
        if (this.currentView === 'yearly') {
            this.renderTrendsChart(data.monthly_trends);
        }

        // Show dashboard
        document.getElementById('dashboard-container').style.display = 'block';
    }

    renderTopCategories(topCategories) {
        const container = document.getElementById('top-categories-list');
        container.innerHTML = '';

        if (topCategories.length === 0) {
            container.innerHTML = '<p class="no-data">No spending data available for this period.</p>';
            return;
        }

        topCategories.forEach((category, index) => {
            const div = document.createElement('div');
            div.className = `category-item category-color-${index}`;
            div.innerHTML = `
                <div>
                    <div class="category-name">${category.category}</div>
                    <div class="category-percentage">${category.percentage ? category.percentage.toFixed(1) + '%' : ''}</div>
                </div>
                <div class="category-amount">${this.formatCurrency(category.amount)}</div>
            `;
            container.appendChild(div);
        });
    }

    renderCategoryChart(categoryData) {
        const ctx = document.getElementById('category-chart').getContext('2d');
        
        // Destroy existing chart if it exists
        if (window.categoryChart) {
            window.categoryChart.destroy();
        }

        const labels = categoryData.map(item => item.category);
        const data = categoryData.map(item => item.amount);
        const colors = [
            '#000', '#000', '#000', '#000', '#000', 
            '#000', '#000', '#000', '#000'
        ];

        window.categoryChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors.slice(0, labels.length),
                    borderWidth: 1,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${this.formatCurrency(value)} (${percentage}%)`;
                            }.bind(this)
                        }
                    }
                }
            }
        });
    }

    renderTrendsChart(monthlyData) {
        const ctx = document.getElementById('trends-chart').getContext('2d');
        
        // Destroy existing chart if it exists
        if (window.trendsChart) {
            window.trendsChart.destroy();
        }

        const labels = monthlyData.map(item => item.month_name);
        const data = monthlyData.map(item => item.amount);

        window.trendsChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Monthly Spending',
                    data: data,
                    borderColor: '#000',
                    backgroundColor: 'rgba(0, 0, 0, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return this.formatCurrency(value);
                            }.bind(this)
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Spending: ${this.formatCurrency(context.parsed.y)}`;
                            }.bind(this)
                        }
                    }
                }
            }
        });
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0
        }).format(amount || 0);
    }

    showLoading() {
        document.getElementById('loading').style.display = 'block';
        document.getElementById('dashboard-container').style.display = 'none';
    }

    hideLoading() {
        document.getElementById('loading').style.display = 'none';
    }

    showError(message) {
        const errorDiv = document.getElementById('error-message');
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }

    hideError() {
        document.getElementById('error-message').style.display = 'none';
    }

    showSuccess(message) {
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.textContent = message;
        document.body.appendChild(successDiv);
        
        setTimeout(() => {
            successDiv.remove();
        }, 3000);
    }

    clearDashboard() {
        document.getElementById('total-income').textContent = '₹0';
        document.getElementById('total-expenses').textContent = '₹0';
        document.getElementById('top-categories-list').innerHTML = '';
        document.getElementById('period-info').textContent = '';
        
        if (window.categoryChart) {
            window.categoryChart.destroy();
        }
        if (window.trendsChart) {
            window.trendsChart.destroy();
        }
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new FamilyDashboard();
});