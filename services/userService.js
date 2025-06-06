const db = require('../config/bdd');
const bcrypt = require('bcryptjs');

// Récupérer le profil public d'un utilisateur
const getUserProfile = async (userId) => {
  // Récupérer les informations de base de l'utilisateur
  const [users] = await db.query(
    'SELECT id_user, username, email, city, level, bio, profile_picture, created_at FROM users WHERE id_user = ?',
    [userId]
  );

  if (users.length === 0) {
    throw new Error('Utilisateur non trouvé');
  }

  const user = users[0];

  // Récupérer les évaluations de cet utilisateur
  const [ratings] = await db.query(
    `SELECT r.rating, r.comment, r.created_at, 
            u.id_user as from_id, u.username as from_username, u.profile_picture as from_profile_picture
     FROM ratings r
     JOIN users u ON r.id_user_donne = u.id_user
     WHERE r.id_user_recu = ?
     ORDER BY r.created_at DESC`,
    [userId]
  );

  // Calcul de la note moyenne
  let averageRating = 0;
  if (ratings.length > 0) {
    const sum = ratings.reduce((total, rating) => total + rating.rating, 0);
    averageRating = sum / ratings.length;
  }

  // Récupérer les courses organisées par l'utilisateur
  const [organizedRuns] = await db.query(
    `SELECT r.id_run, r.title, r.date, r.location, r.distance, r.level, r.is_private, r.description,
     u.id_user, u.username as organizer_name, u.profile_picture as organizer_picture,
     COUNT(p.id_user) as participants_count
     FROM runs r
     JOIN users u ON r.id_user = u.id_user
     LEFT JOIN participer p ON r.id_run = p.id_run AND p.status = 'confirmed'
     WHERE r.id_user = ?
     GROUP BY r.id_run, r.title, r.date, r.location, r.distance, r.level, r.is_private, r.description, u.id_user, u.username, u.profile_picture
     ORDER BY r.date DESC
     LIMIT 10`,
    [userId]
  );

  // ➕ CORRECTION COMPLÈTE : Récupérer les courses auxquelles l'utilisateur participe
  const [participatedRuns] = await db.query(
    `SELECT r.id_run, r.title, r.date, r.location, r.distance, r.level, r.is_private, r.description,
     r.id_user, u.username as organizer_name, u.profile_picture as organizer_picture,
     COUNT(p2.id_user) as participants_count,
     p.status as participation_status, p.joined_at
     FROM runs r
     JOIN participer p ON r.id_run = p.id_run
     JOIN users u ON r.id_user = u.id_user
     LEFT JOIN participer p2 ON r.id_run = p2.id_run AND p2.status = 'confirmed'
     WHERE p.id_user = ? AND p.status = 'confirmed' AND r.id_user != ?
     GROUP BY r.id_run, r.title, r.date, r.location, r.distance, r.level, r.is_private, r.description, r.id_user, u.username, u.profile_picture, p.status, p.joined_at
     ORDER BY r.date DESC
     LIMIT 10`,
    [userId, userId]
  );

  return {
    ...user,
    averageRating,
    ratings,
    organizedRuns,
    participatedRuns
  };
};

// Mettre à jour le profil d'un utilisateur
const updateProfile = async (userId, userData) => {
  const { username, city, level, bio, password } = userData;

  // Vérifier si le nom d'utilisateur est déjà pris (par un autre utilisateur)
  if (username) {
    const [existingUsers] = await db.query(
      'SELECT id_user FROM users WHERE username = ? AND id_user != ?',
      [username, userId]
    );

    if (existingUsers.length > 0) {
      throw new Error('Ce nom d\'utilisateur est déjà pris');
    }
  }

  // Préparer les champs à mettre à jour
  const updateFields = [];
  const values = [];

  if (username) {
    updateFields.push('username = ?');
    values.push(username);
  }

  if (city) {
    updateFields.push('city = ?');
    values.push(city);
  }

  if (level) {
    updateFields.push('level = ?');
    values.push(level);
  }

  if (bio !== undefined) {
    updateFields.push('bio = ?');
    values.push(bio);
  }

  // S'il n'y a rien à mettre à jour et pas de mot de passe
  if (updateFields.length === 0 && !password) {
    throw new Error('Aucune donnée à mettre à jour');
  }

  // Gérer le mot de passe séparément si fourni
  if (password) {
    const hashedPassword = await bcrypt.hash(password, 10);
    updateFields.push('password = ?');
    values.push(hashedPassword);
  }

  // Ajouter l'ID utilisateur à la fin du tableau de valeurs
  values.push(userId);

  // Mettre à jour les champs de base
  if (updateFields.length > 0) {
    await db.query(
      `UPDATE users SET ${updateFields.join(', ')} WHERE id_user = ?`,
      values
    );
  }

  return { message: 'Profil mis à jour avec succès' };
};

// Mettre à jour la photo de profil
const updateProfilePicture = async (userId, profilePicturePath) => {
  await db.query(
    'UPDATE users SET profile_picture = ? WHERE id_user = ?',
    [profilePicturePath, userId]
  );

  return {
    message: 'Photo de profil mise à jour avec succès',
    profilePicture: profilePicturePath
  };
};

