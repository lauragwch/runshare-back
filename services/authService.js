const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/bdd');
const ROLES = require('../constants/roles');

// Service pour inscrire un nouvel utilisateur
const register = async (username, email, password, city, level, bio, role = ROLES.USER) => {
  // Vérifier si l'email existe déjà
  const [existingUsers] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
  if (existingUsers.length > 0) {
    throw new Error('Cet email est déjà utilisé');
  }
  
  // Vérifier si le nom d'utilisateur existe déjà
  const [existingUsernames] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
  if (existingUsernames.length > 0) {
    throw new Error('Ce nom d\'utilisateur est déjà pris');
  }
  
  // Vérifier que le rôle est valide
  if (role !== ROLES.USER && role !== ROLES.ADMIN) {
    role = ROLES.USER; // Par défaut, on attribue le rôle USER si le rôle spécifié est invalide
  }
  
  // Hacher le mot de passe
  const hashedPassword = await bcrypt.hash(password, 10);
  
  // Insérer l'utilisateur dans la base de données avec son rôle
  const [result] = await db.query(
    'INSERT INTO users (username, email, password, city, level, bio, profile_picture, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [username, email, hashedPassword, city, level, bio, null, role]
  );
  
  // Générer un token JWT avec le rôle
  const token = jwt.sign(
    { id_user: result.insertId, role },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
  
  return {
    token,
    userId: result.insertId,
    role,
    userData: {
      username,
      email,
      city,
      level,
      bio,
      role
    }
  };
};

// Service pour connecter un utilisateur existant
const login = async (email, password) => {
  // Vérifier si l'utilisateur existe
  const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
  if (users.length === 0) {
    throw new Error('Email ou mot de passe incorrect');
  }
  
  const user = users[0];
  
  // Vérifier le mot de passe
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new Error('Email ou mot de passe incorrect');
  }
  
  // Déterminer le rôle (utiliser celui de la base de données ou le rôle par défaut)
  const role = user.role || ROLES.USER;
  
  // Générer un token JWT avec le rôle
  const token = jwt.sign(
    { id_user: user.id_user, role },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
  
  // Supprimer le mot de passe de l'objet utilisateur
  const { password: _, ...userWithoutPassword } = user;
  
  return {
    token,
    userId: user.id_user,
    role,
    userData: userWithoutPassword
  };
};

// Service pour récupérer le profil d'un utilisateur
const getProfile = async (userId) => {
  const [users] = await db.query(
    'SELECT id_user, username, email, city, level, bio, profile_picture, role, created_at, updated_at FROM users WHERE id_user = ?', 
    [userId]
  );
  
  if (users.length === 0) {
    throw new Error('Utilisateur non trouvé');
  }
  
  return users[0];
};

// Service pour mettre à jour le rôle d'un utilisateur (réservé aux admins)
const updateUserRole = async (targetUserId, newRole, adminId) => {
  // Vérifier que l'utilisateur qui demande le changement est un admin
  const [admins] = await db.query('SELECT role FROM users WHERE id_user = ?', [adminId]);
  
  if (admins.length === 0 || admins[0].role !== ROLES.ADMIN) {
    throw new Error('Vous n\'avez pas les droits pour effectuer cette action');
  }
  
  // Vérifier que l'utilisateur cible existe
  const [users] = await db.query('SELECT * FROM users WHERE id_user = ?', [targetUserId]);
  
  if (users.length === 0) {
    throw new Error('Utilisateur cible non trouvé');
  }
  
  // Vérifier que le nouveau rôle est valide
  if (newRole !== ROLES.USER && newRole !== ROLES.ADMIN) {
    throw new Error('Rôle invalide');
  }
  
  // Mettre à jour le rôle
  await db.query('UPDATE users SET role = ? WHERE id_user = ?', [newRole, targetUserId]);
  
  return {
    message: `Le rôle de l'utilisateur a été mis à jour en "${newRole}"`,
    userId: targetUserId,
    newRole
  };
};

module.exports = {
  register,
  login,
  getProfile,
  updateUserRole
};