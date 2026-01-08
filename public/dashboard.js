// Comprehensive Dashboard JavaScript functionality
class FamilyFinancialDashboard {
    constructor() {
        this.currentView = 'monthly';
        this.currentUser = null;
        this.currentYear = new Date().getFullYear();
        this.currentMonth = new Date().getMonth() + 1;
        this.categories = [];
        this.paymentMethods = [];
        
        // Chart instances
        this.categoryChart = null;
        this.monthlyTrendsChart = null;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.populateDateControls();
        this.checkAuthStatus();
    }

    // ===== AUTHENTICATION MANAGEMENT =====
    
    getAuthHeaders() {
        const token = localStorage.getItem('jwt_token');
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    }

    showLoading(show) {
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = show ? 'flex' : 'none';
        }
    }

    async authenticatedFetch(url, options = {}) {
        const headers = { 
            'Content-Type': 'application/json',
            ...this.getAuthHeaders(), 
            ...options.headers 
        };
        
        const response = await fetch(url, { ...options, headers });
        
        if (response.status === 401) {
            localStorage.removeItem('jwt_token');
            this.showAuthError('Session expired. Please log in again.');
            this.redirectToLogin();
            throw new Error('Unauthorized');
        }
        
        return response;
    }

    async checkAuthStatus() {
        const token = localStorage.getItem('jwt_token');
        if (!token) {
            this.redirectToLogin();
            return;
        }

        try {
            const response = await this.authenticatedFetch('/api/auth/me');
            if (response.ok) {
                const data = await response.json();
                this.currentUser = data.user;
                this.updateUserProfile();
                this.loadInitialData();
            } else {
                this.redirectToLogin();
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            this.redirectToLogin();
        }
    }

    updateUserProfile() {
        if (!this.currentUser) return;

        const userInitials = document.getElementById('userInitials');
        const userName = document.getElementById('userName');
        const userEmail = document.getElementById('userEmail');
        const userAvatar = document.getElementById('userAvatar');

        if (userInitials && userName && userEmail) {
            const initials = this.currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase();
            userInitials.textContent = initials;
            userName.textContent = this.currentUser.name;
            userEmail.textContent = this.currentUser.email;
        }
    }

    redirectToLogin() {
        window.location.href = 'index.html';
    }

    handleLogout() {
        localStorage.removeItem('jwt_token');
        this.redirectToLogin();
    }

    showAuthError(message) {
        this.showNotification(message, 'error');
    }

    // ===== EXPENSE MANAGEMENT =====
    
    setupEventListeners() {
        // View switching
        document.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchView(e.target.dataset.view);
            });
        });

        // Date controls
        const monthSelect = document.getElementById('monthSelect');
        const yearSelect = document.getElementById('yearSelect');
        
        if (monthSelect) {
            monthSelect.addEventListener('change', () => {
                this.currentMonth = parseInt(monthSelect.value);
                this.loadDashboard();
            });
        }
        
        if (yearSelect) {
            yearSelect.addEventListener('change', () => {
                this.currentYear = parseInt(yearSelect.value);
                this.loadDashboard();
            });
        }

        // Form submission
        const expenseForm = document.getElementById('expenseForm');
        if (expenseForm) {
            expenseForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleExpenseSubmission();
            });
        }

        // Reset form
        const resetFormBtn = document.getElementById('resetFormBtn');
        if (resetFormBtn) {
            resetFormBtn.addEventListener('click', () => {
                this.resetExpenseForm();
            });
        }

        // Apply filters
        const applyFiltersBtn = document.getElementById('applyFiltersBtn');
        if (applyFiltersBtn) {
            applyFiltersBtn.addEventListener('click', () => {
                this.loadDashboard();
            });
        }

        // Reset filters
        const resetFiltersBtn = document.getElementById('resetFiltersBtn');
        if (resetFiltersBtn) {
            resetFiltersBtn.addEventListener('click', () => {
                this.resetFilters();
            });
        }

        // Logout
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.handleLogout();
            });
        }

        // Add reminder
        const addReminderBtn = document.getElementById('addReminderBtn');
        if (addReminderBtn) {
            addReminderBtn.addEventListener('click', () => {
                this.addReminder();
            });
        }

        // Form validation
        this.setupFormValidation();
    }

    setupFormValidation() {
        const amountInput = document.getElementById('amount');
        const categorySelect = document.getElementById('category');
        const paymentMethodSelect = document.getElementById('paymentMethod');
        const dateInput = document.getElementById('date');

        if (amountInput) {
            amountInput.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                if (value < 0) {
                    e.target.value = '';
                    this.showNotification('Amount cannot be negative', 'error');
                }
            });
        }

        if (dateInput) {
            const today = new Date().toISOString().split('T')[0];
            dateInput.max = today;
        }
    }

    async handleExpenseSubmission() {
        const formData = this.getExpenseFormData();
        
        if (!this.validateExpenseForm(formData)) {
            return;
        }

        try {
            const response = await this.authenticatedFetch('/api/expenses', {
                method: 'POST',
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (response.ok) {
                this.showNotification('Expense added successfully!', 'success');
                this.resetExpenseForm();
                this.loadDashboard(); // Refresh dashboard data
            } else {
                this.showNotification(result.error || 'Failed to add expense', 'error');
            }
        } catch (error) {
            if (error.message !== 'Unauthorized') {
                this.showNotification('Network error. Please try again.', 'error');
            }
        }
    }

    getExpenseFormData() {
        return {
            amount: parseFloat(document.getElementById('amount').value),
            category_id: parseInt(document.getElementById('category').value),
            payment_method_id: parseInt(document.getElementById('paymentMethod').value),
            description: document.getElementById('description').value.trim(),
            date: document.getElementById('date').value
        };
    }

    validateExpenseForm(formData) {
        const { amount, category_id, payment_method_id, date } = formData;

        if (!amount || amount <= 0) {
            this.showNotification('Please enter a valid amount', 'error');
            return false;
        }

        if (!category_id) {
            this.showNotification('Please select a category', 'error');
            return false;
        }

        if (!payment_method_id) {
            this.showNotification('Please select a payment method', 'error');
            return false;
        }

        if (!date) {
            this.showNotification('Please select a date', 'error');
            return false;
        }

        return true;
    }

    resetExpenseForm() {
        const form = document.getElementById('expenseForm');
        if (form) {
            form.reset();
            // Set default date to today
            const dateInput = document.getElementById('date');
            if (dateInput) {
                dateInput.value = new Date().toISOString().split('T')[0];
            }
        }
    }

    // ===== DASHBOARD ANALYTICS =====
    
    async loadInitialData() {
        try {
            // Load categories and payment methods
            await Promise.all([
                this.loadCategories(),
                this.loadPaymentMethods()
            ]);
            
            // Load dashboard data
            this.loadDashboard();
        } catch (error) {
            console.error('Failed to load initial data:', error);
            this.showNotification('Failed to load dashboard data', 'error');
        }
    }

    async loadCategories() {
        try {
            const response = await this.authenticatedFetch('/api/categories');
            if (response.ok) {
                this.categories = await response.json();
                this.populateDropdown('category', this.categories, 'name', 'id');
            }
        } catch (error) {
            console.error('Failed to load categories:', error);
        }
    }

    async loadPaymentMethods() {
        try {
            const response = await this.authenticatedFetch('/api/payment-methods');
            if (response.ok) {
                this.paymentMethods = await response.json();
                this.populateDropdown('paymentMethod', this.paymentMethods, 'name', 'id');
            }
        } catch (error) {
            console.error('Failed to load payment methods:', error);
        }
    }

    populateDropdown(elementId, data, labelKey, valueKey) {
        const select = document.getElementById(elementId);
        if (!select || !data) return;

        // Clear existing options (except the first placeholder option)
        while (select.options.length > 1) {
            select.remove(1);
        }

        data.forEach(item => {
            const option = document.createElement('option');
            option.value = item[valueKey];
            option.textContent = item[labelKey];
            select.appendChild(option);
        });
    }

    populateDateControls() {
        const monthSelect = document.getElementById('monthSelect');
        const yearSelect = document.getElementById('yearSelect');

        if (monthSelect) {
            const currentMonth = new Date().getMonth() + 1;
            Array.from(monthSelect.options).forEach((option, index) => {
                if (parseInt(option.value) === currentMonth) {
                    option.selected = true;
                }
            });
        }

        if (yearSelect) {
            const currentYear = new Date().getFullYear();
            Array.from(yearSelect.options).forEach(option => {
                if (parseInt(option.value) === currentYear) {
                    option.selected = true;
                }
            });
        }
    }

    async loadDashboard() {
        if (!this.currentUser) return;

        this.showLoading(true);
        
        try {
            const url = `/api/dashboard/${this.currentUser.id}/${this.currentView}?year=${this.currentYear}&month=${this.currentMonth}`;
            const response = await this.authenticatedFetch(url);
            
            if (response.ok) {
                const data = await response.json();
                this.renderDashboard(data);
            } else {
                throw new Error('Failed to load dashboard data');
            }
        } catch (error) {
            if (error.message !== 'Unauthorized') {
                this.showNotification('Failed to load dashboard data', 'error');
            }
        } finally {
            this.showLoading(false);
        }
    }

    renderDashboard(data) {
        this.updateSummaryCards(data);
        this.renderTopCategories(data.top_categories || []);
        this.renderCategoryChart(data.category_breakdown || []);
        
        if (this.currentView === 'yearly') {
            this.renderMonthlyTrendsChart(data.monthly_trends || []);
        }
    }

    updateSummaryCards(data) {
        const totalIncome = document.getElementById('totalIncome');
        const totalExpenses = document.getElementById('totalExpenses');
        const balance = document.getElementById('balance');
        const incomePeriod = document.getElementById('incomePeriod');
        const expensesPeriod = document.getElementById('expensesPeriod');
        const balancePeriod = document.getElementById('balancePeriod');

        const periodText = this.getPeriodText();

        if (totalIncome) totalIncome.textContent = this.formatCurrency(data.total_income || 0);
        if (totalExpenses) totalExpenses.textContent = this.formatCurrency(data.total_expenses || 0);
        if (balance) balance.textContent = this.formatCurrency((data.total_income || 0) - (data.total_expenses || 0));
        
        if (incomePeriod) incomePeriod.textContent = periodText;
        if (expensesPeriod) expensesPeriod.textContent = periodText;
        if (balancePeriod) balancePeriod.textContent = periodText;
    }

    renderTopCategories(topCategories) {
        const container = document.getElementById('topCategoriesList');
        if (!container) return;

        container.innerHTML = '';

        if (!topCategories || topCategories.length === 0) {
            container.innerHTML = '<div class="no-data">No spending data available for this period.</div>';
            return;
        }

        topCategories.forEach((category, index) => {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'category-item';
            categoryDiv.innerHTML = `
                <div class="category-info">
                    <span class="category-name">${category.category || 'Unknown'}</span>
                    <span class="category-percentage">${category.percentage ? category.percentage.toFixed(1) + '%' : ''}</span>
                </div>
                <span class="category-amount">${this.formatCurrency(category.amount || 0)}</span>
            `;
            container.appendChild(categoryDiv);
        });
    }

    // ===== DATA VISUALIZATION =====
    
    renderCategoryChart(categoryData) {
        const ctx = document.getElementById('categoryBreakdownChart');
        if (!ctx) return;

        // Destroy existing chart
        if (this.categoryChart) {
            this.categoryChart.destroy();
        }

        const labels = categoryData.map(item => item.category || 'Unknown');
        const data = categoryData.map(item => item.amount || 0);
        const colors = this.generateColors(categoryData.length);

        this.categoryChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderWidth: 2,
                    borderColor: '#fff',
                    hoverBorderWidth: 3
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
                            usePointStyle: true,
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const label = context.label || '';
                                const value = context.parsed;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                return `${label}: ${this.formatCurrency(value)} (${percentage}%)`;
                            }
                        }
                    }
                },
                animation: {
                    animateRotate: true,
                    animateScale: true
                }
            }
        });
    }

    renderMonthlyTrendsChart(monthlyData) {
        const ctx = document.getElementById('monthlyTrendsChart');
        if (!ctx) return;

        // Show trends card
        const trendsCard = document.getElementById('monthlyTrendsCard');
        if (trendsCard) {
            trendsCard.style.display = 'block';
        }

        // Destroy existing chart
        if (this.monthlyTrendsChart) {
            this.monthlyTrendsChart.destroy();
        }

        const labels = monthlyData.map(item => item.month_name || 'Unknown');
        const data = monthlyData.map(item => item.amount || 0);

        this.monthlyTrendsChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Monthly Expenses',
                    data: data,
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#2563eb',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        ticks: {
                            callback: (value) => this.formatCurrency(value)
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: (context) => {
                                return `Expenses: ${this.formatCurrency(context.parsed.y)}`;
                            }
                        }
                    }
                },
                animation: {
                    duration: 1000
                }
            }
        });
    }

    // ===== USER INTERFACE INTERACTIONS =====
    
    switchView(view) {
        this.currentView = view;
        
        // Update toggle buttons
        document.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });

        // Toggle trends chart visibility
        const trendsCard = document.getElementById('monthlyTrendsCard');
        if (trendsCard) {
            trendsCard.style.display = view === 'yearly' ? 'block' : 'none';
        }

        this.loadDashboard();
    }

    resetFilters() {
        const monthSelect = document.getElementById('monthSelect');
        const yearSelect = document.getElementById('yearSelect');

        if (monthSelect) {
            monthSelect.value = new Date().getMonth() + 1;
            this.currentMonth = parseInt(monthSelect.value);
        }

        if (yearSelect) {
            yearSelect.value = new Date().getFullYear();
            this.currentYear = parseInt(yearSelect.value);
        }

        this.loadDashboard();
    }

    getPeriodText() {
        if (this.currentView === 'monthly') {
            const monthName = new Date(this.currentYear, this.currentMonth - 1).toLocaleString('default', { month: 'long' });
            return `${monthName} ${this.currentYear}`;
        } else {
            return `Year ${this.currentYear}`;
        }
    }

    // ===== REMINDERS FUNCTIONALITY =====
    
    addReminder() {
        const reminderText = document.getElementById('reminderText');
        const reminderDate = document.getElementById('reminderDate');
        const remindersList = document.getElementById('remindersList');

        if (!reminderText || !reminderDate || !remindersList) return;

        const text = reminderText.value.trim();
        const date = reminderDate.value;

        if (!text) {
            this.showNotification('Please enter a reminder text', 'error');
            return;
        }

        const reminderItem = document.createElement('div');
        reminderItem.className = 'reminder-item';
        
        const dateText = date ? new Date(date).toLocaleDateString() : 'No date set';
        
        reminderItem.innerHTML = `
            <div class="reminder-content">
                <span class="reminder-text">${text}</span>
                <span class="reminder-date">${dateText}</span>
            </div>
            <button class="btn-delete" onclick="this.parentElement.parentElement.remove()">Delete</button>
        `;

        remindersList.appendChild(reminderItem);
        
        // Clear inputs
        reminderText.value = '';
        reminderDate.value = '';
        
        this.showNotification('Reminder added successfully!', 'success');
    }

    // ===== UTILITY FUNCTIONS =====
    
    generateColors(count) {
        const colors = [
            '#2563eb', '#16a34a', '#dc2626', '#ca8a04', '#7c3aed',
            '#06b6d4', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'
        ];
        
        return Array.from({ length: count }, (_, i) => colors[i % colors.length]);
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount || 0);
    }

    showNotification(message, type = 'info') {
        // Remove existing notifications
        const existing = document.querySelector('.notification');
        if (existing) existing.remove();

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;

        document.body.appendChild(notification);

        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 3000);
    }

}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new FamilyFinancialDashboard();
});