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

    const today = new Date();
    // Set to beginning of day for consistent comparison
    today.setHours(0, 0, 0, 0);

    const upcomingReminders = reminders.filter(reminder => {
      const dueDate = new Date(reminder.due_date);
      dueDate.setHours(0, 0, 0, 0);

      // Calculate difference in days
      const diffTime = dueDate.getTime() - today.getTime();
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
