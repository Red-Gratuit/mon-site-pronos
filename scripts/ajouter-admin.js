const mongoose = require('mongoose');
const User = require('../models/User');

// Remplacez avec votre deuxième email
const DEUXIEME_EMAIL = 'Evannhlb7@gmail.com';

async function ajouterAdmin() {
  try {
    // Connexion à la base de données
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pronoelite');
    console.log('🔗 Connecté à MongoDB');

    // Vérifier si l'utilisateur existe
    const user = await User.findOne({ email: DEUXIEME_EMAIL });
    
    if (!user) {
      console.log(`❌ Utilisateur ${DEUXIEME_EMAIL} non trouvé`);
      console.log('💡 L\'utilisateur doit d\'abord s\'inscrire sur le site');
      process.exit(1);
    }

    // Mettre à jour le statut admin
    const userUpdated = await User.findByIdAndUpdate(
      user._id,
      { isAdmin: true },
      { new: true }
    );

    console.log(`✅ ${userUpdated.email} est maintenant ADMIN !`);
    console.log(`📋 Username: ${userUpdated.username}`);
    console.log(`🔑 ID: ${userUpdated._id}`);
    console.log(`⭐ VIP: ${userUpdated.isVIP ? 'Oui' : 'Non'}`);
    console.log(`👑 Admin: ${userUpdated.isAdmin ? 'Oui' : 'Non'}`);

    // Fermer la connexion
    await mongoose.connection.close();
    console.log('🔌 Déconnecté de MongoDB');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

// Exécuter la fonction
ajouterAdmin();
