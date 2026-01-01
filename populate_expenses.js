const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./family_financial.db');

// Generate sample expense data for testing
function generateSampleExpenses() {
    const expenses = [];
    const users = [1, 2, 3, 4]; // Alok, Amol, Atul, Rashmi
    const categories = [1, 2, 3, 4]; // Food, Transportation, Utilities, Entertainment
    const paymentMethods = [1, 2, 3, 4, 5]; // Cash, Credit Card, Debit Card, UPI, Other
    
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    
    // Generate data for current month and previous months
    for (let month = 1; month <= currentMonth; month++) {
        for (let user of users) {
            // Generate 5-10 expenses per user per month
            const numExpenses = Math.floor(Math.random() * 6) + 5;
            
            for (let i = 0; i < numExpenses; i++) {
                const amount = Math.floor(Math.random() * 5000) + 100; // Random amount between 100 and 5000
                const categoryId = categories[Math.floor(Math.random() * categories.length)];
                const paymentMethodId = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
                
                // Random date within the month
                const day = Math.floor(Math.random() * 28) + 1;
                const date = `${currentYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                
                expenses.push({
                    user_id: user,
                    amount: amount,
                    date: date,
                    category_id: categoryId,
                    payment_method_id: paymentMethodId,
                    description: `Sample expense ${i + 1}`
                });
            }
        }
    }
    
    return expenses;
}

const sampleExpenses = generateSampleExpenses();

db.serialize(() => {
    const stmt = db.prepare('INSERT INTO expenses (user_id, amount, date, category_id, payment_method_id, description) VALUES (?, ?, ?, ?, ?, ?)');
    
    sampleExpenses.forEach(expense => {
        stmt.run(expense.user_id, expense.amount, expense.date, expense.category_id, expense.payment_method_id, expense.description);
    });
    
    stmt.finalize();
    
    console.log(`Inserted ${sampleExpenses.length} sample expenses.`);
    
    // Verify data insertion
    db.get('SELECT COUNT(*) as count FROM expenses', (err, row) => {
        if (err) {
            console.error('Error counting expenses:', err);
        } else {
            console.log(`Total expenses in database: ${row.count}`);
        }
        db.close();
    });
});