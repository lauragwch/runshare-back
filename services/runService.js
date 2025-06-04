const db = require('../config/bdd');

// Fonction utilitaire pour formater les dates SANS conversion UTC
const formatDateForMySQL = (dateInput) => {
  if (!dateInput) return null;
  
  // Si c'est déjà au format MySQL "YYYY-MM-DD HH:MM:SS"
  if (typeof dateInput === 'string' && dateInput.includes(' ')) {
    return dateInput;
  }
  
  const date = new Date(dateInput);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:00`;
};

// Créer une nouvelle course
const createRun = async (userId, runData) => {
  const { title, description, date, location, distance, level, is_private } = runData;
  
  const formattedDate = formatDateForMySQL(date);
  if (formattedDate) {
    // Vérifier que la date n'est pas dans le passé
    const runDateTime = new Date(formattedDate.replace(' ', 'T'));
    const now = new Date();
    if (runDateTime < now) {
      throw new Error('La date de la course doit être future');
    }
  }

  // Générer un ID unique pour la course
  const [maxIdResult] = await db.query('SELECT COALESCE(MAX(id_run), 0) + 1 as next_id FROM runs');
  const newRunId = maxIdResult[0].next_id;
  
  // Insérer la course avec la date formatée
  await db.query(
    `INSERT INTO runs (id_run, title, description, date, location, distance, level, is_private, id_user)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [newRunId, title, description, formattedDate, location, distance, level, is_private ? 1 : 0, userId]
  );

  // L'organisateur est automatiquement participant
  await db.query(
    'INSERT INTO participer (id_user, id_run, status) VALUES (?, ?, "confirmed")',
    [userId, newRunId]
  );

  return {
    message: 'Course créée avec succès',
    id_run: newRunId
  };
};

