const express = require('express');
const { register, login, getProfile, updateUserRole, forgotPassword, resetPassword } = require('../controllers/authController');
const auth = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');

const router = express.Router();

// Routes publiques
router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Routes protégées
router.get('/profile', auth, getProfile);
router.put('/role', auth, isAdmin, updateUserRole);

module.exports = router;