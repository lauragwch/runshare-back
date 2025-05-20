const db = require('../config/bdd');

// Récupérer le profil public d'un utilisateur
const getUserProfile = async (userId) => {
  // Récupérer les informations de base de l'utilisateur
  const [users] = await db.query(
    'SELECT id_user, username, city, level, bio, profile_picture, created_at FROM users WHERE id_user = ?',
    [userId]
  );
  
  if (users.length === 0) {
    throw new Error('Utilisateur non trouvé');
  }
  
  const user = users[0];
  
  // Récupérer les évaluations de l'utilisateur
  const [ratings] = await db.query(
    `SELECT r.id_rating, r.rating, r.comment, r.created_at, 
            u.id_user, u.username, u.profile_picture
     FROM ratings r
     JOIN users u ON r.id_from_user = u.id_user
     WHERE r.id_to_user = ?
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
    `SELECT id_run, title, date, location, distance, level
     FROM runs
     WHERE id_organizer = ?
     ORDER BY date DESC
     LIMIT 5`,
    [userId]
  );
  
  // Récupérer les courses auxquelles l'utilisateur participe
  const [participatedRuns] = await db.query(
    `SELECT r.id_run, r.title, r.date, r.location, r.distance, r.level,
            u.id_user as organizer_id, u.username as organizer_name
     FROM runs r
     JOIN participants p ON r.id_run = p.id_run
     JOIN users u ON r.id_organizer = u.id_user
     WHERE p.id_user = ? AND p.status = 'confirmed'
     ORDER BY r.date DESC
     LIMIT 5`,
    [userId]
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
  
  // S'il n'y a rien à mettre à jour
  if (updateFields.length === 0 && !password) {
    throw new Error('Aucune donnée à mettre à jour');
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
const rateUser = async (fromUserId, toUserId, runId, rating, comment) => {
  // Vérifier que l'utilisateur ne s'auto-évalue pas
  if (fromUserId === parseInt(toUserId)) {
    throw new Error('Vous ne pouvez pas vous auto-évaluer');
  }
  
  // Vérifier que la note est entre 1 et 5
  if (rating < 1 || rating > 5) {
    throw new Error('La note doit être entre 1 et 5');
  }
  
  // Insérer l'évaluation
  const [result] = await db.query(
    'INSERT INTO ratings (id_from_user, id_to_user, id_run, rating, comment) VALUES (?, ?, ?, ?, ?)',
    [fromUserId, toUserId, runId || null, rating, comment]
  );
  
  return {
    message: 'Évaluation ajoutée avec succès',
    id_rating: result.insertId
  };
};

module.exports = {
  getUserProfile,
  updateProfile,
  updateProfilePicture,
  rateUser
};