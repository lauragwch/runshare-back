const express = require('express');
const { register, login, getProfile, updateUserRole, forgotPassword, resetPassword, verifyToken } = require('../controllers/authController');
const auth = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');

const router = express.Router();

// Routes publiques
router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.get('/verify-token/:token', verifyToken);
router.post('/reset-password', resetPassword);

// Routes protégées
router.get('/profile', auth, getProfile);
router.put('/role', auth, isAdmin, updateUserRole);

module.exports = router;