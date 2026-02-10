const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./family_financial.db', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        process.exit(1);
    }
});

console.log('=== DATABASE ANALYSIS ===\n');

// Get all tables
db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
    if (err) {
        console.error('Error getting tables:', err.message);
        process.exit(1);
    }

    console.log('Tables found:', tables.map(t => t.name));
    console.log('');

    let completed = 0;

    tables.forEach(table => {
        const tableName = table.name;
        
        // Get table schema
        db.all(`PRAGMA table_info(${tableName})`, (err, columns) => {
            if (err) {
                console.error(`Error getting columns for ${tableName}:`, err.message);
            } else {
                console.log(`\n=== TABLE: ${tableName} ===`);
                console.log('Columns:');
                columns.forEach(col => {
                    console.log(`  - ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
                });
            }

            // Get foreign keys
            db.all(`PRAGMA foreign_key_list(${tableName})`, (err, fks) => {
                if (err) {
                    console.error(`Error getting foreign keys for ${tableName}:`, err.message);
                } else {
                    console.log('\nForeign Keys:');
                    if (fks.length === 0) {
                        console.log('  None');
                    } else {
                        fks.forEach(fk => {
                            console.log(`  - ${fk.from} -> ${fk.table}.${fk.to} (ON DELETE: ${fk.on_delete}, ON UPDATE: ${fk.on_update})`);
                        });
                    }
                }

                // Get indexes
                db.all(`PRAGMA index_list(${tableName})`, (err, indexes) => {
                    if (err) {
                        console.error(`Error getting indexes for ${tableName}:`, err.message);
                    } else {
                        console.log('\nIndexes:');
                        if (indexes.length === 0) {
                            console.log('  None');
                        } else {
                            indexes.forEach(idx => {
                                console.log(`  - ${idx.name} (${idx.unique ? 'UNIQUE' : ''})`);
                            });
                        }
                    }

                    // Get row count
                    db.get(`SELECT COUNT(*) as count FROM ${tableName}`, (err, result) => {
                        if (err) {
                            console.error(`Error getting count for ${tableName}:`, err.message);
                        } else {
                            console.log(`\nRow Count: ${result.count}`);
                        }

                        // Get sample data
                        db.all(`SELECT * FROM ${tableName} LIMIT 5`, (err, rows) => {
                            if (err) {
                                console.error(`Error getting sample data for ${tableName}:`, err.message);
                            } else {
                                console.log('\nSample Data:');
                                if (rows.length === 0) {
                                    console.log('  No data');
                                } else {
                                    console.log(JSON.stringify(rows, null, 2));
                                }
                            }

                            console.log('\n' + '='.repeat(50));
                            completed++;
                            if (completed === tables.length) {
                                db.close();
                                process.exit(0);
                            }
                        });
                    });
                });
            });
        });
    });
});
