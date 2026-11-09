const { pool } = require('../config/db');

/**
 * @desc    Create or Update Donor Profile
 * @route   POST /api/donor/profile
 * @access  Private (Donor only)
 */
const createOrUpdateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            blood_group,
            component_type,
            gender,
            date_of_birth,
            weight_kg,
            city,
            pincode,
            latitude,
            longitude,
            screening_passed
        } = req.body;

        // 1. Validation
        if (!blood_group || !component_type || !gender || !date_of_birth || !weight_kg || !city || !pincode) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required profile and medical fields.'
            });
        }

        const validBloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Bombay'];
        if (!validBloodGroups.includes(blood_group)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid blood group selected.'
            });
        }

        const validComponents = ['whole_blood', 'platelets', 'plasma', 'all'];
        if (!validComponents.includes(component_type)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid component type selected.'
            });
        }

        // 2. Weight Check (Must be >= 50kg for donor safety)
        const weight = parseFloat(weight_kg);
        if (isNaN(weight) || weight < 50) {
            return res.status(400).json({
                success: false,
                message: 'Medical Guideline: Donors must weigh at least 50 kg to be eligible for voluntary donation.'
            });
        }

        // 3. Age Check (Must be between 18 and 65 years)
        const dob = new Date(date_of_birth);
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const monthDiff = today.getMonth() - dob.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
            age--;
        }

        if (isNaN(age) || age < 18 || age > 65) {
            return res.status(400).json({
                success: false,
                message: `Medical Guideline: Donors must be between 18 and 65 years old. Your calculated age is ${age}.`
            });
        }

        // 4. Medical Questionnaire Screening Check
        if (screening_passed !== true) {
            return res.status(400).json({
                success: false,
                message: 'You must satisfy all pre-donation medical safety criteria to register as an active donor.'
            });
        }

        // 5. Check if profile already exists for this user
        const [existing] = await pool.query(
            'SELECT id, availability_status FROM donor_profiles WHERE user_id = ?',
            [userId]
        );

        const lat = latitude ? parseFloat(latitude) : null;
        const lng = longitude ? parseFloat(longitude) : null;

        if (existing.length > 0) {
            // Update existing profile
            await pool.query(
                `UPDATE donor_profiles 
                 SET blood_group = ?, component_type = ?, gender = ?, date_of_birth = ?, 
                     weight_kg = ?, city = ?, pincode = ?, latitude = ?, longitude = ?
                 WHERE user_id = ?`,
                [blood_group, component_type, gender, date_of_birth, weight, city.trim(), pincode.trim(), lat, lng, userId]
            );

            return res.status(200).json({
                success: true,
                message: 'Donor profile updated successfully!'
            });
        } else {
            // Insert new donor profile
            await pool.query(
                `INSERT INTO donor_profiles 
                 (user_id, blood_group, component_type, gender, date_of_birth, weight_kg, city, pincode, latitude, longitude, availability_status) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'available')`,
                [userId, blood_group, component_type, gender, date_of_birth, weight, city.trim(), pincode.trim(), lat, lng]
            );

            return res.status(201).json({
                success: true,
                message: 'Donor profile created successfully! You are now active in the donor directory.'
            });
        }

    } catch (error) {
        console.error('Error in createOrUpdateProfile:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error saving donor profile.',
            error: error.message
        });
    }
};

/**
 * @desc    Get Current Donor Profile
 * @route   GET /api/donor/profile
 * @access  Private (Donor only)
 */
const getMyProfile = async (req, res) => {
    try {
        const userId = req.user.id;

        const [rows] = await pool.query(
            `SELECT dp.*, u.name, u.email, u.phone 
             FROM donor_profiles dp 
             JOIN users u ON dp.user_id = u.id 
             WHERE dp.user_id = ?`,
            [userId]
        );

        if (rows.length === 0) {
            return res.status(200).json({
                success: true,
                profile: null,
                message: 'No profile created yet. Please complete your donor profile.'
            });
        }

        const profile = rows[0];

        // Calculate cooldown remaining in days if any
        let cooldownDaysRemaining = 0;
        let isEligible = true;

        if (profile.cooldown_until) {
            const cooldownDate = new Date(profile.cooldown_until);
            const now = new Date();
            if (cooldownDate > now) {
                const diffTime = Math.abs(cooldownDate - now);
                cooldownDaysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                isEligible = false;
            }
        }

        return res.status(200).json({
            success: true,
            profile: {
                ...profile,
                cooldownDaysRemaining,
                isEligible
            }
        });

    } catch (error) {
        console.error('Error in getMyProfile:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error retrieving donor profile.',
            error: error.message
        });
    }
};

/**
 * @desc    Toggle Donor Availability Status (Available / Busy)
 * @route   PATCH /api/donor/availability
 * @access  Private (Donor only)
 */
const toggleAvailability = async (req, res) => {
    try {
        const userId = req.user.id;
        const { status } = req.body;

        const allowed = ['available', 'busy'];
        if (!allowed.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Status must be either 'available' or 'busy'."
            });
        }

        // Verify profile exists
        const [rows] = await pool.query(
            'SELECT id, cooldown_until, availability_status FROM donor_profiles WHERE user_id = ?',
            [userId]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Please complete your donor profile first.'
            });
        }

        const profile = rows[0];

        // Check if currently under medical cooldown
        if (profile.cooldown_until && new Date(profile.cooldown_until) > new Date() && status === 'available') {
            return res.status(400).json({
                success: false,
                message: 'You are currently in a mandatory medical cooldown period following your recent donation and cannot set status to Available yet.'
            });
        }

        await pool.query(
            'UPDATE donor_profiles SET availability_status = ? WHERE user_id = ?',
            [status, userId]
        );

        return res.status(200).json({
            success: true,
            message: `Availability status updated to '${status}'.`,
            availability_status: status
        });

    } catch (error) {
        console.error('Error in toggleAvailability:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error updating availability.',
            error: error.message
        });
    }
};

module.exports = {
    createOrUpdateProfile,
    getMyProfile,
    toggleAvailability
};

