const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const { checkRole } = require('../middleware/roleMiddleware');
const {
    createOrUpdateProfile,
    getMyProfile,
    toggleAvailability
} = require('../controllers/donorController');

// All donor routes require authentication and 'donor' role
router.use(verifyToken, checkRole('donor'));

router.get('/profile', getMyProfile);
router.post('/profile', createOrUpdateProfile);
router.patch('/availability', toggleAvailability);

module.exports = router;

