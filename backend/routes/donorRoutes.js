const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const { checkRole } = require('../middleware/roleMiddleware');
const {
    createOrUpdateProfile,
    getMyProfile,
    toggleAvailability,
    searchDonors
} = require('../controllers/donorController');

// Public Route: Emergency search for compatible donors
router.get('/search', searchDonors);

// Protected Routes (Requires 'donor' role)
router.use(verifyToken, checkRole('donor'));
router.get('/profile', getMyProfile);
router.post('/profile', createOrUpdateProfile);
router.patch('/availability', toggleAvailability);

module.exports = router;
