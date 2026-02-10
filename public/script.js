// =============================================
// Family Financial Application - Shared Script
// =============================================

// Utility functions
async function apiCall(endpoint, options = {}) {
    try {
        const fetchOptions = {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...(options.headers || {}),
            },
            credentials: 'include', // Send cookies including httpOnly JWT
        };

        const response = await fetch(endpoint, fetchOptions);

        // Handle unauthorized
        if (response.status === 401) {
            console.log('Unauthorized access');
            handleLogout();
            throw new Error('Unauthorized. Please log in again.');
        }

        if (!response.ok) {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const error = await response.json();
                throw new Error(error && error.error ? error.error : 'Request failed');
            }
            const text = await response.text();
            throw new Error(text || 'Request failed');
        }

        return await handleResponse(response);
    } catch (error) {
        console.error('API call error:', error);
        throw error;
    }
}

// Handle response and parse JSON if applicable
async function handleResponse(response) {
    const contentType = response.headers.get('content-type') || '';
    
    if (response.status === 204) {
        return null;
    }
    
    if (contentType.includes('application/json')) {
        return await response.json();
    }
    
    return null;
}

// Handle logout
function handleLogout() {
    // Clear localStorage
    localStorage.removeItem('user');
    
    // Redirect to login
    window.location.href = '/login';
}

// Sanitize HTML to prevent XSS
function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return unsafe;
    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Logout function
