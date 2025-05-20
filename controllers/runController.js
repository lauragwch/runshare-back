const runService = require('../services/runService');

// Créer une nouvelle course
const createRun = async (req, res) => {
  try {
    const { title, description, date, location, distance, level, is_private } = req.body;
    
    // Vérification des champs obligatoires
    if (!title || !date || !location) {
      return res.status(400).json({ message: 'Titre, date et lieu sont requis' });
    }
    
    const id_organizer = req.user.id_user;
    
    // Appel du service pour créer la course
    const result = await runService.createRun(id_organizer, { 
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

module.exports = {
  createRun,
  getRuns,
  getRunById,
  joinRun,
  leaveRun
};