// Ajouter une évaluation à un utilisateur
const rateUser = async (fromUserId, toUserId, rating, comment) => {
  // Vérifier que l'utilisateur ne s'auto-évalue pas
  if (fromUserId === parseInt(toUserId)) {
    throw new Error('Vous ne pouvez pas vous auto-évaluer');
  }

  // Vérifier que la note est entre 1 et 5
  if (rating < 1 || rating > 5) {
    throw new Error('La note doit être entre 1 et 5');
  }

  // ➕ NOUVEAU : Vérifier qu'ils ont participé ensemble à une course passée
  const [sharedPastRuns] = await db.query(
    `SELECT DISTINCT r.id_run, r.title, r.date
     FROM runs r
     JOIN participer p1 ON r.id_run = p1.id_run
     JOIN participer p2 ON r.id_run = p2.id_run
     WHERE p1.id_user = ? 
       AND p2.id_user = ? 
       AND p1.status = 'confirmed' 
       AND p2.status = 'confirmed'
       AND r.date < NOW()`,
    [fromUserId, toUserId]
  );

  if (sharedPastRuns.length === 0) {
    throw new Error('Vous ne pouvez évaluer cet utilisateur qu\'après avoir participé ensemble à une course terminée');
  }

  // Vérifier si une évaluation existe déjà
  const [existingRatings] = await db.query(
    'SELECT id_rating FROM ratings WHERE id_user_donne = ? AND id_user_recu = ?',
    [fromUserId, toUserId]
  );

  if (existingRatings.length > 0) {
    // Mettre à jour l'évaluation existante
    await db.query(
      'UPDATE ratings SET rating = ?, comment = ?, created_at = NOW() WHERE id_user_donne = ? AND id_user_recu = ?',
      [rating, comment, fromUserId, toUserId]
    );

    return {
      message: 'Évaluation mise à jour avec succès',
      id_rating: existingRatings[0].id_rating
    };
  } else {
    // Insérer une nouvelle évaluation
    const [result] = await db.query(
      'INSERT INTO ratings (rating, comment, id_user_recu, id_user_donne) VALUES (?, ?, ?, ?)',
      [rating, comment, toUserId, fromUserId]
    );

    return {
      message: 'Évaluation ajoutée avec succès',
      id_rating: result.insertId
    };
  }
};

// Fonction utilitaire pour récupérer les courses partagées passées
const getSharedPastRuns = async (userId1, userId2) => {
  const [sharedRuns] = await db.query(
    `SELECT r.id_run, r.title, r.date, r.location
     FROM runs r
     JOIN participer p1 ON r.id_run = p1.id_run
     JOIN participer p2 ON r.id_run = p2.id_run
     WHERE p1.id_user = ? 
       AND p2.id_user = ? 
       AND p1.status = 'confirmed' 
       AND p2.status = 'confirmed'
       AND r.date < NOW()
     ORDER BY r.date DESC`,
    [userId1, userId2]
  );

  return sharedRuns;
};

// Récupérer tous les utilisateurs (admin seulement)
const getAllUsers = async () => {
  const [users] = await db.query(
    `SELECT id_user, username, email, city, level, bio, profile_picture, role, created_at, updated_at
     FROM users 
     ORDER BY created_at DESC`
  );

  return users;
};

// Supprimer un utilisateur (admin seulement)
const deleteUser = async (userId, adminId) => {
  // Vérifier que l'admin ne se supprime pas lui-même
  if (userId === adminId) {
    throw new Error('Vous ne pouvez pas supprimer votre propre compte');
  }

  // Vérifier que l'utilisateur existe
  const [users] = await db.query('SELECT * FROM users WHERE id_user = ?', [userId]);
  if (users.length === 0) {
    throw new Error('Utilisateur non trouvé');
  }

  // Supprimer les données liées en cascade
  await db.query('DELETE FROM ratings WHERE id_user_donne = ? OR id_user_recu = ?', [userId, userId]);
  await db.query('DELETE FROM rating_run WHERE id_user = ?', [userId]);
  await db.query('DELETE FROM participer WHERE id_user = ?', [userId]);

  // Supprimer les courses organisées par cet utilisateur
  const [userRuns] = await db.query('SELECT id_run FROM runs WHERE id_user = ?', [userId]);
  for (let run of userRuns) {
    await db.query('DELETE FROM participer WHERE id_run = ?', [run.id_run]);
    await db.query('DELETE FROM rating_run WHERE id_run = ?', [run.id_run]);
  }
  await db.query('DELETE FROM runs WHERE id_user = ?', [userId]);

  // Supprimer l'utilisateur
  await db.query('DELETE FROM users WHERE id_user = ?', [userId]);

  return { message: 'Utilisateur supprimé avec succès' };
};

module.exports = {
  getUserProfile,
  updateProfile,
  updateProfilePicture,
  rateUser,
  getSharedPastRuns,
  getAllUsers,
  deleteUser
};