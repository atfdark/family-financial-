const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./family_financial.db', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        process.exit(1);
    }
});

console.log('=== DETAILED DATABASE INTEGRITY ANALYSIS ===\n');

const issues = [];

// Check 1: Schema mismatch between database.js and actual database
console.log('1. Checking schema mismatch...');
console.log('   database.js defines: users(id, username, password_hash, created_at)');
console.log('   Actual database has: users(id, username, email, password_hash)');
console.log('   ❌ ISSUE: Schema mismatch - created_at column missing, email column added');
issues.push({
    table: 'users',
    column: 'created_at',
    severity: 'HIGH',
    description: 'Schema mismatch: database.js defines created_at column but it does not exist in actual database',
    fix: 'Either add created_at column to database or update database.js to match actual schema'
});

console.log('   database.js defines: transactions(id, user_id, type, amount, description, category, date, created_at)');
console.log('   Actual database has: transactions(id, user_id, type, amount, description, category, date)');
console.log('   ❌ ISSUE: Schema mismatch - created_at column missing');
issues.push({
    table: 'transactions',
    column: 'created_at',
    severity: 'HIGH',
    description: 'Schema mismatch: database.js defines created_at column but it does not exist in actual database',
    fix: 'Either add created_at column to database or update database.js to match actual schema'
});

