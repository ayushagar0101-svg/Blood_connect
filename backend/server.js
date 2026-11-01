const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const { testConnection, getDatabaseStatus } = require('./config/db');

// Route Imports
const authRoutes = require('./routes/authRoutes');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: true,
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Phase 1 Health Check Route
app.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'BloodConnect API is running smoothly!',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Phase 2 Database Status Route
app.get('/api/db-status', async (req, res) => {
    const status = await getDatabaseStatus();
    if (status.connected) {
        return res.status(200).json({
            success: true,
            data: status
        });
    } else {
        return res.status(500).json({
            success: false,
            data: status
        });
    }
});

// Phase 3 Authentication Routes
app.use('/api/auth', authRoutes);

// Start Server
app.listen(PORT, async () => {
    console.log('==================================================');
    console.log(`🚀 BloodConnect Server is running on port: ${PORT}`);
    console.log(`📡 URL: http://localhost:${PORT}`);
    console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
    console.log(`🗄️  DB Status Check: http://localhost:${PORT}/api/db-status`);
    console.log(`🔐 Auth API: http://localhost:${PORT}/api/auth`);
    console.log('==================================================');

    // Test DB connection on startup (non-blocking)
    await testConnection();
});
