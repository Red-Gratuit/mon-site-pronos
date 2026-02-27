// Service pour les données de matchs en temps réel
class FootballAPIService {
  constructor() {
    // Options d'API populaires
    this.apis = {
      footballData: {
        url: 'https://api.football-data.org/v4',
        key: process.env.FOOTBALL_DATA_API_KEY
      },
      apiSports: {
        url: 'https://v3.football.api-sports.io',
        key: process.env.API_SPORTS_KEY
      },
      theSportsDB: {
        url: 'https://www.thesportsdb.com/api/v1/json/3',
        key: process.env.SPORTS_DB_KEY
      }
    };
  }

  // Obtenir les matchs du jour
  async getTodayMatches() {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Exemple avec API Sports (le plus complet)
      const response = await fetch(`${this.apis.apiSports.url}/fixtures?date=${today}`, {
        headers: {
          'x-apisports-key': this.apis.apiSports.key
        }
      });
      
      const data = await response.json();
      return data.response;
    } catch (error) {
      console.error('Erreur API Football:', error);
      return [];
    }
  }

  // Obtenir les scores en direct
  async getLiveScores(fixtureId) {
    try {
      const response = await fetch(`${this.apis.apiSports.url}/fixtures?id=${fixtureId}`, {
        headers: {
          'x-apisports-key': this.apis.apiSports.key
        }
      });
      
      const data = await response.json();
      return data.response[0];
    } catch (error) {
      console.error('Erreur scores live:', error);
      return null;
    }
  }

  // Analyser si un prono est gagnant
  analyzePronoResult(match, prono) {
    const { goals } = match;
    const homeScore = goals.home;
    const awayScore = goals.away;
    
    // Logique d'analyse du prono
    const pronoLower = prono.toLowerCase();
    
    if (pronoLower.includes('victoire')) {
      const homeTeam = match.teams.home.name.toLowerCase();
      const awayTeam = match.teams.away.name.toLowerCase();
      
      if (pronoLower.includes(homeTeam)) {
        return homeScore > awayScore ? 'winning' : 'losing';
      } else if (pronoLower.includes(awayTeam)) {
        return awayScore > homeScore ? 'winning' : 'losing';
      }
    }
    
    if (pronoLower.includes('nul') || pronoLower.includes('match nul')) {
      return homeScore === awayScore ? 'winning' : 'losing';
    }
    
    if (pronoLower.includes('plus de') || pronoLower.includes('over')) {
      const totalGoals = homeScore + awayScore;
      const overUnder = parseFloat(prono.match(/[\d.]+/)?.[0] || '2.5');
      return totalGoals > overUnder ? 'winning' : 'losing';
    }
    
    if (pronoLower.includes('moins de') || pronoLower.includes('under')) {
      const totalGoals = homeScore + awayScore;
      const overUnder = parseFloat(prono.match(/[\d.]+/)?.[0] || '2.5');
      return totalGoals < overUnder ? 'winning' : 'losing';
    }
    
    return 'pending';
  }

  // Formatter les données pour l'affichage
  formatMatchForDisplay(match, userProno) {
    return {
      id: match.fixture.id,
      teams: {
        home: match.teams.home.name,
        away: match.teams.away.name
      },
      score: {
        home: match.goals.home,
        away: match.goals.away
      },
      status: match.fixture.status.short,
      minute: match.fixture.status.elapsed,
      league: match.league.name,
      prono: userProno,
      pronoStatus: this.analyzePronoResult(match, userProno)
    };
  }
}

module.exports = FootballAPIService;