// Check 2: Missing NOT NULL constraints
console.log('\n2. Checking NOT NULL constraints...');
db.all(`PRAGMA table_info(users)`, (err, columns) => {
    columns.forEach(col => {
        if (!col.notnull && col.name !== 'id') {
            console.log(`   ❌ ISSUE: users.${col.name} is NOT NULL in database.js but not in actual database`);
            issues.push({
                table: 'users',
                column: col.name,
                severity: 'HIGH',
                description: `Missing NOT NULL constraint on users.${col.name}`,
                fix: `Add NOT NULL constraint to users.${col.name} column`
            });
        }
    });

    db.all(`PRAGMA table_info(transactions)`, (err, columns) => {
        columns.forEach(col => {
            if (!col.notnull && col.name !== 'id') {
                console.log(`   ❌ ISSUE: transactions.${col.name} is NOT NULL in database.js but not in actual database`);
                issues.push({
                    table: 'transactions',
                    column: col.name,
                    severity: 'HIGH',
                    description: `Missing NOT NULL constraint on transactions.${col.name}`,
                    fix: `Add NOT NULL constraint to transactions.${col.name} column`
                });
            }
        });

        // Check 3: Missing CHECK constraints
        console.log('\n3. Checking CHECK constraints...');
        db.get(`SELECT sql FROM sqlite_master WHERE type='table' AND name='transactions'`, (err, result) => {
            if (result && !result.sql.includes('CHECK(type IN')) {
                console.log('   ❌ ISSUE: Missing CHECK constraint on transactions.type');
                issues.push({
                    table: 'transactions',
                    column: 'type',
                    severity: 'HIGH',
                    description: 'Missing CHECK constraint to ensure type is either "income" or "expense"',
                    fix: 'Add CHECK(type IN ("income", "expense")) constraint'
                });
            }
            if (result && !result.sql.includes('CHECK(amount > 0)')) {
                console.log('   ❌ ISSUE: Missing CHECK constraint on transactions.amount');
                issues.push({
                    table: 'transactions',
                    column: 'amount',
                    severity: 'HIGH',
                    description: 'Missing CHECK constraint to ensure amount is greater than 0',
                    fix: 'Add CHECK(amount > 0) constraint'
                });
            }

            // Check 4: Foreign key cascade behavior
            console.log('\n4. Checking foreign key cascade behavior...');
            db.all(`PRAGMA foreign_key_list(transactions)`, (err, fks) => {
                if (fks.length > 0) {
                    fks.forEach(fk => {
                        if (fk.on_delete !== 'CASCADE') {
                            console.log(`   ❌ ISSUE: Foreign key on_delete is ${fk.on_delete} instead of CASCADE`);
                            issues.push({
                                table: 'transactions',
                                column: fk.from,
                                severity: 'MEDIUM',
                                description: `Foreign key on_delete is ${fk.on_delete} instead of CASCADE as defined in database.js`,
                                fix: 'Recreate foreign key with ON DELETE CASCADE'
                            });
                        }
                    });
                }

                // Check 5: Missing indexes
                console.log('\n5. Checking for missing indexes...');
                db.all(`PRAGMA index_list(transactions)`, (err, indexes) => {
                    const indexNames = indexes.map(i => i.name);
                    if (!indexNames.includes('idx_transactions_user_id')) {
                        console.log('   ❌ ISSUE: Missing index on transactions.user_id');
                        issues.push({
                            table: 'transactions',
                            column: 'user_id',
                            severity: 'MEDIUM',
                            description: 'Missing index on user_id foreign key, which will impact query performance',
                            fix: 'CREATE INDEX idx_transactions_user_id ON transactions(user_id)'
                        });
                    }
                    if (!indexNames.includes('idx_transactions_date')) {
                        console.log('   ❌ ISSUE: Missing index on transactions.date');
                        issues.push({
                            table: 'transactions',
                            column: 'date',
                            severity: 'MEDIUM',
                            description: 'Missing index on date column, which will impact date-based queries',
                            fix: 'CREATE INDEX idx_transactions_date ON transactions(date)'
                        });
                    }
                    if (!indexNames.includes('idx_transactions_type')) {
                        console.log('   ❌ ISSUE: Missing index on transactions.type');
                        issues.push({
                            table: 'transactions',
                            column: 'type',
                            severity: 'LOW',
                            description: 'Missing index on type column, which may impact filtering by income/expense',
                            fix: 'CREATE INDEX idx_transactions_type ON transactions(type)'
                        });
                    }

                    // Check 6: Data integrity - NULL values
                    console.log('\n6. Checking for NULL values in critical columns...');
                    db.get(`SELECT COUNT(*) as count FROM users WHERE email IS NULL`, (err, result) => {
                        if (result.count > 0) {
                            console.log(`   ❌ ISSUE: ${result.count} users have NULL email values`);
                            issues.push({
                                table: 'users',
                                column: 'email',
                                severity: 'MEDIUM',
                                description: `${result.count} users have NULL email values, which may cause issues with email-based features`,
                                fix: 'Add NOT NULL constraint to email column and update existing NULL values'
                            });
                        }

                        db.get(`SELECT COUNT(*) as count FROM transactions WHERE category IS NULL`, (err, result) => {
                            if (result.count > 0) {
                                console.log(`   ⚠️  WARNING: ${result.count} transactions have NULL category values`);
                                issues.push({
                                    table: 'transactions',
                                    column: 'category',
                                    severity: 'LOW',
                                    description: `${result.count} transactions have NULL category values`,
                                    fix: 'Consider adding a default category or making category optional with proper handling'
                                });
                            }

                            // Check 7: Orphaned records
                            console.log('\n7. Checking for orphaned records...');
                            db.get(`SELECT COUNT(*) as count FROM transactions t LEFT JOIN users u ON t.user_id = u.id WHERE u.id IS NULL`, (err, result) => {
                                if (result.count > 0) {
                                    console.log(`   ❌ ISSUE: ${result.count} orphaned transactions (user_id references non-existent user)`);
                                    issues.push({
                                        table: 'transactions',
                                        column: 'user_id',
                                        severity: 'CRITICAL',
                                        description: `${result.count} orphaned transactions with invalid user_id references`,
                                        fix: 'Delete orphaned records or fix user_id references'
                                    });
                                } else {
                                    console.log('   ✓ No orphaned transactions found');
                                }

                                // Check 8: Duplicate data
                                console.log('\n8. Checking for duplicate data...');
                                db.get(`SELECT username, COUNT(*) as count FROM users GROUP BY username HAVING count > 1`, (err, result) => {
                                    if (result) {
                                        console.log(`   ❌ ISSUE: Duplicate username found: ${result.username} (${result.count} occurrences)`);
                                        issues.push({
                                            table: 'users',
                                            column: 'username',
                                            severity: 'CRITICAL',
                                            description: `Duplicate username: ${result.username} (${result.count} occurrences)`,
                                            fix: 'Remove duplicate usernames and ensure UNIQUE constraint is enforced'
                                        });
                                    } else {
                                        console.log('   ✓ No duplicate usernames found');
                                    }

                                    db.get(`SELECT email, COUNT(*) as count FROM users WHERE email IS NOT NULL GROUP BY email HAVING count > 1`, (err, result) => {
                                        if (result) {
                                            console.log(`   ❌ ISSUE: Duplicate email found: ${result.email} (${result.count} occurrences)`);
                                            issues.push({
                                                table: 'users',
                                                column: 'email',
                                                severity: 'HIGH',
                                                description: `Duplicate email: ${result.email} (${result.count} occurrences)`,
                                                fix: 'Remove duplicate emails and add UNIQUE constraint on email column'
                                            });
                                        } else {
                                            console.log('   ✓ No duplicate emails found');
                                        }

                                        // Check 9: Data type validation
                                        console.log('\n9. Checking data type validation...');
                                        db.get(`SELECT COUNT(*) as count FROM transactions WHERE type NOT IN ('income', 'expense')`, (err, result) => {
                                            if (result.count > 0) {
                                                console.log(`   ❌ ISSUE: ${result.count} transactions have invalid type values`);
                                                issues.push({
                                                    table: 'transactions',
                                                    column: 'type',
                                                    severity: 'HIGH',
                                                    description: `${result.count} transactions have invalid type values (not "income" or "expense")`,
                                                    fix: 'Add CHECK constraint and fix invalid data'
                                                });
                                            } else {
                                                console.log('   ✓ All transaction types are valid');
                                            }

                                            db.get(`SELECT COUNT(*) as count FROM transactions WHERE amount <= 0`, (err, result) => {
                                                if (result.count > 0) {
                                                    console.log(`   ❌ ISSUE: ${result.count} transactions have amount <= 0`);
                                                    issues.push({
                                                        table: 'transactions',
                                                        column: 'amount',
                                                        severity: 'HIGH',
                                                        description: `${result.count} transactions have amount <= 0`,
                                                        fix: 'Add CHECK(amount > 0) constraint and fix invalid data'
                                                    });
                                                } else {
                                                    console.log('   ✓ All transaction amounts are positive');
                                                }

                                                // Check 10: Security concerns
                                                console.log('\n10. Checking security concerns...');
                                                console.log('   ⚠️  WARNING: Passwords are stored as hashes (good), but no salt rotation mechanism');
                                                issues.push({
                                                    table: 'users',
                                                    column: 'password_hash',
                                                    severity: 'MEDIUM',
                                                    description: 'No password salt rotation mechanism - consider implementing password rehashing on login',
                                                    fix: 'Implement password rehashing mechanism to upgrade hash algorithms over time'
                                                });

                                                console.log('   ⚠️  WARNING: No account lockout mechanism for failed login attempts');
                                                issues.push({
                                                    table: 'users',
                                                    column: 'N/A',
                                                    severity: 'HIGH',
                                                    description: 'No account lockout mechanism for failed login attempts - vulnerable to brute force attacks',
                                                    fix: 'Implement account lockout after N failed attempts'
                                                });

                                                console.log('   ⚠️  WARNING: No password complexity requirements enforced at database level');
                                                issues.push({
                                                    table: 'users',
                                                    column: 'password_hash',
                                                    severity: 'MEDIUM',
                                                    description: 'No password complexity requirements enforced at database level',
                                                    fix: 'Add CHECK constraint or application-level validation for password complexity'
                                                });

                                                console.log('   ⚠️  WARNING: No email verification mechanism');
                                                issues.push({
                                                    table: 'users',
                                                    column: 'email',
                                                    severity: 'MEDIUM',
                                                    description: 'No email verification mechanism - users can register with fake emails',
                                                    fix: 'Implement email verification workflow'
                                                });

                                                // Check 11: Missing created_at timestamps
                                                console.log('\n11. Checking for audit trail...');
                                                console.log('   ❌ ISSUE: No created_at timestamp in users table');
                                                issues.push({
                                                    table: 'users',
                                                    column: 'created_at',
                                                    severity: 'MEDIUM',
                                                    description: 'Missing created_at timestamp - no audit trail for user creation',
                                                    fix: 'Add created_at DATETIME DEFAULT CURRENT_TIMESTAMP column'
                                                });

                                                console.log('   ❌ ISSUE: No created_at timestamp in transactions table');
                                                issues.push({
                                                    table: 'transactions',
                                                    column: 'created_at',
                                                    severity: 'MEDIUM',
                                                    description: 'Missing created_at timestamp - no audit trail for transaction creation',
                                                    fix: 'Add created_at DATETIME DEFAULT CURRENT_TIMESTAMP column'
                                                });

                                                console.log('   ❌ ISSUE: No updated_at timestamp in any table');
                                                issues.push({
                                                    table: 'all',
                                                    column: 'updated_at',
                                                    severity: 'LOW',
                                                    description: 'No updated_at timestamp - cannot track when records were last modified',
                                                    fix: 'Add updated_at DATETIME DEFAULT CURRENT_TIMESTAMP columns'
                                                });

                                                // Check 12: Missing UNIQUE constraint on email
                                                console.log('\n12. Checking for missing UNIQUE constraints...');
                                                db.get(`SELECT sql FROM sqlite_master WHERE type='table' AND name='users'`, (err, result) => {
                                                    if (result && !result.sql.includes('email UNIQUE')) {
                                                        console.log('   ❌ ISSUE: No UNIQUE constraint on users.email');
                                                        issues.push({
                                                            table: 'users',
                                                            column: 'email',
                                                            severity: 'HIGH',
                                                            description: 'Missing UNIQUE constraint on email column - multiple users can have same email',
                                                            fix: 'Add UNIQUE constraint to email column'
                                                        });
                                                    }

                                                    // Check 13: Date format inconsistency
                                                    console.log('\n13. Checking date format consistency...');
                                                    db.all(`SELECT DISTINCT date FROM transactions LIMIT 10`, (err, rows) => {
                                                        console.log('   Sample date formats:');
                                                        rows.forEach(row => {
                                                            console.log(`     - ${row.date}`);
                                                        });
                                                        console.log('   ⚠️  WARNING: Date format is TEXT, not DATETIME - may cause sorting/filtering issues');
                                                        issues.push({
                                                            table: 'transactions',
                                                            column: 'date',
                                                            severity: 'LOW',
                                                            description: 'Date stored as TEXT instead of DATETIME - may cause sorting/filtering issues',
                                                            fix: 'Consider using DATETIME type or ensure consistent ISO 8601 format'
                                                        });

                                                        // Check 14: Missing soft delete mechanism
                                                        console.log('\n14. Checking for soft delete mechanism...');
                                                        console.log('   ⚠️  WARNING: No soft delete mechanism - deleted data cannot be recovered');
                                                        issues.push({
                                                            table: 'all',
                                                            column: 'deleted_at',
                                                            severity: 'LOW',
                                                            description: 'No soft delete mechanism - deleted data cannot be recovered',
                                                            fix: 'Add deleted_at DATETIME column for soft deletes'
                                                        });

                                                        // Check 15: No transaction status tracking
                                                        console.log('\n15. Checking transaction status tracking...');
                                                        console.log('   ⚠️  WARNING: No transaction status (pending, confirmed, cancelled)');
                                                        issues.push({
                                                            table: 'transactions',
                                                            column: 'status',
                                                            severity: 'LOW',
                                                            description: 'No transaction status field - cannot track pending/confirmed/cancelled transactions',
                                                            fix: 'Add status column with CHECK constraint'
                                                        });

                                                        // Check 16: No budget/limit tracking
                                                        console.log('\n16. Checking for budget/limit tracking...');
                                                        console.log('   ⚠️  WARNING: No budget or spending limit tables');
                                                        issues.push({
                                                            table: 'N/A',
                                                            column: 'N/A',
                                                            severity: 'LOW',
                                                            description: 'No budget or spending limit tracking - cannot enforce financial limits',
                                                            fix: 'Add budgets table with user_id, category, amount, period columns'
                                                        });

                                                        // Check 17: No transaction tags
                                                        console.log('\n17. Checking for transaction tags...');
                                                        console.log('   ⚠️  WARNING: No transaction tags for better categorization');
                                                        issues.push({
                                                            table: 'transactions',
                                                            column: 'tags',
                                                            severity: 'LOW',
                                                            description: 'No transaction tags - limited categorization options',
                                                            fix: 'Add tags column or create separate transaction_tags table'
                                                        });

                                                        // Check 18: No recurring transaction support
                                                        console.log('\n18. Checking for recurring transaction support...');
                                                        console.log('   ⚠️  WARNING: No recurring transaction support');
                                                        issues.push({
                                                            table: 'N/A',
                                                            column: 'N/A',
                                                            severity: 'LOW',
                                                            description: 'No recurring transaction support - cannot automate regular income/expenses',
                                                            fix: 'Add recurring_transactions table with frequency, next_date columns'
                                                        });

                                                        // Summary
                                                        console.log('\n' + '='.repeat(70));
                                                        console.log('SUMMARY OF ISSUES FOUND');
                                                        console.log('='.repeat(70));
                                                        console.log(`Total Issues: ${issues.length}`);
                                                        console.log(`Critical: ${issues.filter(i => i.severity === 'CRITICAL').length}`);
                                                        console.log(`High: ${issues.filter(i => i.severity === 'HIGH').length}`);
                                                        console.log(`Medium: ${issues.filter(i => i.severity === 'MEDIUM').length}`);
                                                        console.log(`Low: ${issues.filter(i => i.severity === 'LOW').length}`);
                                                        console.log('\n');

                                                        issues.forEach((issue, index) => {
                                                            console.log(`${index + 1}. [${issue.severity}] ${issue.table}.${issue.column || 'N/A'}`);
                                                            console.log(`   Description: ${issue.description}`);
                                                            console.log(`   Fix: ${issue.fix}`);
                                                            console.log('');
                                                        });

                                                        db.close();
                                                        process.exit(0);
                                                    });
                                                });
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});
