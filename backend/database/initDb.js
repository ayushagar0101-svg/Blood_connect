const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

async function initializeDatabase() {
    console.log('==================================================');
    console.log('🚀 Starting BloodConnect Database Migration...');
    console.log(`📡 Connecting to MySQL Host: ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 3306}`);
    console.log(`👤 MySQL User: ${process.env.DB_USER || 'root'}`);
    console.log('==================================================');

    let connection;
    try {
        // Step 1: Connect to MySQL server without selecting a DB first
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            port: parseInt(process.env.DB_PORT) || 3306,
            multipleStatements: true
        });

        console.log('✅ Connected to MySQL server.');

        // Step 2: Read schema.sql file
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        console.log('📄 Executing database schema & creating tables...');
        await connection.query(schemaSql);

        // Step 3: Verify created tables
        const [tables] = await connection.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = '${process.env.DB_NAME || 'bloodconnect_db'}'
        `);

        console.log('==================================================');
        console.log(`🎉 Database '${process.env.DB_NAME || 'bloodconnect_db'}' is READY!`);
        console.log(`📊 Total Tables Created: ${tables.length}`);
        tables.forEach((t, i) => {
            console.log(`   ${i + 1}. ${t.TABLE_NAME || t.table_name}`);
        });
        console.log('==================================================');

        await connection.end();
        process.exit(0);
    } catch (error) {
        console.error('❌ Database Initialization Failed!');
        console.error(`   Error Message: ${error.message}`);
        console.error('   Error Code:   ', error.code);
        console.log('--------------------------------------------------');
        console.log('💡 Quick Troubleshooting Tips:');
        console.log('1. Make sure your MySQL service is RUNNING (e.g. XAMPP or MySQL Server).');
        console.log('2. Check your password in backend/.env: DB_PASSWORD=your_password');
        console.log('--------------------------------------------------');
        if (connection) await connection.end();
        process.exit(1);
    }
}

initializeDatabase();

