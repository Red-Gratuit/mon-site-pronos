const express = require('express');
const router = express.Router();
const Prono = require('../models/Prono');

// Obtenir tous les matchs avec leurs résultats
router.get('/', async (req, res) => {
  try {
    const pronos = await Prono.find().sort({ date: 1 });
    res.json(pronos);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Mettre à jour le résultat d'un match
router.put('/:id/result', async (req, res) => {
  try {
    const { resultat } = req.body;
    const prono = await Prono.findByIdAndUpdate(
      req.params.id,
      { resultat },
      { new: true }
    );
    
    if (!prono) {
      return res.status(404).json({ error: 'Prono non trouvé' });
    }
    
    res.json(prono);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Obtenir les stats de résultats
router.get('/stats', async (req, res) => {
  try {
    const stats = await Prono.aggregate([
      {
        $group: {
          _id: '$resultat',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const result = {
      gagnant: 0,
      perdant: 0,
      pending: 0,
      total: 0
    };
    
    stats.forEach(stat => {
      result[stat._id] = stat.count;
      result.total += stat.count;
    });
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
