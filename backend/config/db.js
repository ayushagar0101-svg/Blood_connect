const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

// Create MySQL Connection Pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bloodconnect_db',
    port: parseInt(process.env.DB_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Helper function to test DB connection
const testConnection = async () => {
    try {
        const connection = await pool.getConnection();
        console.log('✅ MySQL Database connected successfully.');
        connection.release();
        return true;
    } catch (error) {
        console.log('⚠️  MySQL Database connection check:');
        console.log(`   Message: ${error.message}`);
        return false;
    }
};

// Detailed status function used by Phase 2 /api/db-status
const getDatabaseStatus = async () => {
    try {
        const connection = await pool.getConnection();
        const dbName = process.env.DB_NAME || 'bloodconnect_db';

        const [tables] = await connection.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = ?
            ORDER BY table_name ASC
        `, [dbName]);

        connection.release();

        const tableNames = tables.map(t => t.TABLE_NAME || t.table_name);

        return {
            connected: true,
            database: dbName,
            host: process.env.DB_HOST || 'localhost',
            totalTables: tableNames.length,
            tables: tableNames,
            message: tableNames.length >= 6 
                ? 'All core tables are present and verified.' 
                : 'Database connected, but some tables are missing. Run npm run init-db.'
        };
    } catch (error) {
        return {
            connected: false,
            database: process.env.DB_NAME || 'bloodconnect_db',
            host: process.env.DB_HOST || 'localhost',
            totalTables: 0,
            tables: [],
            error: error.message,
            code: error.code
        };
    }
};

module.exports = { pool, testConnection, getDatabaseStatus };
