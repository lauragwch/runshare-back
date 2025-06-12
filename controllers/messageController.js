const messageService = require('../services/messageService');

// Envoyer un message
const sendMessage = async (req, res) => {
  try {
    const { recipientId, content } = req.body;
    const senderId = req.user.id_user;

    if (!content || !recipientId) {
      return res.status(400).json({ message: 'Destinataire et contenu requis' });
    }

    if (!content.trim()) {
      return res.status(400).json({ message: 'Le message ne peut pas être vide' });
    }

    const result = await messageService.sendMessage(senderId, recipientId, content.trim());
    res.status(201).json(result);
  } catch (error) {
    console.error('Erreur dans sendMessage:', error.message);
    res.status(400).json({ message: error.message });
  }
};

// Récupérer la conversation avec un utilisateur
const getConversation = async (req, res) => {
  try {
    const otherUserId = parseInt(req.params.userId);
    const currentUserId = req.user.id_user;

    if (!otherUserId || isNaN(otherUserId)) {
      return res.status(400).json({ message: 'ID utilisateur invalide' });
    }

    const messages = await messageService.getConversation(currentUserId, otherUserId);
    res.json(messages);
  } catch (error) {
    console.error('Erreur dans getConversation:', error.message);
    res.status(400).json({ message: error.message });
  }
};

// Récupérer toutes les conversations
const getUserConversations = async (req, res) => {
  try {
    const userId = req.user.id_user;
    const conversations = await messageService.getUserConversations(userId);
    res.json(conversations);
  } catch (error) {
    console.error('Erreur dans getUserConversations:', error.message);
    res.status(500).json({ message: 'Erreur lors de la récupération des conversations' });
  }
};

// Compter les messages reçus (pour le badge)
const getMessageCount = async (req, res) => {
  try {
    const userId = req.user.id_user;
    
    const [result] = await require('../config/bdd').query(
      'SELECT COUNT(*) as message_count FROM messages WHERE id_recipient = ?',
      [userId]
    );
    
    res.json({ messageCount: result[0].message_count });
  } catch (error) {
    console.error('Erreur dans getMessageCount:', error.message);
    res.status(500).json({ message: 'Erreur lors du comptage des messages' });
  }
};

module.exports = {
  sendMessage,
  getConversation,
  getUserConversations,
  getMessageCount
};