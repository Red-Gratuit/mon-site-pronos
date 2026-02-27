const express = require('express');
const router = express.Router();
const Prono = require('../models/Prono');

// Obtenir l'historique des pronostics avec filtres
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, league, type, resultat, startDate, endDate } = req.query;
    
    // Construire le filtre
    const filter = {};
    if (league) filter.league = new RegExp(league, 'i');
    if (type) filter.type = type;
    if (resultat) filter.resultat = resultat;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }
    
    // Récupérer les pronostics
    const pronos = await Prono.find(filter)
      .sort({ date: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    // Compter le total pour la pagination
    const total = await Prono.countDocuments(filter);
    
    // Calculer les statistiques
    const stats = await calculateStats(filter);
    
    res.json({
      pronos,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      stats
    });
  } catch (error) {
    console.error('Erreur historique:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Obtenir les statistiques détaillées
router.get('/stats', async (req, res) => {
  try {
    const stats = await calculateStats({});
    res.json(stats);
  } catch (error) {
    console.error('Erreur stats:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Obtenir les statistiques par ligue
router.get('/stats/leagues', async (req, res) => {
  try {
    const leagues = await Prono.aggregate([
      {
        $group: {
          _id: '$league',
          total: { $sum: 1 },
          gagnants: {
            $sum: {
              $cond: [{ $eq: ['$resultat', 'gagnant'] }, 1, 0]
            }
          },
          perdants: {
            $sum: {
              $cond: [{ $eq: ['$resultat', 'perdant'] }, 1, 0]
            }
          }
        }
      },
      {
        $addFields: {
          tauxReussite: {
            $multiply: [
              { $divide: ['$gagnants', '$total'] },
              100
            ]
          }
        }
      },
      { $sort: { tauxReussite: -1 } }
    ]);
    
    res.json(leagues);
  } catch (error) {
    console.error('Erreur stats ligues:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Obtenir les statistiques mensuelles
router.get('/stats/monthly', async (req, res) => {
  try {
    const monthlyStats = await Prono.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' }
          },
          total: { $sum: 1 },
          gagnants: {
            $sum: {
              $cond: [{ $eq: ['$resultat', 'gagnant'] }, 1, 0]
            }
          }
        }
      },
      {
        $addFields: {
          tauxReussite: {
            $multiply: [
              { $divide: ['$gagnants', '$total'] },
              100
            ]
          },
          month: {
            $concat: [
              { $toString: '$_id.year' },
              '-',
              { $cond: [
                { $lt: ['$_id.month', 10] },
                { $concat: ['0', { $toString: '$_id.month' }] },
                { $toString: '$_id.month' }
              ]}
            ]
          }
        }
      },
      { $sort: { month: -1 } },
      { $limit: 12 }
    ]);
    
    res.json(monthlyStats);
  } catch (error) {
    console.error('Erreur stats mensuelles:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Fonction utilitaire pour calculer les statistiques
async function calculateStats(filter) {
  const stats = await Prono.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        gagnants: {
          $sum: {
            $cond: [{ $eq: ['$resultat', 'gagnant'] }, 1, 0]
          }
        },
        perdants: {
          $sum: {
            $cond: [{ $eq: ['$resultat', 'perdant'] }, 1, 0]
          }
        },
        enAttente: {
          $sum: {
            $cond: [{ $eq: ['$resultat', 'pending'] }, 1, 0]
          }
        },
        coteMoyenne: { $avg: '$cote' }
      }
    }
  ]);
  
  const result = stats[0] || { total: 0, gagnants: 0, perdants: 0, enAttente: 0, coteMoyenne: 0 };
  
  return {
    total: result.total,
    gagnants: result.gagnants,
    perdants: result.perdants,
    enAttente: result.enAttente,
    tauxReussite: result.total > 0 ? (result.gagnants / result.total * 100).toFixed(1) : 0,
    coteMoyenne: result.coteMoyenne ? result.coteMoyenne.toFixed(2) : 0
  };
}

module.exports = router;
