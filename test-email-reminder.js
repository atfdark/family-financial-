require('dotenv').config();
const { checkReminders } = require('./services/scheduler');

console.log('EMAIL_USER:', process.env.EMAIL_USER);
console.log('EMAIL_PASS length:', process.env.EMAIL_PASS ? process.env.EMAIL_PASS.length : 'undefined');
console.log('EMAIL_TO:', process.env.EMAIL_TO);

console.log('Starting manual reminder check...');
checkReminders()
    .then(() => {
        console.log('Manual check complete.');
        process.exit(0);
    })
    .catch(err => {
        console.error('Error during manual check:', err);
        process.exit(1);
    });
