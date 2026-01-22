// Utility functions
function getUsers() {
    return JSON.parse(localStorage.getItem('users') || '[]');
}

function saveUsers(users) {
    localStorage.setItem('users', JSON.stringify(users));
}

function getTransactions(username) {
    return JSON.parse(localStorage.getItem('transactions_' + username) || '[]');
}

function saveTransactions(username, transactions) {
    localStorage.setItem('transactions_' + username, JSON.stringify(transactions));
}

function getCurrentUser() {
    return localStorage.getItem('currentUser');
}

function setCurrentUser(username) {
    localStorage.setItem('currentUser', username);
}

function logout() {
    localStorage.removeItem('currentUser');
    window.location.href = 'login.html';
}

// Registration
if (document.getElementById('register-form')) {
    document.getElementById('register-form').addEventListener('submit', function(e) {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirm = document.getElementById('confirm-password').value;
        if (password !== confirm) {
            alert('Passwords do not match');
            return;
        }
        const users = getUsers();
        if (users.find(u => u.username === username || u.email === email)) {
            alert('User already exists');
            return;
        }
        users.push({username, email, password});
        saveUsers(users);
        alert('Registration successful');
        window.location.href = 'login.html';
    });
}

// Login
if (document.getElementById('login-form')) {
    document.getElementById('login-form').addEventListener('submit', function(e) {
        e.preventDefault();
        const usernameEmail = document.getElementById('username-email').value;
        const password = document.getElementById('password').value;
        const users = getUsers();
        const user = users.find(u => (u.username === usernameEmail || u.email === usernameEmail) && u.password === password);
        if (!user) {
            alert('Invalid credentials');
            return;
        }
        setCurrentUser(user.username);
        window.location.href = 'dashboard.html';
    });
}

