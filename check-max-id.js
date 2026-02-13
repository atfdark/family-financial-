const supabase = require('./services/supabase');

async function checkMaxId() {
    try {
        const { data, error } = await supabase
            .from('transactions')
            .select('id')
            .order('id', { ascending: false })
            .limit(1);

        if (error) {
            console.error('Error fetching max ID:', error);
            return;
        }

        if (data && data.length > 0) {
            console.log('Max ID found:', data[0].id);
        } else {
            console.log('No transactions found.');
        }
    } catch (err) {
        console.error('Exception:', err);
    }
}

checkMaxId();
