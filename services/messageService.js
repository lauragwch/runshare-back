const db = require('../config/bdd');

// Vérifier si deux utilisateurs peuvent communiquer (même logique que rateUser)
const canCommunicate = async (userId1, userId2) => {
  const [sharedRuns] = await db.query(
    `SELECT DISTINCT r.id_run
     FROM runs r
     JOIN participer p1 ON r.id_run = p1.id_run
     JOIN participer p2 ON r.id_run = p2.id_run
     WHERE ((p1.id_user = ? AND p2.id_user = ?) OR 
            (p1.id_user = ? AND p2.id_user = ?)) 
       AND p1.status = 'confirmed' 
       AND p2.status = 'confirmed'
       AND (r.id_user = ? OR r.id_user = ?)`,
    [userId1, userId2, userId2, userId1, userId1, userId2]
  );
  
  return sharedRuns.length > 0;
};

// Envoyer un message
const sendMessage = async (senderId, recipientId, content) => {
  // Vérifier que les utilisateurs peuvent communiquer
  const canSend = await canCommunicate(senderId, recipientId);
  if (!canSend) {
    throw new Error('Vous ne pouvez contacter cet utilisateur qu\'après avoir participé ensemble à une course');
  }

  // Insérer le message
  const [result] = await db.query(
    `INSERT INTO messages (content, id_sender, id_recipient) 
     VALUES (?, ?, ?)`,
    [content, senderId, recipientId]
  );

  return {
    id_message: result.insertId,
    message: 'Message envoyé avec succès'
  };
};

// Récupérer la conversation entre deux utilisateurs
const getConversation = async (userId1, userId2) => {
  // Vérifier que les utilisateurs peuvent communiquer
  const canSend = await canCommunicate(userId1, userId2);
  if (!canSend) {
    throw new Error('Vous n\'avez pas accès à cette conversation');
  }

  // Récupérer tous les messages entre ces deux utilisateurs
  const [messages] = await db.query(
    `SELECT m.*, 
            sender.username as sender_name, sender.profile_picture as sender_picture
     FROM messages m
     JOIN users sender ON m.id_sender = sender.id_user
     WHERE (m.id_sender = ? AND m.id_recipient = ?) 
        OR (m.id_sender = ? AND m.id_recipient = ?)
     ORDER BY m.sent_at ASC`,
    [userId1, userId2, userId2, userId1]
  );

  return messages;
};

// Récupérer les conversations d'un utilisateur
const getUserConversations = async (userId) => {
  const [conversations] = await db.query(
    `SELECT 
       CASE WHEN m.id_sender = ? THEN m.id_recipient ELSE m.id_sender END as other_user_id,
       u.username as other_user_name,
       u.profile_picture as other_user_picture,
       MAX(m.sent_at) as last_message_time
     FROM messages m
     JOIN users u ON u.id_user = CASE WHEN m.id_sender = ? THEN m.id_recipient ELSE m.id_sender END
     WHERE m.id_sender = ? OR m.id_recipient = ?
     GROUP BY other_user_id, other_user_name, other_user_picture
     ORDER BY last_message_time DESC`,
    [userId, userId, userId, userId]
  );

    // Ajouter le dernier message pour chaque conversation
  for (let conv of conversations) {
    const [lastMsg] = await db.query(
      `SELECT content FROM messages 
       WHERE (id_sender = ? AND id_recipient = ?) OR (id_sender = ? AND id_recipient = ?)
       ORDER BY sent_at DESC LIMIT 1`,
      [userId, conv.other_user_id, conv.other_user_id, userId]
    );
    conv.last_message = lastMsg[0]?.content || '';
  }

  return conversations;
};

module.exports = {
  canCommunicate,
  sendMessage,
  getConversation,
  getUserConversations
};