// Récupérer toutes les courses (avec filtres)
const getRuns = async (filters, userId = null) => {
  const { city, date, level, distance, search } = filters;
  
  let query = `
    SELECT r.*, u.username as organizer_name, u.profile_picture as organizer_picture,
           COUNT(p.id_user) as participants_count
    FROM runs r
    JOIN users u ON r.id_user = u.id_user
    LEFT JOIN participer p ON r.id_run = p.id_run AND p.status = 'confirmed'
    WHERE 1=1
  `;
  
  const queryParams = [];
  
  if (city) {
    query += ` AND r.location LIKE ?`;
    queryParams.push(`%${city}%`);
  }
  
  if (date) {
    query += ` AND DATE(r.date) = ?`;
    queryParams.push(date);
  }
  
  if (level) {
    query += ` AND r.level = ?`;
    queryParams.push(level);
  }
  
  if (distance) {
    const [min, max] = distance.split('-');
    if (min && max) {
      query += ` AND r.distance BETWEEN ? AND ?`;
      queryParams.push(parseFloat(min), parseFloat(max));
    } else if (min) {
      query += ` AND r.distance >= ?`;
      queryParams.push(parseFloat(min));
    }
  }
  
  if (search) {
    query += ` AND (r.title LIKE ? OR r.description LIKE ? OR r.location LIKE ?)`;
    queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  
  // N'afficher que les courses à venir
  query += ` AND r.date >= NOW()`;
  
  // N'afficher que les courses publiques (sauf si l'utilisateur est connecté)
  if (!userId) {
    query += ` AND r.is_private = 0`;
  }
  
  // Grouper par course
  query += ` GROUP BY r.id_run`;
  
  // Ordonner par date (prochaines courses d'abord)
  query += ` ORDER BY r.date ASC`;
  
  const [runs] = await db.query(query, queryParams);
  
  return runs;
};

// Récupérer les détails d'une course
const getRunById = async (runId, userId = null) => {
  // Récupérer les informations de la course
  const [runs] = await db.query(
    `SELECT r.*, u.username as organizer_name, u.profile_picture as organizer_picture
     FROM runs r
     JOIN users u ON r.id_user = u.id_user
     WHERE r.id_run = ?`,
    [runId]
  );
  
  if (runs.length === 0) {
    throw new Error('Course non trouvée');
  }
  
  const run = runs[0];
  
  // Vérifier si c'est une course privée et si l'utilisateur a accès
  if (run.is_private && (!userId || (userId !== run.id_user))) {
    // Si privée, vérifier si l'utilisateur est participant
    const [participation] = await db.query(
      'SELECT * FROM participer WHERE id_run = ? AND id_user = ?',
      [runId, userId]
    );
    
    if (participation.length === 0) {
      throw new Error('Vous n\'avez pas accès à cette course privée');
    }
  }
  
  // Récupérer les participants
  const [participants] = await db.query(
    `SELECT p.status, p.joined_at, u.id_user, u.username, u.profile_picture
     FROM participer p
     JOIN users u ON p.id_user = u.id_user
     WHERE p.id_run = ?
     ORDER BY p.status, p.joined_at`,
    [runId]
  );
  
  // Récupérer les évaluations de cette course
  const [ratings] = await db.query(
    `SELECT rr.rating, rr.comment, rr.created_at, 
            u.id_user, u.username, u.profile_picture
     FROM rating_run rr
     JOIN users u ON rr.id_user = u.id_user
     WHERE rr.id_run = ?
     ORDER BY rr.created_at DESC`,
    [runId]
  );
  
  return {
    ...run,
    participants,
    ratings
  };
};

// Rejoindre une course
const joinRun = async (runId, userId) => {
  // Vérifier que la course existe
  const [runs] = await db.query('SELECT * FROM runs WHERE id_run = ?', [runId]);
  if (runs.length === 0) {
    throw new Error('Course non trouvée');
  }
  
  // Vérifier que l'utilisateur n'est pas déjà inscrit
  const [existingParticipations] = await db.query(
    'SELECT * FROM participer WHERE id_run = ? AND id_user = ? AND status != "cancelled"',
    [runId, userId]
  );
  
  if (existingParticipations.length > 0) {
    throw new Error('Vous êtes déjà inscrit à cette course');
  }
  
  // Vérifier si l'utilisateur avait déjà une participation annulée
  const [cancelledParticipations] = await db.query(
    'SELECT * FROM participer WHERE id_run = ? AND id_user = ? AND status = "cancelled"',
    [runId, userId]
  );
  
  if (cancelledParticipations.length > 0) {
    // Réactiver la participation
    await db.query(
      'UPDATE participer SET status = "pending", joined_at = NOW() WHERE id_run = ? AND id_user = ?',
      [runId, userId]
    );
  } else {
    // Inscrire l'utilisateur
    await db.query(
      'INSERT INTO participer (id_user, id_run, status) VALUES (?, ?, ?)',
      [userId, runId, 'pending'] // Ou 'confirmed' si pas de validation nécessaire
    );
  }
  
  return { message: 'Vous avez rejoint cette course avec succès' };
};

// Modifier une course
const updateRun = async (runId, userId, runData) => {
  const { title, description, date, location, distance, level, is_private } = runData;
  
  // Vérifier que la course existe et que l'utilisateur est l'organisateur
  const [runs] = await db.query('SELECT * FROM runs WHERE id_run = ?', [runId]);
  
  if (runs.length === 0) {
    throw new Error('Course non trouvée');
  }
  
  if (runs[0].id_user !== userId) {
    throw new Error('Vous n\'êtes pas autorisé à modifier cette course');
  }
  
  const formattedDate = formatDateForMySQL(date);
  if (formattedDate) {
    // Vérifier que la date n'est pas dans le passé
    const runDateTime = new Date(formattedDate.replace(' ', 'T'));
    const now = new Date();
    if (runDateTime < now) {
      throw new Error('La date de la course doit être future');
    }
  }
  
  // Mettre à jour la course
  await db.query(
    `UPDATE runs SET 
     title = COALESCE(?, title),
     description = COALESCE(?, description),
     date = COALESCE(?, date),
     location = COALESCE(?, location),
     distance = COALESCE(?, distance),
     level = COALESCE(?, level),
     is_private = COALESCE(?, is_private)
     WHERE id_run = ?`,
    [title, description, formattedDate, location, distance, level, is_private ? 1 : 0, runId]
  );
  
  return {
    message: 'Course modifiée avec succès'
  };
};

// Supprimer une course
const deleteRun = async (runId, userId) => {
  // Vérifier que la course existe et que l'utilisateur est l'organisateur
  const [runs] = await db.query('SELECT * FROM runs WHERE id_run = ?', [runId]);
  
  if (runs.length === 0) {
    throw new Error('Course non trouvée');
  }
  
  if (runs[0].id_user !== userId) {
    throw new Error('Vous n\'êtes pas autorisé à supprimer cette course');
  }
  
  // Supprimer d'abord les participations liées
  await db.query('DELETE FROM participer WHERE id_run = ?', [runId]);
  
  // Supprimer les évaluations liées
  await db.query('DELETE FROM rating_run WHERE id_run = ?', [runId]);
  
  // Supprimer la course
  await db.query('DELETE FROM runs WHERE id_run = ?', [runId]);
  
  return {
    message: 'Course supprimée avec succès'
  };
};

// Quitter une course
const leaveRun = async (runId, userId) => {
  // Vérifier que l'utilisateur est inscrit
  const [participants] = await db.query(
    'SELECT * FROM participer WHERE id_run = ? AND id_user = ?',
    [runId, userId]
  );
  
  if (participants.length === 0) {
    throw new Error('Vous n\'êtes pas inscrit à cette course');
  }
  
  // Vérifier si l'utilisateur est l'organisateur
  const [runs] = await db.query('SELECT id_user FROM runs WHERE id_run = ?', [runId]);
  
  if (runs[0].id_user === userId) {
    throw new Error('L\'organisateur ne peut pas quitter sa propre course');
  }
  
  // Mettre à jour le statut à 'cancelled' au lieu de supprimer
  await db.query(
    'UPDATE participer SET status = "cancelled" WHERE id_run = ? AND id_user = ?',
    [runId, userId]
  );
  
  return { message: 'Vous avez quitté cette course avec succès' };
};

// Évaluer une course
const rateRun = async (runId, userId, rating, comment) => {
  // Vérifier que la course existe
  const [runs] = await db.query('SELECT * FROM runs WHERE id_run = ?', [runId]);
  if (runs.length === 0) {
    throw new Error('Course non trouvée');
  }
  
  // Vérifier que l'utilisateur a participé à la course
  const [participation] = await db.query(
    'SELECT * FROM participer WHERE id_run = ? AND id_user = ? AND status = "confirmed"',
    [runId, userId]
  );
  
  if (participation.length === 0) {
    throw new Error('Vous devez avoir participé à la course pour pouvoir l\'évaluer');
  }
  
  // Vérifier si l'utilisateur a déjà évalué cette course
  const [existingRatings] = await db.query(
    'SELECT * FROM rating_run WHERE id_run = ? AND id_user = ?',
    [runId, userId]
  );
  
  if (existingRatings.length > 0) {
    // Mettre à jour l'évaluation existante
    await db.query(
      'UPDATE rating_run SET rating = ?, comment = ?, created_at = NOW() WHERE id_run = ? AND id_user = ?',
      [rating, comment, runId, userId]
    );
  } else {
    // Ajouter une nouvelle évaluation
    await db.query(
      'INSERT INTO rating_run (id_user, id_run, rating, comment) VALUES (?, ?, ?, ?)',
      [userId, runId, rating, comment]
    );
  }
  
  return { message: 'Évaluation ajoutée avec succès' };
};

module.exports = {
  createRun,
  getRuns,
  getRunById,
  joinRun,
  leaveRun,
  rateRun,
  updateRun,
  deleteRun
};