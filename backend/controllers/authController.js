const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

/**
 * Generate JSON Web Token
 */
const generateToken = (user) => {
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role
        },
        process.env.JWT_SECRET || 'bloodconnect_super_secret_jwt_key_2026',
        {
            expiresIn: process.env.JWT_EXPIRES_IN || '7d'
        }
    );
};

/**
 * @desc    Register a new user (Donor, Requester, or Hospital)
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = async (req, res) => {
    try {
        const { name, email, phone, password, role } = req.body;

        // 1. Basic Validation
        if (!name || !email || !phone || !password) {
            return res.status(400).json({
                success: false,
                message: 'All fields (Name, Email, Phone, Password) are required.'
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid email address.'
            });
        }

        // Validate password length
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters long.'
            });
        }

        // Validate role (admin can only be assigned manually in database)
        const allowedRoles = ['donor', 'requester', 'hospital'];
        const userRole = role && allowedRoles.includes(role.toLowerCase()) ? role.toLowerCase() : 'donor';

        // 2. Check if Email already exists
        const [existingEmail] = await pool.query('SELECT id FROM users WHERE email = ?', [email.trim().toLowerCase()]);
        if (existingEmail.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'An account with this email address already exists. Please log in.'
            });
        }

        // 3. Check if Phone already exists
        const [existingPhone] = await pool.query('SELECT id FROM users WHERE phone = ?', [phone.trim()]);
        if (existingPhone.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'An account with this phone number already exists.'
            });
        }

        // 4. Hash Password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // 5. Insert User into Database
        const [result] = await pool.query(
            `INSERT INTO users (name, email, phone, password_hash, role, is_verified) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [name.trim(), email.trim().toLowerCase(), phone.trim(), passwordHash, userRole, false]
        );

        return res.status(201).json({
            success: true,
            message: 'Registration successful! You can now sign in with your email.',
            data: {
                userId: result.insertId,
                name: name.trim(),
                email: email.trim().toLowerCase(),
                role: userRole
            }
        });

    } catch (error) {
        console.error('Registration Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error during registration.',
            error: error.message
        });
    }
};

/**
 * @desc    Sign In using Email and Password
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. Validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and Password are required.'
            });
        }

        // 2. Find user by email
        const [rows] = await pool.query(
            'SELECT * FROM users WHERE email = ?',
            [email.trim().toLowerCase()]
        );

        if (rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password.'
            });
        }

        const user = rows[0];

        // 3. Compare Password
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password.'
            });
        }

        // 4. Generate JWT Token
        const token = generateToken(user);

        // 5. Set Cookie (Optional, helps with web sessions)
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        // 6. Return response
        return res.status(200).json({
            success: true,
            message: `Welcome back, ${user.name}!`,
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                is_verified: user.is_verified
            }
        });

    } catch (error) {
        console.error('Login Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error during login.',
            error: error.message
        });
    }
};

/**
 * @desc    Get Current Logged-in User Profile
 * @route   GET /api/auth/me
 * @access  Private (Requires Token)
 */
const getMe = async (req, res) => {
    try {
        return res.status(200).json({
            success: true,
            user: req.user
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Server error fetching user profile.'
        });
    }
};

/**
 * @desc    Logout User / Clear Cookie
 * @route   POST /api/auth/logout
 * @access  Public
 */
const logout = async (req, res) => {
    res.clearCookie('token');
    return res.status(200).json({
        success: true,
        message: 'Logged out successfully.'
    });
};

module.exports = {
    register,
    login,
    getMe,
    logout
};

