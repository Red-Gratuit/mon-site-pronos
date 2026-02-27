const router   = require('express').Router();
const passport = require('passport');
const jwt      = require('jsonwebtoken');

// Lance la connexion Google
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Callback Google
router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    const token = jwt.sign(
      {
        id:       req.user._id,
        username: req.user.username,
        email:    req.user.email,
        isVIP:    req.user.isVIP,
        isAdmin:  req.user.isAdmin
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    // Redirige vers le site avec le token dans l'URL
    res.redirect(`/?token=${token}`);
  }
);

// Déconnexion
router.get('/logout', (req, res) => {
  req.logout(() => res.redirect('/'));
});

module.exports = router;
