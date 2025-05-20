const ROLES = require('../constants/roles');

module.exports = (req, res, next) => {
  // Vérifier si l'utilisateur est authentifié et a le rôle admin
  if (!req.user || req.user.role !== ROLES.ADMIN) {
    return res.status(403).json({ 
      message: 'Accès refusé. Vous devez être administrateur pour effectuer cette action.'
    });
  }
  
  // Si l'utilisateur est admin, continuer
  next();
};