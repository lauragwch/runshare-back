const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/bdd');
const ROLES = require('../constants/roles');

// Service pour inscrire un nouvel utilisateur
const register = async (username, email, password, city, level, bio) => {
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
  
  // Hacher le mot de passe
  const hashedPassword = await bcrypt.hash(password, 10);
  
  // Insérer l'utilisateur dans la base de données
  const [result] = await db.query(
    'INSERT INTO users (username, email, password, city, level, bio, profile_picture) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [username, email, hashedPassword, city, level, bio, null]
  );
  
  // Générer un token JWT
  const token = jwt.sign(
    { id_user: result.insertId, role: ROLES.USER },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
  
  return {
    token,
    userId: result.insertId,
    role: ROLES.USER,
    userData: {
      username,
      email,
      city,
      level,
      bio
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
  
  // Déterminer le rôle
  const role = user.role || ROLES.USER;
  
  // Générer un token JWT
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
    'SELECT id_user, username, email, city, level, bio, profile_picture, created_at, updated_at FROM users WHERE id_user = ?', 
    [userId]
  );
  
  if (users.length === 0) {
    throw new Error('Utilisateur non trouvé');
  }
  
  return users[0];
};

module.exports = {
  register,
  login,
  getProfile
};