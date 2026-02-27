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
    const prono = await Prono.create(req.body);
    res.json(prono);
  } catch (err) {
    res.status(500).json({ error: err.message });
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


