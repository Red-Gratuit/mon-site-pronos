const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Non connecté' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token invalide' });
  }
};

exports.isAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    // Autoriser admin OU les utilisateurs spécifiques
    const allowedEmails = ['afkiranis0605@gmail.com', 'timeodujardin25@gmail.com', 'enzo.xr59@gmail.com'];
    if (!user?.isAdmin && !allowedEmails.includes(user?.email)) {
      return res.status(403).json({ error: 'Admin requis' });
    }
    req.user = user; // Mettre à jour avec les données complètes
    next();
  } catch (err) {
    res.status(500).json({ error: 'Erreur vérification admin' });
  }
};

exports.isVIP = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user?.isVIP && !user?.isAdmin) return res.status(403).json({ error: 'VIP requis' });
    req.user = user; // Mettre à jour avec les données complètes
    next();
  } catch (err) {
    res.status(500).json({ error: 'Erreur vérification VIP' });
  }
};
