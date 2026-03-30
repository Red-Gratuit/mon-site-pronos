require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const session = require('express-session');
const cors = require('cors');
const path = require('path');

require('./config/passport');

const app = express();

app.use(cors());

// Middleware pour webhooks Stripe (doit être AVANT express.json)
app.use('/api/payment/webhook', express.raw({ 
  type: 'application/json',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

app.use(express.json());
app.use(express.static('public'));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connecté'))
  .catch(err => console.error('❌ MongoDB erreur:', err));

app.use('/auth',       require('./routes/auth'));
app.use('/api/pronos', require('./routes/pronos'));
app.use('/api/payment', require('./routes/payment'));
app.use('/api/user',    require('./routes/user'));
app.use('/api/history', require('./routes/history'));
app.use('/api/matches', require('./routes/matches'));
app.use('/api/live-matches', require('./routes/live-matches'));

app.get('/logout', (req, res) => {
  req.logout(() => {
    req.session.destroy();
    res.redirect('/');
  });
});

// Servir la page d'historique
app.get('/history', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'history.html'));
});

// Servir la page admin mobile
app.get('/admin-mobile', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-mobile.html'));
});

app.get('/api/me', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ user: req.user });
  } else {
    res.status(401).json({ error: 'Non connecté' });
  }
});

// Health check pour Railway
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0';

console.log(`🔧 Configuration: PORT=${PORT}, HOST=${HOST}`);
console.log(`� Démarrage serveur...`);

const server = app.listen(PORT, HOST, () => {
  console.log(`🚀 Serveur démarré sur http://${HOST}:${PORT}`);
  console.log(`✅ Application prête sur le port ${PORT}`);
});

server.on('error', (err) => {
  console.error('❌ Erreur serveur:', err);
  process.exit(1);
});
