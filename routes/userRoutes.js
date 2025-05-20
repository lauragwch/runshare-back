const express = require('express');
const { getUserProfile, updateProfile, updateProfilePicture, rateUser } = require('../controllers/userController');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// Routes publiques
router.get('/:id', getUserProfile);

// Routes protégées
router.put('/profile', auth, updateProfile);
router.post('/profile/picture', auth, upload.single('profile_picture'), updateProfilePicture);
router.post('/rate', auth, rateUser);

module.exports = router;