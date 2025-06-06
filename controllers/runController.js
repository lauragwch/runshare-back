const runService = require('../services/runService');

// Créer une nouvelle course
const createRun = async (req, res) => {
  try {
    const { title, description, date, location, distance, level, is_private } = req.body;
    
    // Vérification des champs obligatoires
    if (!title || !date || !location) {
      return res.status(400).json({ message: 'Titre, date et lieu sont requis' });
    }
    
    const userId = req.user.id_user;
    
    // Appel du service pour créer la course
    const result = await runService.createRun(userId, { 
      title, 
      description, 
      date, 
      location, 
      distance, 
      level, 
      is_private 
    });
    
    res.status(201).json(result);
    
  } catch (error) {
    console.error('Erreur dans createRun :', error.message);
    res.status(400).json({ message: error.message || 'Erreur lors de la création de la course' });
  }
};

// Récupérer toutes les courses (avec filtres)
const getRuns = async (req, res) => {
  try {
    const { city, date, level, distance, search } = req.query;
    const userId = req.user ? req.user.id_user : null;
    
    // Appel du service pour récupérer les courses
    const runs = await runService.getRuns({ city, date, level, distance, search }, userId);
    
    res.json(runs);
    
  } catch (error) {
    console.error('Erreur dans getRuns :', error.message);
    res.status(500).json({ message: 'Erreur lors de la récupération des courses' });
  }
};

// Récupérer les détails d'une course
const getRunById = async (req, res) => {
  try {
    const runId = req.params.id;
    const userId = req.user ? req.user.id_user : null;
    
    // Appel du service pour récupérer les détails de la course
    const run = await runService.getRunById(runId, userId);
    
    res.json(run);
    
  } catch (error) {
    console.error('Erreur dans getRunById :', error.message);
    
    if (error.message.includes('pas accès')) {
      return res.status(403).json({ message: error.message });
    }
    
    res.status(404).json({ message: error.message || 'Course non trouvée' });
  }
};

// Rejoindre une course
const joinRun = async (req, res) => {
  try {
    const runId = req.params.id;
    const userId = req.user.id_user;
    
    // Appel du service pour rejoindre la course
    const result = await runService.joinRun(runId, userId);
    
    res.status(201).json(result);
    
  } catch (error) {
    console.error('Erreur dans joinRun :', error.message);
    res.status(400).json({ message: error.message || 'Erreur lors de l\'inscription à la course' });
  }
};

// Quitter une course
const leaveRun = async (req, res) => {
  try {
    const runId = req.params.id;
    const userId = req.user.id_user;
    
    // Appel du service pour quitter la course
    const result = await runService.leaveRun(runId, userId);
    
    res.json(result);
    
  } catch (error) {
    console.error('Erreur dans leaveRun :', error.message);
    res.status(400).json({ message: error.message || 'Erreur lors du départ de la course' });
  }
};

// Évaluer une course
const rateRun = async (req, res) => {
  try {
    const runId = req.params.id;
    const userId = req.user.id_user;
    const { rating, comment } = req.body;
    
    // Vérifier que la note est entre 1 et 5
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'La note doit être entre 1 et 5' });
    }
    
    // Appel du service pour évaluer la course
    const result = await runService.rateRun(runId, userId, rating, comment);
    
    res.status(201).json(result);
    
  } catch (error) {
    console.error('Erreur dans rateRun:', error.message);
    res.status(400).json({ message: error.message || 'Erreur lors de l\'évaluation de la course' });
  }
};

const updateRun = async (req, res) => {
  try {
    const runId = req.params.id;
    const userId = req.user.id_user;
    const runData = req.body;
    
    // Appel du service pour modifier la course
    const result = await runService.updateRun(runId, userId, runData);
    
    res.json(result);
    
  } catch (error) {
    console.error('Erreur dans updateRun :', error.message);
    res.status(400).json({ message: error.message || 'Erreur lors de la modification de la course' });
  }
};

const deleteRun = async (req, res) => {
  try {
    const runId = req.params.id;
    const userId = req.user.id_user;
    
    // Appel du service pour supprimer la course
    const result = await runService.deleteRun(runId, userId);
    
    res.json(result);
    
  } catch (error) {
    console.error('Erreur dans deleteRun :', error.message);
    res.status(400).json({ message: error.message || 'Erreur lors de la suppression de la course' });
  }
};

// Récupérer toutes les courses (admin)
const getAllRunsForAdmin = async (req, res) => {
  try {
    const runs = await runService.getAllRunsForAdmin();
    res.json(runs);
  } catch (error) {
    console.error('Erreur dans getAllRunsForAdmin :', error.message);
    res.status(500).json({ message: 'Erreur lors de la récupération des courses' });
  }
};

// Supprimer une course (admin)
const deleteRunAsAdmin = async (req, res) => {
  try {
    const runId = req.params.id;
    
    const result = await runService.deleteRunAsAdmin(runId);
    res.json(result);
  } catch (error) {
    console.error('Erreur dans deleteRunAsAdmin :', error.message);
    res.status(400).json({ message: error.message || 'Erreur lors de la suppression de la course' });
  }
};

module.exports = {
  createRun,
  getRuns,
  getRunById,
  joinRun,
  leaveRun,
  rateRun,
  updateRun,
  deleteRun,
  getAllRunsForAdmin,
  deleteRunAsAdmin
};