const mongoose = require('mongoose');
const User = require('../models/User');

// Liste tous les admins existants
async function listerAdmins() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pronoelite');
    console.log('🔗 Connecté à MongoDB');

    const admins = await User.find({ isAdmin: true });
    
    console.log(`📋 Liste des admins (${admins.length}):`);
    console.log('=====================================');
    
    admins.forEach((admin, index) => {
      console.log(`${index + 1}. ${admin.email}`);
      console.log(`   👤 Username: ${admin.username}`);
      console.log(`   ⭐ VIP: ${admin.isVIP ? 'Oui' : 'Non'}`);
      console.log(`   📅 Inscrit le: ${admin.createdAt.toLocaleDateString('fr-FR')}`);
      console.log('');
    });

    if (admins.length === 0) {
      console.log('❌ Aucun admin trouvé');
    }

    await mongoose.connection.close();
    console.log('🔌 Déconnecté de MongoDB');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

listerAdmins();
