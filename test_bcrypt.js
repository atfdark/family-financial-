const bcrypt = require('bcryptjs');

// Test data from the database
const username = 'Abi';
const password = '123456';
const passwordHash = '$2b$10$MeO6qZMwCBPBbS.PCmnK8O5hUx5leTdHlvZlMO5fm54iYRoxemcf.';

console.log('=== BCRYPT COMPARE TEST ===\n');
console.log('Username:', username);
console.log('Password:', password);
console.log('Password Hash:', passwordHash);
console.log('');

// Test bcrypt.compare()
bcrypt.compare(password, passwordHash, (err, isMatch) => {
    if (err) {
        console.error('❌ Error comparing passwords:', err);
        console.error('Error name:', err.name);
        console.error('Error message:', err.message);
        console.error('Error stack:', err.stack);
        process.exit(1);
    }

    console.log('✅ bcrypt.compare() completed successfully');
    console.log('Password match:', isMatch);
    console.log('');

    // Also test with a wrong password
    bcrypt.compare('wrongpassword', passwordHash, (err, isMatch2) => {
        if (err) {
            console.error('❌ Error comparing wrong password:', err);
            process.exit(1);
        }

        console.log('✅ bcrypt.compare() with wrong password completed successfully');
        console.log('Wrong password match:', isMatch2);
        console.log('');

        // Test hashing a new password
        bcrypt.hash('testpassword', 12, (err, hash) => {
            if (err) {
                console.error('❌ Error hashing password:', err);
                process.exit(1);
            }

            console.log('✅ bcrypt.hash() completed successfully');
            console.log('New hash:', hash);
            console.log('');

            // Test comparing with the new hash
            bcrypt.compare('testpassword', hash, (err, isMatch3) => {
                if (err) {
                    console.error('❌ Error comparing with new hash:', err);
                    process.exit(1);
                }

                console.log('✅ bcrypt.compare() with new hash completed successfully');
                console.log('New password match:', isMatch3);
                console.log('');
                console.log('=== ALL TESTS PASSED ===');
                process.exit(0);
            });
        });
    });
});
