const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/bdd');
const ROLES = require('../constants/roles');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

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

// Service pour la récupération de mot de passe
const forgotPassword = async (email) => {
  // Vérifier si l'utilisateur existe
  const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
  if (users.length === 0) {
    // On ne veut pas révéler si l'email existe ou non, donc on simule un succès
    return { success: true };
  }
  
  const user = users[0];
  
  // Générer un token JWT avec une durée limitée (1h) et un champ purpose spécifique
  const resetToken = jwt.sign(
    { 
      id_user: user.id_user,
      email: user.email,
      purpose: 'password-reset' 
    },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
  // Envoyer un email avec le lien de réinitialisation
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  
  const mailOptions = {
    from: `"RunShare" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Réinitialisation de votre mot de passe',
    text: `Vous recevez cet e-mail car vous (ou quelqu'un d'autre) avez demandé la réinitialisation du mot de passe de votre compte.
    Veuillez cliquer sur le lien suivant, ou copiez-le dans votre navigateur pour terminer le processus :
    
    ${resetUrl}

     Ce lien expirera dans 1 heure.
    
    Si vous n'avez pas demandé cela, veuillez ignorer cet e-mail et votre mot de passe restera inchangé.`,
    html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #48466d;">Réinitialisation de votre mot de passe RunShare</h2>
      <p>Vous recevez cet e-mail car vous (ou quelqu'un d'autre) avez demandé la réinitialisation du mot de passe de votre compte.</p>
      <p>Veuillez cliquer sur le bouton ci-dessous pour réinitialiser votre mot de passe :</p>
      <a href="${resetUrl}" style="display: inline-block; background-color: #48466d; color: white; text-decoration: none; padding: 12px 24px; border-radius: 4px; margin: 20px 0;">Réinitialiser le mot de passe</a>
      <p>Ce lien expirera dans 1 heure.</p>
      <p>Si vous n'avez pas demandé cela, veuillez ignorer cet e-mail et votre mot de passe restera inchangé.</p>
      <p style="color: #777; font-size: 0.8em; margin-top: 40px;">RunShare - Courez ensemble en toute sécurité</p>
    </div>
    `
  };
  
  await transporter.sendMail(mailOptions);
  
  return { success: true };
};

// Ajouter une fonction de vérification du token
const verifyResetToken = async (token) => {
  try {
    // Vérifier le token JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Vérifier que c'est bien un token de réinitialisation
    if (decoded.purpose !== 'password-reset') {
      throw new Error('Token non valide pour la réinitialisation');
    }

       // Vérifier que l'utilisateur existe toujours
    const [users] = await db.query('SELECT * FROM users WHERE id_user = ? AND email = ?', 
      [decoded.id_user, decoded.email]);
    
    if (users.length === 0) {
      throw new Error('Utilisateur non trouvé');
    }
    
    return { valid: true, email: decoded.email, id_user: decoded.id_user };
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expiré');
    }
    throw error;
  }
};

// Service pour réinitialiser le mot de passe
const resetPassword = async (token, newPassword) => {
  // Vérifier le token
  const { email, id_user } = await verifyResetToken(token);
  
  // Hacher le nouveau mot de passe
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  
  // Mettre à jour le mot de passe de l'utilisateur
  await db.query(
    'UPDATE users SET password = ? WHERE id_user = ?',
    [hashedPassword, id_user]
  );
  
  return { success: true };
};


module.exports = {
  register,
  login,
  getProfile,
  updateUserRole,
  forgotPassword,
  verifyResetToken,
  resetPassword
};