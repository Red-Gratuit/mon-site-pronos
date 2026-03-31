const User = require('../models/User');

const ADMIN_EMAILS = [
  'enzo.xr59@gmail.com',
  'afkiranis0605@gmail.com',
  'timeodujardin25@gmail.com'
];

async function setupAdmins() {
  try {
    for (const email of ADMIN_EMAILS) {
      const user = await User.findOneAndUpdate(
        { email: email.toLowerCase() },
        { isAdmin: true },
        { new: true }
      );
      if (user) {
        console.log(`✅ ${email} est maintenant admin`);
      } else {
        console.log(`⚠️ ${email} n'existe pas encore (sera admin à la création)`);
      }
    }
    console.log('✅ Setup admins terminé');
  } catch (err) {
    console.error('❌ Erreur setup admins:', err);
  }
}

module.exports = { setupAdmins, ADMIN_EMAILS };
