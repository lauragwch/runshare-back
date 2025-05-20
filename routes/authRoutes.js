const express = require('express');
const { register, login, getProfile, updateUserRole } = require('../controllers/authController');
const auth = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');

const router = express.Router();

// Routes publiques
router.post('/register', register);
router.post('/login', login);

// Routes protégées
router.get('/profile', auth, getProfile);
router.put('/role', auth, isAdmin, updateUserRole);

module.exports = router;