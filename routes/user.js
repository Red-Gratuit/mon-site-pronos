const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Middleware pour vérifier le token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token requis' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token invalide' });
    }
    req.user = user;
    next();
  });
};

// Mettre à jour le pseudo de l'utilisateur
router.post('/update-username', authenticateToken, async (req, res) => {
  try {
    const { username } = req.body;
    
    if (!username || username.trim().length < 2) {
      return res.status(400).json({ error: 'Le pseudo doit contenir au moins 2 caractères' });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { username: username.trim() },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    res.json({ 
      success: true, 
      message: 'Pseudo mis à jour avec succès',
      user: {
        username: user.username,
        email: user.email,
        isVIP: user.isVIP,
        isAdmin: user.isAdmin
      }
    });
  } catch (error) {
    console.error('Erreur mise à jour pseudo:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Obtenir les informations de l'utilisateur
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-stripeCustomerId -stripeSubId');
    
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    res.json({
      success: true,
      user: {
        username: user.username,
        email: user.email,
        isVIP: user.isVIP,
        isAdmin: user.isAdmin,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Erreur profil:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
