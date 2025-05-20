// Importation du service d'authentification qui contient la logique métier
const authService = require('../services/authService');

// Contrôleur pour gérer l'inscription d'un nouvel utilisateur
const register = async (req, res) => {
  try {
    // Extraction des données envoyées par le client
    const { username, email, password, city, level, bio } = req.body;
    
    // Vérification que tous les champs requis sont présents
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Nom d\'utilisateur, email et mot de passe requis' });
    }
    
    // Appel du service pour créer le nouvel utilisateur
    const result = await authService.register(username, email, password, city, level, bio);
    
    // Renvoyer le résultat avec un code 201 (Created)
    res.status(201).json({
      message: 'Utilisateur créé avec succès',
      token: result.token,
      user: {
        id_user: result.userId,
        username: result.userData.username,
        email: result.userData.email,
        city: result.userData.city,
        level: result.userData.level,
        bio: result.userData.bio,
        role: result.role
      }
    });
    
  } catch (error) {
    console.error('Erreur dans register :', error.message);
    res.status(400).json({ message: error.message || 'Erreur lors de l\'inscription' });
  }
};

// Contrôleur pour gérer la connexion d'un utilisateur
const login = async (req, res) => {
  try {
    // Extraction des identifiants
    const { email, password } = req.body;
    
    // Vérification que les identifiants sont présents
    if (!email || !password) {
      return res.status(400).json({ message: 'Email et mot de passe requis' });
    }
    
    // Appel du service pour vérifier les identifiants
    const result = await authService.login(email, password);
    
    // Si tout est OK, renvoyer le résultat au client
    res.json({
      token: result.token,
      user: {
        ...result.userData,
        role: result.role
      }
    });
    
  } catch (error) {
    console.error('Erreur dans login :', error.message);
    res.status(401).json({ message: 'Email ou mot de passe incorrect' });
  }
};

// Contrôleur pour récupérer le profil de l'utilisateur connecté
const getProfile = async (req, res) => {
  try {
    const userId = req.user.id_user;
    
    // Appel du service pour récupérer le profil
    const profileData = await authService.getProfile(userId);
    
    res.json(profileData);
    
  } catch (error) {
    console.error('Erreur dans getProfile :', error.message);
    res.status(404).json({ message: error.message || 'Erreur lors de la récupération du profil' });
  }
};

// Exportation des fonctions
module.exports = {
  register,
  login,
  getProfile
};