const passport       = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User           = require('../models/User');

passport.serializeUser((user, done) => done(null, user.id));

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

passport.use(new GoogleStrategy({
  clientID:     process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL:  'https://the-room.up.railway.app/auth/google/callback'
},
async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails[0].value;
    let user = await User.findOne({ googleId: profile.id });

    if (!user) {
      user = await User.create({
        googleId: profile.id,
        username: profile.displayName,
        email,
        isAdmin: ['enzo.xr59@gmail.com', 'afkiranis0605@gmail.com', 'timeodujardin25@gmail.com'].includes(email),
        isVIP:   ['enzo.xr59@gmail.com', 'afkiranis0605@gmail.com', 'timeodujardin25@gmail.com'].includes(email)
      });
    }
    return done(null, user);
  } catch (err) {
    return done(err, null);
  }
}));
