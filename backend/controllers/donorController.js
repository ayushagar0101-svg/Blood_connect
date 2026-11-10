const { pool } = require('../config/db');
const {
    getCompatibleDonors,
    isRareBloodGroup,
    isUniversalDonor,
    maskPhoneNumber
} = require('../utils/compatibility');

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

/**
 * @desc    Smart Search for Compatible Donors using Medical Rules & Haversine Geolocation
 * @route   GET /api/donor/search
 * @access  Public
 */
const searchDonors = async (req, res) => {
    try {
        const { blood_group, component, city, lat, lng, radius } = req.query;

        if (!blood_group) {
            return res.status(400).json({
                success: false,
                message: 'Please specify the recipient blood group to search compatible donors.'
            });
        }

        // 1. Get clinically compatible blood groups from compatibility matrix
        const compatibleGroups = getCompatibleDonors(blood_group);

        // Check if user provided valid GPS coordinates
        const hasCoordinates = lat !== undefined && lng !== undefined && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng));
        const userLat = hasCoordinates ? parseFloat(lat) : null;
        const userLng = hasCoordinates ? parseFloat(lng) : null;
        const maxRadius = radius && !isNaN(parseFloat(radius)) ? parseFloat(radius) : 50; // Default 50 km

        // 2. Build Query
        let distanceSelect = 'NULL AS distance_km';
        let distanceHaving = '';
        let params = [compatibleGroups];

        if (hasCoordinates) {
            // Haversine formula calculation in kilometers (Earth Radius R = 6371 km)
            // Clamp value between -1.0 and 1.0 to prevent floating-point precision error in ACOS
            distanceSelect = `
                (6371 * ACOS(
                    LEAST(1.0, GREATEST(-1.0,
                        COS(RADIANS(?)) * COS(RADIANS(dp.latitude)) *
                        COS(RADIANS(dp.longitude) - RADIANS(?)) +
                        SIN(RADIANS(?)) * SIN(RADIANS(dp.latitude))
                    ))
                )) AS distance_km
            `;
            // Add userLat and userLng to params for distance calculation
            params = [userLat, userLng, userLat, compatibleGroups];
        }

        let query = `
            SELECT dp.id, dp.user_id, dp.blood_group, dp.component_type, dp.gender, 
                   dp.city, dp.pincode, dp.latitude, dp.longitude, dp.availability_status, 
                   dp.total_donations, u.name, u.phone,
                   ${distanceSelect}
            FROM donor_profiles dp
            JOIN users u ON dp.user_id = u.id
            WHERE dp.blood_group IN (?)
              AND dp.availability_status = 'available'
              AND (dp.cooldown_until IS NULL OR dp.cooldown_until <= NOW())
        `;

        // 3. Filter by Component Capability
        if (component && component !== 'all') {
            query += ` AND (dp.component_type = ? OR dp.component_type = 'all')`;
            params.push(component);
        }

        // 4. Filter by City (Optional)
        if (city && city.trim()) {
            query += ` AND LOWER(dp.city) LIKE LOWER(?)`;
            params.push(`%${city.trim()}%`);
        }

        // 5. Apply Radius Distance Filter if GPS provided
        if (hasCoordinates) {
            query += ` HAVING (distance_km IS NOT NULL AND distance_km <= ?)`;
            params.push(maxRadius);
            // Nearest donors first, then exact blood group match
            query += ` ORDER BY distance_km ASC, (dp.blood_group = ?) DESC`;
            params.push(blood_group);
        } else {
            // If no GPS coordinates, sort by Exact Match first, then total successful donations
            query += ` ORDER BY (dp.blood_group = ?) DESC, dp.total_donations DESC`;
            params.push(blood_group);
        }

        const [donors] = await pool.query(query, params);

        // 6. Format response & apply Privacy Shield (Number Masking)
        const sanitizedDonors = donors.map(d => {
            const isExact = (d.blood_group === blood_group);
            const distance = (d.distance_km !== null && d.distance_km !== undefined) 
                ? parseFloat(Number(d.distance_km).toFixed(1)) 
                : null;

            return {
                id: d.id,
                userId: d.user_id,
                name: d.name,
                bloodGroup: d.blood_group,
                isExactMatch: isExact,
                matchType: isExact ? 'Exact Match' : 'Compatible Alternative Match',
                isUniversalDonor: isUniversalDonor(d.blood_group),
                isRare: isRareBloodGroup(d.blood_group),
                componentType: d.component_type,
                gender: d.gender,
                city: d.city,
                pincode: d.pincode,
                latitude: d.latitude ? parseFloat(d.latitude) : null,
                longitude: d.longitude ? parseFloat(d.longitude) : null,
                distance_km: distance,
                maskedPhone: maskPhoneNumber(d.phone), // Masked for privacy
                totalDonations: d.total_donations
            };
        });

        return res.status(200).json({
            success: true,
            recipientBloodGroup: blood_group,
            compatibleGroups,
            totalFound: sanitizedDonors.length,
            searchCenter: hasCoordinates ? { lat: userLat, lng: userLng, radiusKm: maxRadius } : null,
            donors: sanitizedDonors
        });

    } catch (error) {
        console.error('Error in searchDonors:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error searching for compatible donors.',
            error: error.message
        });
    }
};

module.exports = {
    createOrUpdateProfile,
    getMyProfile,
    toggleAvailability,
    searchDonors
};