function logout() {
    fetch('/logout', { 
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(() => {
        handleLogout();
    })
    .catch(err => {
        console.error('Logout error:', err);
        // Still logout even if API fails
        handleLogout();
    });
}

// Login form handling (for login.html)
if (document.getElementById('loginFormObj')) {
    // This is handled by the form's submit event in login.html
}

// Registration form handling (for register.html)
if (document.getElementById('registerForm')) {
    // This is handled by the form's submit event in register.html
}

// Dashboard
if (document.getElementById('summary')) {
   let transactions = [];
   let username = 'User'; // Will be updated from API
   let currentMonth = new Date().getMonth() + 1;
   let currentYear = new Date().getFullYear();

   // API functions
   async function fetchTransactions() {
      try {
         const allTransactions = await apiCall('/api/transactions');
         // Filter by current month and year
         return allTransactions.filter(t => {
            const d = new Date(t.date);
            return d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear;
         });
      } catch (error) {
         console.error('Error fetching transactions:', error);
         return [];
      }
   }

   async function fetchUserData() {
       try {
          const userData = await apiCall('/api/user');
          return userData.username;
       } catch (error) {
          return 'User';
       }
    }

    // Initialize
    async function initializeDashboard() {
       try {
          username = await fetchUserData();
          const usernameDisplay = document.getElementById('username-display');
          if (usernameDisplay) {
              usernameDisplay.textContent = username;
          }
          transactions = await fetchTransactions();
          loadDashboard();
       } catch (error) {
          console.error('Dashboard initialization error:', error);
          const usernameDisplay = document.getElementById('username-display');
          if (usernameDisplay) {
              usernameDisplay.textContent = 'User';
          }
          loadDashboard();
       }
    }

    // Set up event listeners
    setupEventListeners();

    // Initialize dashboard
    initializeDashboard();

    // Keyboard navigation support
    const focusableSections = [
       document.querySelector('.income .amount'),
       document.querySelector('.expenses .amount'),
       document.querySelector('.reminders .amount'),
       document.getElementById('pieChart'),
       document.querySelector('#categories'),
       document.querySelector('#transactions')
    ].filter(el => el);

    focusableSections.forEach(el => el.tabIndex = 0);

    let currentFocusIndex = 0;
    document.addEventListener('keydown', (e) => {
       if (e.key === 'ArrowDown' && currentFocusIndex < focusableSections.length - 1) {
          currentFocusIndex++;
          focusableSections[currentFocusIndex].focus();
          e.preventDefault();
       } else if (e.key === 'ArrowUp' && currentFocusIndex > 0) {
          currentFocusIndex--;
          focusableSections[currentFocusIndex].focus();
          e.preventDefault();
       }
    });

    // Logout
    document.getElementById('logout').addEventListener('click', logout);

    function setupEventListeners() {
       // Populate filter dropdowns
       const monthFilter = document.getElementById('month');
       const yearFilter = document.getElementById('year');
       if (monthFilter) {
          monthFilter.innerHTML = '';
          for (let m = 1; m <= 12; m++) {
             const option = document.createElement('option');
             option.value = m;
             option.textContent = new Date(0, m - 1).toLocaleString('default', { month: 'long' });
             if (m === currentMonth) option.selected = true;
             monthFilter.appendChild(option);
          }
          monthFilter.addEventListener('change', async () => {
             currentMonth = parseInt(monthFilter.value);
             transactions = await fetchTransactions();
             loadDashboard();
          });
       }
       if (yearFilter) {
          yearFilter.innerHTML = '';
          const currentYearNow = new Date().getFullYear();
          for (let y = currentYearNow - 2; y <= currentYearNow + 1; y++) {
             const option = document.createElement('option');
             option.value = y;
             option.textContent = y;
             if (y === currentYear) option.selected = true;
             yearFilter.appendChild(option);
          }
          yearFilter.addEventListener('change', async () => {
             currentYear = parseInt(yearFilter.value);
             transactions = await fetchTransactions();
             loadDashboard();
          });
       }

       // Apply filters button
       document.getElementById('apply-filters').addEventListener('click', async () => {
          currentMonth = parseInt(monthFilter.value);
          currentYear = parseInt(yearFilter.value);
          transactions = await fetchTransactions();
          loadDashboard();
       });

       // Sidebar toggle
       document.getElementById('sidebar-toggle').addEventListener('click', () => {
          document.querySelector('.sidebar').classList.toggle('open');
       });
    }

     // Generate expense chart
     var expenseChart;
     function generateExpenseChart(categorySums) {
        const ctx = document.getElementById('pieChart');
        if (!ctx) return;
        
        // Debounce chart updates to prevent excessive re-rendering
        if (expenseChart) {
           expenseChart.destroy();
        }
        
        const labels = Object.keys(categorySums);
        const data = Object.values(categorySums);
        
        // Skip rendering if no data
        if (labels.length === 0 || data.length === 0) {
           return;
        }
        
        let total = 0;
        for (let i = 0; i < data.length; i++) {
           total += data[i];
        }
        
        const colors = ['#008080', '#FF8C00', '#800080', '#4BC0C0', '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#FF6384'];
        
        expenseChart = new Chart(ctx.getContext('2d'), {
           type: 'pie',
           data: {
              labels: labels,
              datasets: [{
                 data: data,
                 backgroundColor: colors.slice(0, labels.length),
                 hoverOffset: 4
              }]
           },
           options: {
              responsive: true,
              maintainAspectRatio: false,
              animation: {
                 duration: 400,
                 easing: 'easeOutQuart'
              },
              plugins: {
                 legend: {
                    position: 'top',
                    display: true,
                    labels: {
                       usePointStyle: true,
                       pointStyle: 'circle',
                       padding: 15
                    }
                 },
                 tooltip: {
                    enabled: true,
                    callbacks: {
                       label: function(context) {
                          const value = context.parsed;
                          const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
                          return context.label + ': ₹' + value + ' (' + percentage + '%)';
                       }
                    }
                 }
              }
           }
        });
     }

     // Load data
     function loadDashboard() {
        // Summary cards
        const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const totalExpenses = Math.abs(transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0));
        const incomeAmountEl = document.querySelector('.income .amount');
        const expensesAmountEl = document.querySelector('.expenses .amount');
        if (incomeAmountEl) {
            incomeAmountEl.textContent = '₹' + totalIncome.toFixed(2);
        }
        if (expensesAmountEl) {
            expensesAmountEl.textContent = '₹' + totalExpenses.toFixed(2);
        }

       // Balance (optional, if exists)
       const balance = totalIncome - totalExpenses;
       if (document.querySelector('#balance p')) {
          document.querySelector('#balance p').textContent = '₹' + balance.toFixed(2);
       }

        // Recent Transactions table
        const tbody = document.querySelector('#transactions tbody');
        const sortedTransactions = transactions.slice().sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);
        // Use DocumentFragment for better performance
        const tbodyFragment = document.createDocumentFragment();
        for (let i = 0; i < sortedTransactions.length; i++) {
           const t = sortedTransactions[i];
           const row = document.createElement('tr');
           // Use the actual transaction ID instead of array index
           row.innerHTML = `<td>${escapeHtml(t.date)}</td><td>${escapeHtml(t.description)}</td><td>${t.amount > 0 ? '₹' + t.amount : '-₹' + Math.abs(t.amount)}</td><td>
              <button class="edit-btn text-blue-600 hover:underline mr-2" data-id="${t.id}" aria-label="Edit transaction">Edit</button>
              <button class="delete-btn text-red-600 hover:underline" data-id="${t.id}" aria-label="Delete transaction">Delete</button>
           </td>`;
           tbodyFragment.appendChild(row);
        }
        tbody.innerHTML = '';
        tbody.appendChild(tbodyFragment);

        // Add event listeners for edit and delete buttons
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = Number(e.target.getAttribute('data-id'));
                const transaction = transactions.find(t => t.id === id);
                if (transaction) {
                    document.getElementById('edit-transaction-id').value = transaction.id;
                    document.getElementById('edit-transaction-date').value = transaction.date;
                    document.getElementById('edit-transaction-description').value = transaction.description;
                    document.getElementById('edit-transaction-amount').value = Math.abs(transaction.amount);
                    document.getElementById('edit-transaction-type').value = transaction.type;
                    document.getElementById('edit-transaction-category').value = transaction.category || '';
                    showModal(editTransactionModal);
                }
            });
        });

         document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
               const id = Number(e.target.getAttribute('data-id'));
               const transaction = transactions.find(t => t.id === id);
               if (!transaction) return;
               if (confirm('Are you sure you want to delete this transaction?')) {
                  try {
                     await apiCall(`/api/transactions/${transaction.id}`, { method: 'DELETE' });
                     transactions = await fetchTransactions();
                     loadDashboard();
                  } catch (error) {
                     alert('Error deleting transaction: ' + error.message);
                  }
               }
            });
         });

        // Top 5 Expense Categories with progress bars
        const categorySums = {};
        const expenseTransactions = transactions.filter(t => t.type === 'expense');
        for (let i = 0; i < expenseTransactions.length; i++) {
           const t = expenseTransactions[i];
           categorySums[t.category] = (categorySums[t.category] || 0) + Math.abs(t.amount);
        }
        const topCategories = Object.entries(categorySums).sort((a, b) => b[1] - a[1]).slice(0, 5);
        const maxSum = topCategories[0] ? topCategories[0][1] : 1;
        const ulCat = document.querySelector('#categories ul');
        // Use DocumentFragment for better performance
        const fragment = document.createDocumentFragment();
        for (let i = 0; i < topCategories.length; i++) {
           const [cat, sum] = topCategories[i];
           const li = document.createElement('li');
           li.innerHTML = `${escapeHtml(cat)}: ₹${sum} <progress value="${sum}" max="${maxSum}" title="${escapeHtml(cat)}: ₹${sum}"></progress>`;
           fragment.appendChild(li);
        }
        ulCat.innerHTML = '';
        ulCat.appendChild(fragment);

       // Generate expense chart
       generateExpenseChart(categorySums);

       // Add tooltips
       document.querySelector('.income .amount').title = 'Total income for the selected month and year';
       document.querySelector('.expenses .amount').title = 'Total expenses for the selected month and year';
       document.querySelector('.reminders .amount').title = 'Number of pending reminders';
       document.getElementById('pieChart').title = 'Pie chart showing expense distribution by category';
    }
}
