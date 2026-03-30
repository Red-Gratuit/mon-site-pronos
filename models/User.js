const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  googleId:  String,
  username:  String,
  email:     { type: String, required: true, unique: true },
  isVIP:     { type: Boolean, default: false },
  vipTier:   { type: String, enum: ['basic', 'premium'], default: null }, // niveau d'abonnement
  isAdmin:   { type: Boolean, default: false },
  stripeCustomerId: String,
  stripeSubId:      String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
