const request = require('supertest');
const express = require('express');
const userRoutes = require('../routes/userRoutes');
const authRoutes = require('../routes/authRoutes');
const auth = require('../middleware/auth');
const db = require('../config/bdd');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Configuration pour les tests
require('dotenv').config();

// Créer une application Express pour les tests
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// Créer un utilisateur de test et générer un token
let testUserId;
let authToken;

// Avant tous les tests
beforeAll(async () => {
  // Créer un utilisateur de test
  const hashedPassword = await bcrypt.hash('Password123!', 10);
  const [result] = await db.query(
    'INSERT INTO users (username, email, password, city, level, bio) VALUES (?, ?, ?, ?, ?, ?)',
    ['profileuser', 'profile@example.com', hashedPassword, 'Lyon', 'intermédiaire', 'Test bio']
  );
  
  testUserId = result.insertId;
  
  // Générer un token pour l'authentification
  authToken = jwt.sign(
    { id_user: testUserId, role: 'user' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
});

// Après tous les tests
afterAll(async () => {
  await db.query('DELETE FROM users WHERE id_user = ?', [testUserId]);
  await db.end();
});

describe('Tests des profils utilisateurs', () => {
  
  // Test 1: Récupération du profil d'un utilisateur
  test('Devrait récupérer le profil public d\'un utilisateur', async () => {
    const response = await request(app)
      .get(`/api/users/${testUserId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('username', 'profileuser');
    expect(response.body).toHaveProperty('city', 'Lyon');
    expect(response.body).toHaveProperty('level', 'intermédiaire');
    expect(response.body).toHaveProperty('bio', 'Test bio');
  });

  // Test 2: Mise à jour du profil d'un utilisateur
  test('Devrait mettre à jour le profil d\'un utilisateur', async () => {
    const updatedData = {
      city: 'Marseille',
      bio: 'Nouvelle bio de test'
    };

    const response = await request(app)
      .put('/api/users/profile')
      .set('Authorization', `Bearer ${authToken}`)
      .send(updatedData);

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('message', 'Profil mis à jour avec succès');

    // Vérifier que les données ont été mises à jour
    const [users] = await db.query('SELECT * FROM users WHERE id_user = ?', [testUserId]);
    expect(users[0].city).toBe('Marseille');
    expect(users[0].bio).toBe('Nouvelle bio de test');
  });
});