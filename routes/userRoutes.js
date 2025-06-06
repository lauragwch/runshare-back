const express = require('express');
const { getUserProfile, updateProfile, updateProfilePicture, rateUser, getAllUsers, deleteUser, updateUserRole, getSharedPastRuns } = require('../controllers/userController');
const auth = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');
const upload = require('../middleware/upload');

const router = express.Router();

// Routes publiques
router.get('/:id', getUserProfile);

// Routes protégées
router.put('/profile', auth, updateProfile);
router.post('/profile/picture', auth, upload.single('profile_picture'), updateProfilePicture);
router.post('/rate', auth, rateUser);
router.get('/:id/shared-runs', auth, getSharedPastRuns);

// Routes admin
router.get('/admin/all', auth, isAdmin, getAllUsers);
router.delete('/admin/:id', auth, isAdmin, deleteUser);
router.put('/admin/role', auth, isAdmin, updateUserRole);

module.exports = router;