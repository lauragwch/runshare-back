const express = require('express');
const { createRun, getRuns, getRunById, joinRun, leaveRun, rateRun, updateRun, deleteRun, getAllRunsForAdmin, deleteRunAsAdmin } = require('../controllers/runController');
const auth = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');

const router = express.Router();

// Routes publiques/semi-publiques (accessibles sans authentification, mais avec des restrictions)
router.get('/', getRuns); // Accessible à tous, mais filtré pour les courses publiques seulement
router.get('/:id', getRunById); // Accessible à tous, mais vérification pour les courses privées

// Routes protégées utilisateur
router.post('/', auth, createRun);
router.put('/:id', auth, updateRun);
router.delete('/:id', auth, deleteRun);
router.post('/:id/join', auth, joinRun);
router.delete('/:id/leave', auth, leaveRun);
router.post('/:id/rate', auth, rateRun); 

// Routes admin
router.get('/admin/all', auth, isAdmin, getAllRunsForAdmin);
router.delete('/admin/:id', auth, isAdmin, deleteRunAsAdmin);


module.exports = router;