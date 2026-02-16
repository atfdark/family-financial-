const supabase = require('./supabase');
const { sendEmail } = require('./emailService');

const checkReminders = async () => {
  console.log('Running daily reminder check...');
  try {
    const { data: reminders, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('is_paid', false);

    if (error) throw error;

    // Get current time in IST
    const now = new Date();
    const istDateString = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
    const todayIST = new Date(istDateString);
    // Set to beginning of day for consistent comparison
    todayIST.setHours(0, 0, 0, 0);

    const upcomingReminders = reminders.filter(reminder => {
      // Parse due date (assuming it's stored as YYYY-MM-DD or ISO)
      // We need to treat the due date as an IST date 
      const dueDate = new Date(reminder.due_date);

      // Adjust due date strictly to start of day in local time (which matches how we treat "todayIST")
      // Since due_date from DB is likely UTC midnight, we just want to compare dates.
      // A robust way: compare YYYY-MM-DD strings in IST.

      const dueDateString = dueDate.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
      const dueDateIST = new Date(dueDateString);
      dueDateIST.setHours(0, 0, 0, 0);

      // Calculate difference in days
      const diffTime = dueDateIST.getTime() - todayIST.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Return true if due within next 5 days (including today and overdue up to 0)
      return diffDays <= 5 && diffDays >= 0;
    });

    if (upcomingReminders.length > 0) {
      console.log(`Found ${upcomingReminders.length} upcoming reminders.`);

      // Use the configured recipient email
      const recipientEmail = process.env.EMAIL_TO;

      if (!recipientEmail) {
        console.error('No recipient email configured (EMAIL_TO). Skipping email.');
        return;
      }

      const emailSubject = `Upcoming Bill Reminders - ${upcomingReminders.length} Due Soon`;
      const emailBody = `
          <h2>Upcoming Bill Reminders</h2>
          <p>You have the following bills due soon:</p>
          <table style="border-collapse: collapse; width: 100%;">
            <thead>
              <tr style="background-color: #f2f2f2;">
                <th style="padding: 8px; border: 1px solid #ddd;">Description</th>
                <th style="padding: 8px; border: 1px solid #ddd;">Due Date</th>
                <th style="padding: 8px; border: 1px solid #ddd;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${upcomingReminders.map(r => `
                <tr>
                  <td style="padding: 8px; border: 1px solid #ddd;">${r.description}</td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${new Date(r.due_date).toLocaleDateString()}</td>
                  <td style="padding: 8px; border: 1px solid #ddd;">₹${r.amount.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <p>
            If already paid, please mark it as paid on the site:<br>
            <a href="https://family-financial-qntd.vercel.app" style="color: #007bff; text-decoration: none; font-weight: bold;">
              https://family-financial-qntd.vercel.app
            </a>
          </p>
        `;

      await sendEmail(recipientEmail, emailSubject, emailBody);
      console.log(`Reminder email sent to ${recipientEmail}`);
    } else {
      console.log('No upcoming reminders found.');
    }
  } catch (error) {
    console.error('Error in daily reminder check:', error);
    throw error; // Re-throw for Vercel Cron to see failure
  }
};

module.exports = { checkReminders };