// Dashboard
if (document.getElementById('balance')) {
   let transactions = [];
   let reminders = [];
   let username = 'Demo User'; // Mock username
   let currentMonth = new Date().getMonth() + 1;
   let currentYear = new Date().getFullYear();

   // Mock data for demonstration
   const mockTransactions = [
      { date: '2023-01-01', description: 'Salary', amount: 50000, type: 'income', category: '' },
      { date: '2023-01-02', description: 'Grocery Shopping', amount: -2000, type: 'expense', category: 'Food' },
      { date: '2023-01-03', description: 'Electricity Bill', amount: -1500, type: 'expense', category: 'Utilities' },
      { date: '2023-01-04', description: 'Freelance Work', amount: 10000, type: 'income', category: '' },
      { date: '2023-01-05', description: 'Movie Tickets', amount: -500, type: 'expense', category: 'Entertainment' },
      { date: '2023-01-06', description: 'Gas Station', amount: -1000, type: 'expense', category: 'Transportation' },
      { date: '2023-01-07', description: 'Rent', amount: -8000, type: 'expense', category: 'Housing' },
      { date: '2023-01-08', description: 'Coffee', amount: -200, type: 'expense', category: 'Food' },
      { date: '2023-01-09', description: 'Bonus', amount: 5000, type: 'income', category: '' },
      { date: '2023-01-10', description: 'Internet Bill', amount: -800, type: 'expense', category: 'Utilities' },
      { date: '2023-02-01', description: 'Salary', amount: 50000, type: 'income', category: '' },
      { date: '2023-02-02', description: 'Supermarket', amount: -3000, type: 'expense', category: 'Food' },
      { date: '2023-02-03', description: 'Water Bill', amount: -600, type: 'expense', category: 'Utilities' },
      { date: '2023-02-04', description: 'Taxi', amount: -400, type: 'expense', category: 'Transportation' },
      { date: '2023-02-05', description: 'Concert', amount: -1500, type: 'expense', category: 'Entertainment' }
   ];

   const mockReminders = [
      { text: 'Pay electricity bill', due: '2023-01-15' },
      { text: 'Renew insurance', due: '2023-02-01' },
      { text: 'Submit tax returns', due: '2023-03-15' }
   ];

   // Placeholder functions for backend integration
   function fetchTransactions(month, year) {
      // Mock filtering by month and year
      return mockTransactions.filter(t => {
         const d = new Date(t.date);
         return d.getMonth() + 1 === month && d.getFullYear() === year;
      });
   }

   function fetchReminders() {
      return mockReminders;
   }

   function fetchExpenses(month, year) {
      // Placeholder for backend integration
      return fetchTransactions(month, year).filter(t => t.type === 'expense');
   }

   // Initialize
   document.querySelector('h1').textContent = 'Welcome, ' + username;
   transactions = fetchTransactions(currentMonth, currentYear);
   reminders = fetchReminders();

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
      monthFilter.addEventListener('change', () => {
         currentMonth = parseInt(monthFilter.value);
         transactions = fetchTransactions(currentMonth, currentYear);
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
      yearFilter.addEventListener('change', () => {
         currentYear = parseInt(yearFilter.value);
         transactions = fetchTransactions(currentMonth, currentYear);
         loadDashboard();
      });
   }

   // Apply filters button
   document.getElementById('apply-filters').addEventListener('click', () => {
      currentMonth = parseInt(monthFilter.value);
      currentYear = parseInt(yearFilter.value);
      transactions = fetchTransactions(currentMonth, currentYear);
      loadDashboard();
   });

   // Sidebar toggle
   document.getElementById('sidebar-toggle').addEventListener('click', () => {
      document.querySelector('.sidebar').classList.toggle('open');
   });

   loadDashboard();

   // Keyboard navigation support
   const focusableSections = [
      document.querySelector('#total-income'),
      document.querySelector('#total-expenses'),
      document.querySelector('#reminders-count'),
      document.getElementById('expenseChart'),
      document.querySelector('#top-categories'),
      document.querySelector('#transaction-history')
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
   document.getElementById('logout').addEventListener('click', () => {
      fetch('/logout', { method: 'POST' })
         .then(() => window.location.href = '/login')
         .catch(err => console.error(err));
   });

   // Generate expense chart
   let expenseChart;
   function generateExpenseChart(categorySums) {
      const ctx = document.getElementById('expenseChart').getContext('2d');
      if (expenseChart) {
         expenseChart.destroy();
      }
      const labels = Object.keys(categorySums);
      const data = Object.values(categorySums);
      const total = data.reduce((a, b) => a + b, 0);
      const colors = ['#008080', '#FF8C00', '#800080', '#4BC0C0', '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#FF6384'];
      expenseChart = new Chart(ctx, {
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
            plugins: {
               legend: {
                  position: 'top',
                  display: true
               },
               tooltip: {
                  callbacks: {
                     label: function(context) {
                        const value = context.parsed;
                        const percentage = ((value / total) * 100).toFixed(1);
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
      const remindersCount = reminders.length;
      document.querySelector('#total-income').textContent = '₹' + totalIncome.toFixed(2);
      document.querySelector('#total-expenses').textContent = '₹' + totalExpenses.toFixed(2);
      document.querySelector('#reminders-count').textContent = remindersCount;

      // Balance (optional, if exists)
      const balance = totalIncome - totalExpenses;
      if (document.querySelector('#balance p')) {
         document.querySelector('#balance p').textContent = '₹' + balance.toFixed(2);
      }

      // Recent Transactions table
      const tbody = document.querySelector('#transaction-history tbody');
      tbody.innerHTML = '';
      transactions.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10).forEach((t, index) => {
         const row = document.createElement('tr');
         row.innerHTML = `<td>${t.date}</td><td>${t.description}</td><td>${t.amount > 0 ? '₹' + t.amount : '-₹' + Math.abs(t.amount)}</td><td>${t.type}</td>`;
         tbody.appendChild(row);
      });

      // Top 5 Expense Categories with progress bars
      const categorySums = {};
      transactions.filter(t => t.type === 'expense').forEach(t => {
         categorySums[t.category] = (categorySums[t.category] || 0) + Math.abs(t.amount);
      });
      const topCategories = Object.entries(categorySums).sort((a, b) => b[1] - a[1]).slice(0, 5);
      const maxSum = topCategories[0] ? topCategories[0][1] : 1;
      const olCat = document.querySelector('#top-categories ol');
      olCat.innerHTML = '';
      topCategories.forEach(([cat, sum]) => {
         const li = document.createElement('li');
         li.innerHTML = `${cat} - ₹${sum} <progress value="${sum}" max="${maxSum}" title="${cat}: ₹${sum}"></progress>`;
         olCat.appendChild(li);
      });

      // Generate expense chart
      generateExpenseChart(categorySums);

      // Add tooltips
      document.querySelector('#total-income').title = 'Total income for the selected month and year';
      document.querySelector('#total-expenses').title = 'Total expenses for the selected month and year';
      document.querySelector('#reminders-count').title = 'Number of pending reminders';
      document.getElementById('expenseChart').title = 'Pie chart showing expense distribution by category';
   }

   // Add expense form handler
   document.getElementById('expense-form').addEventListener('submit', function(e) {
      e.preventDefault();
      const amount = parseFloat(document.getElementById('expense-amount').value);
      const description = document.getElementById('expense-description').value.trim();
      const category = document.getElementById('expense-category').value.trim();
      if (!amount || amount <= 0 || !description || !category) {
         alert('Please fill all fields correctly');
         return;
      }
      fetch('/api/transactions', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ type: 'expense', amount, description, category })
      })
      .then(res => res.json())
      .then(data => {
         if (data.message) {
            return fetch('/api/transactions');
         } else {
            alert(data.error);
         }
      })
      .then(res => res ? res.json() : null)
      .then(data => {
         if (data) {
            transactions = data;
            loadDashboard();
            document.getElementById('expense-form').reset();
         }
      })
      .catch(err => console.error(err));
   });

   // Add income form handler
   document.getElementById('income-form').addEventListener('submit', function(e) {
      e.preventDefault();
      const amount = parseFloat(document.getElementById('income-amount').value);
      const description = document.getElementById('income-description').value.trim();
      if (!amount || amount <= 0 || !description) {
         alert('Please fill all fields correctly');
         return;
      }
      fetch('/api/transactions', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ type: 'income', amount, description })
      })
      .then(res => res.json())
      .then(data => {
         if (data.message) {
            return fetch('/api/transactions');
         } else {
            alert(data.error);
         }
      })
      .then(res => res ? res.json() : null)
      .then(data => {
         if (data) {
            transactions = data;
            loadDashboard();
            document.getElementById('income-form').reset();
         }
      })
      .catch(err => console.error(err));
   });

   // Modal functionality
   const addExpenseBtn = document.getElementById('add-expense-btn');
   const addReminderBtn = document.getElementById('add-reminder-btn');
   const addExpenseModal = document.getElementById('add-expense-modal');
   const addReminderModal = document.getElementById('add-reminder-modal');
   const closeButtons = document.querySelectorAll('.close-modal');

   function showModal(modal) {
       modal.style.display = 'block';
       modal.setAttribute('aria-hidden', 'false');
       // ARIA announcement
       const announcement = document.createElement('div');
       announcement.setAttribute('aria-live', 'assertive');
       announcement.setAttribute('aria-atomic', 'true');
       announcement.className = 'sr-only';
       announcement.textContent = modal.querySelector('h3').textContent + ' modal opened';
       document.body.appendChild(announcement);
       setTimeout(() => document.body.removeChild(announcement), 1000);
       // Focus trapping
       const focusableElements = modal.querySelectorAll('button, input, select, textarea');
       const firstFocusable = focusableElements[0];
       const lastFocusable = focusableElements[focusableElements.length - 1];
       firstFocusable.focus();
       function trapFocus(e) {
           if (e.key === 'Tab') {
               if (e.shiftKey) {
                   if (document.activeElement === firstFocusable) {
                       lastFocusable.focus();
                       e.preventDefault();
                   }
               } else {
                   if (document.activeElement === lastFocusable) {
                       firstFocusable.focus();
                       e.preventDefault();
                   }
               }
           }
       }
       modal.trapFocus = trapFocus; // Store reference
       modal.addEventListener('keydown', trapFocus);
   }

   function hideModal(modal) {
       modal.style.display = 'none';
       modal.setAttribute('aria-hidden', 'true');
       // Remove focus trapping
       if (modal.trapFocus) {
           modal.removeEventListener('keydown', modal.trapFocus);
           delete modal.trapFocus;
       }
       // ARIA announcement
       const announcement = document.createElement('div');
       announcement.setAttribute('aria-live', 'assertive');
       announcement.setAttribute('aria-atomic', 'true');
       announcement.className = 'sr-only';
       announcement.textContent = modal.querySelector('h3').textContent + ' modal closed';
       document.body.appendChild(announcement);
       setTimeout(() => document.body.removeChild(announcement), 1000);
       // Reset form
       const form = modal.querySelector('form');
       if (form) form.reset();
   }

   if (addExpenseBtn) addExpenseBtn.addEventListener('click', () => showModal(addExpenseModal));
   if (addReminderBtn) addReminderBtn.addEventListener('click', () => showModal(addReminderModal));
   closeButtons.forEach(btn => btn.addEventListener('click', (e) => {
       const modal = e.target.closest('.modal');
       hideModal(modal);
   }));

   // ESC key to close modals
   document.addEventListener('keydown', (e) => {
       if (e.key === 'Escape') {
           const openModal = document.querySelector('.modal[aria-hidden="false"]');
           if (openModal) hideModal(openModal);
       }
   });

   // Handle add-expense-form submission
   const addExpenseForm = document.getElementById('add-expense-form');
   if (addExpenseForm) {
       addExpenseForm.addEventListener('submit', function(e) {
           e.preventDefault();
           const who = document.getElementById('expense-who').value.trim();
           const paymentMethod = document.getElementById('payment-method').value;
           const amount = parseFloat(document.getElementById('expense-amount').value);
           const description = document.getElementById('expense-description').value.trim();
           if (!who || !paymentMethod || !amount || amount <= 0 || !description) {
               const errorMsg = 'Please fill all fields correctly';
               document.getElementById('add-expense-error').textContent = errorMsg;
               document.getElementById('add-expense-error').classList.remove('sr-only');
               return;
           }
           document.getElementById('add-expense-error').textContent = '';
           document.getElementById('add-expense-error').classList.add('sr-only');
           // Add to mock data
           const newExpense = {
               date: new Date().toISOString().split('T')[0],
               description: description,
               amount: -amount,
               type: 'expense',
               category: paymentMethod
           };
           mockTransactions.push(newExpense);
           transactions = fetchTransactions(currentMonth, currentYear);
           loadDashboard();
           hideModal(addExpenseModal);
       });
   }

   // Handle add-reminder-form submission
   const addReminderForm = document.getElementById('add-reminder-form');
   if (addReminderForm) {
       addReminderForm.addEventListener('submit', function(e) {
           e.preventDefault();
           const description = document.getElementById('reminder-description').value.trim();
           const date = document.getElementById('reminder-date').value;
           if (!description || !date) {
               const errorMsg = 'Please fill all fields';
               document.getElementById('add-reminder-error').textContent = errorMsg;
               document.getElementById('add-reminder-error').classList.remove('sr-only');
               return;
           }
           document.getElementById('add-reminder-error').textContent = '';
           document.getElementById('add-reminder-error').classList.add('sr-only');
           // Add to reminders
           mockReminders.push({
               text: description,
               due: date
           });
           reminders = fetchReminders();
           loadDashboard();
           hideModal(addReminderModal);
       });
   }
}