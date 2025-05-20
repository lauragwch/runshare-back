const db = require('../config/bdd');

// Créer une nouvelle course
const createRun = async (organizerId, runData) => {
  const { title, description, date, location, distance, level, is_private } = runData;
  
  // Vérifier la date (pas dans le passé)
  const runDate = new Date(date);
  const now = new Date();
  
  if (runDate < now) {
    throw new Error('La date de la course doit être future');
  }
  
  // Insérer la course
  const [result] = await db.query(
    `INSERT INTO runs (title, description, date, location, distance, level, is_private, id_organizer)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [title, description, date, location, distance, level, is_private ? 1 : 0, organizerId]
  );
  
  // L'organisateur est automatiquement participant
  await db.query(
    'INSERT INTO participants (id_user, id_run, status) VALUES (?, ?, "confirmed")',
    [organizerId, result.insertId]
  );
  
  return {
    message: 'Course créée avec succès',
    id_run: result.insertId
  };
};

// Récupérer toutes les courses (avec filtres)
const getRuns = async (filters, userId = null) => {
  const { city, date, level, distance, search } = filters;
  
  let query = `
    SELECT r.*, u.username as organizer_name, u.profile_picture as organizer_picture,
           COUNT(p.id_participant) as participants_count
    FROM runs r
    JOIN users u ON r.id_organizer = u.id_user
    LEFT JOIN participants p ON r.id_run = p.id_run AND p.status = 'confirmed'
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
     JOIN users u ON r.id_organizer = u.id_user
     WHERE r.id_run = ?`,
    [runId]
  );
  
  if (runs.length === 0) {
    throw new Error('Course non trouvée');
  }
  
  const run = runs[0];
  
  // Vérifier si c'est une course privée et si l'utilisateur a accès
  if (run.is_private && (!userId || (userId !== run.id_organizer))) {
    const [participation] = await db.query(
      'SELECT * FROM participants WHERE id_run = ? AND id_user = ?',
      [runId, userId]
    );
    
    if (participation.length === 0) {
      throw new Error('Vous n\'avez pas accès à cette course privée');
    }
  }
  
  // Récupérer les participants
  const [participants] = await db.query(
    `SELECT p.status, p.joined_at, u.id_user, u.username, u.profile_picture
     FROM participants p
     JOIN users u ON p.id_user = u.id_user
     WHERE p.id_run = ?
     ORDER BY p.status, p.joined_at`,
    [runId]
  );
  
  // Récupérer les commentaires/évaluations liés à cette course
  const [ratings] = await db.query(
    `SELECT r.rating, r.comment, r.created_at, 
            u_from.id_user as from_id, u_from.username as from_username, u_from.profile_picture as from_picture,
            u_to.id_user as to_id, u_to.username as to_username
     FROM ratings r
     JOIN users u_from ON r.id_from_user = u_from.id_user
     JOIN users u_to ON r.id_to_user = u_to.id_user
     WHERE r.id_run = ?
     ORDER BY r.created_at DESC`,
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
    'SELECT * FROM participants WHERE id_run = ? AND id_user = ?',
    [runId, userId]
  );
  
  if (existingParticipations.length > 0) {
    throw new Error('Vous êtes déjà inscrit à cette course');
  }
  
  // Inscrire l'utilisateur
  await db.query(
    'INSERT INTO participants (id_user, id_run, status) VALUES (?, ?, ?)',
    [userId, runId, 'confirmed'] // Ou 'pending' si vous ajoutez une validation par l'organisateur
  );
  
  return { message: 'Vous avez rejoint cette course avec succès' };
};

// Quitter une course
const leaveRun = async (runId, userId) => {
  // Vérifier que l'utilisateur est inscrit
  const [participants] = await db.query(
    'SELECT * FROM participants WHERE id_run = ? AND id_user = ?',
    [runId, userId]
  );
  
  if (participants.length === 0) {
    throw new Error('Vous n\'êtes pas inscrit à cette course');
  }
  
  // Vérifier si l'utilisateur est l'organisateur
  const [runs] = await db.query('SELECT id_organizer FROM runs WHERE id_run = ?', [runId]);
  
  if (runs[0].id_organizer === userId) {
    throw new Error('L\'organisateur ne peut pas quitter sa propre course');
  }
  
  // Supprimer la participation
  await db.query(
    'DELETE FROM participants WHERE id_run = ? AND id_user = ?',
    [runId, userId]
  );
  
  return { message: 'Vous avez quitté cette course avec succès' };
};

module.exports = {
  createRun,
  getRuns,
  getRunById,
  joinRun,
  leaveRun
};