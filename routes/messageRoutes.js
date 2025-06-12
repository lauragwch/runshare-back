const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const auth = require('../middleware/auth');

// Toutes les routes nécessitent une authentification
router.use(auth);

// Envoyer un message
router.post('/send', messageController.sendMessage);

// Récupérer la conversation avec un utilisateur
router.get('/conversation/:userId', messageController.getConversation);

// Récupérer toutes les conversations
router.get('/conversations', messageController.getUserConversations);

// Compter les messages reçus (pour le badge)
router.get('/count', messageController.getMessageCount);

module.exports = router;