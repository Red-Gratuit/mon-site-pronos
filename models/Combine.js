const mongoose = require('mongoose');

const CombineSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  type: { type: String, enum: ['public', 'vip'], default: 'vip' },
  pronos: [{
    match: { type: String, required: true },
    league: { type: String },
    prono: { type: String, required: true },
    cote: { type: Number, required: true },
    resultat: { type: String, enum: ['pending', 'gagnant', 'perdant'], default: 'pending' }
  }],
  coteTotale: { type: Number, required: true },
  miseConseillee: { type: Number, default: 10 },
  gainPotentiel: { type: Number },
  tag: { type: String, enum: ['', 'hot', 'sure'], default: '' },
  publishedBy: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Calcul automatique de la cote totale et du gain potentiel
CombineSchema.pre('save', function(next) {
  this.coteTotale = this.pronos.reduce((acc, p) => acc * p.cote, 1);
  this.gainPotentiel = this.miseConseillee * this.coteTotale;
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Combine', CombineSchema);
