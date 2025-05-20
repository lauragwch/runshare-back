const userService = require('../services/userService');

// Récupérer le profil public d'un utilisateur
const getUserProfile = async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Appel du service pour récupérer le profil
    const profileData = await userService.getUserProfile(userId);
    
    res.json(profileData);
    
  } catch (error) {
    console.error('Erreur dans getUserProfile :', error.message);
    res.status(404).json({ message: error.message || 'Erreur lors de la récupération du profil' });
  }
};

// Mettre à jour son propre profil
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id_user;
    const { username, city, level, bio, password } = req.body;
    
    // Appel du service pour mettre à jour le profil
    const result = await userService.updateProfile(userId, { username, city, level, bio, password });
    
    res.json(result);
    
  } catch (error) {
    console.error('Erreur dans updateProfile :', error.message);
    res.status(400).json({ message: error.message || 'Erreur lors de la mise à jour du profil' });
  }
};

// Mettre à jour la photo de profil
const updateProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Aucun fichier téléchargé' });
    }
    
    const userId = req.user.id_user;
    const profilePicturePath = `/images/profiles/${req.file.filename}`;
    
    // Appel du service pour mettre à jour la photo
    const result = await userService.updateProfilePicture(userId, profilePicturePath);
    
    res.json(result);
    
  } catch (error) {
    console.error('Erreur dans updateProfilePicture :', error.message);
    res.status(500).json({ message: error.message || 'Erreur lors de la mise à jour de la photo de profil' });
  }
};

// Ajouter une évaluation à un utilisateur
const rateUser = async (req, res) => {
  try {
    const { id_to_user, id_run, rating, comment } = req.body;
    const id_from_user = req.user.id_user;
    
    // Appel du service pour ajouter l'évaluation
    const result = await userService.rateUser(id_from_user, id_to_user, id_run, rating, comment);
    
    res.status(201).json(result);
    
  } catch (error) {
    console.error('Erreur dans rateUser :', error.message);
    res.status(400).json({ message: error.message || 'Erreur lors de l\'ajout de l\'évaluation' });
  }
};

module.exports = {
  getUserProfile,
  updateProfile,
  updateProfilePicture,
  rateUser
};