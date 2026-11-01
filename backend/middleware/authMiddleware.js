const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

/**
 * Authentication Middleware
 * Validates JWT token from the Authorization header or cookies
 */
const verifyToken = async (req, res, next) => {
    try {
        let token = null;

        // Check Authorization header (Bearer <token>)
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        } 
        // Fallback to cookie
        else if (req.cookies && req.cookies.token) {
            token = req.cookies.token;
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. No authentication token provided. Please log in.'
            });
        }

        // Verify JWT
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'bloodconnect_super_secret_jwt_key_2026');

        // Fetch fresh user data from database to verify user still exists
        const [rows] = await pool.query(
            'SELECT id, name, email, phone, role, is_verified, created_at FROM users WHERE id = ?',
            [decoded.id]
        );

        if (rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'User belonging to this token no longer exists.'
            });
        }

        // Attach user object to request
        req.user = rows[0];
        next();
    } catch (error) {
        console.error('JWT Verification Error:', error.message);
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token. Please log in again.'
        });
    }
};

module.exports = { verifyToken };

