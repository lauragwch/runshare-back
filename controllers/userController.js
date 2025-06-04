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
    const fromUserId = req.user.id_user;
    const { userId, rating, comment } = req.body;
    
    // Appel du service pour ajouter l'évaluation
    const result = await userService.rateUser(fromUserId, userId, rating, comment);
    res.status(201).json(result);
    
  } catch (error) {
    console.error('Erreur dans rateUser :', error.message);
    res.status(400).json({ message: error.message || 'Erreur lors de l\'ajout de l\'évaluation' });
  }
};

// Récupérer tous les utilisateurs (admin)
const getAllUsers = async (req, res) => {
  try {
    const users = await userService.getAllUsers();
    res.json(users);
  } catch (error) {
    console.error('Erreur dans getAllUsers :', error.message);
    res.status(500).json({ message: 'Erreur lors de la récupération des utilisateurs' });
  }
};

// Supprimer un utilisateur (admin)
const deleteUser = async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const adminId = req.user.id_user;
    
    const result = await userService.deleteUser(userId, adminId);
    res.json(result);
  } catch (error) {
    console.error('Erreur dans deleteUser :', error.message);
    res.status(400).json({ message: error.message || 'Erreur lors de la suppression de l\'utilisateur' });
  }
};

// Modifier le rôle d'un utilisateur (admin)
const updateUserRole = async (req, res) => {
  try {
    const { userId, role } = req.body;
    const adminId = req.user.id_user;
    
    if (!userId || !role) {
      return res.status(400).json({ message: 'ID utilisateur et rôle requis' });
    }
    
    // Utiliser la fonction existante dans authService
    const authService = require('../services/authService');
    const result = await authService.updateUserRole(userId, role, adminId);
    
    res.json(result);
  } catch (error) {
    console.error('Erreur dans updateUserRole :', error.message);
    res.status(400).json({ message: error.message || 'Erreur lors de la modification du rôle' });
  }
};

module.exports = {
  getUserProfile,
  updateProfile,
  updateProfilePicture,
  rateUser,
  getAllUsers,
  deleteUser,
  updateUserRole
};