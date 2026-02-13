const db = require('./database');

const createTestReminder = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dueDate = tomorrow.toISOString();

    // We need a user ID. Assuming user ID 1 exists (from login/register flow).
    // If no user exists, this might fail or we need to create one.
    // Let's assume user 1 exists.
    const userId = 1;

    db.run('INSERT INTO reminders (user_id, description, amount, due_date, frequency, is_paid) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, 'Test Reminder for Email', 100.50, dueDate, 'once', 0], function (err) {
            if (err) {
                console.error('Error creating test reminder:', err);
            } else {
                console.log('Test reminder created with ID:', this.lastID);
            }
        });
};

createTestReminder();
