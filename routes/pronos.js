const router = require('express').Router();
const Prono  = require('../models/Prono');
const { auth, isAdmin, isVIP } = require('../middleware/auth');

// Pronos publics
router.get('/public', async (req, res) => {
  try {
    const pronos = await Prono.find({ type: 'public' }).sort({ createdAt: -1 });
    res.json(pronos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Pronos VIP
router.get('/vip', auth, isVIP, async (req, res) => {
  try {
    const pronos = await Prono.find({ type: 'vip' }).sort({ createdAt: -1 });
    res.json(pronos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Obtenir les pronostics de l'utilisateur connecté
router.get('/user', auth, async (req, res) => {
  try {
    const pronos = await Prono.find({ userId: req.user.id }).sort({ date: -1 });
    res.json(pronos);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Tous les pronos (admin)
router.get('/all', auth, isAdmin, async (req, res) => {
  try {
    const pronos = await Prono.find().sort({ createdAt: -1 });
    res.json(pronos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ajouter un prono (admin)
router.post('/add', auth, isAdmin, async (req, res) => {
  try {
    console.log('🔍 ADD PRONO - Données reçues:', req.body);
    console.log('🔍 ADD PRONO - User:', req.user.email, 'isAdmin:', req.user.isAdmin);
    
    const { league, match, prono, cote, date, type, tag, analyse, resultat } = req.body;
    
    // Validation des champs requis
    if (!league || !match || !prono || !cote) {
      console.log('❌ ADD PRONO - Champs manquants');
      return res.status(400).json({ error: 'League, match, pronostic et cote sont requis' });
    }
    
    // Validation de la cote
    if (isNaN(cote) || cote <= 0) {
      console.log('❌ ADD PRONO - Cote invalide:', cote);
      return res.status(400).json({ error: 'La cote doit être un nombre positif' });
    }
    
    // Validation du type
    if (!['public', 'vip'].includes(type)) {
      console.log('❌ ADD PRONO - Type invalide:', type);
      return res.status(400).json({ error: 'Le type doit être "public" ou "vip"' });
    }
    
    // Validation du résultat
    if (!['gagnant', 'perdant', 'pending'].includes(resultat)) {
      console.log('❌ ADD PRONO - Résultat invalide:', resultat);
      return res.status(400).json({ error: 'Le résultat doit être "gagnant", "perdant" ou "pending"' });
    }
    
    const pronoData = {
      league: league.trim(),
      match: match.trim(),
      prono: prono.trim(),
      cote: parseFloat(cote),
      date: date ? new Date(date) : new Date(),
      type: type || 'public',
      tag: tag ? tag.trim() : '',
      analyse: analyse ? analyse.trim() : '',
      resultat: resultat || 'pending'
    };
    
    console.log('✅ ADD PRONO - Données validées:', pronoData);
    
    const newProno = await Prono.create(pronoData);
    console.log('✅ ADD PRONO - Prono créé:', newProno._id);
    
    res.status(201).json(newProno);
  } catch (err) {
    console.error('❌ ADD PRONO - Erreur:', err);
    
    // Gestion des erreurs MongoDB
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ error: messages.join(', ') });
    }
    
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Un prono identique existe déjà' });
    }
    
    res.status(500).json({ error: 'Erreur serveur: ' + err.message });
  }
});

// Modifier résultat (admin)
router.put('/:id', auth, isAdmin, async (req, res) => {
  try {
    const prono = await Prono.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(prono);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Supprimer (admin)
router.delete('/:id', auth, isAdmin, async (req, res) => {
  try {
    await Prono.findByIdAndDelete(req.params.id);
    res.json({ message: 'Supprimé ✅' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;


