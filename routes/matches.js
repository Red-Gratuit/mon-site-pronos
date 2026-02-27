const express = require('express');
const router = express.Router();
const Prono = require('../models/Prono');

// Obtenir les matchs en direct via API Sports
router.get('/live', async (req, res) => {
  try {
    const apiKey = process.env.API_SPORTS_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Clé API Sports non configurée' });
    }

    // Obtenir la date d'aujourd'hui
    const today = new Date().toISOString().split('T')[0];
    
    // Appel à l'API Sports pour les matchs du jour
    const response = await fetch(`https://v3.football.api-sports.io/fixtures?date=${today}`, {
      headers: {
        'x-apisports-key': apiKey
      }
    });

    if (!response.ok) {
      throw new Error('Erreur API Sports');
    }

    const data = await response.json();
    
    // Filtrer uniquement les matchs en direct ou terminés aujourd'hui
    const relevantMatches = data.response.filter(match => 
      match.fixture.status.short === 'LIVE' || 
      match.fixture.status.short === 'FT' ||
      match.fixture.status.short === 'AET' ||
      match.fixture.status.short === 'PEN'
    );

    // Formatter les données pour le frontend
    const formattedMatches = relevantMatches.map(match => ({
      id: match.fixture.id,
      teams: {
        home: match.teams.home.name,
        away: match.teams.away.name
      },
      score: {
        home: match.goals.home || 0,
        away: match.goals.away || 0
      },
      status: match.fixture.status.short,
      minute: match.fixture.status.elapsed || null,
      league: match.league.name,
      country: match.league.country,
      date: match.fixture.date
    }));

    res.json(formattedMatches);
  } catch (error) {
    console.error('Erreur matchs live:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Obtenir tous les matchs avec leurs résultats (fallback)
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
