const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');

// Chargement des variables d'environnement
dotenv.config();

// Initialisation de l'application Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir les images statiques
app.use('/images/profiles', express.static(path.join(__dirname, 'images/profiles')));

// Configuration de Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: "RunShare API Documentation"
}));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/runs', require('./routes/runRoutes'));
app.use('/api/messages', require('./routes/messageRoutes')); 


// Route de base pour tester l'API
app.get('/', (req, res) => {
  res.json({ message: 'Bienvenue sur l\'API de RunShare!' });
});

// Middleware de gestion des erreurs
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Erreur serveur' });
});

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
  console.log(`Documentation API disponible sur http://localhost:${PORT}/api-docs`);
});