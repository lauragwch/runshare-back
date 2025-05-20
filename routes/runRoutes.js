const express = require('express');
const { createRun, getRuns, getRunById, joinRun, leaveRun } = require('../controllers/runController');
const auth = require('../middleware/auth');

const router = express.Router();

// Routes publiques/semi-publiques (accessibles sans authentification, mais avec des restrictions)
router.get('/', getRuns); // Accessible à tous, mais filtré pour les courses publiques seulement
router.get('/:id', getRunById); // Accessible à tous, mais vérification pour les courses privées

// Routes protégées
router.post('/', auth, createRun);
router.post('/:id/join', auth, joinRun);
router.delete('/:id/leave', auth, leaveRun);

module.exports = router;