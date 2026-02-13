const db = require('./database');

const cleanupTestReminder = () => {
    db.run("DELETE FROM reminders WHERE description = 'Test Reminder for Email'", [], function (err) {
        if (err) {
            console.error('Error cleaning up test reminder:', err);
        } else {
            console.log('Cleanup complete. Deleted rows:', this.changes);
        }
        // exit explicitly because db connection keeps process alive for backups
        // wait a bit for logging
        setTimeout(() => process.exit(0), 1000);
    });
};

cleanupTestReminder();
