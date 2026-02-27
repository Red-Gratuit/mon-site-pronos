const mongoose = require('mongoose');

const PronoSchema = new mongoose.Schema({
  league:    String,
  match:     { type: String, required: true },
  prono:     { type: String, required: true },
  cote:      Number,
  date:      Date,
  type:      { type: String, enum: ['public', 'vip'], default: 'public' },
  tag:       String,
  analyse:   String,
  resultat:  { type: String, enum: ['gagnant', 'perdant', 'pending'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Prono', PronoSchema);
