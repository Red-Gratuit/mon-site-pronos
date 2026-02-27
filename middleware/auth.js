const jwt = require('jsonwebtoken');

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

exports.isAdmin = (req, res, next) => {
  if (!req.user?.isAdmin) return res.status(403).json({ error: 'Admin requis' });
  next();
};

exports.isVIP = (req, res, next) => {
  if (!req.user?.isVIP && !req.user?.isAdmin) return res.status(403).json({ error: 'VIP requis' });
  next();
};
