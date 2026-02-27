const express = require('express');
const router = express.Router();

// Stockage en mémoire des matchs live (pour démo)
let liveMatches = [];

// Ajouter un match live manuellement
router.post('/add', (req, res) => {
  try {
    const { homeTeam, awayTeam, scoreHome, scoreAway, minute, status, league } = req.body;
    
    const newMatch = {
      id: Date.now().toString(),
      teams: {
        home: homeTeam,
        away: awayTeam
      },
      score: {
        home: parseInt(scoreHome) || 0,
        away: parseInt(scoreAway) || 0
      },
      status: status || 'LIVE',
      minute: minute || null,
      league: league || 'Match personnalisé',
      date: new Date().toISOString(),
      addedBy: 'user',
      updatedAt: new Date().toISOString()
    };
    
    liveMatches.push(newMatch);
    res.json(newMatch);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Mettre à jour un match live
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { scoreHome, scoreAway, minute, status } = req.body;
    
    const matchIndex = liveMatches.findIndex(m => m.id === id);
    if (matchIndex === -1) {
      return res.status(404).json({ error: 'Match non trouvé' });
    }
    
    liveMatches[matchIndex] = {
      ...liveMatches[matchIndex],
      score: {
        home: parseInt(scoreHome) || liveMatches[matchIndex].score.home,
        away: parseInt(scoreAway) || liveMatches[matchIndex].score.away
      },
      minute: minute !== undefined ? minute : liveMatches[matchIndex].minute,
      status: status || liveMatches[matchIndex].status,
      updatedAt: new Date().toISOString()
    };
    
    res.json(liveMatches[matchIndex]);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Supprimer un match live
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const matchIndex = liveMatches.findIndex(m => m.id === id);
    
    if (matchIndex === -1) {
      return res.status(404).json({ error: 'Match non trouvé' });
    }
    
    const deletedMatch = liveMatches.splice(matchIndex, 1)[0];
    res.json(deletedMatch);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Obtenir tous les matchs live
router.get('/', (req, res) => {
  try {
    res.json(liveMatches);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Vider tous les matchs
router.delete('/', (req, res) => {
  try {
    liveMatches = [];
    res.json({ message: 'Tous les matchs ont été supprimés' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
