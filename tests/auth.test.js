const request = require('supertest');
const express = require('express');
const authRoutes = require('../routes/authRoutes');
const db = require('../config/bdd');
const bcrypt = require('bcryptjs');

// Configuration pour les tests
require('dotenv').config();

// Créer une application Express pour les tests
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

// Avant chaque test, nettoyer la base de données
beforeEach(async () => {
  await db.query('DELETE FROM users WHERE email = ?', ['test@example.com']);
});

// Après tous les tests, fermer la connexion à la base de données
afterAll(async () => {
  await db.query('DELETE FROM users WHERE email = ?', ['test@example.com']);
  await db.end();
});

describe('Tests d\'authentification', () => {
  
  // Test 1: Inscription d'un nouvel utilisateur
  test('Devrait inscrire un nouvel utilisateur avec succès', async () => {
    const userData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'Password123!',
      city: 'Paris',
      level: 'débutant',
      bio: 'Je suis un coureur passionné'
    };

    const response = await request(app)
      .post('/api/auth/register')
      .send(userData);

    expect(response.statusCode).toBe(201);
    expect(response.body).toHaveProperty('token');
    expect(response.body).toHaveProperty('user');
    expect(response.body.user.username).toBe(userData.username);
    expect(response.body.user.email).toBe(userData.email);
  });

  // Test 2: Connexion d'un utilisateur
  test('Devrait connecter un utilisateur existant', async () => {
    // Créer d'abord un utilisateur
    const hashedPassword = await bcrypt.hash('Password123!', 10);
    await db.query(
      'INSERT INTO users (username, email, password, city, level) VALUES (?, ?, ?, ?, ?)',
      ['loginuser', 'test@example.com', hashedPassword, 'Paris', 'débutant']
    );

    // Tester la connexion
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'Password123!'
      });

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('token');
    expect(response.body).toHaveProperty('user');
    expect(response.body.user.username).toBe('loginuser');
  });
});