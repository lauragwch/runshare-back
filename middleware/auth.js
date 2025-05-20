const jwt = require('jsonwebtoken');
require('dotenv').config();

module.exports = (req, res, next) => {
  try {
    // Récupération du token dans l'en-tête Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Token d\'authentification manquant' });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Vérification du token
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    
    // Ajout des informations utilisateur à la requête
    req.user = { 
      id_user: decodedToken.id_user,
      role: decodedToken.role 
    };
    
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token invalide' });
  }
};